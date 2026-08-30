const Organization = require('../../cloud/src/services/organization/organization');

/** A stand-in for a Parse object — resolve() only reads via .get(). */
const org = (shortCode, aliases) => ({
  id: `id-${shortCode}`,
  get: (k) => ({ shortCode, aliases, name: shortCode.toUpperCase() }[k]),
});

describe('normalizeOrganizationName', () => {
  it('folds case and surrounding whitespace', () => {
    expect(Organization.normalizeOrganizationName('  WOF ')).toEqual('wof');
  });

  it('folds accents, including marks outside the U+0300 block', () => {
    expect(Organization.normalizeOrganizationName('Asociación')).toEqual('asociacion');
    expect(Organization.normalizeOrganizationName('ÁÉÍÓÚÑÜ')).toEqual('aeiounu');
    expect(Organization.normalizeOrganizationName('A᪰')).toEqual('a');
  });

  it('returns null for a non-string, so absent never collides with empty', () => {
    expect(Organization.normalizeOrganizationName(undefined)).toBeNull();
    expect(Organization.normalizeOrganizationName(null)).toBeNull();
  });
});

describe('Organization.resolve', () => {
  const WOF = org('wof', ['WOF', 'World Outreach Fund']);

  it('resolves a collected string through an alias', () => {
    expect(Organization.resolve({ name: 'World Outreach Fund' }, [WOF]).status).toEqual('resolved');
  });

  it('prefers the pointer, in either Parse shape', () => {
    expect(Organization.resolve({ pointer: { objectId: 'id-wof' }, name: 'nope' }, [WOF])
      .organization.get('shortCode')).toEqual('wof');
    expect(Organization.resolve({ pointer: { id: 'id-wof' }, name: 'nope' }, [WOF])
      .organization.get('shortCode')).toEqual('wof');
  });

  it('returns unresolved for an unknown string, never a nearest match', () => {
    const r = Organization.resolve({ name: 'Never Seen' }, [WOF]);
    expect(r.status).toEqual('unresolved');
    expect(r.organization).toBeUndefined();
  });

  it('raises when two organizations claim the same alias', () => {
    // createOrganization now refuses to MINT a collision, but one can still
    // arrive via direct REST or the Back4App console, so resolve() must keep
    // refusing rather than silently picking the first match.
    const collide = () => Organization.resolve(
      { name: 'Shared' }, [org('a', ['Shared']), org('b', ['shared'])],
    );
    expect(collide).toThrow(/ambiguous/i);
  });

  it('treats a missing name as unresolved, not a match on an empty alias', () => {
    expect(Organization.resolve({}, [org('x', [''])]).status).toEqual('unresolved');
  });
});

describe('Organization.findAliasClash', () => {
  const orgNamed = (shortCode, name, aliases) => ({
    id: `id-${shortCode}`,
    get: (k) => ({ shortCode, name, aliases }[k]),
  });

  const WOF = orgNamed('wof', 'World Outreach Fund', ['WOF']);
  const RAYJON = orgNamed('rayjon', 'Rayjon', ['Rayjon Eye Clinic']);
  const all = [WOF, RAYJON];

  it('returns null when nothing is claimed', () => {
    expect(Organization.findAliasClash(['Brand New Org'], all)).toBeNull();
  });

  it('reports the owner when a candidate matches another org alias', () => {
    expect(Organization.findAliasClash(['Rayjon Eye Clinic'], all))
      .toEqual(['Rayjon Eye Clinic', 'rayjon']);
  });

  it('treats a canonical name as an implicit alias', () => {
    // resolve() matches on name as well as aliases, so a candidate colliding
    // with someone's NAME is just as ambiguous as one colliding with an alias.
    expect(Organization.findAliasClash(['World Outreach Fund'], all))
      .toEqual(['World Outreach Fund', 'wof']);
  });

  it('folds case and accents before comparing', () => {
    expect(Organization.findAliasClash(['  rayjon  '], all)[1]).toEqual('rayjon');
  });

  it('lets an organization keep its own strings via excludeShortCode', () => {
    // Editing WOF must not report WOF's existing aliases as collisions with
    // itself, or no organization could ever be saved twice.
    expect(Organization.findAliasClash(['WOF'], all, { excludeShortCode: 'wof' })).toBeNull();
    // ...but another org's alias is still refused during that same edit.
    expect(Organization.findAliasClash(['Rayjon'], all, { excludeShortCode: 'wof' })[1])
      .toEqual('rayjon');
  });

  it('reports the FIRST clash so the message names one concrete string', () => {
    expect(Organization.findAliasClash(['Rayjon', 'WOF'], all)[0]).toEqual('Rayjon');
  });
});
