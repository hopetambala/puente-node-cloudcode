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

  if (Array.isArray(localObject.location)) {
    const { location } = localObject;
    const point = new Parse.GeoPoint(parseFloat(location[0]), parseFloat(location[1]));
    localObject.location = point;
  }

  Object.keys(localObject).forEach((key) => surveyPoint.set(key, localObject[key]));

  if (typeof parseUser !== 'undefined' && parseUser) {
    const userObject = new Parse.Object('_User');
    userObject.id = String(survey.parseUser);
    surveyPoint.set('parseUser', userObject);
  }

  return surveyPoint.save().then((result) => result).catch((error) => {
    console.error('Error: postObject',error); //eslint-disable-line
  });
};

const postObjectWithRelationships = async (survey) => {
  const supplementaryForm = new Parse.Object(survey.parseClass);
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

  if (typeof survey.parseUser !== 'undefined' && survey.parseUser) {
    const userObject = new Parse.Object('_User');
    userObject.id = String(survey.parseUser);
    supplementaryForm.set('parseUser', userObject);
  }

  const results = await supplementaryForm.save().catch((error) => {
    console.error('Error: postObjectWithRelationships',error); //eslint-disable-line
  });

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
