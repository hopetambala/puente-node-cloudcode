const Patient = require("./patient.model.js");
const Vitals = require("./vitals.model");
const MedicalAssessment = require("./medical_assessment.model");

const classes = {}

classes.patient = new Patient();
classes.Vitals = new Vitals();
classes.MedicalAssessment = new MedicalAssessment();

module.exports = classes;
