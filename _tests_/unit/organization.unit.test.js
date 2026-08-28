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
