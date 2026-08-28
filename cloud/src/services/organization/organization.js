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
 * Folds an organization string to its comparison form: accent-, case- and
 * whitespace-insensitive. Non-strings become null, so an absent organization
 * can never collide with an empty-string alias.
 *
 * Accents are folded because these names are frequently Spanish and are typed
 * both ways. The 2026-08-28 production audit found 524 records under
 * 'Asociacion para el impacto de desarrollo comunitario' and 31 under
 * 'Asociación…' — one character splitting 555 records across what would
 * otherwise be two organizations. It also keeps this consistent with the export
 * pipeline, which already strips accents before writing CSV headers
 * (replace_spanish_characters in puente-flask-rest-aggregator).
 *
 * NFD decomposition plus combining-mark removal covers those and every other
 * diacritic, rather than a hand-maintained map that silently misses whatever
 * was not listed.
 *
 * MUST stay identical to normalizeOrganizationName in
 * puente-react-nextjs-platform/app/modules/organization/index.js.
 */
const normalizeOrganizationName = (value) => (
  typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    : null
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
  resolve: function resolve({ pointer, name } = {}, organizations = []) {
    // A raw Parse pointer carries `objectId`; a hydrated Parse.Object carries
    // `id`. Reading only one silently ignores the other and falls through to
    // string matching. Kept identical to the client-side resolver in
    // puente-react-nextjs-platform/app/modules/organization/index.js.
    const pointerId = pointer && (pointer.objectId || pointer.id);
    if (pointerId) {
      const byPointer = organizations.find((org) => org.id === pointerId);
      if (byPointer) return { status: 'resolved', organization: byPointer };
    }

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
/**
 * Fetches the organization a parent record belongs to, as either an existing
 * pointer or its collected string. Only the two fields are transferred.
 */
Organization.readParentOrganization = async function readParentOrganization(parentClass, parentId) {
  const query = new Parse.Query(parentClass);
  query.select('organization', 'surveyingOrganization');
  const parent = await query.get(parentId, { useMasterKey: true });
  return {
    pointer: parent.get('organization') || null,
    name: parent.get('surveyingOrganization') || null,
  };
};

/**
 * Sets the `organization` pointer on a record. Mutates `record`; returns nothing.
 *
 * `parent` is `{ parseClass, objectId }` for a supplementary record, or omitted.
 * Supplementary classes overwhelmingly carry no `surveyingOrganization` of their
 * own — the 2026-08-28 production audit found HistoryMedical, Allergies and
 * Prescriptions at 100% missing, Vitals and EvaluationSurgical above 98% — because
 * the organization is a property of the PERSON, not of a vitals reading. Reading
 * only the child's own field would leave those records permanently unresolvable,
 * blocking the backfill's 100% gate and leaving them without a restrictive ACL
 * forever.
 *
 * The child's own collected string still wins when it has one: collection-time
 * values are authoritative for the record that carries them.
 *
 * Deliberately swallows every failure. A collection in the field must never be
 * rejected because an alias is missing or two organizations collide — those are
 * ops problems, worked from the admin queue, and the record is still correct
 * without a pointer.
 */
Organization.stampOrganization = async function stampOrganization(
  record, localObject = {}, parent = null, preloaded = null,
) {
  try {
    let name = localObject.surveyingOrganization;

    if (typeof name !== 'string' || name.trim() === '') {
      if (!parent || !parent.parseClass || !parent.objectId) return;
      const fromParent = await Organization.readParentOrganization(
        parent.parseClass, parent.objectId,
      );
      // A parent already carrying the pointer is the cheapest correct answer.
      if (fromParent.pointer) {
        record.set('organization', fromParent.pointer);
        return;
      }
      name = fromParent.name;
      if (typeof name !== 'string' || name.trim() === '') return;
    }

    // A batch passes its organizations in so the list is fetched once for the
    // whole upload rather than once per record — an offline sync of 50 records
    // would otherwise pay 50 round-trips on the most latency-sensitive path.
    const organizations = preloaded || await Organization.findAll();
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
