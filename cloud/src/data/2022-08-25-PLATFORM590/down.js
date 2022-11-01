const removeOrganizationModels = async () => {
  /**
     * Remove Organization model
     */

  const organizationSchema = new Parse.Schema('Organization');
  organizationSchema.purge();
};


module.exports = { removeOrganizationModels };
