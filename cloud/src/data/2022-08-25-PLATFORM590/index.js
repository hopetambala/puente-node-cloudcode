const { removeOrganizationModels } = require('./down');
const { addOrganizationModel } = require('./up');

/**
 * https://puente.atlassian.net/browse/PLATFORM-590
 */

class PLATFORM590 {
    constructor() {
    }
    
    async up() {
        /**
         * 1. Create Organization Table records with all the organizations
         * 2. Create a field on the User Table called affliliatedOrganization
         * 3. Change all records in the SurveyData Table to point to the User's affliliatedOrganization field (which points to the unique id of that's organizations record)
         */

         await addOrganizationModel()
    }

    async down() {
         /**
         * 1. Remove all Organization Table records
         * 2. Remove the affliliatedOrganization field on the User Table 
         * 3. Remove the parseUser field in all records in the SurveyData Table that points the the users
         *    affliliatedOrganization
         */

        await removeOrganizationModels()
    }
  }
  
  module.exports = PLATFORM590;
  