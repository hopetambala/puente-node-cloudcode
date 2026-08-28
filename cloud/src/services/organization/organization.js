/**
 * `modules/error` requires `services`, so requiring it at load time here would
 * close a cycle (services -> organization -> module -> services) and leave
 * `modules.Error` undefined at call time. Resolved lazily at the call site
 * instead — definers can require both because they load after services are built.
 */
const logError = (message) => require('../../module').Error.logError(message); // eslint-disable-line global-require

/**
 * Organization resolution — the canonical tenancy entity.
 *
 * This is the SERVER-SIDE authority. Puente Manage carries a matching resolver
 * for reading historical records that predate their pointer; the two must apply
 * the same rule or they will disagree about who owns a record. Keep
 * `normalizeOrganizationName` here identical to the one in
 * puente-react-nextjs-platform/app/modules/organization/index.js.
 *
 * See puente-react-nextjs-platform/docs/billing-and-invoicing.md §3.
 */

/**
 * Folds an organization string to its comparison form. Non-strings become null,
 * so an absent organization can never collide with an empty-string alias.
 */
const normalizeOrganizationName = (value) => (
  typeof value === 'string' ? value.trim().toLowerCase() : null
);

/**
 * Organizations are created by hand by Puente staff and number in the single
 * digits, so one unpaginated fetch is the cheap option. The cap exists only so
 * this can never become an unbounded query.
 *
 * If it is ever REACHED, organizations past it become invisible and their
 * records silently unresolvable — so hitting it is reported, not shrugged off.
 */
const ORGANIZATION_FETCH_CAP = 1000;

const Organization = {
  normalizeOrganizationName,

  /** Every organization. See ORGANIZATION_FETCH_CAP for why this is unpaginated. */
  findAll: async function findAll() {
    const query = new Parse.Query('Organization');
    query.limit(ORGANIZATION_FETCH_CAP);
    const organizations = await query.find({ useMasterKey: true });

    // A truncated list resolves records against an incomplete set, which looks
    // exactly like "this organization has no alias for that string". Never let
    // that pass silently.
    if (organizations.length === ORGANIZATION_FETCH_CAP) {
      logError(
        `Organization.findAll hit the ${ORGANIZATION_FETCH_CAP}-row cap. Resolution `
        + 'is now against an incomplete set and records may be left unresolved.',
      );
    }

    return organizations;
  },

  /**
   * Resolves `{ pointer, name }` to a canonical Organization.
   *
   * Never falls back to a "closest" organization: an unresolved record is
   * recoverable, a misattributed one is not.
   *
   * @throws {Error} when two organizations claim the same alias. Callers on a
   *   write path must catch this — a collision is an ops problem and must not
   *   reject a survey collected in the field. See `stampOrganization`.
   */
  resolve: function resolve({ name } = {}, organizations = []) {
    const wanted = normalizeOrganizationName(name);

    const matches = wanted === null ? [] : organizations.filter((org) => {
      const aliases = org.get('aliases') || [];
      return aliases.some((alias) => normalizeOrganizationName(alias) === wanted);
    });

    // Two organizations claiming one alias must be FIXED by a human, not
    // swallowed. Returning `unresolved` would hide a collision that misroutes
    // records AND money; a wrong pointer looks exactly like a right one.
    if (matches.length > 1) {
      const claimants = matches.map((org) => org.get('shortCode')).join(', ');
      throw new Error(
        `Ambiguous organization alias "${name}": claimed by ${claimants}. `
        + 'Aliases must be unique across organizations.',
      );
    }

    if (matches.length === 1) {
      return { status: 'resolved', organization: matches[0] };
    }

    return { status: 'unresolved', value: name === undefined ? null : name };
  },
};

/**
 * Sets the `organization` pointer on a record from its collected
 * `surveyingOrganization` string. Mutates `record`; returns nothing.
 *
 * Deliberately swallows every failure. A collection in the field must never be
 * rejected because an alias is missing or two organizations collide — those are
 * ops problems, worked from the admin queue, and the record is still correct
 * without a pointer. The string it was collected with is retained regardless.
 */
Organization.stampOrganization = async function stampOrganization(record, localObject = {}) {
  const name = localObject.surveyingOrganization;
  if (typeof name !== 'string' || name.trim() === '') return;

  try {
    const organizations = await Organization.findAll();
    const result = Organization.resolve({ name }, organizations);
    if (result.status === 'resolved') record.set('organization', result.organization);
  } catch (error) {
    // Loud to the team, invisible to the surveyor. modules.Error.logError routes
    // to the platform-alerts Slack channel outside dev — a collision that nobody
    // is told about is one nobody fixes, and every record it touches stays
    // unresolved, blocking the backfill and ACL gates downstream.
    //
    // String(error) rather than error.message to preserve the full cause chain:
    // a genuine Parse outage here must be distinguishable from an ambiguous alias.
    logError(`stampOrganization: ${String(error)}`);
  }
};

module.exports = Organization;
