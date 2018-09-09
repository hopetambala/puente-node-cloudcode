function retrieveAll(className){
    //Creates local object based on "SurveyData" Object in Parse-Server
    const Class = Parse.Object.extend(className);
    
    //Queries the SurveyData class from Parse Server
    let query = new Parse.Query(Class);
    
    query.limit(2000);
    //Below searches what's in the surveyPoints array
    query.find().then((results) => {
        resolve(results);
    }, (error) => {
        reject(error);
    });
}

function retrieveByOrganization(className, organization){
    //return new Promise((resolve,reject)=> {
    var PatientDemographics = Parse.Object.extend(className);
    var q = new Parse.Query(PatientDemographics);
    q.limit(2000);
    q.equalTo("surveyingOrganization", organization);
    q.find().then((results) =>{
        resolve(results);
    }, (error) => {
        reject(error);
    });
    //});
}

function retrieveByPatient(className,patientID){

}

module.exports = {
    retrieveAll: retrieveAll(),
    retrieveByOrganization: retrieveByOrganization(),
    retrieveByPatient: retrieveByPatient()

}