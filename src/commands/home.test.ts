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
    writeFile: vi.fn(),
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, existsSync: vi.fn() };
});

vi.mock('@clack/prompts', () => ({
  intro:   vi.fn(),
  outro:   vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  isCancel: vi.fn(() => false),
  confirm:  vi.fn(async () => true),
}));

vi.mock('./sync.js', () => ({ syncCommand: vi.fn() }));

const fakeAgent = { id: 'opencode', name: 'OpenCode', skillsPath: '/home/user/.opencode/skills', skillFile: 'SKILL.md' };
vi.mock('../agents.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../agents.js')>();
  return {
    ...actual,
    detectInstalledAgents: vi.fn(() => [fakeAgent]),
    agentSkillPath: (_agent: typeof fakeAgent, name: string) => `/home/user/.opencode/skills/${name}`,
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

let readRegistry:  ReturnType<typeof vi.fn>;
let writeRegistry: ReturnType<typeof vi.fn>;
let cloneRepo:     ReturnType<typeof vi.fn>;
let gitAddAll:     ReturnType<typeof vi.fn>;
let gitCommit:     ReturnType<typeof vi.fn>;
let gitPush:       ReturnType<typeof vi.fn>;
let existsSync:    ReturnType<typeof vi.fn>;
let writeFile:     ReturnType<typeof vi.fn>;

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
  (fsp.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (fsp.cp    as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (fsp.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);

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
    // Manifest should now include the authored skill's newly assigned source
    const [, content] = writeFile.mock.calls[0] as [string, string];
    const manifest = JSON.parse(content) as { skills: Record<string, string> };
    expect(manifest.skills['my-skill']).toContain('alice/my-skills');
    // Registry should be saved with the updated source
    expect(writeRegistry).toHaveBeenCalled();
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

  it('exits when no agents are detected', async () => {
    readRegistry.mockResolvedValue(makeRegistry({
      home: { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' },
    }));
    const agents = await import('../agents.js');
    (agents.detectInstalledAgents as ReturnType<typeof vi.fn>).mockReturnValueOnce([]);
    vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as never);

    await expect(homePullCommand()).rejects.toThrow('exit');
  });

  it('clones the repo and runs syncCommand with the manifest path', async () => {
    existsSync.mockReturnValue(true);
    readRegistry.mockResolvedValue(makeRegistry({
      home: { repo: 'alice/my-skills', path: 'augy.json', skillsPath: 'skills' },
    }));
    const { readdir } = await import('fs/promises');
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]); // no authored skills

    const { syncCommand } = await import('./sync.js');
    const syncMock = syncCommand as ReturnType<typeof vi.fn>;

    await homePullCommand();

    expect(cloneRepo).toHaveBeenCalledWith(
      'https://github.com/alice/my-skills.git',
      expect.stringContaining('augy-home-pull-'),
    );
    expect(syncMock).toHaveBeenCalledOnce();
    const [manifestPath] = syncMock.mock.calls[0] as [string];
    expect(manifestPath).toMatch(/augy-home-pull-.+\/augy\.json$/);
  });
});
