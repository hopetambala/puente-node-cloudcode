const services = require('../services');
const modules = require('../module');

/** ******************************************
SIGN UP
Receives user attributes and registers user
Should send notification to admin (To be in=mplemented)

Input Paramaters:
  firstname - user's first name
  lastname - user's last name
  username - selectd username for the user
  email - email address for the user
  orginzation - nonprofit user belogns to
  role - role of user within organization
******************************************* */
Parse.Cloud.define('signup', (request) => new Promise((resolve, reject) => {
  const {
    firstname,
    lastname,
    password,
    email,
    phonenumber,
    organization,
    restParams,
  } = request.params;


  const user = new Parse.User();
  user.set('firstname', String(firstname));
  user.set('lastname', String(lastname));
  user.set('password', String(password));
  if (String(email) !== '') {
    user.set('email', String(email));
  }
  user.set('phonenumber', String(phonenumber));

  if (phonenumber) {
    user.set('username', String(phonenumber));
  } else {
    user.set('username', String(email));
  }

  let userRole = '';

  /**
   * Resolves the typed organization to a canonical `Organization`, or null.
   *
   * Never throws and never blocks the signup. An organization we cannot
   * identify is an ops problem; a person who cannot create an account is a
   * field problem, and Collect's signup screen is still a free-text box.
   */
  const resolveOrganization = async () => {
    try {
      const organizations = await services.organization.findAll();
      const result = services.organization.resolve({ name: organization }, organizations);
      return {
        canonical: result.status === 'resolved' ? result.organization : null,
        organizations,
      };
    } catch (error) {
      // Includes the deliberate ambiguous-alias throw from resolve(). A human
      // must fix that; it must not stop someone registering.
      modules.Error.logError(
        // String(error), not error.message: a non-Error throw would otherwise
        // log "undefined" and lose the only clue about what failed.
        `signup could not resolve organization "${organization}": ${String(error)}`,
      );
      return { canonical: null, organizations: [] };
    }
  };

  /**
   * A URL-safe, unique shortCode for a self-created organization.
   *
   * shortCode is immutable and the CSV exporter keys on it, so a collision
   * would make one organization's export unreachable. Suffixes on collision
   * rather than failing the signup.
   */
  const deriveShortCode = (name, organizations) => {
    const base = services.organization.normalizeOrganizationName(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'org';
    const taken = new Set(organizations.map((o) => o.get('shortCode')));
    if (!taken.has(base)) return base;
    for (let n = 2; n < 1000; n += 1) {
      if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
    }
    return `${base}-${Date.now()}`;
  };

  resolveOrganization().then(async ({ canonical, organizations }) => {
    let organizationRecord = canonical;

    if (!organizationRecord) {
      // The typed organization is not one we recognise. Before creating it,
      // check it is not a near-duplicate of one that already exists — that
      // check is the entire reason self-service creation is safe, because a
      // typo would otherwise become a second tenant whose records are
      // invisible to the first. See
      // puente-react-nextjs-platform/docs/self-service-organizations.md.
      const similar = services.organization.findSimilarOrganization(organization, organizations);

      if (similar) {
        // Refused. The ACCOUNT is still created — an unidentified organization
        // is an ops problem, a person who cannot register is a field problem.
        // The string is logged so staff can add an alias or create the org.
        modules.Error.logError(
          `signup refused to create organization "${organization}": too close to `
          + `"${similar.matched}" (${similar.reason}). Needs a human.`,
        );
        user.set('organization', String(organization));
        user.set('role', 'contributor');
        user.set('adminVerified', false);
        userRole = 'contributor';
        return user;
      }

      // Clearly distinct: create it, and the signer-up becomes its admin.
      const created = new Parse.Object('Organization');
      created.set('name', String(organization).trim());
      created.set('shortCode', deriveShortCode(organization, organizations));
      created.set('aliases', []);
      created.set('active', true);
      // Self-created organizations are never billable until staff say so.
      // Nobody is invoiced because they signed up to try the product.
      created.set('plan', 'no-charge');
      const orgAcl = new Parse.ACL();
      // Public read so the registration picker can list it; no public write.
      orgAcl.setPublicReadAccess(true);
      created.setACL(orgAcl);
      organizationRecord = await created.save(null, { useMasterKey: true });

      user.set('organization', organizationRecord.get('name'));
      user.set('role', 'administrator');
      user.set('adminVerified', true);
      userRole = 'admin';
      return user;
    }

    // Store the CANONICAL name, not what was typed. Storing the typed string is
    // what split "Puente" from "Puento" across thousands of rows, and what makes
    // an account match no records and show an empty app with no error.
    user.set('organization', organizationRecord.get('name'));

    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('organization', organizationRecord.get('name'));
    // useMasterKey is load-bearing: without it this count is subject to the
    // _User CLP, and a restricted read returns 0 for an organization that
    // already has members — minting a SECOND administrator.
    const results = await userQuery.count({ useMasterKey: true });

    if (results === 0) {
      // First member of a known organization gets admin. This grant is only
      // safe because `canonical` proves a human already created the org.
      user.set('role', 'administrator');
      user.set('adminVerified', true);
      userRole = 'admin';
    } else {
      // others need approval from admin
      user.set('role', 'contributor');
      user.set('adminVerified', false);
      userRole = 'contributor';
    }
    return user;
  }).then(async (userUpdated) => {
    // sign up user
    userUpdated.signUp().then(async (result) => {
      console.log(`User created successfully with name ${result.get('username')} and email: ${result.get('email')}`); // eslint-disable-line
      const userObject = {
        objectId: result.id,
        firstname,
        email,
        phonenumber,
      };
      if (restParams) {
        await services.Messaging.TextEmailMessaging.sendMessage(restParams, userObject);
      }

      const acl = new Parse.ACL();
      acl.setPublicReadAccess(true);
      acl.setWriteAccess(result, true);
      acl.setRoleWriteAccess('admin', true);
      result.setACL(acl);
      result.save(null, { useMasterKey: true }).then((aclUser) => {
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo('name', userRole);

        roleQuery.first({ useMasterKey: true }).then((role) => {
          role.getUsers().add(aclUser);
          role.save(null, { useMasterKey: true });
          resolve(aclUser);
        }).catch((error) => {
          console.log(`Error: ${error.code} ${error.message}`); // eslint-disable-line
          reject(error);
        });
      });
    }).catch((error) => {
      console.log(`Error: ${error.code} ${error.message}`); // eslint-disable-line
      reject(error);
    });
  }).catch((error) => {
    modules.Error.logError(`Error: ${error.code} ${error.message}`);
    reject(error);
  });
}));


/** ******************************************
SIGN IN
Signs a user in with given username and password
Will also check the email to see if that is being used

Input Paramaters:
  username - selected username for the user
  password - user password
******************************************* */
Parse.Cloud.define('signin', (request, response) => new Promise((resolve, reject) => {
  Parse.User.logIn(String(request.params.username), String(request.params.password))
    .then((result) => {
      console.log(`User logged in successful with username: ${result.get('username')}`); // eslint-disable-line
      resolve(result);
    }, (error1) => {
      // If the user inputs their email instead of the username
      // attempt to get the username
      const userQuery = new Parse.Query(Parse.User);

      userQuery.equalTo('email', request.params.username);
      userQuery.first().then((success) => {
        const { username } = success.toJSON();
        Parse.User.logIn(username, String(request.params.password)).then((result) => {
          console.log(`User logged in successful with email: ${result.get('email')}`); // eslint-disable-line
          resolve(result);
        }, (error2) => {
          modules.Error.logError(`Error: ${error2.code} ${error2.message}`);
          response.error(reject(error2));
        });
      }, (error3) => {
        modules.Error.logError(`Error: ${error3.code} ${error3.message}`);
        response.error(reject(error3));
      });
      modules.Error.logError(`Error: ${error1.code} ${error1.message}`);
      response.error(reject(error1));
    });
}));

/** ******************************************
SIGN OUT
Attempts to log a user out and display success/reject message

Input Paramaters:
  none
******************************************* */
Parse.Cloud.define('signout', () => new Promise((resolve, reject) => {
  Parse.User.logOut().then((result) => {
    resolve(result);
  }, (error) => {
    reject(error);
  });
}));

/** ******************************************
FORGOT PASSWORD
Recevies a user email address and immediately send out a
reset email link to the user.

Input Paramaters:
  email - user's email associated with the account
******************************************* */
Parse.Cloud.define('forgotPassword', (request) => new Promise((resolve, reject) => {
  Parse.User.requestPasswordReset(String(request.params.email)).then(() => {
    console.log('Password reset request was sent successfully'); // eslint-disable-line
    resolve('Success');
  }, (error) => {
    console.log(`Error: ${error.code} ${error.message}`); // eslint-disable-line
    reject(error);
  });
}));

/** ******************************************
CURRENT USER
captures the cached current user object to avoid having to
log back in every time

Input Paramaters:
  none
******************************************* */
Parse.Cloud.define('currentUser', () => {
  const u = Parse.User.current();

  if (u) {
    const user = new Parse.User();
    user.id = u.id;
    user.name = u.get('username');
    user.email = u.get('email');
    user.organization = u.get('organization');
    user.role = u.get('role');
    return user;
  }
  return null;
});

Parse.Cloud.define('deleteUser', (request) => new Promise((resolve, reject) => {
  const { userId } = request.params;
  const user = new Parse.User();
  user.set('id', userId);
  const query = new Parse.Query(Parse.User);
  query.get(userId)
    .then((userObj) => userObj.destroy({ useMasterKey: true }), { useMasterKey: true })
    .then(() => {
      resolve(user);
    }, (error) => {
      reject(error);
    });
}));

/** ******************************************
ADD USER PUSH TOKEN
Adds the users expo push notification to the user object

Input Paramaters:
  userId - objectId for the user
  expoPushToken - expo's generated push token for the user (frontend)
******************************************* */
Parse.Cloud.define('addUserPushToken', (request) => new Promise((resolve, reject) => {
  const { userId, expoPushToken } = request.params;
  const user = new Parse.User();
  user.set('id', userId);
  const query = new Parse.Query(Parse.User);
  query.get(userId)
    .then((userObj) => {
      userObj.set('expoPushToken', expoPushToken);
      userObj.save(null, { useMasterKey: true }).then((updatedUser) => {
        resolve(updatedUser);
      }, (error1) => {
        // unable to update user object
        reject(error1);
      });
    }, (error2) => {
      // unable to find userId
      reject(error2);
    });
}));

/**
 *
 */
Parse.Cloud.define('updateUser', async (request) => {
  const { objectId, userObject } = request.params;
  const User = Parse.Object.extend(Parse.User);
  const query = new Parse.Query(User);
  const user = await query.get(objectId, { useMasterKey: true });
  if (!user) return 'No user found!';

  Object.keys(userObject).forEach((key) => {
    const obj = userObject[key];
    user.set(String(key), obj);
  });

  try {
    user.save(null, { useMasterKey: true });
    return JSON.parse(JSON.stringify(user));
  } catch (e) {
    return e.message;
  }
});

Parse.Cloud.define('queryUser', async (request) => {
  const { username } = request.params;
  const User = Parse.Object.extend(Parse.User);

  const phonenumber = new Parse.Query(User);
  const email = new Parse.Query(User);
  const userName = new Parse.Query(User);

  phonenumber.equalTo('phonenumber', username);
  email.equalTo('email', username);
  userName.equalTo('username', username);

  const query = Parse.Query.or(phonenumber, email, userName);
  const queriedUser = await query.first(null, { useMasterKey: true });

  try {
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(queriedUser.id, { useMasterKey: true });
    return JSON.parse(JSON.stringify(user));
  } catch (e) {
    return e.message;
  }
});

Parse.Cloud.define('sendMessage', async (request) => {
  const { user, restParamsData } = request.params;
  restParamsData.runMessaging = true;

  try {
    const resp = await services.Messaging.TextEmailMessaging.sendMessage(restParamsData, user);
    return JSON.parse(JSON.stringify(resp));
  } catch (e) {
    return e.message;
  }
});
