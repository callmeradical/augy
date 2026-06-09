import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Registry } from '../registry.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../registry.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../registry.js')>();
  return { ...actual, readRegistry: vi.fn(), writeRegistry: vi.fn() };
});

vi.mock('@clack/prompts', () => ({
  intro:      vi.fn(),
  outro:      vi.fn(),
  note:       vi.fn(),
  spinner:    vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  isCancel:   vi.fn(() => false),
  multiselect: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegistry(skills: Record<string, Partial<{
  name: string; source: string; contexts: string[];
}>> = {}): Registry {
  return {
    version: 1, taps: {}, skills: Object.fromEntries(
      Object.entries(skills).map(([k, v]) => [k, {
        name: k, source: v.source ?? '', gigetSource: '', sha: 'abc',
        shortSha: 'abc1234', installedAt: '', updatedAt: '',
        pinned: false, history: [], agents: {},
        contexts: v.contexts,
      }]),
    ),
  };
}

let readRegistry:  ReturnType<typeof vi.fn>;
let writeRegistry: ReturnType<typeof vi.fn>;
let multiselect:   ReturnType<typeof vi.fn>;
let tagSetCommand:     (skill: string, contexts: string[]) => Promise<void>;
let tagShowCommand:    (skill: string) => Promise<void>;
let tagMigrateCommand: () => Promise<void>;

beforeEach(async () => {
  vi.clearAllMocks();
  const reg = await import('../registry.js');
  readRegistry  = reg.readRegistry  as ReturnType<typeof vi.fn>;
  writeRegistry = reg.writeRegistry as ReturnType<typeof vi.fn>;
  writeRegistry.mockResolvedValue(undefined);

  const clack = await import('@clack/prompts');
  multiselect = clack.multiselect as ReturnType<typeof vi.fn>;

  const mod = await import('./tag.js');
  tagSetCommand     = mod.tagSetCommand;
  tagShowCommand    = mod.tagShowCommand;
  tagMigrateCommand = mod.tagMigrateCommand;
});

// ---------------------------------------------------------------------------
// tagSetCommand
// ---------------------------------------------------------------------------

describe('tagSetCommand', () => {
  it('sets contexts on the skill and saves the registry', async () => {
    readRegistry.mockResolvedValue(makeRegistry({ tdd: {} }));

    await tagSetCommand('tdd', ['work', 'universal']);

    expect(writeRegistry).toHaveBeenCalledOnce();
    const saved = writeRegistry.mock.calls[0]![0] as Registry;
    expect(saved.skills['tdd']!.contexts).toEqual(['work', 'universal']);
  });

  it('replaces existing contexts', async () => {
    readRegistry.mockResolvedValue(makeRegistry({ tdd: { contexts: ['personal'] } }));

    await tagSetCommand('tdd', ['work']);

    const saved = writeRegistry.mock.calls[0]![0] as Registry;
    expect(saved.skills['tdd']!.contexts).toEqual(['work']);
  });

  it('throws when skill is not found', async () => {
    readRegistry.mockResolvedValue(makeRegistry({}));
    await expect(tagSetCommand('no-such-skill', ['work'])).rejects.toThrow(/not found/i);
  });

  it('clears contexts when called with empty array', async () => {
    readRegistry.mockResolvedValue(makeRegistry({ tdd: { contexts: ['personal'] } }));

    await tagSetCommand('tdd', []);

    const saved = writeRegistry.mock.calls[0]![0] as Registry;
    expect(saved.skills['tdd']!.contexts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// tagShowCommand
// ---------------------------------------------------------------------------

describe('tagShowCommand', () => {
  it('throws when skill is not found', async () => {
    readRegistry.mockResolvedValue(makeRegistry({}));
    await expect(tagShowCommand('no-skill')).rejects.toThrow(/not found/i);
  });

  it('resolves without throwing when skill exists', async () => {
    readRegistry.mockResolvedValue(makeRegistry({ tdd: { contexts: ['work'] } }));
    await expect(tagShowCommand('tdd')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// tagMigrateCommand
// ---------------------------------------------------------------------------

describe('tagMigrateCommand', () => {
  it('skips skills that already have contexts', async () => {
    readRegistry.mockResolvedValue(makeRegistry({
      tdd:    { contexts: ['work'] },   // already tagged
      commit: {},                        // untagged — needs migration
    }));
    multiselect.mockResolvedValue(['universal']);

    await tagMigrateCommand();

    // writeRegistry called once per untagged skill (only commit)
    expect(writeRegistry).toHaveBeenCalledOnce();
    const saved = writeRegistry.mock.calls[0]![0] as Registry;
    expect(saved.skills['tdd']!.contexts).toEqual(['work']);     // unchanged
    expect(saved.skills['commit']!.contexts).toEqual(['universal']);
  });

  it('prompts once per untagged skill', async () => {
    readRegistry.mockResolvedValue(makeRegistry({
      a: {}, b: {}, c: { contexts: ['personal'] },
    }));
    multiselect.mockResolvedValue(['work']);

    await tagMigrateCommand();

    expect(multiselect).toHaveBeenCalledTimes(2); // a and b, not c
  });

  it('saves immediately after each skill so progress is not lost', async () => {
    readRegistry.mockResolvedValue(makeRegistry({ a: {}, b: {} }));
    multiselect.mockResolvedValue(['universal']);

    await tagMigrateCommand();

    expect(writeRegistry).toHaveBeenCalledTimes(2);
  });

  it('outputs a summary when no skills need migration', async () => {
    readRegistry.mockResolvedValue(makeRegistry({
      tdd: { contexts: ['work'] },
    }));
    const { outro } = await import('@clack/prompts');

    await tagMigrateCommand();

    expect(outro).toHaveBeenCalled();
    expect(multiselect).not.toHaveBeenCalled();
  });
});
