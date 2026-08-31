const { cloudFunctions } = require('../run-cloud');

// Puente staff must be able to change who an invoice goes to and what plan an
// organization is on, without a deploy. Both are relationship facts that move.

describe('setOrganizationBilling', () => {
  beforeAll(async () => {
    await cloudFunctions.createOrganization({
      name: 'billing-target', shortCode: 'billing-target', aliases: [], active: true,
    });
  });

  it('refuses a caller who is not staff', async () => {
    await expect(cloudFunctions.setOrganizationBilling({
      shortCode: 'billing-target', plan: 'partner',
    })).rejects.toThrow(/staff|master key/i);
  });

  it('sets the plan and the billing email', async () => {
    await cloudFunctions.setOrganizationBillingPrivileged({
      shortCode: 'billing-target', plan: 'partner', billingEmail: 'pay@example.org',
    });
    const org = await cloudFunctions.getOrganizationBilling({ shortCode: 'billing-target' });
    expect(org.plan).toBe('partner');
    expect(org.billingEmail).toBe('pay@example.org');
  });

  it('refuses an address that is not an email', async () => {
    // An invoice sent to a malformed address fails silently at the provider.
    await expect(cloudFunctions.setOrganizationBillingPrivileged({
      shortCode: 'billing-target', billingEmail: 'not-an-email',
    })).rejects.toThrow(/email/i);
  });

  it('clears the billing email when explicitly emptied', async () => {
    // Distinct from "not supplied". Removing a stale contact must be possible.
    await cloudFunctions.setOrganizationBillingPrivileged({
      shortCode: 'billing-target', billingEmail: '',
    });
    const org = await cloudFunctions.getOrganizationBilling({ shortCode: 'billing-target' });
    expect(org.billingEmail).toBeFalsy();
  });

  it('leaves the plan alone when only the email is sent', async () => {
    // A partial update must not blank the field it did not mention - that would
    // silently un-bill a paying partner.
    await cloudFunctions.setOrganizationBillingPrivileged({
      shortCode: 'billing-target', billingEmail: 'again@example.org',
    });
    const org = await cloudFunctions.getOrganizationBilling({ shortCode: 'billing-target' });
    expect(org.plan).toBe('partner');
  });

  it('refuses an unknown organization rather than creating one', async () => {
    await expect(cloudFunctions.setOrganizationBillingPrivileged({
      shortCode: 'no-such-org', plan: 'partner',
    })).rejects.toThrow(/no organization/i);
  });
});
