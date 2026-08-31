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

describe('deactivated organizations', () => {
  /**
   * A stand-in carrying the `active` flag. Absent means active — the same
   * tri-state the registration pickers apply (`active !== false`).
   */
  const orgActive = (shortCode, name, aliases, active) => ({
    id: `id-${shortCode}`,
    get: (k) => ({
      shortCode,
      name,
      aliases,
      active,
    }[k]),
  });

  // The 2026-08-30 production merge: holy-family-mission was a duplicate row
  // for records that belong to cevicos.
  const HFM = orgActive('holy-family-mission', 'Holy Family Mission', ['HFM'], false);
  const CEVICOS = orgActive('cevicos', 'Cevicos', [], true);

  describe('findAliasClash', () => {
    it('lets a surviving organization claim a deactivated one\'s name', () => {
      // The merge that motivated this: deactivate the duplicate, then re-home
      // its strings onto the survivor. While the retired row still counted as
      // an owner, the only way to finish the merge was to DELETE it, which
      // loses the provenance of every record collected under it.
      expect(Organization.findAliasClash(
        ['Holy Family Mission', 'HFM'], [HFM, CEVICOS], { excludeShortCode: 'cevicos' },
      )).toBeNull();
    });

    it('still refuses a name a LIVE organization holds', () => {
      // Guard on the scope of the change: only DEACTIVATED organizations
      // release their names. A live organization's strings stay untouchable.
      expect(Organization.findAliasClash(
        ['Cevicos'], [HFM, CEVICOS], { excludeShortCode: 'holy-family-mission' },
      )).toEqual(['Cevicos', 'cevicos']);
    });

    it('treats an organization with no `active` field as live', () => {
      // `active` postdates the class. Absent must mean live, or every row that
      // predates the field would silently hand its name to the next caller.
      const legacy = { id: 'id-legacy', get: (k) => ({ shortCode: 'legacy', name: 'Legacy Org', aliases: [] }[k]) };

      expect(Organization.findAliasClash(['Legacy Org'], [legacy]))
        .toEqual(['Legacy Org', 'legacy']);
    });
  });

  describe('resolve', () => {
    it('still resolves a deactivated organization by its own name', () => {
      // DO NOT "FIX" THIS. Deactivation means "stop offering this in the
      // picker", not "forget it existed". Years of records carry a retired
      // partner's collected string and must keep scoping to it — filtering
      // inactive organizations out here would leave all of them unresolved,
      // stripping their pointer, their export attribution and their ACL.
      const result = Organization.resolve({ name: 'HFM' }, [HFM, CEVICOS]);

      expect(result.status).toEqual('resolved');
      expect(result.organization.get('shortCode')).toEqual('holy-family-mission');
    });

    it('prefers the surviving active claimant once a name has been re-homed', () => {
      // The state the merge LEAVES BEHIND: two rows now carry the string, the
      // retired one and the survivor that took it over. Treating that as an
      // ambiguity throws on the record write path, and stampOrganization then
      // swallows it and saves every incoming record with NO organization
      // pointer — the merge would silently unscope the very records it was
      // meant to consolidate.
      const merged = orgActive('cevicos', 'Cevicos', ['Holy Family Mission'], true);
      const result = Organization.resolve({ name: 'Holy Family Mission' }, [HFM, merged]);

      expect(result.status).toEqual('resolved');
      expect(result.organization.get('shortCode')).toEqual('cevicos');
    });

    it('still raises when two LIVE organizations claim one string', () => {
      // Deactivating one side is the REMEDY for a collision, not a way to hide
      // one. Two live claimants name no single owner and still need a human.
      const a = orgActive('a', 'A', ['Shared'], true);
      const b = orgActive('b', 'B', ['Shared'], true);

      expect(() => Organization.resolve({ name: 'Shared' }, [a, b])).toThrow(/ambiguous/i);
    });

    it('still raises when only RETIRED organizations collide', () => {
      // No live claimant to prefer, so there is still no single owner. Falling
      // back to "the first retired one" would misattribute records silently.
      const a = orgActive('a', 'A', ['Shared'], false);
      const b = orgActive('b', 'B', ['Shared'], false);

      expect(() => Organization.resolve({ name: 'Shared' }, [a, b])).toThrow(/ambiguous/i);
    });
  });

  describe('findSimilarOrganization', () => {
    it('still sees deactivated organizations, so a retired name is not re-used by accident', () => {
      // Deliberately NOT given the same treatment as findAliasClash. This is
      // not an ownership rule, it is the "make a human look" guard on
      // self-service signup, and a retired partner's name is exactly the kind
      // of string that must not quietly become a DIFFERENT tenant — resolve()
      // would then re-home the retired org's historical records onto it.
      const hit = Organization.findSimilarOrganization('Holy Family Missionn', [HFM, CEVICOS]);

      expect(hit).not.toBeNull();
      expect(hit.organization.get('shortCode')).toEqual('holy-family-mission');
    });
  });
});

describe('Organization.findSimilarOrganization', () => {
  const orgNamed2 = (shortCode, name, aliases) => ({
    id: `id-${shortCode}`,
    get: (k) => ({ shortCode, name, aliases }[k]),
  });

  const PUENTE = orgNamed2('puente', 'Puente', ['Puente DR']);
  const WOF = orgNamed2('wof', 'World Outreach Fund', ['WOF']);
  const all = [PUENTE, WOF];

  it('allows a clearly distinct name — this is the create path', () => {
    expect(Organization.findSimilarOrganization('Timmy Global Health', all)).toBeNull();
  });

  it('allows an exact normalized match, because that is a JOIN not a creation', () => {
    // resolve() owns exact matching. If findSimilar also refused here, an
    // ordinary signup into an existing organization would be blocked.
    expect(Organization.findSimilarOrganization('puente', all)).toBeNull();
    expect(Organization.findSimilarOrganization('  PUENTE ', all)).toBeNull();
  });

  it('refuses a one-character typo, which would otherwise fork the tenant', () => {
    // The whole reason self-service creation is safe. "Puentte" must not
    // become a second Puente with its own invisible records.
    const hit = Organization.findSimilarOrganization('Puentte', all);

    expect(hit).not.toBeNull();
    expect(hit.organization.get('shortCode')).toEqual('puente');
  });

  it('refuses by containment, which edit distance would wave through', () => {
    // "Puente Colorado" is 9 edits from "Puente" — distance alone allows it.
    // Containment is what catches this class, and it is the common real case.
    const hit = Organization.findSimilarOrganization('Puente Colorado', all);

    expect(hit).not.toBeNull();
    expect(hit.organization.get('shortCode')).toEqual('puente');
  });

  it('compares against aliases, not only the canonical name', () => {
    const hit = Organization.findSimilarOrganization('WOFF', all);

    expect(hit).not.toBeNull();
    expect(hit.organization.get('shortCode')).toEqual('wof');
  });

  it('folds accents, so an accented near-duplicate is still caught', () => {
    const hit = Organization.findSimilarOrganization('Puénte Colorado', all);

    expect(hit).not.toBeNull();
  });

  it('names the string it matched, so the refusal can tell a human what to do', () => {
    const hit = Organization.findSimilarOrganization('Puentte', all);

    expect(hit.matched).toBeDefined();
    expect(typeof hit.reason).toEqual('string');
  });

  it('does not let a very short alias refuse everything by containment', () => {
    // A two-character alias would otherwise be a substring of half the names
    // anyone could type, and no organization could ever be created again.
    const shortAlias = [orgNamed2('dr', 'DR', ['DR'])];

    expect(Organization.findSimilarOrganization('Dominican Republic Mission', shortAlias))
      .toBeNull();
  });

  it('treats a missing name as nothing to compare', () => {
    expect(Organization.findSimilarOrganization(undefined, all)).toBeNull();
    expect(Organization.findSimilarOrganization('', all)).toBeNull();
  });
});
