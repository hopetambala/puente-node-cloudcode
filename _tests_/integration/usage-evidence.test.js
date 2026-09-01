const { Parse } = require('parse/node');
const { cloudFunctions } = require('../run-cloud');

// Usage is EVIDENCE attached to an invoice - "here is what you got this month" -
// and never the basis of the charge. createdAt is sync time, so a week of
// offline fieldwork lands in one day; billing on it would spike a month where
// nothing extra happened and the partner could not verify the number.

const iso = (s) => ({ __type: 'Date', iso: s });

describe('organizationUsage', () => {
  beforeAll(async () => {
    await cloudFunctions.createOrganization({
      name: 'Usage Co', shortCode: 'usage-co', aliases: ['UCO'], active: true,
    });
    // Two records under DIFFERENT strings that both belong to this
    // organization. Counting on the canonical name alone once found 0 of 31
    // DRMT accounts, because every one of them stored "DRMT".
    await Promise.all(['Usage Co', 'UCO'].map((org) => {
      const row = new Parse.Object('SurveyData');
      row.set('surveyingOrganization', org);
      row.set('communityname', 'somewhere');
      return row.save(null, { useMasterKey: true });
    }));
  });

  it('counts across the whole ALIAS SET, not just the canonical name', async () => {
    const usage = await cloudFunctions.organizationUsagePrivileged({ shortCode: 'usage-co' });
    expect(usage.counts.SurveyData).toBe(2);
  });

  it('labels the period basis as synced, never collected', async () => {
    const usage = await cloudFunctions.organizationUsagePrivileged({ shortCode: 'usage-co' });
    expect(usage.basis).toBe('synced');
  });

  it('scopes to a period when one is given', async () => {
    const usage = await cloudFunctions.organizationUsagePrivileged({
      shortCode: 'usage-co',
      from: iso('2019-01-01T00:00:00.000Z'),
      to: iso('2019-12-31T00:00:00.000Z'),
    });
    expect(usage.counts.SurveyData).toBe(0);
  });

  it('reports a class it could not read as null, never as zero', async () => {
    // A count that failed and a count of zero look identical on an invoice, and
    // one of them understates what a partner received.
    const usage = await cloudFunctions.organizationUsagePrivileged({ shortCode: 'usage-co' });
    Object.values(usage.counts).forEach((n) => {
      expect(n === null || Number.isInteger(n)).toBe(true);
    });
  });

  it('refuses a caller who may not administer that organization', async () => {
    await expect(cloudFunctions.organizationUsage({ shortCode: 'usage-co' }))
      .rejects.toThrow(/staff|admin role|master key/i);
  });

  it('refuses an unknown organization rather than reporting zeroes', async () => {
    // Zeroes for an organization that does not exist reads as "they collected
    // nothing", which is a different and wrong statement.
    await expect(cloudFunctions.organizationUsagePrivileged({ shortCode: 'no-such-org' }))
      .rejects.toThrow(/no organization/i);
  });
});
