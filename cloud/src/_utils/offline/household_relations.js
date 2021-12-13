/** ***********************************************
 * Function to post offline forms and households that are related to households
 * new households and households with relation
 * @name postHouseholdRelations
 * @example
 * postHouseholdRelations(householdsRelation, idForms, supForms);
 *
 * @param {Array} householdsRelation Array of households created w relationship to
 *  previosuly created households
 * @param {Array} idForms Array of id forms created offline
 * @param {Array} supForms Array of all supplementary forms created offline
 *
 *********************************************** */
const HouseholdRelation = {
  postHouseholdRelations: function postHouseholdRelations(householdsRelation, idForms,
    supForms) {
    return new Promise((resolve, reject) => {
      if (householdsRelation !== null && householdsRelation !== undefined) {
        // post new households with relations to existing households
        householdsRelation.forEach((householdRelation, index, array) => {
          if (!householdRelation.parseParentClassID.includes('Household-')) {
            const householdRelationParams = householdRelation;
            const offlineHouseholdRelationID = householdRelationParams.localObject.objectId;
            delete householdRelationParams.localObject.objectId;
            Parse.Cloud.run('postObjectsToClassWithRelation', householdRelationParams).then((relationResult) => {
              const parseHouseholdRelationID = relationResult.id;
              // post id/sup forms with newly created households with relation
              // tied to existing households
              if (idForms !== null && idForms !== undefined) {
                idForms.forEach((postParams) => {
                  if (postParams.localObject.householdId === offlineHouseholdRelationID) {
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
          if (index === array.length - 1) resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  },
};

module.exports = HouseholdRelation;
