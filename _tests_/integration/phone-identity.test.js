const { cloudFunctions } = require('../run-cloud');

// A phone number is not an identity. It is shared between colleagues, reassigned
// when someone leaves, and often belongs to the organization rather than the
// person. Making it the Parse username - which must be unique - means the second
// person to use a field phone cannot register at all, and the error says nothing
// about why.

describe('two people can share a phone number', () => {
  beforeAll(async () => {
    // Each file creates its own roles: signup assigns one, and relying on
    // another file having made them first breaks under parallel workers.
    await cloudFunctions.createAdminRole();
    await cloudFunctions.createManagerRole();
    await cloudFunctions.createContributorRole();
    await cloudFunctions.createOrganization({
      name: 'shared-phone-co', shortCode: 'shared-phone-co', aliases: [], active: true,
    });
  });

  it('uses the EMAIL as the username when one is given', async () => {
    const user = await cloudFunctions.signup({
      firstname: 'First',
      lastname: 'Person',
      password: 'pw',
      email: 'first@shared.org',
      phonenumber: '8095550000',
      organization: 'shared-phone-co',
      restParams: { runMessaging: false, path: 'email' },
    });
    expect(JSON.parse(JSON.stringify(user)).username).toBe('first@shared.org');
  });

  it('lets a SECOND person register with the same phone number', async () => {
    // The whole point. Today this fails with a bare "username taken", which
    // names a field the person never filled in.
    const user = await cloudFunctions.signup({
      firstname: 'Second',
      lastname: 'Person',
      password: 'pw',
      email: 'second@shared.org',
      phonenumber: '8095550000',
      organization: 'shared-phone-co',
      restParams: { runMessaging: false, path: 'email' },
    });
    expect(JSON.parse(JSON.stringify(user)).username).toBe('second@shared.org');
  });

  it('still uses the phone as the username when there is NO email', async () => {
    // Collect does not require an email - a promotora signing up on a field
    // phone may not have one, and phone-only signup must keep working.
    const user = await cloudFunctions.signup({
      firstname: 'NoEmail',
      lastname: 'Person',
      password: 'pw',
      email: '',
      phonenumber: '8095551111',
      organization: 'shared-phone-co',
      restParams: { runMessaging: false, path: 'email' },
    });
    expect(JSON.parse(JSON.stringify(user)).username).toBe('8095551111');
  });
});

describe('signin still finds you by phone', () => {
  // Changing the username without this would silently break login for everyone
  // who signs up with both - they would type the phone they registered with and
  // be told their password was wrong.
  it('signs in with the phone number even when the username is the email', async () => {
    const result = await cloudFunctions.signin({
      username: '8095550000', password: 'pw',
    });
    expect(result).toBeDefined();
  });

  it('still signs in with the email', async () => {
    const result = await cloudFunctions.signin({
      username: 'second@shared.org', password: 'pw',
    });
    expect(result).toBeDefined();
  });

  it('still rejects a wrong password rather than falling through', async () => {
    await expect(cloudFunctions.signin({
      username: '8095550000', password: 'wrong',
    })).rejects.toThrow();
  });
});
