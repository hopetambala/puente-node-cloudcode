/**
 * Create Organization Table records with all the organizations
 */
const addOrganizationModel = async () => {
    /**
     * Get unique list of organizations using User Model
     */
    const query = new Parse.Query("User");
    const uniqueListOfOrganizations = await query.distinct("organization") //Make query of unique list of organiztions using User model and fill this array with those
    
    const Organization = Parse.Object.extend('Organization');

    uniqueListOfOrganizations.forEach((singleOrganizationName)=> {
        const surveyingOrganization = new Organization();
        surveyingOrganization.set("name", singleOrganizationName);
        surveyingOrganization.save()
    })

}

/**
 * Create a field on the User Table called affliliatedOrganization
 */
const createAffiliatedOrganizationField = () =>{

}

/**
 * Change all records in the SurveyData Table
 */

const changeSurveyDataTable = () =>{

}

module.exports = { addOrganizationModel };
