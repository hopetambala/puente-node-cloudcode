const Patient = require('./patient.model.js');
const Vitals = require('./vitals.model');
const MedicalAssessment = require('./medical_assessment.model');
const HistoryEnvironmentalHealth = require('./environmental_health');

const classes = {};

classes.patient = new Patient();
classes.Vitals = new Vitals();
classes.MedicalAssessment = new MedicalAssessment();
classes.HistoryEnvironmentalHealth = new HistoryEnvironmentalHealth();

module.exports = classes;
