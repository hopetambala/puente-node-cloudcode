const { Parse } = require('parse/node');
const { cloudFunctions } = require('../run-cloud');

// The referee rule: Stripe holds the money and is the only ledger. Parse mirrors
// payment state and never authors it. If Parse says paid and Stripe says unpaid,
// that is a money bug with no arbiter.

describe('the Invoice mirror', () => {
  it('refuses to READ without staff or the organization\'s admin role', async () => {
    // Invoice rows carry no public read, and the scoping is server-side: a
    // client-side filter would mean shipping every partner's invoices to every
    // partner's browser first.
    await expect(cloudFunctions.listInvoices({ shortCode: 'wof' }))
      .rejects.toThrow(/staff|admin role|master key/i);
  });

  it('refuses to mirror without the master key', async () => {
    // The mirror is written by a server-side sync from Stripe, never by a
    // browser. A client that could write `paid` IS the competing ledger.
    await expect(cloudFunctions.mirrorInvoice({
      stripeInvoiceId: 'in_x', organization: 'wof', status: 'paid', amountDue: 1,
    })).rejects.toThrow(/master key/i);
  });

  it('stores what Stripe said and reads it back', async () => {
    await cloudFunctions.mirrorInvoicePrivileged({
      stripeInvoiceId: 'in_1',
      organization: 'wof',
      status: 'open',
      amountDue: 15000,
      currency: 'usd',
      dueAt: '2026-09-30T00:00:00.000Z',
    });
    const rows = await cloudFunctions.listInvoicesPrivileged({ shortCode: 'wof' });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('open');
    expect(rows[0].amountDue).toBe(15000);
  });

  it('updates the existing row rather than adding a second one', async () => {
    // One invoice, one row. Two rows for the same stripeInvoiceId is two
    // opinions about whether it is paid.
    await cloudFunctions.mirrorInvoicePrivileged({
      stripeInvoiceId: 'in_1', organization: 'wof', status: 'paid', amountDue: 0,
    });
    const found = await new Parse.Query('Invoice')
      .equalTo('stripeInvoiceId', 'in_1').find({ useMasterKey: true });
    expect(found).toHaveLength(1);
    expect(found[0].get('status')).toBe('paid');
  });

  it('requires a stripeInvoiceId — a mirror with no source is not a mirror', async () => {
    await expect(cloudFunctions.mirrorInvoicePrivileged({
      organization: 'wof', status: 'open',
    })).rejects.toThrow(/stripeInvoiceId/i);
  });

  it('scopes a read to one organization, so a partner cannot read another\'s', async () => {
    await cloudFunctions.mirrorInvoicePrivileged({
      stripeInvoiceId: 'in_other', organization: 'cevicos', status: 'open', amountDue: 900,
    });
    const rows = await cloudFunctions.listInvoicesPrivileged({ shortCode: 'wof' });
    expect(rows.every((r) => r.organization === 'wof')).toBe(true);
  });

  it('never lets a caller set paid through the read path', async () => {
    // listInvoices is a read. If it ever grew a write, this fails.
    const before = await cloudFunctions.listInvoicesPrivileged({ shortCode: 'cevicos' });
    await cloudFunctions.listInvoicesPrivileged({ shortCode: 'cevicos', status: 'paid' });
    const after = await cloudFunctions.listInvoicesPrivileged({ shortCode: 'cevicos' });
    expect(after[0].status).toBe(before[0].status);
  });
});
