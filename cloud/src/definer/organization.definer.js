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
 * Master key rather than a role fits the actual process — staff create
 * organizations by hand, so no client legitimately needs this. When
 * `puente_staff` exists (§7) this becomes `request.master ||
 * isStaff(request.user)`, which is what an OrganizationAdmin screen in Manage
 * would need.
 */
Parse.Cloud.define('createOrganization', async (request) => {
  if (!request.master) {
    throw new Error('createOrganization requires the master key');
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

  const taken = new Map();
  existing.forEach((o) => (o.get('aliases') || []).forEach(
    (a) => taken.set(service.normalizeOrganizationName(a), o.get('shortCode')),
  ));
  const clash = aliases
    .map((a) => [a, taken.get(service.normalizeOrganizationName(a))])
    .find(([, owner]) => owner);
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
