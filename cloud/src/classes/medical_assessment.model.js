class MedicalAssessment {
  constructor() {
    this.ParseClass = 'EvaluationMedical';
    this.MedicalAssessment = Parse.Object.extend(this.ParseClass);
  }
}

module.exports = MedicalAssessment;
