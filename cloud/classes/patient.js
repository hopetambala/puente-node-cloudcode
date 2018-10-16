'use strict';

const Aggregator = require('../functions/aggregate');

class Patient {
    constructor(Parse){
        this.Parse = Parse;
        this.ParseClass = "SurveyData";
        this.forms = [
            'Allergies', 
            'EvaluationMedical', 
            'HistoryEnvironmentalHealth',
            'HistoryMedical',
            'Vitals'
        ];
    }

    retrieveAllPatients(){
        return new Promise((resolve, reject) => {
            //Creates local object based on "SurveyData" Object in Parse-Server
            const PatientDemographics = Parse.Object.extend(this.ParseClass);
    
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

    retrieveAllPatientsByOrganization(organization){
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

    //Proto - Don't Know if works
    retrieveAllFormsForPatientByPatientID(patientID){
        var arrayLength = this.forms.length;
        var dataArray = [];

        return new Promise((resolve,reject)=> {
            for (var i = 0; i < arrayLength; i++){
                Aggregator.retrieveOneByPatient(this.forms[i],patientID).then((result)=>{
                    //append result into Array
                    console.log(result);
                    //dataArray.push(result);
                    dataArray.push(result.attributes)
                })
            }
            resolve(dataArray);
        });
    }

    /**
     * Performs a query based on the parameter defined in a column
     * 
     * @returns Results of Query
     */
    retrieveAllPatientsByParam(offset, limit, parseColumn, parseParam) {
        return new Promise((resolve, reject) => {
            var PatientDemographics = Parse.Object.extend(this.ParseClass);

            var query = new Parse.Query(PatientDemographics);
            
            query.skip(offset);

            query.limit(limit);

            query.equalTo(parseColumn,parseParam);

            query.find().then((results) => {
                resolve(results);
            }, (error) => {
                reject(error);
            })
        });
    }
}

module.exports = Patient;