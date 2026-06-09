import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Registry } from '../registry.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../registry.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../registry.js')>();
  return { ...actual, readRegistry: vi.fn(), writeRegistry: vi.fn() };
});

vi.mock('../agents.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../agents.js')>();
  return {
    ...actual,
    detectInstalledAgents: vi.fn(() => [
      { id: 'opencode', name: 'OpenCode', skillsPath: '/home/.opencode/skills', skillFile: 'SKILL.md' },
    ]),
    agentSkillPath: (_a: unknown, name: string) => `/home/.opencode/skills/${name}`,
  };
});

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return { ...actual, mkdir: vi.fn(), writeFile: vi.fn() };
});

vi.mock('child_process', () => ({ spawn: vi.fn() }));

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(), outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  multiselect: vi.fn(),
  isCancel: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

function makeRegistry(skills: Record<string, unknown> = {}): Registry {
  return { version: 1, taps: {}, skills: skills as Registry['skills'] };
}

let readRegistry:  ReturnType<typeof vi.fn>;
let writeRegistry: ReturnType<typeof vi.fn>;
let mkdir:         ReturnType<typeof vi.fn>;
let writeFile:     ReturnType<typeof vi.fn>;
let spawn:         ReturnType<typeof vi.fn>;
let multiselect:   ReturnType<typeof vi.fn>;

let authorNewCommand:  (name: string, opts?: { noEdit?: boolean }) => Promise<void>;
let authorEditCommand: (name: string) => Promise<void>;

beforeEach(async () => {
  vi.clearAllMocks();

  const reg = await import('../registry.js');
  readRegistry  = reg.readRegistry  as ReturnType<typeof vi.fn>;
  writeRegistry = reg.writeRegistry as ReturnType<typeof vi.fn>;
  writeRegistry.mockResolvedValue(undefined);

  const fsp = await import('fs/promises');
  mkdir     = fsp.mkdir     as ReturnType<typeof vi.fn>;
  writeFile = fsp.writeFile as ReturnType<typeof vi.fn>;
  mkdir.mockResolvedValue(undefined);
  writeFile.mockResolvedValue(undefined);

  const cp = await import('child_process');
  spawn = cp.spawn as ReturnType<typeof vi.fn>;
  spawn.mockReturnValue({ on: vi.fn(), unref: vi.fn() });

  const prompts = await import('@clack/prompts');
  multiselect = prompts.multiselect as ReturnType<typeof vi.fn>;

  const mod = await import('./author.js');
  authorNewCommand  = mod.authorNewCommand;
  authorEditCommand = mod.authorEditCommand;
});

// ---------------------------------------------------------------------------
// authorNewCommand
// ---------------------------------------------------------------------------

describe('authorNewCommand', () => {
  it('creates the skill directory and SKILL.md for each selected agent', async () => {
    readRegistry.mockResolvedValue(makeRegistry());
    multiselect.mockResolvedValue(['opencode']);

    await authorNewCommand('my-skill', { noEdit: true });

    expect(mkdir).toHaveBeenCalledWith('/home/.opencode/skills/my-skill', { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      '/home/.opencode/skills/my-skill/SKILL.md',
      expect.stringContaining('my-skill'),
      'utf8',
    );
  });

  it('registers the new skill in the registry with no source', async () => {
    readRegistry.mockResolvedValue(makeRegistry());
    multiselect.mockResolvedValue(['opencode']);

    await authorNewCommand('my-skill', { noEdit: true });

    expect(writeRegistry).toHaveBeenCalledOnce();
    const saved = writeRegistry.mock.calls[0]![0] as Registry;
    expect(saved.skills['my-skill']).toMatchObject({
      name: 'my-skill',
      source: '',
      sha: 'unversioned',
    });
    expect(saved.skills['my-skill']!.agents['opencode']).toBeDefined();
  });

  it('opens the skill in $EDITOR after creating (unless noEdit)', async () => {
    readRegistry.mockResolvedValue(makeRegistry());
    multiselect.mockResolvedValue(['opencode']);
    process.env['EDITOR'] = 'code';

    await authorNewCommand('my-skill');

    expect(spawn).toHaveBeenCalledWith('code', ['/home/.opencode/skills/my-skill'], expect.any(Object));
  });

  it('does not open editor when --no-edit flag is set', async () => {
    readRegistry.mockResolvedValue(makeRegistry());
    multiselect.mockResolvedValue(['opencode']);

    await authorNewCommand('my-skill', { noEdit: true });

    expect(spawn).not.toHaveBeenCalled();
  });

  it('errors if the skill name already exists in the registry', async () => {
    readRegistry.mockResolvedValue(makeRegistry({
      'my-skill': { name: 'my-skill', source: '', sha: 'abc', shortSha: 'abc1234',
        gigetSource: '', installedAt: '', updatedAt: '', pinned: false, history: [], agents: {} },
    }));

    await expect(authorNewCommand('my-skill', { noEdit: true })).rejects.toThrow(/already exists/i);
  });
});

// ---------------------------------------------------------------------------
// authorEditCommand
// ---------------------------------------------------------------------------

describe('authorEditCommand', () => {
  it('opens the first active agent path in $EDITOR', async () => {
    readRegistry.mockResolvedValue(makeRegistry({
      'my-skill': {
        name: 'my-skill', source: '', sha: 'abc', shortSha: 'abc1234',
        gigetSource: '', installedAt: '', updatedAt: '', pinned: false, history: [],
        agents: { opencode: { path: '/home/.opencode/skills/my-skill', active: true } },
      },
    }));
    process.env['EDITOR'] = 'vim';

    await authorEditCommand('my-skill');

    expect(spawn).toHaveBeenCalledWith('vim', ['/home/.opencode/skills/my-skill'], expect.any(Object));
  });

  it('throws if the skill is not in the registry', async () => {
    readRegistry.mockResolvedValue(makeRegistry());

    await expect(authorEditCommand('no-such-skill')).rejects.toThrow(/not found/i);
  });

  it('throws if no active agent path exists for the skill', async () => {
    readRegistry.mockResolvedValue(makeRegistry({
      'ghost-skill': {
        name: 'ghost-skill', source: '', sha: 'abc', shortSha: 'abc1234',
        gigetSource: '', installedAt: '', updatedAt: '', pinned: false, history: [],
        agents: {},
      },
    }));

    await expect(authorEditCommand('ghost-skill')).rejects.toThrow(/no.*path/i);
  });
});
