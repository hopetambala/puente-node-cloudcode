const removeOrganizationModels = async () => {
  /**
     * Remove Organization model
     */

  const organizationSchema = new Parse.Schema('Organization');
  organizationSchema.purge();

};

const removeSurveyDataRelation = async () => {
  const surveyingUsers = new Parse.Schema('SurveyData')
  surveyingUsers.get()
  surveyingUsers.deleteField('UserID')
  surveyingUsers.update()
}

const removeUserRelation = async () => {

  const users = new Parse.Schema('User')
  users.get()
  users.deleteField('organizationID')
  users.update()
}

module.exports = { removeOrganizationModels, removeSurveyDataRelation, removeUserRelation };
