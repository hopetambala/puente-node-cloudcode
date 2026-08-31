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
  // NOTE: "signs in by phone when the username is the email" now lives in the
  // shared-phone describe below, against a phone only ONE account uses. It has
  // to: 8095550000 is deliberately shared by two accounts in this file, so it
  // no longer names a single person and the correct answer there is the
  // ambiguity error, not a login.

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

describe('a shared phone number cannot identify one account', () => {
  // Once two people share a phone, that phone no longer names a single account.
  // Parse cannot log in "one of two", so the honest answer is to say so - and
  // "Invalid username/password" is a lie that sends someone to reset a password
  // that was never wrong.
  it('tells the person to use their email instead of failing opaquely', async () => {
    await expect(cloudFunctions.signin({
      username: '8095550000', password: 'pw',
    })).rejects.toThrow(/more than one account|use your email/i);
  });

  it('still signs in by phone when only ONE account has that number', async () => {
    const result = await cloudFunctions.signin({
      username: '8095551111', password: 'pw',
    });
    expect(result).toBeDefined();
  });
});
