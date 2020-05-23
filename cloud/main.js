/* global Parse */
/* eslint no-undef: "error" */

const classes = require('./src/classes');
const services = require('./src/services');

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

Parse.Cloud.define('createAdminRole', (request, response) => {
  const service = services.roles;
  return service.createAdminRole();
});

Parse.Cloud.define('createAdministrator', (request, response) => new Promise((resolve, reject) => {
  const Role = Parse.Object.extend('_Role');
  const existingAdminRole = new Parse.Query(Role)
    .equalTo('name', 'administrator');
  existingAdminRole.first().then((results) => {
    // If the admin role already exists we have nothing to do here
    if (results) {
      console.log('Admin Exists');
      response.success(resolve(results));
      // If the admin role does not exist create it and set the ACLs
    } else {
      console.log('Admin DNE');
      const acl = new Parse.ACL();
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(false);
      acl.setRoleWriteAccess('moderator', true);
      acl.setRoleWriteAccess('contributor', true);
      acl.setRoleReadAccess('moderator', true);
      acl.setRoleReadAccess('contributor', true);
      const adminRole = new Role();
      adminRole.set('name', 'administrator');
      adminRole.setACL(acl);
      adminRole.save({}, { useMasterKey: true }).then((results) => {
        response.success(resolve(results));
      }, (error) => {
        response.error(reject(error));
      });
    }
  }, (error) => {
    response.error(reject(error));
  });
}));

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
  // userQuery.equalTo("username", request.params.userID);

  userQuery.get(request.params.userID).then((user) => {
    user.set('role', String(request.params.roleName));
    user.set('adminVerified', true);
    return user;
  }).then((user) => user.save()).then((result) => {
    Parse.Cloud.useMasterKey();
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', String(request.params.roleName));
    roleQuery.first().then((role) => {
      role.getUsers().add(result);
      role.save();
      response.success(resolve(result));
    }, (error) => {
      response.error(reject(error));
    });
  }, (error) => {
    response.error(reject(error));
  });
}));

// Parse.Cloud.define('queryRole', (request, response) => new Promise((resolve, reject) => {
//   var roleQuery = new Parse.Query(Parse.Role);

// }))

Parse.Cloud.define('createModerator', (request, response) => new Promise((resolve, reject) => {
  const Role = Parse.Object.extend('_Role');
  const existingModeratorrole = new Parse.Query(Role)
    .equalTo('name', 'moderator');
  existingModeratorrole.first().then((results) => {
    // If the admin role already exists we have nothing to do here
    if (results) {
      console.log('Moderator Exists');
      response.success(resolve(results));
      // If the admin role does not exist create it and set the ACLs
    } else {
      console.log('Moderator DNE');
      const acl = new Parse.ACL();
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(false);
      acl.setRoleWriteAccess('administrator', false);
      acl.setRoleWriteAccess('contributor', true);
      acl.setRoleReadAccess('administrator', false);
      acl.setRoleReadAccess('contributor', true);
      const adminRole = new Role();
      adminRole.set('name', 'moderator');
      adminRole.setACL(acl);
      adminRole.save({}, { useMasterKey: true }).then((results) => {
        response.success(resolve(results));
      }, (error) => {
        response.error(reject(error));
      });
    }
  }, (error) => {
    response.error(reject(error));
  });
}));

Parse.Cloud.define('createContributor', (request, response) => new Promise((resolve, reject) => {
  const Role = Parse.Object.extend('_Role');
  const existingContributorRole = new Parse.Query(Role)
    .equalTo('name', 'contributor');
  existingContributorRole.first().then((results) => {
    // If the admin role already exists we have nothing to do here
    if (results) {
      console.log('Contributor Exists');
      response.success(resolve(results));
      // If the admin role does not exist create it and set the ACLs
    } else {
      console.log('Moderator DNE');
      const acl = new Parse.ACL();
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(false);
      acl.setRoleWriteAccess('administrator', false);
      acl.setRoleWriteAccess('moderator', false);
      acl.setRoleReadAccess('administrator', false);
      acl.setRoleReadAccess('moderator', false);
      const adminRole = new Role();
      adminRole.set('name', 'contributor');
      adminRole.setACL(acl);
      adminRole.save({}, { useMasterKey: true }).then((results) => {
        response.success(resolve(results));
      }, (error) => {
        response.error(reject(error));
      });
    }
  }, (error) => {
    response.error(reject(error));
  });
}));


// Parse.Cloud.define('addAdmin', (request, response) => new Promise((resolve, reject) => {
//   user = request.params.user;

//   var queryRole = new Parse.Query('_Role');
//   queryRole.equalTo("name", "admin");
//   queryRole.first().then(function (role) {
//     // response.success(resolve(role));

//     role.getUsers().add(user);
//     role.save({}, { useMasterKey: true });
//     response.success(resolve("Admin added"))
//   }, (error) => {
//     response.error(reject(error))
//   })
// }));



