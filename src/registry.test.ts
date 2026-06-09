import { describe, it, expect } from 'vitest';
import type { Registry } from './registry.js';
import { getHomeConfig, setHomeConfig, skillMatchesContext } from './registry.js';

// ---------------------------------------------------------------------------
// Helpers to build a minimal registry for testing
// ---------------------------------------------------------------------------

function emptyRegistry(): Registry {
  return { version: 1, taps: {}, skills: {} };
}

// ---------------------------------------------------------------------------
// Home config
// ---------------------------------------------------------------------------

describe('getHomeConfig', () => {
  it('returns undefined when no home is configured', () => {
    const reg = emptyRegistry();
    expect(getHomeConfig(reg)).toBeUndefined();
  });

  it('returns the stored home config', () => {
    const reg = emptyRegistry();
    reg.home = { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' };
    expect(getHomeConfig(reg)).toEqual({ repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' });
  });
});

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

describe('skillMatchesContext', () => {
  it('matches when skill has no contexts (treated as universal)', () => {
    expect(skillMatchesContext(undefined, 'work')).toBe(true);
    expect(skillMatchesContext([], 'work')).toBe(true);
  });

  it('matches when skill is tagged universal', () => {
    expect(skillMatchesContext(['universal'], 'work')).toBe(true);
    expect(skillMatchesContext(['universal'], 'personal')).toBe(true);
  });

  it('matches when skill context includes the requested context', () => {
    expect(skillMatchesContext(['work'], 'work')).toBe(true);
    expect(skillMatchesContext(['work', 'personal'], 'personal')).toBe(true);
  });

  it('does not match when skill context does not include requested context', () => {
    expect(skillMatchesContext(['personal'], 'work')).toBe(false);
    expect(skillMatchesContext(['work'], 'personal')).toBe(false);
  });

  it('matches anything when no context filter is specified', () => {
    expect(skillMatchesContext(['personal'], undefined)).toBe(true);
    expect(skillMatchesContext(['work'], undefined)).toBe(true);
    expect(skillMatchesContext([], undefined)).toBe(true);
  });
});

describe('setHomeConfig', () => {
  it('stores repo, path, and skillsPath in the registry', () => {
    const reg = emptyRegistry();
    setHomeConfig(reg, { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' });
    expect(reg.home).toEqual({ repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' });
  });

  it('overwrites an existing home config', () => {
    const reg = emptyRegistry();
    reg.home = { repo: 'old/repo', path: 'old.json', skillsPath: '' };
    setHomeConfig(reg, { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' });
    expect(reg.home).toEqual({ repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' });
  });
});
