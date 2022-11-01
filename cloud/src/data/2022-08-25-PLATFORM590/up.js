/**
 * Create Organization Table records with all the organizations
 */
const addOrganizationModel = async () => {
  /**
     * Get unique list of organizations using User Model
     */
  const query = new Parse.Query('User');
  const uniqueListOfOrganizations = await query.distinct('organization'); // Make query of unique list of organiztions using User model and fill this array with those

  const Organization = Parse.Object.extend('Organization');

  uniqueListOfOrganizations.forEach((singleOrganizationName) => {
    const surveyingOrganization = new Organization();
    surveyingOrganization.set('name', singleOrganizationName);
    surveyingOrganization.save();
  });
};

/** add
 * Create a field on the User Table called affliliatedOrganization
 */
const createAffiliatedOrganizationField = async () => {
  const query = new Parse.Query('Organization');
  const organizations = await query.find();

  organizations.forEach(async (organization) => {
    const { id } = organization;
    const name = organization.get('name');
    const userQuery = new Parse.Query('User');
    userQuery.equalTo('organization', name);
    const users = await userQuery.find();
    users.forEach(async (user) => {
      user.set('organizationID', id);
      user.save(null, { useMasterKey: true });
    });
  });
};

/**
 * Change all records in the SurveyData Table
 */

const changeSurveyDataTable = async () => {
  const userQuery = new Parse.Query('User');
  const users = await userQuery.find();
  users.forEach(async (user) => {
    const { id } = user;
    const username = user.get('username');
    const firstname = user.get('firstname');
    const lastname = user.get('lastname');
    const fullname = `${firstname} ${lastname}`;

    const surveyQuery = new Parse.Query('SurveyData');
    surveyQuery.equalTo('surveyingUser', fullname);

    const surveyQueryUser = new Parse.Query('SurveyData');
    surveyQueryUser.equalTo('surveyingUser', username);

    const mainQuery = Parse.Query.or(surveyQuery, surveyQueryUser);
    const surveyingUsers = await mainQuery.find();
    // console.log(surveyingUsers)
    surveyingUsers.forEach(async (surveyingUsername) => {
      surveyingUsername.set('UserID', id);
      surveyingUsername.save();
    });
  });
};

module.exports = { addOrganizationModel, createAffiliatedOrganizationField, changeSurveyDataTable };

/* DO THE SAME BUT PUT THE USERID IN RELATED SURVEYDATA RECORDS
const query = new Parse.Query("Organization");
const organizations = await query.find()

organizations.forEach( async (organization)=> {

      const id = organization.id
      const name = organization.get("name")
      const userQuery =  new Parse.Query("User");
      userQuery.equalTo("organization", name)
      const users = await userQuery.find()
      users.forEach( async (user) => {

        user.set("organizationID", id)
        user.save(null, { useMasterKey: true })
      })

    })

const userQuery = new Parse.Query("User")
const users = await userQuery.find()
users.forEach( async (user)=>{
  const id = user.id
  const username = user.get("username")
  const firstname = user.get("firstname")
  const lastname = user.get("lastname")
  const email = user.get("email")
  const fullname = firstname + " " + lastname

  const surveyQuery = new Parse.Query("SurveyData")
  surveyQuery.equalTo("surveyingUser", fullname)

  const surveyQueryUser = new Parse.Query("SurveyData")
  surveyQueryUser.equalTo("surveyingUser", username)

  const mainQuery = Parse.Query.or(surveyQuery, surveyQueryUser)
  const surveyingUsers = await mainQuery.find()
  // console.log(surveyingUsers)
  surveyingUsers.forEach( async (surveyingUsername) => {
    surveyingUsername.set("UserID", id)
    surveyingUsername.save()
  })

})


*/
