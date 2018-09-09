'use strict';

module.exports = {
     retrieveAll: function (className){
        const Class = Parse.Object.extend(className);

        let query = new Parse.Query(Class);
        
        query.limit(2000);

        query.find().then((results) => {
            resolve(results);
        }, (error) => {
            reject(error);
        });
    },

    retrieveAllByOrganization: function (className, organization){
        var Class = Parse.Object.extend(className);
        var q = new Parse.Query(Class);
        q.limit(2000);
        q.equalTo("surveyingOrganization", organization);
        q.find().then((results) =>{
            resolve(results);
        }, (error) => {
            reject(error);
        });
    },

    retrieveOneByPatient: function (className,patientID){
        return new Promise((resolve, reject) => {
            var Class = Parse.Object.extend(className);
            var q = new Parse.Query(Class);
            q.limit(2000);
            q.get(patientID).then((result) =>{
                resolve(result);
            }, (error) => {
                reject(error);
            });
        });
    }

}