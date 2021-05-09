// Have not tested yet
const Set = {
  setUserAsAdmin: function setUserAsAdmin(request) {
    return new Promise((resolve, reject) => {
    // Parse.Cloud.define("setUserAdmin", function(request, response) {
      let user;
      const userQuery = new Parse.Query(Parse.User);
      return userQuery.get(request.params.userId).then((result) => {
        user = result;
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo('name', 'admin');
        // here's our defense against mischief: find the admin role
        // only if the requesting user is an admin
        roleQuery.equalTo('users', request.params.user);
        return roleQuery.first();
      }).then((role) => {
        if (!role) {
          return Parse.Promise.error('only admins can add admins');
        }
        Parse.Cloud.useMasterKey();
        const relation = role.relation('users');
        relation.add(user);
        return role.save();
      }).then((result) => {
        resolve(result);
      }, (error) => {
        reject(error);
      });
    });
  },
};

module.exports = Set;
