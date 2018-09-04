Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
}); 

Parse.Cloud.define("retrievePatientRecordsAll", function(request, response) {
  return new Promise((resolve,reject)=> {
    var PatientDemographics = Parse.Object.extend(this.ParseClass);
    var q = new Parse.Query(PatientDemographics);
    q.limit(2000);
    q.find().then((results) =>{
      response.success(resolve(results));
    }, (error) => {
      response.error(reject(error));
    });
  });
});

Parse.Cloud.define("retrievePatientRecordByOrgnization", function(request, response) {
  return new Promise((resolve,reject)=> {
    var PatientDemographics = Parse.Object.extend(this.ParseClass);
    var q = new Parse.Query(PatientDemographics);
    q.limit(2000);
    q.equalTo("surveyingOrganization", request.params.organization);
    q.find().then((results) =>{
      response.success(resolve(results));
    }, (error) => {
      response.error(reject(error));
    });
  });
});
