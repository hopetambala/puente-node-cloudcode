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
