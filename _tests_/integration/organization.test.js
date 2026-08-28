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
