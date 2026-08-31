const services = require('../services');

/**
 * The `Invoice` mirror.
 *
 * **Stripe holds the money and is the only ledger.** These rows are a cached
 * copy of what Stripe said, kept so Manage can render who-owes-what without a
 * round trip per invoice — never a second opinion about whether cash arrived.
 * If Parse says paid and Stripe says unpaid, that is a money bug with no
 * arbiter, and the only defence is that nothing here is authored locally.
 *
 * So the write is master-key only. It is called by a server-side sync from
 * Stripe, never by a browser. A client that could set `status` IS the competing
 * ledger this design exists to prevent.
 *
 * One row per `stripeInvoiceId`, updated in place. Two rows for one invoice is
 * two answers to "is this paid", and whichever a query returned first would be
 * the one an operator acted on.
 */

const MIRRORED_FIELDS = [
  'organization', 'status', 'amountDue', 'currency', 'dueAt', 'issuedAt',
  'hostedInvoiceUrl', 'number',
];

Parse.Cloud.define('mirrorInvoice', async (request) => {
  if (!request.master) {
    throw new Error(
      'mirrorInvoice requires the master key. Payment state is mirrored from '
      + 'Stripe by a server-side sync, never authored by a client.',
    );
  }

  const { stripeInvoiceId } = request.params;
  // A mirror with no source is not a mirror - it is a locally invented invoice,
  // which is precisely what must never exist here.
  if (!stripeInvoiceId) throw new Error('mirrorInvoice: stripeInvoiceId is required');

  const query = new Parse.Query('Invoice');
  query.equalTo('stripeInvoiceId', String(stripeInvoiceId));
  const row = await query.first({ useMasterKey: true }) || new Parse.Object('Invoice');

  row.set('stripeInvoiceId', String(stripeInvoiceId));
  MIRRORED_FIELDS.forEach((field) => {
    if (request.params[field] !== undefined) row.set(field, request.params[field]);
  });
  // When the mirror last agreed with Stripe. A stale mirror is a wrong answer
  // about money, so the age has to be readable.
  row.set('mirroredAt', new Date());

  // No public read: one partner must not be able to read another's invoices out
  // of the browser. Reads go through listInvoices, which scopes by organization.
  const acl = new Parse.ACL();
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  row.setACL(acl);

  await row.save(null, { useMasterKey: true });
  return { mirrored: stripeInvoiceId };
});

/**
 * Invoices for ONE organization.
 *
 * Read-only by construction — it takes a shortCode and returns rows. Extra
 * params are ignored rather than applied, so this can never become a write
 * path by accident.
 *
 * Scoped server-side rather than filtered in the browser: the Invoice rows
 * carry no public read, and a client-side filter would mean shipping every
 * partner's invoices to every partner's browser first.
 */
Parse.Cloud.define('listInvoices', async (request) => {
  const { shortCode } = request.params;
  if (!shortCode) throw new Error('listInvoices: shortCode is required');

  if (!await services.roles.mayAdministerOrganization(request, shortCode)) {
    throw new Error(
      'listInvoices requires the master key, the puente_staff role, or the '
      + "organization's admin role",
    );
  }

  const query = new Parse.Query('Invoice');
  query.equalTo('organization', shortCode);
  query.descending('dueAt');
  query.limit(1000);
  const rows = await query.find({ useMasterKey: true });

  return rows.map((row) => ({
    stripeInvoiceId: row.get('stripeInvoiceId'),
    organization: row.get('organization'),
    status: row.get('status'),
    amountDue: row.get('amountDue'),
    currency: row.get('currency'),
    dueAt: row.get('dueAt'),
    hostedInvoiceUrl: row.get('hostedInvoiceUrl'),
    number: row.get('number'),
    mirroredAt: row.get('mirroredAt'),
  }));
});
