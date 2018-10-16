'use strict';

class aggregate{
    constructor(Parse){
        this.Parse = Parse;
    }

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
    basicQuery(offset, limit, parseObject, parseColumn, parseParam) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
            const SurveyData = Parse.Object.extend(parseObject);

            let query = new Parse.Query(SurveyData);
            
            query.skip(offset);

            query.limit(limit);

            query.equalTo(parseColumn,parseParam);

            query.find().then((surveyPoints) => {
                resolve(surveyPoints);
            }, (error) => {
                reject(error);
            });
            }, 500);
        });
    }
}