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

const Organization = {
  normalizeOrganizationName,

  /** Every organization. There are a handful; a full fetch is the cheap option. */
  findAll: async function findAll() {
    const query = new Parse.Query('Organization');
    query.limit(1000);
    return query.find({ useMasterKey: true });
  },

  /**
   * Resolves `{ pointer, name }` to a canonical Organization.
   *
   * Never falls back to a "closest" organization: an unresolved record is
   * recoverable, a misattributed one is not.
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
    // Loud in the log, invisible to the surveyor.
    console.error(`stampOrganization: ${error.message}`); // eslint-disable-line no-console
  }
};

module.exports = Organization;
