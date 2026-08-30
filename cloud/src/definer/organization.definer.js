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
