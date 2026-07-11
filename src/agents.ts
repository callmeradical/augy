import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

export interface Agent {
  id: string;
  name: string;
  /** Absolute path where skills are stored for this agent */
  skillsPath: string;
  /** Filename that marks a directory as a skill */
  skillFile: string;
  /**
   * One or more detection signals used to determine whether this agent is
   * actually installed on the current machine.  Evaluated in order — the
   * agent is considered present if ANY signal matches.
   *
   * Signal types:
   *   { bin: 'name' }          — command exists in PATH (which <name>)
   *   { path: '~/.foo' }       — file or directory exists on disk
   *   { env: 'VAR' }           — environment variable is set (non-empty)
   */
  detect: DetectSignal[];
}

export type DetectSignal =
  | { bin: string }
  | { path: string }
  | { env: string };

function h(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

function codexSkillsPath(): string {
  const codexHome = process.env['CODEX_HOME'];
  return codexHome ? join(codexHome, 'skills') : h('~/.codex/skills');
}

export const AGENTS: Agent[] = [
  // ── Tier 1: most widely used ────────────────────────────────────
  {
    id: 'opencode', name: 'OpenCode',
    skillsPath: h('~/.opencode/skills'), skillFile: 'SKILL.md',
    // bin primary; config.json is augy-independent and specific
    detect: [{ bin: 'opencode' }, { path: '~/.opencode/config.json' }],
  },
  {
    id: 'claude', name: 'Claude',
    skillsPath: h('~/.claude/skills'), skillFile: 'SKILL.md',
    // bin primary; settings.json is written by Claude Code on first run
    detect: [{ bin: 'claude' }, { path: '~/.claude/settings.json' }],
  },
  {
    id: 'codex', name: 'Codex',
    skillsPath: codexSkillsPath(), skillFile: 'SKILL.md',
    detect: [{ bin: 'codex' }, { env: 'CODEX_HOME' }],
  },
  {
    id: 'cursor', name: 'Cursor',
    skillsPath: h('~/.cursor/skills'), skillFile: 'SKILL.md',
    // GUI app — .app bundle or its own app-support dir are unambiguous
    detect: [
      { bin: 'cursor' },
      { path: '/Applications/Cursor.app' },
      { path: '~/Applications/Cursor.app' },
      { path: '~/Library/Application Support/Cursor/User/globalStorage' },
    ],
  },
  {
    id: 'windsurf', name: 'Windsurf',
    skillsPath: h('~/.codeium/windsurf/skills'), skillFile: 'SKILL.md',
    detect: [
      { bin: 'windsurf' },
      { path: '/Applications/Windsurf.app' },
      { path: '~/Applications/Windsurf.app' },
      { path: '~/Library/Application Support/Windsurf/User/globalStorage' },
    ],
  },
  {
    id: 'copilot', name: 'GitHub Copilot',
    skillsPath: h('~/.github/skills'), skillFile: 'SKILL.md',
    // gh copilot extension writes to ~/.config/github-copilot
    detect: [{ bin: 'gh' }, { path: '~/.config/github-copilot' }],
  },
  {
    id: 'gemini', name: 'Gemini CLI',
    skillsPath: h('~/.gemini/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'gemini' }, { path: '~/.gemini/settings.json' }],
  },
  {
    id: 'goose', name: 'Goose',
    skillsPath: h('~/.goose/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'goose' }],
  },
  {
    id: 'amp', name: 'Amp',
    skillsPath: h('~/.agents/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'amp' }],
  },
  {
    id: 'roo', name: 'Roo Code',
    skillsPath: h('~/.roo/skills'), skillFile: 'SKILL.md',
    // VS Code extension — extension storage is unambiguous
    detect: [
      { path: '~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline' },
      { path: '~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.roo-cline' },
    ],
  },
  {
    id: 'cline', name: 'Cline',
    skillsPath: h('~/.cline/skills'), skillFile: 'SKILL.md',
    detect: [
      { path: '~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev' },
      { path: '~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev' },
    ],
  },
  // ── Tier 2: growing ─────────────────────────────────────────────
  {
    id: 'kiro', name: 'Kiro',
    skillsPath: h('~/.kiro/skills'), skillFile: 'SKILL.md',
    detect: [
      { bin: 'kiro' },
      { path: '/Applications/Kiro.app' },
      { path: '~/Applications/Kiro.app' },
    ],
  },
  {
    id: 'kimi', name: 'Kimi CLI',
    skillsPath: h('~/.kimi/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'kimi' }],
  },
  {
    id: 'kilocode', name: 'Kilo Code',
    skillsPath: h('~/.kilocode/skills'), skillFile: 'SKILL.md',
    detect: [
      { path: '~/Library/Application Support/Code/User/globalStorage/kilocode.kilo-code' },
    ],
  },
  {
    id: 'trae', name: 'Trae',
    skillsPath: h('~/.trae/skills'), skillFile: 'SKILL.md',
    detect: [
      { bin: 'trae' },
      { path: '/Applications/Trae.app' },
      { path: '~/Applications/Trae.app' },
    ],
  },
  {
    id: 'trae-cn', name: 'Trae CN',
    skillsPath: h('~/.trae-cn/skills'), skillFile: 'SKILL.md',
    detect: [
      { path: '/Applications/Trae CN.app' },
      { path: '~/Applications/Trae CN.app' },
    ],
  },
  {
    id: 'augment', name: 'Augment',
    skillsPath: h('~/.augment/rules'), skillFile: 'SKILL.md',
    detect: [
      { path: '~/Library/Application Support/Code/User/globalStorage/augment.vscode-augment' },
    ],
  },
  {
    id: 'openhands', name: 'OpenHands',
    skillsPath: h('~/.openhands/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'openhands' }, { bin: 'oh' }],
  },
  {
    id: 'replit', name: 'Replit',
    skillsPath: h('~/.replit/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'replit' }],
  },
  {
    id: 'crush', name: 'Crush',
    skillsPath: h('~/.config/crush/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'crush' }],
  },
  // ── Tier 3: long tail ───────────────────────────────────────────
  {
    id: 'antigravity', name: 'Antigravity',
    skillsPath: h('~/.gemini/antigravity/skills'), skillFile: 'SKILL.md',
    // bin dir contains real binaries placed by the Antigravity installer
    detect: [{ path: '~/.gemini/antigravity/bin' }],
  },
  {
    id: 'droid', name: 'Droid',
    skillsPath: h('~/.factory/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'droid' }],
  },
  {
    id: 'openclaw', name: 'OpenClaw',
    skillsPath: h('~/.openclaw/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'openclaw' }],
  },
  {
    id: 'codebuddy', name: 'CodeBuddy',
    skillsPath: h('~/.codebuddy/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'codebuddy' }],
  },
  {
    id: 'commandcode', name: 'Command Code',
    skillsPath: h('~/.commandcode/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'commandcode' }],
  },
  {
    id: 'kode', name: 'Kode',
    skillsPath: h('~/.kode/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'kode' }],
  },
  {
    id: 'mistralvibe', name: 'Mistral Vibe',
    skillsPath: h('~/.vibe/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'vibe' }],
  },
  {
    id: 'mux', name: 'Mux',
    skillsPath: h('~/.mux/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'mux' }],
  },
  {
    id: 'openclaude', name: 'OpenClaude IDE',
    skillsPath: h('~/.openclaude/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'openclaude' }],
  },
  {
    id: 'qoder', name: 'Qoder',
    skillsPath: h('~/.qoder/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'qoder' }],
  },
  {
    id: 'qwen', name: 'Qwen Code',
    skillsPath: h('~/.qwen/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'qwen' }],
  },
  {
    id: 'neovate', name: 'Neovate',
    skillsPath: h('~/.neovate/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'neovate' }],
  },
  {
    id: 'adal', name: 'AdaL',
    skillsPath: h('~/.adal/skills'), skillFile: 'SKILL.md',
    detect: [{ bin: 'adal' }],
  },
];

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** Resolve a signal path, expanding ~ to homedir */
function resolvePath(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

/** Check whether a single detection signal fires */
function signalFires(signal: DetectSignal): boolean {
  if ('bin' in signal) {
    try {
      execSync(`which ${signal.bin}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
  if ('path' in signal) {
    return existsSync(resolvePath(signal.path));
  }
  if ('env' in signal) {
    return Boolean(process.env[signal.env]);
  }
  return false;
}

/** Returns true if at least one detection signal fires for the agent */
export function isAgentInstalled(agent: Agent): boolean {
  return agent.detect.some(signalFires);
}

export function agentById(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function agentSkillPath(agent: Agent, skillName: string): string {
  return join(agent.skillsPath, skillName);
}

/**
 * Returns agents that are detected as installed on this machine.
 * Uses proper detection signals (binary, config path, env var) rather than
 * checking whether the skills directory exists (which augy itself creates).
 */
export function detectInstalledAgents(): Agent[] {
  return AGENTS.filter(isAgentInstalled);
}
