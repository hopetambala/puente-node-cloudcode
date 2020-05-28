const { Parse } = require('parse/node');

Parse.initialize('ZvGwjA7cemNfr9Qtn6LnwnrcgiM3Xl4N3msObrcg', 'dQW12E6wgKWrqdlNCYMCIzLzWomgjCZlLZrrXlki'); // PASTE HERE YOUR Back4App APPLICATION ID AND YOUR JavaScript KEY
Parse.serverURL = 'https://parseapi.back4app.com/';

const cloudFunctions = {
  hello: (request) => Parse.Cloud
    .run('hello')
    .then((res) => res.data)
    .catch((err) => 'error'),
  postObjectsToClass: (post_params) => Parse.Cloud
    .run('postObjectsToClass', post_params)
    .then((response) => response)
    .catch((err) => err),
  genericQuery: () => Parse.Cloud
    .run('genericQuery', post_params)
    .then((res) => res.data)
    .catch((err) => 'error'),
  roleQuery: () => Parse.Cloud
    .run('queryRoles')
    .then((res) => res.data)
    .catch((err) => 'error'),
};

module.exports = { cloudFunctions };
