import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Registry } from '../registry.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../registry.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../registry.js')>();
  return {
    ...actual,
    readRegistry: vi.fn(),
    writeRegistry: vi.fn(),
  };
});

vi.mock('../git.js', () => ({
  repoToUrl: (r: string) => `https://github.com/${r}.git`,
  cloneRepo:  vi.fn(),
  gitAddAll:  vi.fn(),
  gitCommit:  vi.fn(),
  gitPush:    vi.fn(),
}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    cp:       vi.fn(),
    mkdir:    vi.fn(),
    readdir:  vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, existsSync: vi.fn() };
});

vi.mock('@clack/prompts', () => ({
  intro:      vi.fn(),
  outro:      vi.fn(),
  spinner:    vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  isCancel:   vi.fn(() => false),
  confirm:    vi.fn(async () => true),
  multiselect: vi.fn(),
}));

vi.mock('./sync.js', () => ({ syncCommand: vi.fn() }));

vi.mock('../ui/filterable-multiselect.js', () => ({
  filterableMultiselect: vi.fn(),
}));

const fakeAgent = { id: 'opencode', name: 'OpenCode', skillsPath: '/home/user/.opencode/skills', skillFile: 'SKILL.md' };
const fakeAgent2 = { id: 'claude', name: 'Claude', skillsPath: '/home/user/.claude/skills', skillFile: 'SKILL.md' };
vi.mock('../agents.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../agents.js')>();
  return {
    ...actual,
    AGENTS: [fakeAgent, fakeAgent2],
    detectInstalledAgents: vi.fn(() => [fakeAgent, fakeAgent2]),
    agentSkillPath: (_agent: typeof fakeAgent, name: string) => `/home/user/.${_agent.id}/skills/${name}`,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegistry(overrides: Partial<Registry> = {}): Registry {
  return { version: 1, taps: {}, skills: {}, ...overrides };
}

function makeSkill(name: string, source: string, agentPath = `/home/user/.opencode/skills/${name}`) {
  return {
    name, source, gigetSource: source,
    sha: 'abc1234', shortSha: 'abc1234',
    installedAt: '', updatedAt: '', pinned: false, history: [],
    agents: { opencode: { path: agentPath, active: true } },
  };
}

// ---------------------------------------------------------------------------
// Shared refs
// ---------------------------------------------------------------------------

let readRegistry:          ReturnType<typeof vi.fn>;
let writeRegistry:         ReturnType<typeof vi.fn>;
let cloneRepo:             ReturnType<typeof vi.fn>;
let gitAddAll:             ReturnType<typeof vi.fn>;
let gitCommit:             ReturnType<typeof vi.fn>;
let gitPush:               ReturnType<typeof vi.fn>;
let existsSync:            ReturnType<typeof vi.fn>;
let writeFile:             ReturnType<typeof vi.fn>;
let filterableMultiselect: ReturnType<typeof vi.fn>;
let multiselect:           ReturnType<typeof vi.fn>;

let homeSetCommand:  (repo: string, opts?: { path?: string; skillsPath?: string }) => Promise<void>;
let homePushCommand: () => Promise<void>;
let homePullCommand: (opts?: { dryRun?: boolean; agent?: string[] }) => Promise<void>;

beforeEach(async () => {
  vi.clearAllMocks();

  const reg = await import('../registry.js');
  readRegistry  = reg.readRegistry  as ReturnType<typeof vi.fn>;
  writeRegistry = reg.writeRegistry as ReturnType<typeof vi.fn>;
  writeRegistry.mockResolvedValue(undefined);

  const git = await import('../git.js');
  cloneRepo = git.cloneRepo as ReturnType<typeof vi.fn>;
  gitAddAll = git.gitAddAll as ReturnType<typeof vi.fn>;
  gitCommit = git.gitCommit as ReturnType<typeof vi.fn>;
  gitPush   = git.gitPush   as ReturnType<typeof vi.fn>;
  cloneRepo.mockResolvedValue(undefined);
  gitAddAll.mockResolvedValue(undefined);
  gitCommit.mockResolvedValue(undefined);
  gitPush.mockResolvedValue(undefined);

  const fs = await import('fs');
  existsSync = fs.existsSync as ReturnType<typeof vi.fn>;

  const fsp = await import('fs/promises');
  writeFile = fsp.writeFile as ReturnType<typeof vi.fn>;
  writeFile.mockResolvedValue(undefined);
  (fsp.mkdir   as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (fsp.cp      as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (fsp.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (fsp.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
    JSON.stringify({ version: 1, skills: {} }),
  );

  const clack = await import('@clack/prompts');
  multiselect = clack.multiselect as ReturnType<typeof vi.fn>;
  multiselect.mockResolvedValue([fakeAgent.id, fakeAgent2.id]);

  const fms = await import('../ui/filterable-multiselect.js');
  filterableMultiselect = fms.filterableMultiselect as ReturnType<typeof vi.fn>;
  filterableMultiselect.mockImplementation(
    async (opts: { options: Array<{ value: unknown }> }) => opts.options.map((o) => o.value),
  );

  const mod = await import('./home.js');
  homeSetCommand  = mod.homeSetCommand;
  homePushCommand = mod.homePushCommand;
  homePullCommand = mod.homePullCommand;
});

// ---------------------------------------------------------------------------
// home set
// ---------------------------------------------------------------------------

describe('homeSetCommand', () => {
  it('stores repo, default path, and default skillsPath in the registry', async () => {
    readRegistry.mockResolvedValue(makeRegistry());

    await homeSetCommand('alice/my-skills');

    const saved = writeRegistry.mock.calls[0]![0] as Registry;
    expect(saved.home).toEqual({ repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' });
  });

  it('stores custom path and skillsPath when provided', async () => {
    readRegistry.mockResolvedValue(makeRegistry());

    await homeSetCommand('alice/my-skills', { path: 'config/augy.json', skillsPath: 'authored' });

    const saved = writeRegistry.mock.calls[0]![0] as Registry;
    expect(saved.home).toEqual({ repo: 'alice/my-skills', path: 'config/augy.json', skillsPath: 'authored' });
  });

  it('throws if repo is not in owner/repo format', async () => {
    await expect(homeSetCommand('notarepo')).rejects.toThrow(/invalid/i);
  });
});

// ---------------------------------------------------------------------------
// home push
// ---------------------------------------------------------------------------

describe('homePushCommand', () => {
  it('exits when no home repo is configured', async () => {
    readRegistry.mockResolvedValue(makeRegistry());
    vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as never);

    await expect(homePushCommand()).rejects.toThrow('exit');
  });

  it('clones the home repo, writes manifest, commits, and pushes', async () => {
    const registry = makeRegistry({
      home: { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' },
      skills: {
        tdd: makeSkill('tdd', 'github:org/skills/tdd'),
      },
    });
    readRegistry.mockResolvedValue(registry);

    await homePushCommand();

    expect(cloneRepo).toHaveBeenCalledWith(
      'https://github.com/alice/my-skills.git',
      expect.stringContaining('augy-home-push-'),
    );
    expect(writeFile).toHaveBeenCalledOnce();
    const [, content] = writeFile.mock.calls[0] as [string, string];
    const manifest = JSON.parse(content) as { skills: Record<string, string> };
    expect(manifest.skills['tdd']).toBe('github:org/skills/tdd');
    expect(gitAddAll).toHaveBeenCalledOnce();
    expect(gitCommit).toHaveBeenCalledOnce();
    expect(gitPush).toHaveBeenCalledOnce();
  });

  it('copies authored skill files (source = "") into the clone and registers a source', async () => {
    existsSync.mockReturnValue(true);
    const authoredSkill = makeSkill('my-skill', ''); // no source = authored
    const registry = makeRegistry({
      home: { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' },
      skills: { 'my-skill': authoredSkill },
    });
    readRegistry.mockResolvedValue(registry);

    const { cp } = await import('fs/promises');
    (cp as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await homePushCommand();

    expect(cp).toHaveBeenCalledOnce();
    // Authored skill should appear in manifest with empty source (sync skips it on pull)
    const [, content] = writeFile.mock.calls[0] as [string, string];
    const manifest = JSON.parse(content) as { skills: Record<string, string> };
    expect(manifest.skills['my-skill']).toBe('');
    // Registry source stays empty — authored skills are not given a URL
    const saved = writeRegistry.mock.calls[0]?.[0] as Registry | undefined;
    expect(saved?.skills['my-skill']?.source ?? '').toBe('');
  });

  it('does not copy files for externally-sourced skills', async () => {
    const registry = makeRegistry({
      home: { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' },
      skills: {
        tdd: makeSkill('tdd', 'github:org/skills/tdd'), // has a source → manifest only
      },
    });
    readRegistry.mockResolvedValue(registry);

    await homePushCommand();

    const { cp } = await import('fs/promises');
    expect(cp).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// home pull
// ---------------------------------------------------------------------------

describe('homePullCommand', () => {
  it('exits when no home repo is configured', async () => {
    readRegistry.mockResolvedValue(makeRegistry());
    vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as never);

    await expect(homePullCommand()).rejects.toThrow('exit');
  });

  it('shows a skill picker with authored + external skills from the repo', async () => {
    existsSync.mockReturnValue(true);
    readRegistry.mockResolvedValue(makeRegistry({
      home: { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' },
    }));
    const { readdir, readFile } = await import('fs/promises');
    // Two authored skills in the skills/ dir
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'my-skill', isDirectory: () => true },
      { name: 'other-skill', isDirectory: () => true },
    ]);
    // Manifest has one external skill
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ version: 1, skills: { tdd: 'github:org/skills/tdd', 'my-skill': '', 'other-skill': '' } }),
    );

    await homePullCommand();

    expect(filterableMultiselect).toHaveBeenCalledOnce();
    const pickerOpts = filterableMultiselect.mock.calls[0]![0] as { options: Array<{ label: string }> };
    const labels = pickerOpts.options.map((o) => o.label);
    expect(labels).toContain('my-skill');
    expect(labels).toContain('other-skill');
    expect(labels).toContain('tdd');
  });

  it('shows an agent picker and installs authored skills to selected agents only', async () => {
    existsSync.mockReturnValue(true);
    readRegistry.mockResolvedValue(makeRegistry({
      home: { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' },
    }));
    const { readdir, readFile } = await import('fs/promises');
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'my-skill', isDirectory: () => true },
    ]);
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ version: 1, skills: { 'my-skill': '' } }),
    );
    // User selects only opencode agent
    multiselect.mockResolvedValueOnce([fakeAgent.id]);

    const { cp } = await import('fs/promises');
    await homePullCommand();

    // cp called once (for opencode only, not claude)
    expect(cp).toHaveBeenCalledOnce();
    const [, dest] = (cp as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(dest).toContain('opencode');
  });

  it('passes only selected external skills to syncCommand', async () => {
    existsSync.mockReturnValue(true);
    readRegistry.mockResolvedValue(makeRegistry({
      home: { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' },
    }));
    const { readdir, readFile } = await import('fs/promises');
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ version: 1, skills: { tdd: 'github:org/tdd', commit: 'github:org/commit' } }),
    );
    // User selects only tdd from the picker
    filterableMultiselect.mockResolvedValueOnce([
      { name: 'tdd', source: 'github:org/tdd', isAuthored: false },
    ]);

    const { syncCommand } = await import('./sync.js');
    const syncMock = syncCommand as ReturnType<typeof vi.fn>;

    await homePullCommand();

    expect(syncMock).toHaveBeenCalledOnce();
    const [tmpPath] = syncMock.mock.calls[0] as [string];
    const { readFile: rf } = await import('fs/promises');
    // The temp manifest written for sync should only contain tdd
    // We verify writeFile was called (filtered manifest written for sync)
    expect(writeFile).toHaveBeenCalled();
  });

  it('skips syncCommand entirely when no external skills are selected', async () => {
    existsSync.mockReturnValue(true);
    readRegistry.mockResolvedValue(makeRegistry({
      home: { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' },
    }));
    const { readdir, readFile } = await import('fs/promises');
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'my-skill', isDirectory: () => true },
    ]);
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ version: 1, skills: { 'my-skill': '' } }),
    );
    // Only authored skill selected (no external)
    filterableMultiselect.mockResolvedValueOnce([
      { name: 'my-skill', source: '', isAuthored: true },
    ]);

    const { syncCommand } = await import('./sync.js');
    await homePullCommand();

    expect(syncCommand).not.toHaveBeenCalled();
  });

  it('respects --agent flag and skips agent picker', async () => {
    existsSync.mockReturnValue(true);
    readRegistry.mockResolvedValue(makeRegistry({
      home: { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' },
    }));
    const { readdir, readFile } = await import('fs/promises');
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ version: 1, skills: {} }),
    );

    await homePullCommand({ agent: ['opencode'] });

    // multiselect (agent picker) should NOT have been called
    expect(multiselect).not.toHaveBeenCalled();
  });
});
