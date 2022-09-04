Parse.Cloud.define('organizationUnverified', (request) => new Promise((resolve, reject) => {
  // const User = Parse.Object.extend(Parse.User);
  const userQuery = new Parse.Query(Parse.User);
  // find if there is a current user associated with organization
  userQuery.equalTo('organization', String(request.params.organization));
  userQuery.equalTo('adminVerified', false);
  userQuery.find().then((results) => {
    resolve(results);
  }, (error) => {
    reject(error);
  });
}));

Parse.Cloud.define('organizationVerified', (request) => new Promise((resolve, reject) => {
  // const User = Parse.Object.extend(Parse.User);
  const userQuery = new Parse.Query(Parse.User);
  // find if there is a current user associated with organization
  userQuery.equalTo('organization', String(request.params.organization));
  userQuery.equalTo('adminVerified', true);
  userQuery.find().then((results) => {
    resolve(results);
  }, (error) => {
    reject(error);
  });
}));

Parse.Cloud.define('queryRoles', () => new Promise((resolve, reject) => {
  const Role = Parse.Object.extend('_Role');
  const queryRole = new Parse.Query(Role);

  queryRole.find().then((result) => {
    resolve(result);
  }, (error) => {
    reject(error);
  });
}));

Parse.Cloud.define('retrieveUserByObjectId', (request) => new Promise((resolve, reject) => {
  setTimeout(() => {
    const query = new Parse.Query(Parse.User);
    query.get(request.params.objectId, { useMasterKey: true }).then((record) => {
      resolve(record);
    }, (error) => {
      reject(error);
    });
  }, 1500);
}));
