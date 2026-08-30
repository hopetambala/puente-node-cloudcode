const services = require('../services');

/**
 * Resolves a collected organization string (or an existing pointer) to the
 * canonical `Organization`. See services/organization/organization.js.
 */
Parse.Cloud.define('resolveOrganization', async (request) => {
  const service = services.organization;
  const organizations = await service.findAll();
  const result = service.resolve(request.params, organizations);

  if (result.status !== 'resolved') return result;

  return {
    status: 'resolved',
    organization: {
      objectId: result.organization.id,
      name: result.organization.get('name'),
      shortCode: result.organization.get('shortCode'),
    },
  };
});

/**
 * Creates an `Organization`. Dedicated endpoint rather than the generic
 * `postObjectsToClass`, which refuses this class.
 *
 * The important guard is the alias check, not the endpoint. An attacker who can
 * mint an Organization claiming an alias an existing tenant already uses makes
 * `resolve()` raise on the ambiguity, and that tenant's records then save with
 * no pointer — a denial-of-attribution needing no credentials. Rejecting a
 * colliding alias at creation closes that regardless of who is calling.
 *
 * Creation is master-key only. The earlier note here argued an endpoint check
 * would be theatre because no role carries tenancy — true of a ROLE check, but
 * this is an AUTHENTICATION check, and it is not theatre: the app id and
 * JavaScript key ship in every client bundle, and since the registration picker
 * landed this list is what every new account chooses from.
 *
 * Master key OR `puente_staff` (the extension this comment used to anticipate).
 * The master-key arm still carries the ops console, the seed script and the
 * integration tests, none of which have a user. The role arm is what lets the
 * OrganizationAdmin screen in Manage create a partner without shipping a master
 * key to a browser.
 *
 * The role is evaluated SERVER-SIDE under the master key, and `puente_staff` is
 * created with no public read or write — unlike the legacy `admin` role, which
 * is publicly writable. See services/roles/roles.js.
 */
Parse.Cloud.define('createOrganization', async (request) => {
  if (!await services.roles.mayAdministerOrganizations(request)) {
    throw new Error(
      'createOrganization requires the master key or the puente_staff role',
    );
  }

  const service = services.organization;
  const {
    name, shortCode, aliases = [], plan, active = true,
  } = request.params;

  if (!name || !shortCode) throw new Error('createOrganization: name and shortCode are required');

  const existing = await service.findAll();

  if (existing.some((o) => o.get('shortCode') === shortCode)) {
    throw new Error(`createOrganization: shortCode "${shortCode}" is already taken`);
  }

  // Names participate in uniqueness in BOTH directions, because resolve()
  // treats an organization's name as an implicit alias. A name colliding with
  // someone else's alias makes that string ambiguous, and on the record write
  // path an ambiguous string means a whole tenant's records stop resolving.
  //
  // Shared with editOrganizationAliases via findAliasClash so the two cannot
  // drift into disagreeing about what counts as taken.
  const clash = service.findAliasClash([name, ...aliases], existing);
  if (clash) {
    throw new Error(
      `createOrganization: alias "${clash[0]}" already belongs to "${clash[1]}". `
      + 'Aliases must be unique across organizations.',
    );
  }

  const org = new Parse.Object('Organization');
  org.set('name', name);
  org.set('shortCode', shortCode);
  org.set('aliases', aliases);
  org.set('active', active);
  if (plan) org.set('plan', plan);
  // Public read so the registration picker can list organizations; no public
  // write. Better than the class default, which grants both.
  const acl = new Parse.ACL();
  acl.setPublicReadAccess(true);
  org.setACL(acl);

  return org.save(null, { useMasterKey: true });
});


/**
 * Replaces an organization's alias set.
 *
 * Same gate as createOrganization, for the same reason: aliases decide which
 * organization owns a record, so an open endpoint would let anyone re-route a
 * tenant's data by claiming their spelling.
 *
 * Replace rather than append — the admin screen edits the whole set, and a
 * remove-an-alias operation has to be expressible. The caller sends the list it
 * wants; the canonical `name` is always an implicit alias and never needs to be
 * in it.
 */
Parse.Cloud.define('editOrganizationAliases', async (request) => {
  if (!await services.roles.mayAdministerOrganizations(request)) {
    throw new Error(
      'editOrganizationAliases requires the master key or the puente_staff role',
    );
  }

  const service = services.organization;
  const { shortCode, aliases } = request.params;

  if (!shortCode) throw new Error('editOrganizationAliases: shortCode is required');
  if (!Array.isArray(aliases)) {
    throw new Error('editOrganizationAliases: aliases must be an array');
  }

  const existing = await service.findAll();
  const target = existing.find((o) => o.get('shortCode') === shortCode);
  // Refuse rather than create: a typo in the shortCode would otherwise mint a
  // nameless organization that the picker would then offer to new accounts.
  if (!target) {
    throw new Error(`editOrganizationAliases: no organization with shortCode "${shortCode}"`);
  }

  // The target's own strings are excluded, or re-saving an unchanged set would
  // report the organization as colliding with itself.
  const clash = service.findAliasClash(aliases, existing, { excludeShortCode: shortCode });
  if (clash) {
    throw new Error(
      `editOrganizationAliases: alias "${clash[0]}" already belongs to "${clash[1]}". `
      + 'Aliases must be unique across organizations.',
    );
  }

  target.set('aliases', aliases);
  return target.save(null, { useMasterKey: true });
});

/**
 * Resolves a shortCode to its Organization, or throws.
 *
 * Shared by the member endpoints so they cannot disagree about what a
 * shortCode means.
 */
const organizationByShortCode = async (shortCode) => {
  const organizations = await services.organization.findAll();
  const org = organizations.find((o) => o.get('shortCode') === shortCode);
  if (!org) throw new Error(`No organization with shortCode "${shortCode}"`);
  return org;
};

/** The objectIds currently in an organization's admin role. */

/**
 * Cap on the account read. Truncation is reported, never swallowed: a partial
 * member list reads exactly like a short one.
 */
const USER_FETCH_LIMIT = 1000;

/**
 * Every account grouped by the organization its stored string RESOLVES to.
 *
 * Matching the canonical name is WRONG and was a real bug: production carries
 * 31 accounts whose organization is "DRMT" and none whose organization is
 * "DR Missions", so a real partner reported as having no members and would have
 * been left with no admin. Exact `containedIn` on the alias set is not enough
 * either — 17 accounts carry "Puente " with a trailing space.
 *
 * Only the resolver handles all of it, because it folds case, accents and
 * whitespace and knows the alias set. This is the same
 * one-organization-several-strings rule that governs record scoping.
 *
 * One query for every organization, ascending by createdAt — so the first
 * account in each group is that organization's earliest, which is exactly what
 * the seed plan needs.
 */
const accountsByOrganization = async (organizations) => {
  const userQuery = new Parse.Query(Parse.User);
  userQuery.select(
    'username', 'firstname', 'lastname', 'role',
    'adminVerified', 'deactivated', 'organization', 'createdAt',
  );
  userQuery.limit(USER_FETCH_LIMIT);
  userQuery.ascending('createdAt');
  const users = await userQuery.find({ useMasterKey: true });

  const byShortCode = new Map();
  users.forEach((user) => {
    let shortCode = null;
    try {
      const resolved = services.organization.resolve(
        { name: user.get('organization') }, organizations,
      );
      shortCode = resolved.status === 'resolved' ? resolved.organization.get('shortCode') : null;
    } catch (error) {
      // An ambiguous alias throws by design. That account belongs to no
      // organization we can name, so it is left out rather than guessed at.
      shortCode = null;
    }
    if (!shortCode) return;
    if (!byShortCode.has(shortCode)) byShortCode.set(shortCode, []);
    byShortCode.get(shortCode).push(user);
  });

  if (users.length === USER_FETCH_LIMIT) {
    // Same treatment findAll gives its own cap: a truncated read means the
    // member lists and the seed plan are computed against an incomplete set,
    // and a partial answer reads exactly like a complete one.
    require('../module').Error.logError( // eslint-disable-line global-require
      `accountsByOrganization hit the ${USER_FETCH_LIMIT}-account cap. Member `
      + 'lists and the org-admin seed plan are now against an incomplete set.',
    );
  }

  return { byShortCode, truncated: users.length === USER_FETCH_LIMIT };
};
const orgAdminIds = async (shortCode) => {
  const roleQuery = new Parse.Query(Parse.Role);
  roleQuery.equalTo('name', services.roles.orgAdminRoleName(shortCode));
  const role = await roleQuery.first({ useMasterKey: true });
  if (!role) return { role: null, ids: new Set() };
  const users = await role.getUsers().query().find({ useMasterKey: true });
  return { role, ids: new Set(users.map((u) => u.id)) };
};

/**
 * The members of one organization, with what an admin needs in order to act.
 *
 * A member list is tenant data — it carries names and phone numbers — so it is
 * gated exactly like every other organization-scoped operation.
 */
Parse.Cloud.define('listOrganizationMembers', async (request) => {
  const { shortCode } = request.params;
  if (!shortCode) throw new Error('listOrganizationMembers: shortCode is required');

  if (!await services.roles.mayAdministerOrganization(request, shortCode)) {
    throw new Error(
      'listOrganizationMembers requires the master key, the puente_staff role, '
      + "or the organization's admin role",
    );
  }

  await organizationByShortCode(shortCode);
  const { ids } = await orgAdminIds(shortCode);

  const organizations = await services.organization.findAll();
  const { byShortCode } = await accountsByOrganization(organizations);
  const users = byShortCode.get(shortCode) || [];

  return users.map((u) => ({
    objectId: u.id,
    username: u.get('username'),
    firstname: u.get('firstname'),
    lastname: u.get('lastname'),
    role: u.get('role'),
    adminVerified: u.get('adminVerified') === true,
    // Absent means active. A tri-state here would make the UI guess.
    deactivated: u.get('deactivated') === true,
    isOrgAdmin: ids.has(u.id),
  }));
});

/**
 * Promotes or demotes an organization admin.
 *
 * Membership of the Parse role IS the authorization, so this endpoint is the
 * escalation to guard: it is gated on the TARGET's organization, never the
 * caller's, so an admin of one partner cannot appoint themselves into another.
 */
Parse.Cloud.define('setOrgAdmin', async (request) => {
  const { userId, isAdmin } = request.params;
  if (!userId) throw new Error('setOrgAdmin: userId is required');

  const target = await new Parse.Query(Parse.User).get(String(userId), { useMasterKey: true });

  const organizations = await services.organization.findAll();
  let shortCode = null;
  try {
    const resolved = services.organization.resolve(
      { name: target.get('organization') }, organizations,
    );
    shortCode = resolved.status === 'resolved' ? resolved.organization.get('shortCode') : null;
  } catch (error) {
    shortCode = null;
  }
  if (!shortCode) throw new Error("setOrgAdmin: the target's organization does not resolve");

  if (!await services.roles.mayAdministerOrganization(request, shortCode)) {
    throw new Error(
      'setOrgAdmin requires the master key, the puente_staff role, or the '
      + "organization's admin role",
    );
  }

  await services.roles.createOrgAdminRole(shortCode);
  const { role, ids } = await orgAdminIds(shortCode);

  if (isAdmin === false) {
    // Demoting the last admin orphans the organization: nobody can then
    // administer it and only a master key recovers it. Staff override.
    const staff = request.master || await services.roles.isStaff(request.user);
    if (ids.has(target.id) && ids.size <= 1 && !staff) {
      throw new Error(
        'Cannot demote the last admin of an organization. Appoint another admin '
        + 'first, or ask Puente staff.',
      );
    }
    role.getUsers().remove(target);
  } else {
    role.getUsers().add(target);
  }
  await role.save(null, { useMasterKey: true });

  return { objectId: target.id, shortCode, isOrgAdmin: isAdmin !== false };
});

/**
 * Builds the org-admin seed plan for organizations that have no admin yet.
 *
 * D5: the EARLIEST account of each organization becomes its admin. That is
 * Hope's call over staff-assigning each one, and it is applied as a dry run
 * first because it is a BULK PRIVILEGE GRANT across every existing
 * organization — the same discipline the section 6 backfill runbook uses, where
 * the dry run is the deliverable.
 *
 * Three buckets, and the third is the point: an organization with no members
 * is REPORTED rather than silently skipped. A silent skip is how an
 * organization stays adminless and nobody notices.
 */
const buildOrgAdminSeedPlan = async () => {
  const organizations = await services.organization.findAll();
  // One account read for every organization, rather than one per organization.
  const accounts = await accountsByOrganization(organizations);
  const propose = [];
  const alreadyHasAdmin = [];
  const noMembers = [];

  // Sequential on purpose: dozens of organizations, and a burst of parallel
  // role reads against Back4App buys nothing but throttling risk.
  for (const org of organizations) { // eslint-disable-line no-restricted-syntax
    const shortCode = org.get('shortCode');
    if (!shortCode) continue; // eslint-disable-line no-continue

    // eslint-disable-next-line no-await-in-loop
    const { ids } = await orgAdminIds(shortCode);
    if (ids.size > 0) {
      alreadyHasAdmin.push({ shortCode, name: org.get('name'), admins: ids.size });
      continue; // eslint-disable-line no-continue
    }

    // accountsByOrganization already sorted ascending by createdAt, so the
    // first entry IS the organization's earliest account - the D5 rule.
    const [earliest] = accounts.byShortCode.get(shortCode) || [];

    if (!earliest) {
      noMembers.push({ shortCode, name: org.get('name') });
      continue; // eslint-disable-line no-continue
    }

    propose.push({
      shortCode,
      organization: org.get('name'),
      userId: earliest.id,
      username: earliest.get('username'),
      firstname: earliest.get('firstname'),
      lastname: earliest.get('lastname'),
      createdAt: earliest.get('createdAt'),
    });
  }

  return { propose, alreadyHasAdmin, noMembers };
};

/**
 * The seed plan. Reads only — nothing is granted here.
 *
 * Master-key only: it enumerates every organization's earliest account, which
 * is tenant data, and it is the input to a bulk privilege grant.
 */
Parse.Cloud.define('planOrgAdminSeed', async (request) => {
  if (!request.master) throw new Error('planOrgAdminSeed requires the master key');
  return buildOrgAdminSeedPlan();
});

/**
 * Applies the seed plan.
 *
 * Requires `confirm: true` as a separate, explicit act. The plan is meant to be
 * read by a human first, and an apply that runs on an empty params object is
 * one keystroke away from a bulk grant nobody looked at.
 *
 * Idempotent: it re-plans, and an organization that already has an admin is no
 * longer proposed, so a second run grants nothing.
 */
Parse.Cloud.define('applyOrgAdminSeed', async (request) => {
  if (!request.master) throw new Error('applyOrgAdminSeed requires the master key');
  if (request.params.confirm !== true) {
    throw new Error(
      'applyOrgAdminSeed requires confirm: true. Read the plan from '
      + 'planOrgAdminSeed first — this is a bulk privilege grant.',
    );
  }

  const plan = await buildOrgAdminSeedPlan();
  const granted = [];

  for (const row of plan.propose) { // eslint-disable-line no-restricted-syntax
    // eslint-disable-next-line no-await-in-loop
    await services.roles.createOrgAdminRole(row.shortCode);
    // eslint-disable-next-line no-await-in-loop
    const { role } = await orgAdminIds(row.shortCode);
    // eslint-disable-next-line no-await-in-loop
    const user = await new Parse.Query(Parse.User).get(row.userId, { useMasterKey: true });
    role.getUsers().add(user);
    // eslint-disable-next-line no-await-in-loop
    await role.save(null, { useMasterKey: true });
    granted.push({ shortCode: row.shortCode, username: row.username });
  }

  return { granted, skippedNoMembers: plan.noMembers, alreadyHadAdmin: plan.alreadyHasAdmin };
});

/**
 * What the calling session may administer.
 *
 * The OrganizationAdmin screen in Manage needs this to decide what to render:
 * staff see every organization, an org admin sees only their own, and everyone
 * else is redirected. Deriving it client-side is not possible — org roles carry
 * no public read, so a browser querying `_Role` gets nothing back and every
 * admin would render as non-admin.
 *
 * Deliberately NOT the security boundary. Every privileged endpoint checks for
 * itself; this only decides what to draw. It fails closed — an unauthenticated
 * caller gets an empty list rather than an error, because a guard that throws
 * blanks the page while one that assumes access renders a surface whose every
 * action then fails.
 */
Parse.Cloud.define('myOrganizationAccess', async (request) => {
  const { user } = request;
  if (!user) return { isStaff: false, orgAdminOf: [] };

  const isStaff = await services.roles.isStaff(user);

  // Only the organizations this user actually administers, checked one by one
  // against the role. Staff are not enumerated across every organization here:
  // the client is told `isStaff` and treats that as "all", which stays correct
  // as organizations are added.
  const organizations = await services.organization.findAll();
  const orgAdminOf = [];
  for (const org of organizations) { // eslint-disable-line no-restricted-syntax
    const shortCode = org.get('shortCode');
    if (!shortCode) continue; // eslint-disable-line no-continue
    // eslint-disable-next-line no-await-in-loop
    if (await services.roles.isOrgAdmin(user, shortCode)) orgAdminOf.push(shortCode);
  }

  return { isStaff, orgAdminOf };
});
