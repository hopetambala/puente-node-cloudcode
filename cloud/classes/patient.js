'use strict';

class Patient {
    constructor(Parse){
        this.Parse = Parse;
        this.ParseClass = "SurveyData";
    }

    retrieveAllPatients(){
        return new Promise((resolve, reject) => {
            //Creates local object based on "SurveyData" Object in Parse-Server
            const PatientDemographics = Parse.Object.extend('SurveyData');
    
            //Queries the SurveyData class from Parse Server
            let query = new Parse.Query(PatientDemographics);
            
            query.limit(2000);
            //Below searches what's in the surveyPoints array
            query.find().then((results) => {
                resolve(results);
            }, (error) => {
                reject(error);
            });
        });
    }

    retrievePatientsByOrganization(organization){
        return new Promise((resolve,reject)=> {
            var PatientDemographics = Parse.Object.extend(this.ParseClass);
            var q = new Parse.Query(PatientDemographics);
            q.limit(2000);
            q.equalTo("surveyingOrganization", organization);
            q.find().then((results) =>{
                resolve(results);
            }, (error) => {
                reject(error);
            });
        });
    }
}

module.exports = Patient;