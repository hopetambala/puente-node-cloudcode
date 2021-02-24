const Batch = {
  /**
     * Performs a query based on the parameter defined in a column
     *
     * @example
     * basicQuery(0,1000,SurveyData,organization,Puente)
     *
     * @param {number} offset First number
     * @param {number} limit Max limit of results
     * @param {string} parseObject Name of Backend Model
     * @param {string} parseColumn Name of Column in Backend Model
     * @param {string} parseParam Name of Parameter in Column
     * @returns Results of Query
     */
  basicQuery: function basicQuery(modelObject, offset, limit, parseColumn, parseParam) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const Model = Parse.Object.extend(modelObject);

        const query = new Parse.Query(Model);

        query.skip(offset);

        console.log("old limit is", limit)

        query.limit(2500);

        query.equalTo(parseColumn, parseParam);
        query.descending("createdAt");

        query.find().then((surveyPoints) => {
          resolve(surveyPoints);
        }, (error) => {
          reject(error);
        });
      }, 500);
    });
  },
  genericQuery: function genericQuery(modelObject) {
    return new Promise((resolve, reject) => {
      const Model = Parse.Object.extend(modelObject);

      const query = new Parse.Query(Model);

      query.find().then((results) => {
        resolve(results);
      }, (error) => {
        reject(error);
      });
    });
  },
  geoQuery: function geoQuery(modelObject, latitude, longitude, limit, parseColumn, parseParam) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const Model = Parse.Object.extend(modelObject);
        const query = new Parse.Query(Model);

        const myLocation = new Parse.GeoPoint({ latitude, longitude });
        const sorted = true;
        query.withinMiles('location', myLocation, 5, sorted);

        query.limit(limit);
        query.descending('createdAt');
        query.equalTo(parseColumn, parseParam);

        query.find().then((results) => {
          resolve(results);
        }, (error) => {
          reject(error);
        });
      }, 500);
    });
  },
};
// export default batch;

module.exports = Batch;
