//TODO

var PatientManager = require("../classes/patient");

function Aggregate(Parse){
    let patientManager = new PatientManager(Parse);

    this.patientsAll = () =>{
       return Parse.Cloud.define("retrievePatientRecordsAll", function(request, response) {
           response.success(patientManager.retrieveAllPatients());
        });
    }

    this.patientsByOrganization = () =>{
        return Parse.Cloud.define("retrievePatientRecordsByOrganization", function(request, response) {
            response.success(patientManager.retrievePatientsByOrganization(request));
         });
    }

}
