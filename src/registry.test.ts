import { describe, it, expect } from 'vitest';
import type { Registry } from './registry.js';
import { getHomeConfig, setHomeConfig } from './registry.js';

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
