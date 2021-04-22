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
    function checkIfAlreadyExist(accumulator, currentVal) {
      return accumulator.some((item) => (item.get('fname') === currentVal.get('fname')
          && item.get('lname') === currentVal.get('lname')
          && item.get('sex') === currentVal.get('sex')
          && item.get('marriageStatus') === currentVal.get('marriageStatus')
          && item.get('educationLevel') === currentVal.get('educationLevel')
      ));
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const Model = Parse.Object.extend(modelObject);

        const query = new Parse.Query(Model);

        query.skip(offset);

        console.log('old limit is', limit); //eslint-disable-line

        query.limit(3000);

        query.equalTo(parseColumn, parseParam);
        query.descending('createdAt');

        query.find().then((records) => {
          const deDuplicatedRecords = records.reduce((accumulator, current) => {
            if (checkIfAlreadyExist(accumulator, current)) {
              return accumulator;
            }
            return [...accumulator, current];
          }, []);
          resolve(deDuplicatedRecords);
        }, (error) => {
          reject(error);
        });
      }, 500);
    });
  },
  /**
   * Performs a query based on the parameter defined in a column
   *
   * @example
   * searchPersonQuery(SurveyData,Javier,2000,surveyingOrganization,Puente)
   *
   * @param {string} modelObject Name of Backend Model
   * @param {string} qry qry to search
   * @param {number} limit Max limit of results
   * @param {string} parseColumn Name of Column in Backend Model
   * @param {string} parseParam Name of Value in Column
   * @returns Results of Query
  */
  searchPersonQuery: function searchPersonQuery(modelObject, qry, limit, parseColumn, parseParam) {
    
    function checkIfAlreadyExist(accumulator, currentVal) {
      return accumulator.some((item) => (item.get('fname') === currentVal.get('fname')
          && item.get('lname') === currentVal.get('lname')
          && item.get('sex') === currentVal.get('sex')
          && item.get('marriageStatus') === currentVal.get('marriageStatus')
          && item.get('educationLevel') === currentVal.get('educationLevel')
      ));
    }

    const fname = new Parse.Query(modelObject);
    fname.limit(limit);
    fname.startsWith('fname', qry);

    const lname = new Parse.Query(modelObject);
    lname.limit(limit);
    lname.startsWith('lname', qry);

    return new Promise((resolve, reject) => {
      const query = Parse.Query.or(fname, lname);  
      
      query.descending('createdAt');
  
      query.equalTo(parseColumn, parseParam);
  
      query.find().then((records) => {
        const deDuplicatedRecords = records.reduce((accumulator, current) => {
          if (checkIfAlreadyExist(accumulator, current)) {
            return accumulator;
          }
          return [...accumulator, current];
        }, []);
        resolve(deDuplicatedRecords);
      }, (error) => {
        reject(error);
      });
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
  countService: function countService(modelObject, parseColumn, parseParam) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const Model = Parse.Object.extend(modelObject);
        const pipeline = [
          {
            group: {
              objectId: ['$fname', '$lname', '$dob', '$sex',
                '$telephoneNumber', '$marriageStatus', '$educationLevel',
                '$city', '$communityname'],
            },
          },
        ];
        const query = new Parse.Query(Model);
        query.equalTo(parseColumn, parseParam);
        query.aggregate(pipeline).then((results) => {
          resolve(results.length);
        }, (error) => {
          reject(error);
        });
      }, 1500);
    });
  },
};
// export default batch;

module.exports = Batch;
