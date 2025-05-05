/**
 * @description Get records with resident data
 *
 */
const getRecordsWithResidentData = (surveyingOrganization) => new Promise((resolve, reject) => {
  (async () => {
    const evaluationMedicalRecordsQuery = new Parse.Query('EvaluationMedical')
      .equalTo('surveyingOrganization', surveyingOrganization)
      .descending('createdAt');
    const historyEnvironmentalHealthRecordsQuery = new Parse.Query(
      'HistoryEnvironmentalHealth',
    )
      .equalTo('surveyingOrganization', surveyingOrganization)
      .descending('createdAt');
    const historyMedicalRecordsQuery = new Parse.Query('HistoryMedical')
      .equalTo('surveyingOrganization', surveyingOrganization)
      .descending('createdAt');
    const vitalsRecordsQuery = new Parse.Query('Vitals')
      .equalTo('surveyingOrganization', surveyingOrganization)
      .descending('createdAt');
    const customFormsQuery = new Parse.Query('FormResults')
      .equalTo('surveyingOrganization', surveyingOrganization)
      .descending('createdAt');

    try {
      const results = await Promise.all([
        evaluationMedicalRecordsQuery.find(),
        historyEnvironmentalHealthRecordsQuery.find(),
        historyMedicalRecordsQuery.find(),
        vitalsRecordsQuery.find(),
        customFormsQuery.find(),
      ]);
      const allRecords = results.flat();
      resolve({
        allRecords,
        count: allRecords.length,
      });
    } catch (error) {
        console.error("Error fetching records:", error); // eslint-disable-line
      reject(error);
    }
  })();
});
// return allRecords.map((record) => {
//   const { resident, ...rest } = record.attributes;
//   return {
//     ...rest,
//     resident: {
//       id: resident.id,
//       name: resident.get('name'),
//       age: resident.get('age'),
//     }}})

const Get = {
  getRecordsWithResidentData,
};

module.exports = Get;
