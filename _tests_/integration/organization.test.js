const { Parse } = require('parse/node');
const { cloudFunctions } = require('../run-cloud');

/**
 * `Organization` is the canonical tenancy entity. Records carry an
 * `organization` pointer; `surveyingOrganization` is retained as the string the
 * field actually collected. `aliases` maps every string ever seen in the wild
 * to one organization.
 *
 * See puente-react-nextjs-platform/docs/billing-and-invoicing.md §3.
 */
// The dedicated endpoint — postObjectsToClass refuses this class.
const createOrganization = (shortCode, aliases) => cloudFunctions.createOrganization({
  name: shortCode.toUpperCase(), shortCode, aliases, active: true,
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
    //
    // The child's org must be a DIFFERENT organization from the parent's,
    // otherwise this passes even when the implementation always inherits and
    // never reads the child's own value. (Copilot caught exactly that: an
    // earlier version used two aliases of the same org and proved nothing.)
    await createOrganization('other-org', ['A Completely Different Org']);

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
      localObject: { height: '6', surveyingOrganization: 'A Completely Different Org' },
    });

    // The child's own value, NOT the parent's 'wof'.
    expect(child.get('organization').get('shortCode')).toEqual('other-org');
  });
});

describe('offline sync stamps the organization', () => {
  // uploadOfflineForms is how Collect actually syncs, and it does NOT route
  // through postObjectsToClass — postObjectsArray calls postObjectFactory,
  // which saves directly. Records arriving from the field are the majority of
  // production data, so stamping that misses this path misses almost everything.
  const metadata = {
    surveyingUser: 'field-user',
    surveyingOrganization: 'WOF',
    appVersion: '1.0.0',
    phoneOS: 'ios',
  };

  it('stamps records uploaded through uploadOfflineForms', async () => {
    await cloudFunctions.uploadOfflineForms({
      residentForms: [{
        parseClass: 'SurveyData',
        parseUser: 'undefined',
        localObject: { fname: 'Offline', lname: 'Stamped', objectIdOffline: 'PatientID-org-1' },
      }],
      households: [],
      assetForms: [],
      assetSupplementaryForms: [],
      residentSupplementaryForms: [],
      metadata,
    });

    const q = new Parse.Query('SurveyData');
    q.equalTo('objectIdOffline', 'PatientID-org-1');
    q.include('organization');
    const saved = await q.first();

    expect(saved).toBeDefined();
    // The org came from sync metadata via mergeMetadataAsFallback...
    expect(saved.get('surveyingOrganization')).toEqual('WOF');
    // ...and must be resolved to a pointer, exactly as the online path does.
    expect(saved.get('organization')).toBeDefined();
    expect(saved.get('organization').get('shortCode')).toEqual('wof');
  });

  it('stamps households uploaded through uploadOfflineForms', async () => {
    await cloudFunctions.uploadOfflineForms({
      residentForms: [],
      households: [{
        parseClass: 'Household',
        parseUser: 'undefined',
        localObject: { objectIdOffline: 'Household-org-1', relationship: 'head' },
      }],
      assetForms: [],
      assetSupplementaryForms: [],
      residentSupplementaryForms: [],
      metadata,
    });

    const q = new Parse.Query('Household');
    q.equalTo('objectIdOffline', 'Household-org-1');
    q.include('organization');
    const saved = await q.first();

    expect(saved).toBeDefined();
    expect(saved.get('organization')).toBeDefined();
    expect(saved.get('organization').get('shortCode')).toEqual('wof');
  });
});

describe('Organization cannot be created through the generic writer', () => {
  // postObjectsToClass is generic and unauthenticated. Left open, anyone could
  // create an Organization claiming an alias an existing tenant already uses —
  // resolution then raises on the ambiguity and that tenant's records save with
  // no pointer. A denial-of-attribution needing no credentials.
  it('refuses parseClass Organization, so a hostile alias never takes effect', async () => {
    const result = await cloudFunctions.postObjectsToClass({
      parseClass: 'Organization',
      parseUser: 'undefined',
      localObject: {
        name: 'Hostile', shortCode: 'hostile', aliases: ['WOF'], active: true,
      },
    });

    expect(String(result)).toMatch(/organization/i);
    // The property that matters: WOF still resolves cleanly rather than raising.
    const wof = await cloudFunctions.resolveOrganization({ name: 'WOF' });
    expect(wof.status).toEqual('resolved');
    expect(wof.organization.shortCode).toEqual('wof');
  });

  it('refuses parseClass Organization on the relation writer too', async () => {
    const parent = await cloudFunctions.postObjectsToClass({
      parseClass: 'SurveyData', parseUser: 'undefined', localObject: { fname: 'P' },
    });

    await cloudFunctions.postObjectsToClassWithRelation({
      parseParentClass: 'SurveyData',
      parseParentClassID: parent.id,
      parseClass: 'Organization',
      parseUser: 'undefined',
      localObject: { name: 'Hostile2', shortCode: 'hostile2', aliases: ['WOF'] },
    });

    // WOF must still resolve cleanly rather than raise on a planted ambiguity.
    const wof = await cloudFunctions.resolveOrganization({ name: 'WOF' });
    expect(wof.status).toEqual('resolved');
    expect(wof.organization.shortCode).toEqual('wof');
  });

  it('createOrganization itself refuses a colliding alias', async () => {
    // The endpoint guard, which is what closes the attack even unauthenticated.
    await expect(cloudFunctions.createOrganization({
      name: 'Impostor', shortCode: 'impostor', aliases: ['World Outreach Fund'],
    })).rejects.toThrow(/already belongs to/i);
  });

  it('createOrganization refuses a duplicate shortCode', async () => {
    await expect(cloudFunctions.createOrganization({
      name: 'Dupe', shortCode: 'wof', aliases: ['Something Unused'],
    })).rejects.toThrow(/already taken/i);
  });
});

describe('postObjectsToAnyClassWithRelation stamps its clinical children', () => {
  // This endpoint saves SEVEN clinical classes directly (Vitals, HistoryMedical,
  // Prescriptions, Allergies, EvaluationSurgical, EvaluationMedical,
  // HistoryEnvironmentalHealth) — precisely the classes that are 94-100% missing
  // surveyingOrganization in production. It has no callers today, but "no
  // callers" is a fact about the present, not a guarantee, and it had no test
  // coverage at all before this.
  it('stamps children from the parent organization', async () => {
    const parent = await cloudFunctions.postObjectsToClass({
      parseClass: 'SurveyData',
      parseUser: 'undefined',
      localObject: { fname: 'AnyClassParent', surveyingOrganization: 'WOF' },
    });

    await cloudFunctions.postObjectsToAnyClassWithRelation({
      parseParentClass: 'SurveyData',
      parseParentClassID: parent.id,
      localObject: {
        a: { tag: 'Vitals', key: 'heartRate', value: '72' },
        b: { tag: 'HistoryMedical', key: 'notes', value: 'anyclass-marker' },
      },
    });

    const vq = new Parse.Query('Vitals');
    vq.equalTo('heartRate', '72');
    vq.include('organization');
    const vitals = await vq.first();

    expect(vitals).toBeDefined();
    expect(vitals.get('organization')).toBeDefined();

    const hq = new Parse.Query('HistoryMedical');
    hq.equalTo('notes', 'anyclass-marker');
    const history = await hq.first();
    expect(history.get('organization')).toBeDefined();
  });
});

describe('createOrganization is privileged', () => {
  it('refuses to create an organization without the master key', async () => {
    // The Organization list is exactly what the registration picker offers. The
    // app id and JavaScript key ship in every client bundle, so without this
    // guard anyone holding them can add an entry to the dropdown that every new
    // account chooses from — and organizations are the tenancy and billing
    // entity, not a lookup table.
    //
    // Master key rather than a role check: organizations are created by hand by
    // staff, so there is no client that legitimately needs this. When
    // puente_staff exists (see billing plan section 7) this becomes
    // `request.master || isStaff(request.user)`.
    await expect(cloudFunctions.createOrganizationUnprivileged({
      name: 'Rogue Org',
      shortCode: 'rogue-org',
      aliases: ['Rogue Org'],
      active: true,
    })).rejects.toThrow(/master key/i);
  });
});

describe('the canonical name is always resolvable', () => {
  it('resolves an organization that has no aliases at all', async () => {
    // createOrganization defaults `aliases` to [], and the registration picker
    // offers an organization's `name`. Matching only aliases means such an
    // organization can sit in the dropdown and still resolve as unknown — so
    // its first member never gets the admin flow and its records never get an
    // organization pointer. Raised by Copilot on PR #620.
    await cloudFunctions.createOrganization({
      name: 'Alias Free Org', shortCode: 'alias-free', active: true,
    });

    const result = await cloudFunctions.resolveOrganization({ name: 'Alias Free Org' });

    expect(result.status).toEqual('resolved');
    expect(result.organization.shortCode).toEqual('alias-free');
  });

  it('refuses a name that another organization already claims as an alias', async () => {
    // Once the name counts as an implicit alias, a name colliding with someone
    // else's alias makes that string ambiguous — resolve() throws, and on the
    // record write path that means a whole tenant's records stop resolving.
    // Cheaper to refuse at creation. `wof` already claims 'World Outreach Fund'.
    await expect(cloudFunctions.createOrganization({
      name: 'World Outreach Fund', shortCode: 'wof-duplicate', active: true,
    })).rejects.toThrow(/already belongs to/i);
  });
});
