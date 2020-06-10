const Roles = {
  createAdminRole: function createAdminRole() {
    return new Promise((resolve, reject) => {
      const Role = Parse.Object.extend('_Role');
      const existingAdminRole = new Parse.Query(Role);

      existingAdminRole
        .equalTo('name', 'admin')
        .first()

      existingAdminRole.first()
        .then((results) => {
          // If the admin role already exists we have nothing to do here
          if (results) {
            console.log('Admin Exists');
            resolve(results);
          }
          else {
            console.log('Admin Does Not Exist');
            const acl = new Parse.ACL();
            acl.setPublicReadAccess(true);
            acl.setPublicWriteAccess(true);
            acl.setRoleWriteAccess('manager', true);
            acl.setRoleWriteAccess('contributor', true);
            acl.setRoleReadAccess('manager', true);
            acl.setRoleReadAccess('contributor', true);
            const adminRole = new Role();
            adminRole.set('name', 'admin');
            adminRole.setACL(acl);
            adminRole.save({}, { useMasterKey: true }).then((results) => {
              console.log(results);
              resolve(results);
            }, (error) => {
              console.log(error);
              reject(error);
            });
          }
        },
          (error) => {
            reject(error);
          }
        );
    });
  },
  createManagerRole: function createManagerRole() {
    return new Promise((resolve, reject) => {
      const Role = Parse.Object.extend('_Role');
      const existingManagerRole = new Parse.Query(Role)
        .equalTo('name', 'manager');
      existingManagerRole.first().then((results) => {
        // If the admin role already exists we have nothing to do here
        if (results) {
          console.log('Manager Role Exists');
          resolve(results);
          // If the admin role does not exist create it and set the ACLs
        } else {
          console.log('Moderator Role Does Not Exist.');
          const acl = new Parse.ACL();
          acl.setPublicReadAccess(true);
          acl.setPublicWriteAccess(false);
          acl.setRoleWriteAccess('admin', false);
          acl.setRoleWriteAccess('contributor', true);
          acl.setRoleReadAccess('admin', false);
          acl.setRoleReadAccess('contributor', true);
          const managerRole = new Role();
          managerRole.set('name', 'manager');
          managerRole.setACL(acl);
          managerRole.save({}, { useMasterKey: true }).then((results) => {
            resolve(results);
          }, (error) => {
            reject(error);
          });
        }
      }, (error) => {
        reject(error);
      });
    });
  },
  createContributorRole: function createContributorRole() {
    return new Promise((resolve, reject) => {
      const Role = Parse.Object.extend('_Role');
      const existingContributorRole = new Parse.Query(Role)
        .equalTo('name', 'contributor');
      existingContributorRole.first().then((results) => {
        if (results) {
          console.log('Contributor Role Exists');
          resolve(results);
        } else {
          console.log('Contributor Role Does Not Exist.');
          const acl = new Parse.ACL();
          acl.setPublicReadAccess(true);
          acl.setPublicWriteAccess(false);
          acl.setRoleWriteAccess('admin', false);
          acl.setRoleWriteAccess('manager', false);
          acl.setRoleReadAccess('admin', false);
          acl.setRoleReadAccess('manager', false);
          const contributorRole = new Role();
          contributorRole.set('name', 'contributor');
          contributorRole.setACL(acl);
          contributorRole.save({}, { useMasterKey: true }).then((results) => {
            resolve(results);
          }, (error) => {
            reject(error);
          });
        }
      }, (error) => {
        reject(error);
      });
    });
  }
};

module.exports = Roles;
