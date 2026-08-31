const { Parse } = require('parse/node');
const { cloudFunctions } = require('../run-cloud');

// Prices must be editable by Puente staff, not hardcoded - a nonprofit's rates
// change with grants and relationships, and a price change should not need a
// deploy. But money rules follow: amounts are integer minor units, only staff
// may write, and every change records who made it.

describe('the rate card', () => {
  it('reads a default card before anyone has configured one', async () => {
    // A missing card must not be an error the billing screen has to special
    // case, nor an empty object that prices everything at zero.
    const card = await cloudFunctions.getRateCard({});
    expect(card.currency).toBe('usd');
    expect(card.netTermsDays).toBe(30);
    expect(card.plans).toBeDefined();
  });

  it('refuses a write from a caller who is not staff', async () => {
    await expect(cloudFunctions.updateRateCard({
      plans: { partner: 1 },
    })).rejects.toThrow(/staff|master key/i);
  });

  it('stores amounts and reads them back', async () => {
    await cloudFunctions.updateRateCardPrivileged({
      currency: 'usd',
      netTermsDays: 30,
      plans: { partner: 15000 },
      services: {
        'custom-form-build': 200000,
        'data-cleanup': 150000,
        training: 100000,
        'custom-export-integration': 300000,
      },
    });
    const card = await cloudFunctions.getRateCard({});
    expect(card.plans.partner).toBe(15000);
    expect(card.services['custom-form-build']).toBe(200000);
  });

  it('refuses a non-integer amount', async () => {
    // 150.5 cents is not a price. Floats near money are how rounding errors
    // become invoices nobody can reconcile.
    await expect(cloudFunctions.updateRateCardPrivileged({
      plans: { partner: 15000.5 },
    })).rejects.toThrow(/integer/i);
  });

  it('refuses a negative amount', async () => {
    await expect(cloudFunctions.updateRateCardPrivileged({
      plans: { partner: -100 },
    })).rejects.toThrow(/negative/i);
  });

  it('records who changed it and when', async () => {
    // "What did we charge them in March, and who set that?" must be answerable
    // without asking around.
    await cloudFunctions.updateRateCardPrivileged({ plans: { partner: 16000 } });
    const card = await cloudFunctions.getRateCard({});
    expect(card.updatedAt).toBeDefined();
    expect(card).toHaveProperty('updatedBy');
  });

  it('keeps only ONE card, so there is never a second opinion about price', async () => {
    await cloudFunctions.updateRateCardPrivileged({ plans: { partner: 17000 } });
    await cloudFunctions.updateRateCardPrivileged({ plans: { partner: 18000 } });
    const found = await new Parse.Query('RateCard').find({ useMasterKey: true });
    expect(found).toHaveLength(1);
    expect(found[0].get('plans').partner).toBe(18000);
  });
});
