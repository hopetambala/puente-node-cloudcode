'use strict';

class Vitals {
    constructor(){
        this.ParseClass = "Vitals";
        this.Vitals = Parse.Object.extend(this.ParseClass);
    }
}

module.exports = Vitals