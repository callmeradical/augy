import { describe, it, expect } from 'vitest';
import type { Registry } from '../registry.js';
import type { Agent } from '../agents.js';
import { findAdditionalAgentInstalls } from './scan.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegistry(skills: Record<string, { agents: Record<string, { path: string; active: boolean }> }>): Registry {
  const skillEntries = Object.fromEntries(
    Object.entries(skills).map(([name, s]) => [
      name,
      {
        name, source: '', gigetSource: '', sha: 'abc', shortSha: 'abc1234',
        installedAt: '', updatedAt: '', pinned: false, history: [],
        agents: s.agents,
      },
    ]),
  );
  return { version: 1, taps: {}, skills: skillEntries };
}

function makeAgent(id: string, name: string): Agent {
  return { id, name, skillsPath: `/home/.${id}/skills`, skillFile: 'SKILL.md' };
}

type OnDisk = Map<string, Array<{ agent: Agent; path: string }>>;

// ---------------------------------------------------------------------------
// findAdditionalAgentInstalls
// ---------------------------------------------------------------------------

describe('findAdditionalAgentInstalls', () => {
  it('returns empty when all tracked agent paths are already registered', () => {
    const opencode = makeAgent('opencode', 'OpenCode');
    const onDisk: OnDisk = new Map([
      ['commit', [{ agent: opencode, path: '/home/.opencode/skills/commit' }]],
    ]);
    const registry = makeRegistry({
      commit: { agents: { opencode: { path: '/home/.opencode/skills/commit', active: true } } },
    });

    expect(findAdditionalAgentInstalls(onDisk, registry)).toEqual([]);
  });

  it('ignores untracked skills (those not in the registry)', () => {
    const opencode = makeAgent('opencode', 'OpenCode');
    const onDisk: OnDisk = new Map([
      ['new-skill', [{ agent: opencode, path: '/home/.opencode/skills/new-skill' }]],
    ]);
    const registry = makeRegistry({}); // new-skill not tracked

    expect(findAdditionalAgentInstalls(onDisk, registry)).toEqual([]);
  });

  it('returns new agent paths for a skill already tracked under a different agent', () => {
    const opencode = makeAgent('opencode', 'OpenCode');
    const claude   = makeAgent('claude',   'Claude');
    const onDisk: OnDisk = new Map([
      ['commit', [
        { agent: opencode, path: '/home/.opencode/skills/commit' },
        { agent: claude,   path: '/home/.claude/skills/commit' },
      ]],
    ]);
    // commit is only registered for opencode so far
    const registry = makeRegistry({
      commit: { agents: { opencode: { path: '/home/.opencode/skills/commit', active: true } } },
    });

    const result = findAdditionalAgentInstalls(onDisk, registry);
    expect(result).toHaveLength(1);
    expect(result[0]!.skillName).toBe('commit');
    expect(result[0]!.newAgents).toHaveLength(1);
    expect(result[0]!.newAgents[0]!.agent.id).toBe('claude');
    expect(result[0]!.newAgents[0]!.path).toBe('/home/.claude/skills/commit');
  });

  it('handles multiple skills with multiple new agent paths each', () => {
    const opencode = makeAgent('opencode', 'OpenCode');
    const claude   = makeAgent('claude',   'Claude');
    const codex    = makeAgent('codex',    'Codex');
    const onDisk: OnDisk = new Map([
      ['tdd',    [{ agent: opencode, path: '/home/.opencode/skills/tdd' },
                  { agent: claude,   path: '/home/.claude/skills/tdd' }]],
      ['commit', [{ agent: opencode, path: '/home/.opencode/skills/commit' },
                  { agent: codex,    path: '/home/.codex/skills/commit' }]],
    ]);
    const registry = makeRegistry({
      tdd:    { agents: { opencode: { path: '/home/.opencode/skills/tdd',    active: true } } },
      commit: { agents: { opencode: { path: '/home/.opencode/skills/commit', active: true } } },
    });

    const result = findAdditionalAgentInstalls(onDisk, registry);
    expect(result).toHaveLength(2);
    const tddResult    = result.find((r) => r.skillName === 'tdd')!;
    const commitResult = result.find((r) => r.skillName === 'commit')!;
    expect(tddResult.newAgents[0]!.agent.id).toBe('claude');
    expect(commitResult.newAgents[0]!.agent.id).toBe('codex');
  });
});
