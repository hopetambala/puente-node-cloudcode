const Roles = {
    createAdminRole: function createAdminRole() {
        return new Promise((resolve, reject) => {
            console.log("Check 1");
            const Role = Parse.Object.extend('_Role')
            // Check if the admin role already exists
            const existingAdminRole = new Parse.Query(Role);
            existingAdminRole.equalTo('name', 'admin');
            existingAdminRole.count().then((results) => {
                // If the admin role already exists we have nothing to do here
                if (results > 0) {
                    console.log("Admin Exists");
                    response.success(resolve("Admin Role Already Exists."))
                    // If the admin role does not exist create it and set the ACLs
                } else {
                    console.log("Admin DNE");
                    const acl = new Parse.ACL()
                    acl.setPublicReadAccess(true)
                    acl.setPublicWriteAccess(false)
                    const adminRole = new Role()
                    adminRole.set('name', 'admin')
                    adminRole.setACL(acl)
                    adminRole.save({}, { useMasterKey: true }).then((results) => {
                        response.success(resolve(results));
                    }, (error) => {
                        response.error(reject(error));
                    })
                }
            }, (error) => {
                response.error(reject(error));
            });
        });
    },
}

module.exports = Roles;