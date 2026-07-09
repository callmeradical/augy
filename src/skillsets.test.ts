import { describe, it, expect, beforeEach } from 'vitest';
import type { SkillsetsFile } from './skillsets.js';
import {
  createSkillset,
  deleteSkillset,
  getSkillset,
  isValidSkillsetName,
  listSkillsets,
} from './skillsets.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyFile(): SkillsetsFile {
  return { version: 1, skillsets: {} };
}

// ---------------------------------------------------------------------------
// isValidSkillsetName
// ---------------------------------------------------------------------------

describe('isValidSkillsetName', () => {
  it('accepts alphanumeric names', () => {
    expect(isValidSkillsetName('engineering')).toBe(true);
    expect(isValidSkillsetName('research123')).toBe(true);
    expect(isValidSkillsetName('MySet')).toBe(true);
  });

  it('accepts names with hyphens', () => {
    expect(isValidSkillsetName('my-set')).toBe(true);
    expect(isValidSkillsetName('a-b-c')).toBe(true);
  });

  it('rejects names with spaces', () => {
    expect(isValidSkillsetName('my set')).toBe(false);
  });

  it('rejects names with underscores', () => {
    expect(isValidSkillsetName('my_set')).toBe(false);
  });

  it('rejects names with special characters', () => {
    expect(isValidSkillsetName('my/set')).toBe(false);
    expect(isValidSkillsetName('my.set')).toBe(false);
    expect(isValidSkillsetName('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createSkillset
// ---------------------------------------------------------------------------

describe('createSkillset', () => {
  let data: SkillsetsFile;
  beforeEach(() => { data = emptyFile(); });

  it('creates a new skillset with the given name', () => {
    createSkillset(data, 'engineering');
    expect(data.skillsets['engineering']).toBeDefined();
    expect(data.skillsets['engineering']!.name).toBe('engineering');
  });

  it('starts with an empty skills array', () => {
    createSkillset(data, 'engineering');
    expect(data.skillsets['engineering']!.skills).toEqual([]);
  });

  it('sets createdAt and updatedAt as ISO strings', () => {
    createSkillset(data, 'engineering');
    const s = data.skillsets['engineering']!;
    expect(() => new Date(s.createdAt)).not.toThrow();
    expect(() => new Date(s.updatedAt)).not.toThrow();
  });

  it('returns the created skillset', () => {
    const s = createSkillset(data, 'engineering');
    expect(s.name).toBe('engineering');
    expect(s.skills).toEqual([]);
  });

  it('overwrites an existing skillset with the same name', () => {
    createSkillset(data, 'engineering');
    data.skillsets['engineering']!.skills = ['tdd'];
    createSkillset(data, 'engineering');
    expect(data.skillsets['engineering']!.skills).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getSkillset
// ---------------------------------------------------------------------------

describe('getSkillset', () => {
  it('returns undefined for a nonexistent skillset', () => {
    const data = emptyFile();
    expect(getSkillset(data, 'nonexistent')).toBeUndefined();
  });

  it('returns the skillset if it exists', () => {
    const data = emptyFile();
    createSkillset(data, 'research');
    expect(getSkillset(data, 'research')).toBeDefined();
    expect(getSkillset(data, 'research')!.name).toBe('research');
  });
});

// ---------------------------------------------------------------------------
// listSkillsets
// ---------------------------------------------------------------------------

describe('listSkillsets', () => {
  it('returns an empty array when no skillsets exist', () => {
    expect(listSkillsets(emptyFile())).toEqual([]);
  });

  it('returns all skillsets as an array', () => {
    const data = emptyFile();
    createSkillset(data, 'engineering');
    createSkillset(data, 'research');
    const list = listSkillsets(data);
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.name).sort()).toEqual(['engineering', 'research']);
  });
});

// ---------------------------------------------------------------------------
// deleteSkillset
// ---------------------------------------------------------------------------

describe('deleteSkillset', () => {
  it('removes the skillset from the data', () => {
    const data = emptyFile();
    createSkillset(data, 'engineering');
    deleteSkillset(data, 'engineering');
    expect(data.skillsets['engineering']).toBeUndefined();
  });

  it('does not throw if the skillset does not exist', () => {
    const data = emptyFile();
    expect(() => deleteSkillset(data, 'nonexistent')).not.toThrow();
  });

  it('leaves other skillsets intact', () => {
    const data = emptyFile();
    createSkillset(data, 'engineering');
    createSkillset(data, 'research');
    deleteSkillset(data, 'engineering');
    expect(data.skillsets['research']).toBeDefined();
    expect(data.skillsets['engineering']).toBeUndefined();
  });
});
