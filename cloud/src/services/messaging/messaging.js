const axios = require('axios').default;

const Messaging = {
  /**
   * Performs a query based on the parameter defined in a column
   *
   * @example
   * sendMessage('Puente Time', Puente Time',['hope@puente-dr.org'])
   *
   * @param {string} emailSubject Name of Backend Model
   * @param {string} emailBody Name of Column in Backend Model
   * @param {string[]} emailsToSendTo Name of Parameter in Column
   * @returns Results of Query
   */
  sendMessage: async function sendMessage(path) {
    const { PUENTE_SMS_EMAIL_API_URL } = process.env;
    const payload = {
      emailSubject: 'Puente Time',
      emailBody: 'Puente Time',
      emailsToSendTo: [
        'hope@puente-dr.org',
      ],
    };

    try {
      const response = await axios.post(`${PUENTE_SMS_EMAIL_API_URL}/${path}`, payload);
      return response;
    } catch (e) {
      return e;
    }
  },
};

module.exports = Messaging;
