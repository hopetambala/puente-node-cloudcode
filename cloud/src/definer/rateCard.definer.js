const services = require('../services');

/**
 * The rate card — one row, editable by Puente staff.
 *
 * Prices live in data rather than in code because a nonprofit's rates move with
 * grants and relationships, and a price change should not need a deploy. What
 * that buys in flexibility it owes back in discipline, so three rules are
 * enforced here rather than in the UI:
 *
 * - **Integer minor units only.** 150.5 cents is not a price. Floats near money
 *   are how rounding errors become invoices nobody can reconcile.
 * - **Staff only.** The rate card decides what every partner is charged.
 * - **One row, always.** Two rate cards is two opinions about price, and
 *   whichever one a query happened to return would become the invoice.
 *
 * Changing a price does NOT change an invoice already issued: the composer
 * snapshots amounts onto the line items when the draft is built, and Stripe
 * holds the issued document. This row is the *current* card, not a history of
 * what anyone was charged.
 */

/**
 * What the billing screen gets before anyone has configured anything.
 *
 * A missing card must not be an error every caller special-cases, and must not
 * be an empty object — that would silently price everything at zero.
 */
const DEFAULT_CARD = {
  currency: 'usd',
  netTermsDays: 30,
  plans: {},
  services: {},
};

const assertAmounts = (group, label) => {
  Object.entries(group || {}).forEach(([code, amount]) => {
    if (!Number.isInteger(amount)) {
      throw new Error(
        `updateRateCard: ${label} "${code}" must be an integer number of cents, got ${amount}`,
      );
    }
    if (amount < 0) {
      throw new Error(`updateRateCard: ${label} "${code}" cannot be negative`);
    }
  });
};

const currentCard = async () => {
  const query = new Parse.Query('RateCard');
  query.ascending('createdAt');
  return query.first({ useMasterKey: true });
};

Parse.Cloud.define('getRateCard', async () => {
  const card = await currentCard();
  if (!card) return DEFAULT_CARD;
  return {
    currency: card.get('currency') || DEFAULT_CARD.currency,
    netTermsDays: card.get('netTermsDays') || DEFAULT_CARD.netTermsDays,
    plans: card.get('plans') || {},
    services: card.get('services') || {},
    updatedAt: card.updatedAt,
    updatedBy: card.get('updatedBy') || null,
  };
});

Parse.Cloud.define('updateRateCard', async (request) => {
  if (!await services.roles.mayAdministerOrganizations(request)) {
    throw new Error('updateRateCard requires the master key or the puente_staff role');
  }

  const {
    currency, netTermsDays, plans, services: serviceRates,
  } = request.params;

  assertAmounts(plans, 'plan');
  assertAmounts(serviceRates, 'service');

  // Update in place rather than inserting. A second row is a second opinion
  // about price, and whichever one a query returned first would become the
  // invoice.
  const card = await currentCard() || new Parse.Object('RateCard');

  if (currency !== undefined) card.set('currency', String(currency));
  if (netTermsDays !== undefined) card.set('netTermsDays', Number(netTermsDays));
  if (plans !== undefined) card.set('plans', plans);
  if (serviceRates !== undefined) card.set('services', serviceRates);

  // "What did we charge them, and who set that?" must be answerable without
  // asking around.
  card.set('updatedBy', (request.user && request.user.id) || 'master-key');

  // No public read: a partner should not be able to read every other partner's
  // list price out of the browser.
  const acl = new Parse.ACL();
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  card.setACL(acl);

  await card.save(null, { useMasterKey: true });
  return { updated: true, updatedBy: card.get('updatedBy') };
});
