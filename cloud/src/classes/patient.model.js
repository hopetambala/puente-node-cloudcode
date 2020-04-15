/* global Parse */
/* eslint no-undef: "error" */

class Patient {
  constructor() {
    this.ParseClass = 'SurveyData';
    this.Patient = Parse.Object.extend(this.ParseClass);
  }
}

module.exports = Patient;
