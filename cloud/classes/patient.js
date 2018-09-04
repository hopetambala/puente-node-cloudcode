//TODO
class Patient{
    constructor(Parse){
        this.Parse = Parse;
        this.ParseClass = "SurveyData";
    }

    retrieveAllPatients(){
        return new Promise((resolve,reject)=> {
            var PatientDemographics = Parse.Object.extend(this.ParseClass);
            var q = new Parse.Query(PatientDemographics);
            q.limit(2000);
            q.find().then((results) =>{
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