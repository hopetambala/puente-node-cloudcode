const utils = require('../../_utils');

const postObject = async (survey) => {
  const surveyPoint = new Parse.Object(survey.parseClass);
  const {
    photoFile,
    signature,
    localObject,
    parseUser,
  } = survey;

  if (typeof photoFile !== 'undefined' && photoFile) {
    const parseFilePhoto = new Parse.File('memberProfPic.png', { base64: photoFile });
    await parseFilePhoto.save()
      .then(() => surveyPoint.set('picture', parseFilePhoto))
      .catch((err) => console.log(err)); //eslint-disable-line
  }

  if (typeof signature !== 'undefined' && signature) {
    const parseFileSignature = new Parse.File('signature.png', { base64: signature });
    await parseFileSignature.save()
      .then(() => surveyPoint.set('signature', parseFileSignature))
      .catch((err) => console.log(err)); //eslint-disable-line
  }

  Object.keys(localObject).forEach((key) => surveyPoint.set(key, localObject[key]));

  const { latitude, longitude } = localObject;
  if (latitude && longitude) {
    const point = new Parse.GeoPoint(latitude, longitude);
    surveyPoint.set('location', point);
  }

  if (parseUser) {
    const userObject = new Parse.Object('_User');
    userObject.id = String(survey.parseUser);
    surveyPoint.set('parseUser', userObject);
  }

  return surveyPoint.save().then((result) => result).catch((error) => error);
};

const postObjectWithRelationships = async (survey) => {
  const supplementaryForm = new Parse.Object(survey.parseClass);
  const userObject = new Parse.Object('_User');
  const loopParentForm = new Parse.Object(survey.parseClass);

  const { localObject, loop } = survey;
  let loopedJson = {};
  let newFieldsArray = [];

  Object.keys(localObject).forEach(async (key) => {
    const value = localObject[key];
    if (key !== 'photoFile') {
      if (loop && key === 'fields') {
        [loopedJson, newFieldsArray] = utils.Loop.buildLoopFieldsParameter(
          value, key, supplementaryForm, loopedJson, newFieldsArray,
        );
      }
      supplementaryForm.set(key, value);
    }
    if (key === 'photoFile') {
      const photoFileLocalObject = new Parse.File('picture', { base64: value });
      await photoFileLocalObject.save()
        .then(() => supplementaryForm.set(key, photoFileLocalObject))
        .catch((err) => console.log(err)); //eslint-disable-line
    }
  });

  // Old way of doing offline
  // residentIdForm.id = String(survey.parseParentClassID);
  // supplementaryForm.set('client', residentIdForm);

  if (survey.loopParentID) {
    loopParentForm.id = String(survey.loopParentID);
    supplementaryForm.set('loopClient', loopParentForm);
  }

  if (survey.parseUser) {
    userObject.id = String(survey.parseUser);
    supplementaryForm.set('parseUser', userObject);
  }

  const results = await supplementaryForm.save();
  const mainObject = results;
  if (loop && Object.keys(loopedJson).length > 0) {
    await utils.Loop.postLoopedForm(loopedJson, newFieldsArray, survey, mainObject);
  }
  return results;
};

const Post = {
  postObjectFactory: async function post(type, data) {
    if (type === 'post') return postObject(data);
    if (type === 'post-relationship') return postObjectWithRelationships(data);
    return {};
  },
};

module.exports = Post;
