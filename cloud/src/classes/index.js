const Patient = require('./patient.model.js');
const Vitals = require('./vitals.model');
const MedicalAssessment = require('./medical_assessment.model');
const Organization = require('./factory/organization.model');

const classes = {};

classes.patient = new Patient();
classes.Vitals = new Vitals();
classes.MedicalAssessment = new MedicalAssessment();
classes.Organization = new Organization();


module.exports = classes;
