/* eslint no-param-reassign: ["error", { "props": false }] */

const Loop = {
  buildLoopFieldsParameter: function buildLoopFieldsParameter(obj, key,
    supplementaryForm, loopedJson, newFieldsArray) {
        obj.forEach((field, index) => { // eslint-disable-line
      if (field.title.indexOf('__loop') < 0) {
        newFieldsArray = newFieldsArray.concat(field); // eslint-disable-line
      } else {
        const originalKey = field.title.split('__loop');
        // check if loop already used
        if (originalKey[1] in Object.keys(loopedJson)) {
          loopedJson[originalKey[1]][originalKey[0]] = field.answer;
        } else {
          loopedJson[originalKey[1]] = {};
          loopedJson[originalKey[1]][originalKey[0]] = field.answer;
        }
      }
    });
    supplementaryForm.set(String(key), newFieldsArray);

    return [
      loopedJson,
      newFieldsArray,
    ];
  },

  postLoopedForm: function postLoopedForm(loopedJson, newFieldsArray, requestParams, mainObject) {
    return new Promise((resolve, reject) => {
            Object.entries(loopedJson).forEach(([key, value]) => { // eslint-disable-line
        // get looped data and adjust the fields Array for each loopp
        newFieldsArray.forEach((element) => {
          if (String(element.title) in (value)) {
                        element.answer = value[element.title]; // eslint-disable-line
          }
        });
        const newLocalObject = requestParams.localObject;
        newLocalObject.fields = newFieldsArray;
        const postParams = {
          parseParentClassID: requestParams.parseParentClassID,
          parseParentClass: requestParams.parseParentClass,
          parseUser: requestParams.parseUser,
          parseClass: requestParams.parseClass,
          photoFile: requestParams.photoFile,
          localObject: newLocalObject,
          loop: false,
          loopParentID: JSON.parse(JSON.stringify(mainObject)).objectId,
        };
        Parse.Cloud.run('postObjectsToClassWithRelation', postParams).then((result) => {
                    resolve(result); // eslint-disable-line
        }, (error) => {
          reject(error);
        });
      });
    });
  },
};

module.exports = Loop;
