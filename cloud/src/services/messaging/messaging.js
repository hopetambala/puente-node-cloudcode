const axios = require('axios').default;

const { PUENTE_SMS_EMAIL_API_URL: url } = process.env;


/**
 * Too tightly coupled with just signup and password reset
 */

async function sendEmail(apiURL, restParamData, parseObject, objectId = 'abc', fullName = 'Full Name') {
  const { emailSubject, emailAddress, type } = restParamData;

  const payload = {
    emailSubject,
    objectId,
    userFullName: fullName,
    emailsToSendTo: [
      emailAddress,
    ],
    type, // signup, passwordReset,default
  };

  return axios.post(`${apiURL}/email`, payload);
}

async function sendText(apiURL, restParamData, parseObject) {
  const { textTo: phoneNumber, type } = restParamData;
  const { objectId, firstname } = parseObject;

  let textBody = '';

  if (type === 'signup') textBody = `Hello ${firstname}! Verify your Puente account at\nhttps://puente-manage.vercel.app/account/verify?objectId=${objectId}`;
  if (type === 'passwordReset') textBody = `Hello ${firstname}! Reset your Puente password at\nhttps://puente-manage.vercel.app/account/reset?objectId=${objectId}`;

  const payload = {
    textTo: phoneNumber,
    textBody,
  };

  return axios.post(`${apiURL}/text`, payload);
}


const Messaging = {
  /**
   * Performs a query based on the parameter defined in a column
   *
   * @example
   * sendMessage(
   *  'text',
   *  {
   *   "textTo": "1234567",
   *   "textBody": "Text"
   *  }
   * )
   *
   * @param {string} path which endpoint to hit
   * @param {string} restParamData Data consisting of which
   * @returns Results of Query
   */
  sendMessage: async function sendMessage(restParam, parseObject) {
    const {
      runMessaging,
      path,
      data,
    } = restParam;

    if (!runMessaging) return null;

    try {
      const response = path === 'email' ? await sendEmail(url, data, parseObject) : await sendText(url, data, parseObject);
      return response;
    } catch (e) {
      return e;
    }
  },
};

module.exports = Messaging;
