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
 * NFD decomposition plus \p{M} covers those and every other diacritic, rather
 * than a hand-maintained map that silently misses whatever was not listed.
 * \p{M} rather than the U+0300–U+036F range because that block is only one of
 * several — a mark from Combining Diacritical Marks Extended (U+1AB0+) survived
 * the range check and still blocked a match.
 *
 * MUST stay identical to normalizeOrganizationName in
 * puente-react-nextjs-platform/app/modules/organization/index.js.
 */
const normalizeOrganizationName = (value) => (
  typeof value === 'string'
    ? value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
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


/**
 * How close a proposed organization name may be to an existing one before a
 * human has to look at it. Tunable in one place on purpose — see
 * findSimilarOrganization for why the bias is toward refusing.
 */
const SIMILARITY_MAX_DISTANCE = 2;

/** Containment is skipped below this length; see findSimilarOrganization. */
const MIN_CONTAINMENT_LENGTH = 3;

/** Standard edit distance. Organizations number in dozens, so the plain DP is fine. */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (unused, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length];
}
const Organization = {

  /**
   * The organization a proposed new name is too close to, or null if the name
   * is clearly distinct and safe to create.
   *
   * This function is the entire safety argument for self-service organization
   * creation. cloudcode #620 removed first-user-becomes-administrator because
   * ANY unused string minted an admin; self-service puts that back, and what
   * makes it safe is that a human still approves the ambiguous cases — this is
   * what decides which cases those are. See
   * puente-react-nextjs-platform/docs/self-service-organizations.md §1 and §3.
   *
   * Three rules, in order:
   *
   *   exact normalized match  -> null. That is a JOIN; resolve() owns it, and
   *                              refusing here would block ordinary signups.
   *   containment either way  -> too close. Catches "Puente Colorado" vs
   *                              "Puente", which edit distance waves through.
   *   distance <= 2           -> too close. Catches "Puentte".
   *
   * Deliberately tighter than edit distance alone. The asymmetry is the point:
   * a false refusal costs one email to staff, while a false accept forks a
   * tenant permanently and silently. Production has already shown that cost —
   * DR Missions carried 11 rows under its canonical name and 611 under "DRMT".
   *
   * Returns `{ organization, matched, reason }` so the refusal can name the
   * concrete string a human needs to act on.
   */
  findSimilarOrganization: function findSimilarOrganization(name, organizations = []) {
    const wanted = normalizeOrganizationName(name);
    if (wanted === null || wanted === '') return null;

    const candidates = [];
    organizations.forEach((org) => {
      [org.get('name'), ...(org.get('aliases') || [])].forEach((raw) => {
        const normalized = normalizeOrganizationName(raw);
        if (normalized) candidates.push({ org, raw, normalized });
      });
    });

    // Checked across ALL organizations before any similarity test, so an exact
    // match on one org is never overridden by a near match on another.
    if (candidates.some((c) => c.normalized === wanted)) return null;

    const contained = candidates.find((c) => {
      // A one- or two-character alias is a substring of half of everything
      // anyone could type; without this floor no organization could ever be
      // created again.
      const shorter = Math.min(c.normalized.length, wanted.length);
      if (shorter < MIN_CONTAINMENT_LENGTH) return false;
      return c.normalized.includes(wanted) || wanted.includes(c.normalized);
    });
    if (contained) {
      return { organization: contained.org, matched: contained.raw, reason: 'containment' };
    }

    const near = candidates.find(
      (c) => levenshtein(c.normalized, wanted) <= SIMILARITY_MAX_DISTANCE,
    );
    if (near) {
      return { organization: near.org, matched: near.raw, reason: 'distance' };
    }

    return null;
  },


  /**
   * The first candidate string already claimed by an organization.
   *
   * Returns `[candidate, ownerShortCode]`, or null when every candidate is
   * free. Canonical names participate as implicit aliases, because resolve()
   * matches on name as well as aliases — a candidate colliding with someone's
   * NAME is exactly as ambiguous as one colliding with an alias, and an
   * ambiguous string makes a whole tenant's records stop resolving.
   *
   * `excludeShortCode` omits one organization from the comparison, so editing
   * an organization does not report its own existing strings as collisions
   * with itself.
   *
   * Shared by createOrganization and editOrganizationAliases so the two cannot
   * drift into disagreeing about what counts as taken.
   */
  findAliasClash: function findAliasClash(
    candidates = [], organizations = [], { excludeShortCode } = {},
  ) {
    const taken = new Map();
    organizations
      .filter((o) => o.get('shortCode') !== excludeShortCode)
      .forEach((o) => [o.get('name'), ...(o.get('aliases') || [])].forEach(
        (a) => taken.set(normalizeOrganizationName(a), o.get('shortCode')),
      ));

    // First match rather than all of them: the error message should name one
    // concrete string a human can act on.
    const clash = candidates
      .map((a) => [a, taken.get(normalizeOrganizationName(a))])
      .find(([, owner]) => owner);

    return clash || null;
  },

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
      // The canonical name is ALWAYS an implicit alias. `aliases` defaults to
      // [] at creation and the registration picker offers an organization's
      // `name`, so matching aliases alone lets an organization sit in the
      // dropdown and still resolve as unknown — its first member never gets the
      // admin flow, and its records never get an organization pointer.
      // Kept identical in the client-side resolver in
      // puente-react-nextjs-platform/app/modules/organization/index.js.
      const candidates = [org.get('name'), ...(org.get('aliases') || [])];
      return candidates.some((c) => normalizeOrganizationName(c) === wanted);
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
