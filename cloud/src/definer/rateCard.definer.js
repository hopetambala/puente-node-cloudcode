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

/**
 * Who an organization's invoice goes to, and what plan it is on.
 *
 * Both are relationship facts that move - a finance contact leaves, a partner
 * moves onto or off a tier - so they are staff-editable data rather than a
 * deploy. 56 of 58 organizations have no plan today, which is exactly why this
 * has to be reachable from the UI and not from a console.
 *
 * A PARTIAL update leaves untouched fields untouched. Blanking a plan because
 * the caller only sent an email would silently un-bill a paying partner, and
 * nothing downstream would flag it - the invoice simply would not be created.
 */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const findOrganization = async (shortCode) => {
  const query = new Parse.Query('Organization');
  query.equalTo('shortCode', String(shortCode));
  return query.first({ useMasterKey: true });
};

Parse.Cloud.define('setOrganizationBilling', async (request) => {
  if (!await services.roles.mayAdministerOrganizations(request)) {
    throw new Error('setOrganizationBilling requires the master key or the puente_staff role');
  }

  const { shortCode, plan, billingEmail } = request.params;
  if (!shortCode) throw new Error('setOrganizationBilling: shortCode is required');

  const org = await findOrganization(shortCode);
  // Refuse rather than create. A typo in the shortCode would otherwise mint a
  // nameless organization that the picker then offers to new accounts.
  if (!org) throw new Error(`setOrganizationBilling: no organization with shortCode "${shortCode}"`);

  if (plan !== undefined) org.set('plan', plan === '' ? undefined : String(plan));

  if (billingEmail !== undefined) {
    // An empty string is a deliberate CLEAR - removing a stale contact has to
    // be possible, and is different from not mentioning the field at all.
    if (billingEmail === '') {
      org.unset('billingEmail');
    } else if (!EMAIL.test(String(billingEmail))) {
      // An invoice sent to a malformed address fails silently at the provider,
      // and the first anyone knows is a partner who never paid.
      throw new Error(`setOrganizationBilling: "${billingEmail}" is not an email address`);
    } else {
      org.set('billingEmail', String(billingEmail).trim());
    }
  }

  await org.save(null, { useMasterKey: true });
  return { shortCode, plan: org.get('plan') || null, billingEmail: org.get('billingEmail') || null };
});

/** Read-only companion, same gate. */
Parse.Cloud.define('getOrganizationBilling', async (request) => {
  if (!await services.roles.mayAdministerOrganizations(request)) {
    throw new Error('getOrganizationBilling requires the master key or the puente_staff role');
  }
  const org = await findOrganization(request.params.shortCode);
  if (!org) throw new Error(`getOrganizationBilling: no organization with shortCode "${request.params.shortCode}"`);
  return {
    shortCode: org.get('shortCode'),
    name: org.get('name'),
    plan: org.get('plan') || null,
    billingEmail: org.get('billingEmail') || null,
  };
});
