const services = require('../services');

/**
 * What an organization received in a period.
 *
 * **Evidence, never the charge.** Billing §4 is explicit: the tier is flat and
 * this justifies it at renewal — "here is what you got this month" — because a
 * metered invoice cannot be verified by the partner. `createdAt` is SYNC time,
 * so a week of offline fieldwork lands in a single day; charging on it would
 * spike a month in which no extra work happened.
 *
 * That is why every number here is labelled `basis: 'synced'`. A partner reading
 * "collected" on an invoice is being told something about fieldwork the data
 * cannot support.
 *
 * Counted server-side in one call rather than six from the browser, and counted
 * across the organization's **whole alias set**. Matching on the canonical name
 * alone once found 0 of 31 DR Missions accounts, because every one of them
 * stores "DRMT".
 */

/** Classes that carry `surveyingOrganization` and mean something to a partner. */
const USAGE_CLASSES = [
  'SurveyData', 'FormResults', 'Vitals', 'EvaluationMedical',
  'HistoryEnvironmentalHealth', 'Assets',
];

Parse.Cloud.define('organizationUsage', async (request) => {
  const { shortCode, from, to } = request.params;
  if (!shortCode) throw new Error('organizationUsage: shortCode is required');

  if (!await services.roles.mayAdministerOrganization(request, shortCode)) {
    throw new Error(
      'organizationUsage requires the master key, the puente_staff role, or the '
      + "organization's admin role",
    );
  }

  const organizations = await services.organization.findAll();
  const org = organizations.find((o) => o.get('shortCode') === shortCode);
  // Zeroes for an organization that does not exist read as "they collected
  // nothing", which is a different and wrong statement.
  if (!org) throw new Error(`organizationUsage: no organization with shortCode "${shortCode}"`);

  // The alias set IS the identity. Records carry the string the field collected.
  const strings = [org.get('name'), org.get('shortCode'), ...(org.get('aliases') || [])]
    .filter(Boolean);

  const counts = {};
  await Promise.all(USAGE_CLASSES.map(async (className) => {
    try {
      const query = new Parse.Query(className);
      query.containedIn('surveyingOrganization', strings);
      if (from) query.greaterThanOrEqualTo('createdAt', new Date(from.iso || from));
      if (to) query.lessThanOrEqualTo('createdAt', new Date(to.iso || to));
      counts[className] = await query.count({ useMasterKey: true });
    } catch (error) {
      // null, never 0. A count that failed and a count of zero look identical
      // on an invoice, and one of them understates what a partner received.
      counts[className] = null;
    }
  }));

  return {
    shortCode,
    organization: org.get('name'),
    // Every string the count matched on, so the number is auditable rather than
    // asserted - a partner asking "why 623?" gets an answer.
    matchedOn: strings,
    from: from || null,
    to: to || null,
    // Synced, never collected. See the note above.
    basis: 'synced',
    counts,
  };
});
