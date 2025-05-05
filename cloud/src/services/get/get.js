const utils = require("../../_utils");

/**
 * @description Get records with resident data
 *
 */
const getRecordsWithResidentData = async (surveyingOrganization) => {
  /**
   * - Get all Custom Form Records
   * - Get all Puente Form Records (HistoryEnvironmental, HistoryMedical, Vitals, EvaluationMedical)
   * - Customize the query by organization
   * - Append the resident data to the custom form records
   * - Return the records
   */

  const evaluationMedicalRecordsQuery = new Parse.Query("EvaluationMedical")
    .equalTo("surveyingOrganization", surveyingOrganization)
    .descending("createdAt");
  const historyEnvironmentalHealthRecordsQuery = new Parse.Query("HistoryEnvironmentalHealth")
    .equalTo("surveyingOrganization", surveyingOrganization)
    .descending("createdAt");
  const historyMedicalRecordsQuery = new Parse.Query("HistoryMedical")
    .equalTo("surveyingOrganization", surveyingOrganization)
    .descending("createdAt");
  const vitalsRecordsQuery = new Parse.Query("Vitals")
    .equalTo("surveyingOrganization", surveyingOrganization)
    .descending("createdAt");
  const customFormsQuery = new Parse.Query("FormResults")
    .equalTo("surveyingOrganization", surveyingOrganization)
    .descending("createdAt");

  try {
    const results = await Promise.all([
      evaluationMedicalRecordsQuery.find(),
      historyEnvironmentalHealthRecordsQuery.find(),
      historyMedicalRecordsQuery.find(),
      vitalsRecordsQuery.find(),
      customFormsQuery.find(),
    ]);
    const allRecords = results.flat();
    console.log("allRecords", allRecords);
  } catch (error) {
    console.error("Error fetching records:", error);
  }
};

const Get = {
  getRecordsWithResidentData,
};

module.exports = Get;
