/** ***********************************************
 * Function to post offline forms and households that are related to households
 * new households and households with relation
 * @name postHouseholds
 * @example
 * postHouseholds(households, householdsRelation, idForms, supForms);
 *
 * @param {Array} households Array of new households created offline
 * @param {Array} householdsRelation Array of households created w relationship to
 * other household created offline
 * @param {Array} idForms Array of id forms created offline
 * @param {Array} supForms Array of all supplementary forms created offline
 *
 *********************************************** */
const Household = {
  postHouseholds: function postHouseholds(households, householdsRelation, idForms, supForms) {
    return new Promise((resolve, reject) => {
      if (households !== null && households !== undefined) {
        households.forEach((household, index, array) => {
          const offlineHouseholdID = household.localObject.objectId;
          const householdParams = household;
          delete householdParams.localObject.objectId;
          Parse.Cloud.run('postObjectsToClass', householdParams).then((result) => {
            const parseHouseholdID = result.id;

            if (householdsRelation !== null && householdsRelation !== undefined) {
              // post new households with relations to newly created households
              householdsRelation.forEach((householdRelation) => {
                if (householdRelation.parseParentClassID === offlineHouseholdID) {
                  const householdRelationParams = householdRelation;
                  householdRelationParams.parseParentClassID = parseHouseholdID;
                  const offlineHouseholdRelationID = householdRelationParams.localObject.objectId;
                  delete householdRelationParams.localObject.objectId;
                  Parse.Cloud.run('postObjectsToClassWithRelation', householdRelationParams)
                    .then((relationResult) => {
                      const parseHouseholdRelationID = relationResult.id;
                      // post id/sup forms with newly created related households
                      if (idForms !== null && idForms !== undefined) {
                        idForms.forEach((postParams) => {
                          if ('householdId' in postParams.localObject && postParams.localObject.householdId === offlineHouseholdRelationID) {
                            const offlineObjectID = postParams.localObject.objectId;
                            const idParams = postParams;
                            idParams.localObject.householdId = parseHouseholdRelationID;
                            delete idParams.localObject.objectId;
                            Parse.Cloud.run('postObjectsToClass', idParams).then((surveyee) => {
                              const surveyeeSanitized = JSON.parse(JSON.stringify(surveyee));
                              const parseObjectID = surveyeeSanitized.objectId;
                              if (supForms !== null && supForms !== undefined) {
                                supForms.forEach((supForm) => {
                                  if (supForm.parseParentClassID === offlineObjectID) {
                                    const supParams = supForm;
                                    supParams.parseParentClassID = parseObjectID;
                                    Parse.Cloud.run('postObjectsToClassWithRelation', supParams).then(() => {
                                    }, (error) => {
                                      reject(error);
                                    });
                                  }
                                });
                              }
                            }, (error) => {
                              reject(error);
                            });
                          }
                        });
                      }
                    }, (error) => {
                      reject(error);
                    });
                }
              });
            }
            // post id/sup with newly created households
            if (idForms !== null && idForms !== undefined) {
              idForms.forEach((postParams) => {
                if ('householdId' in postParams.localObject && postParams.localObject.householdId === offlineHouseholdID) {
                  const offlineObjectID = postParams.localObject.objectId;
                  const idParams = postParams;
                  idParams.localObject.householdId = parseHouseholdID;
                  delete idParams.localObject.objectId;
                  Parse.Cloud.run('postObjectsToClass', idParams).then((surveyee) => {
                    const surveyeeSanitized = JSON.parse(JSON.stringify(surveyee));
                    const parseObjectID = surveyeeSanitized.objectId;
                    if (supForms !== null && supForms !== undefined) {
                      supForms.forEach((supForm) => {
                        if (supForm.parseParentClassID === offlineObjectID) {
                          const supParams = supForm;
                          supParams.parseParentClassID = parseObjectID;
                          Parse.Cloud.run('postObjectsToClassWithRelation', supParams).then(() => {
                          }, (error) => {
                            reject(error);
                          });
                        }
                      });
                    }
                  }, (error) => {
                    reject(error);
                  });
                }
              });
            }
          }, (error) => {
            reject(error);
          });
          if (index === array.length - 1) resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  },
};

module.exports = Household;
