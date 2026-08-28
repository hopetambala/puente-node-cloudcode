const { cloudFunctions } = require('../run-cloud');

/**
 * `Organization` is the canonical tenancy entity. Records carry an
 * `organization` pointer; `surveyingOrganization` is retained as the string the
 * field actually collected. `aliases` maps every string ever seen in the wild
 * to one organization.
 *
 * See puente-react-nextjs-platform/docs/billing-and-invoicing.md §3.
 */
const createOrganization = (shortCode, aliases) => cloudFunctions.postObjectsToClass({
  parseClass: 'Organization',
  parseUser: 'undefined',
  localObject: {
    name: shortCode.toUpperCase(),
    shortCode,
    aliases,
    active: true,
  },
});

describe('resolveOrganization', () => {
  beforeAll(async () => {
    await createOrganization('wof', ['WOF', 'World Outreach Fund']);
  });

  it('resolves a collected organization string through an alias', async () => {
    const result = await cloudFunctions.resolveOrganization({ name: 'WOF' });

    expect(result.status).toEqual('resolved');
    expect(result.organization.shortCode).toEqual('wof');
  });

  it('raises when two organizations claim the same alias', async () => {
    // Returning `unresolved` here would be quietly wrong: the collision must be
    // FIXED by a human, not swallowed. A wrong pointer misroutes records AND
    // money, and looks exactly like a right one.
    await createOrganization('collide-a', ['SharedAlias']);
    await createOrganization('collide-b', ['sharedalias']);

    await expect(cloudFunctions.resolveOrganization({ name: 'SharedAlias' }))
      .rejects.toThrow(/ambiguous/i);
  });

  it('prefers a pointer over the collected name when both are given', async () => {
    // The Cloud function accepts `pointer` in its params. Ignoring it would
    // silently resolve by string instead — and the client-side resolver in
    // Manage must apply the SAME rule or the two disagree about who owns a
    // record. Accepts both pointer shapes: raw `objectId` and Parse `id`.
    const wof = await cloudFunctions.resolveOrganization({ name: 'WOF' });

    const result = await cloudFunctions.resolveOrganization({
      pointer: { objectId: wof.organization.objectId },
      name: 'MeasurablyDifferentOrg',
    });

    expect(result.status).toEqual('resolved');
    expect(result.organization.shortCode).toEqual('wof');
  });

  it('folds Spanish accents, so "Asociación" and "Asociacion" are one organization', async () => {
    // Production audit 2026-08-28: 524 records under
    // 'Asociacion para el impacto de desarrollo comunitario' and 31 under
    // 'Asociación…' — one character splitting 555 records. The Flask exporter
    // already strips accents (replace_spanish_characters), so a resolver that
    // does not fold them disagrees with the export pipeline.
    await createOrganization('asoc', ['Asociacion para el impacto de desarrollo comunitario']);

    const result = await cloudFunctions.resolveOrganization({
      name: 'Asociación para el impacto de desarrollo comunitario',
    });

    expect(result.status).toEqual('resolved');
    expect(result.organization.shortCode).toEqual('asoc');
  });

  // ─── Guards ────────────────────────────────────────────────────────────────
  // Pin properties the implementation already has; each passed on first run.

  it('resolves despite case and surrounding whitespace', async () => {
    // THE live bug: a user whose organization is "puente" matches no records
    // saying "Puente" and sees an empty app with no error.
    const result = await cloudFunctions.resolveOrganization({ name: '  world outreach fund ' });

    expect(result.status).toEqual('resolved');
    expect(result.organization.shortCode).toEqual('wof');
  });

  it('returns unresolved for an unknown string, never a fallback organization', async () => {
    const result = await cloudFunctions.resolveOrganization({ name: 'Never Seen This Org' });

    expect(result.status).toEqual('unresolved');
    expect(result.organization).toBeUndefined();
  });

  it('treats a missing name as unresolved', async () => {
    const result = await cloudFunctions.resolveOrganization({});

    expect(result.status).toEqual('unresolved');
  });
});

describe('stamping the organization pointer on write', () => {
  // This is what removes the mobile release from the rollout entirely: Collect
  // keeps sending `surveyingOrganization` exactly as it does today, and the
  // server resolves the pointer. Every app version in the field — including
  // years-old builds — starts producing pointered records the moment this
  // deploys. See docs/billing-and-invoicing.md §3.1.
  it('stamps the organization pointer from the collected string', async () => {
    const record = await cloudFunctions.postObjectsToClass({
      parseClass: 'SurveyData',
      parseUser: 'undefined',
      localObject: {
        fname: 'Stamped',
        lname: 'Record',
        surveyingOrganization: 'World Outreach Fund',
      },
    });

    const pointer = record.get('organization');

    expect(pointer).toBeDefined();
    expect(pointer.get('shortCode')).toEqual('wof');
    // The collected string is retained as provenance, never overwritten.
    expect(record.get('surveyingOrganization')).toEqual('World Outreach Fund');
  });

  it('still saves the record when the organization cannot be resolved', async () => {
    // A survey collected in a community must never be rejected because an alias
    // is missing. Unresolved is worked from the admin queue; the record is still
    // correct without a pointer, and still carries what the field collected.
    const record = await cloudFunctions.postObjectsToClass({
      parseClass: 'SurveyData',
      parseUser: 'undefined',
      localObject: { fname: 'Unmatched', surveyingOrganization: 'Org Not In Any Alias List' },
    });

    expect(record.id).toBeDefined();
    expect(record.get('organization')).toBeUndefined();
    expect(record.get('surveyingOrganization')).toEqual('Org Not In Any Alias List');
  });

  it('still saves the record when the organization alias is ambiguous', async () => {
    // The collision raises inside resolve(). It must be loud in the log and
    // invisible to the surveyor — an ops problem, not a failed collection.
    const record = await cloudFunctions.postObjectsToClass({
      parseClass: 'SurveyData',
      parseUser: 'undefined',
      localObject: { fname: 'Ambiguous', surveyingOrganization: 'SharedAlias' },
    });

    expect(record.id).toBeDefined();
    expect(record.get('organization')).toBeUndefined();
  });
});

describe('supplementary records inherit the organization from their parent', () => {
  // Production audit 2026-08-28: supplementary classes overwhelmingly carry NO
  // surveyingOrganization of their own — HistoryMedical 1038/1038, Allergies
  // 535/535, Prescriptions 530/530, Vitals 599/607, EvaluationSurgical 531/532.
  // The organization is a property of the PERSON, not of the vitals reading.
  //
  // So reading the child's own field stamps nothing, and these records would be
  // permanently unresolvable — which blocks the backfill's 100% gate and would
  // leave them open forever under the ACL work, since an unresolved record is
  // never given a restrictive ACL.
  it('stamps a child created with a relation, from the parent organization', async () => {
    const parent = await cloudFunctions.postObjectsToClass({
      parseClass: 'SurveyData',
      parseUser: 'undefined',
      localObject: { fname: 'Parent', surveyingOrganization: 'WOF' },
    });

    const child = await cloudFunctions.postObjectsToClassWithRelation({
      parseParentClass: 'SurveyData',
      parseParentClassID: parent.id,
      parseClass: 'Vitals',
      parseUser: 'undefined',
      // No surveyingOrganization — exactly like ~99% of production Vitals.
      localObject: { height: '6', weight: '2' },
    });

    // Identity, not hydration: the inherited pointer is deliberately NOT fetched
    // (hydrating it would be a wasted query), so assert it references the same
    // Organization the parent does — which is the actual contract.
    const pointer = child.get('organization');
    expect(pointer).toBeDefined();

    const wof = await cloudFunctions.resolveOrganization({ name: 'WOF' });
    expect(pointer.id).toEqual(wof.organization.objectId);
    expect(pointer.id).toEqual(parent.get('organization').id);
  });

  it('prefers the child own organization string over the parent', async () => {
    // A child that DOES carry its own collected string is authoritative for
    // itself — collection-time values win.
    const parent = await cloudFunctions.postObjectsToClass({
      parseClass: 'SurveyData',
      parseUser: 'undefined',
      localObject: { fname: 'Parent2', surveyingOrganization: 'WOF' },
    });

    const child = await cloudFunctions.postObjectsToClassWithRelation({
      parseParentClass: 'SurveyData',
      parseParentClassID: parent.id,
      parseClass: 'Vitals',
      parseUser: 'undefined',
      localObject: { height: '6', surveyingOrganization: 'World Outreach Fund' },
    });

    expect(child.get('organization').get('shortCode')).toEqual('wof');
  });
});
