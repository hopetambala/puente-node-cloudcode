const services = require('../services');

Parse.Cloud.define('uploadOfflineForms', (request) => new Promise((resolve, reject) => {
  const { params: offlineData } = request;
  try {
    const uploadedForms = services.offline.upload(offlineData);
    return resolve(uploadedForms);
  } catch (err) {
    return reject(new Error(`Cloud code error: ${err}`));
  }
}));
