/* global Parse */
/* eslint no-undef: "error" */

Parse.Cloud.define('hello', (request, response) => new Promise((resolve) => {
  response.success(resolve('Hello world!'));
}));

/** ********************************************
 * Create, Read, Update, and Delete Objects
 ******************************************** */
require('./src/definer/crud.definer');

/** ********************************************
 * Sign-in, Sign-out, Forget Password
 ******************************************** */

require('./src/definer/auth.definer');

/** ********************************************
 * Admin Verification
 ******************************************** */
require('./src/definer/verification.definer');

/** ********************************************
 * Roles Creator
 ******************************************** */
require('./src/definer/roles.definer');


Parse.Cloud.define('addAdmin', (request, response) => new Promise((resolve, reject) => {
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('username', request.params.userID);

  userQuery.find().then((user) => user).then((user) => {
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', request.params.roleName);

    roleQuery.first().then((role) => {
      const relation = role.relation('users');
      relation.add(user);
      role.save().then((results) => {
        response.success(resolve(results));
      }, (error) => {
        response.error(reject(error));
      });
    }, (error) => {
      response.error(reject(error));
    });
  }, (error) => {
    response.error(reject(error));
  });
}));

Parse.Cloud.define('addToRole', (request, response) => new Promise((resolve, reject) => {
  const userQuery = new Parse.Query(Parse.User);

  userQuery.get(request.params.userID).then((user) => {
    user.set('role', String(request.params.roleName));
    user.set('adminVerified', true);
    return user;
  }).then((user) => user.save(null, { useMasterKey: true })).then((result) => {
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', String(request.params.roleName));
    roleQuery.first({ useMasterKey: true }).then((role) => {
      role.getUsers().add(result);
      role.save(null, { useMasterKey: true });
      resolve(result);
    }, (error) => {
      reject(error);
    });
  }, (error) => {
    reject(error);
  });
}));

Parse.Cloud.define('roleTest', (request, response) => new Promise((resolve, reject) => {
  const rolesQuery = new Parse.Query(Parse.Role);
  rolesQuery.equalTo('name', str(request.params.role));
  return rolesQuery.first({ useMasterKey: true })
    .then((roleObject) => {
      const user = new Parse.User();
      user.id = request.params.userId;
      roleObject.getUsers().add(user);
      roleObject.save(null, { useMasterKey: true });
      response.success(resolve(result));
    });
}));
// xgUArKSqmn
// Parse.Cloud.define('createContributor', (request, response) => new Promise((resolve, reject) => {
//   const Role = Parse.Object.extend('_Role');
//   const existingContributorRole = new Parse.Query(Role)
//     .equalTo('name', 'contributor');
//   existingContributorRole.first().then((results) => {
//     // If the admin role already exists we have nothing to do here
//     if (results) {
//       console.log('Contributor Exists');
//       response.success(resolve(results));
//       // If the admin role does not exist create it and set the ACLs
//     } else {
//       console.log('Moderator DNE');
//       const acl = new Parse.ACL();
//       acl.setPublicReadAccess(true);
//       acl.setPublicWriteAccess(false);
//       acl.setRoleWriteAccess('administrator', false);
//       acl.setRoleWriteAccess('moderator', false);
//       acl.setRoleReadAccess('administrator', false);
//       acl.setRoleReadAccess('moderator', false);
//       const adminRole = new Role();
//       adminRole.set('name', 'contributor');
//       adminRole.setACL(acl);
//       adminRole.save({}, { useMasterKey: true }).then((results) => {
//         response.success(resolve(results));
//       }, (error) => {
//         response.error(reject(error));
//       });
//     }
//   }, (error) => {
//     response.error(reject(error));
//   });
// }));
