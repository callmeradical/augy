import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

export interface Agent {
  id: string;
  name: string;
  /** Absolute path where skills are stored for this agent */
  skillsPath: string;
  /** Filename that marks a directory as a skill */
  skillFile: string;
}

function h(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

function codexSkillsPath(): string {
  const codexHome = process.env['CODEX_HOME'];
  return codexHome ? join(codexHome, 'skills') : h('~/.codex/skills');
}

export const AGENTS: Agent[] = [
  // ── Tier 1: most widely used ────────────────────────────────────
  { id: 'opencode',      name: 'OpenCode',       skillsPath: h('~/.opencode/skills'),                  skillFile: 'SKILL.md' },
  { id: 'claude',        name: 'Claude',          skillsPath: h('~/.claude/skills'),                    skillFile: 'SKILL.md' },
  { id: 'codex',         name: 'Codex',           skillsPath: codexSkillsPath(),                        skillFile: 'SKILL.md' },
  { id: 'cursor',        name: 'Cursor',          skillsPath: h('~/.cursor/skills'),                    skillFile: 'SKILL.md' },
  { id: 'windsurf',      name: 'Windsurf',        skillsPath: h('~/.codeium/windsurf/skills'),          skillFile: 'SKILL.md' },
  { id: 'copilot',       name: 'GitHub Copilot',  skillsPath: h('~/.github/skills'),                    skillFile: 'SKILL.md' },
  { id: 'gemini',        name: 'Gemini CLI',      skillsPath: h('~/.gemini/skills'),                    skillFile: 'SKILL.md' },
  { id: 'goose',         name: 'Goose',           skillsPath: h('~/.goose/skills'),                     skillFile: 'SKILL.md' },
  { id: 'amp',           name: 'Amp',             skillsPath: h('~/.agents/skills'),                    skillFile: 'SKILL.md' },
  { id: 'roo',           name: 'Roo Code',        skillsPath: h('~/.roo/skills'),                       skillFile: 'SKILL.md' },
  { id: 'cline',         name: 'Cline',           skillsPath: h('~/.cline/skills'),                     skillFile: 'SKILL.md' },
  // ── Tier 2: growing ─────────────────────────────────────────────
  { id: 'kiro',          name: 'Kiro',            skillsPath: h('~/.kiro/skills'),                      skillFile: 'SKILL.md' },
  { id: 'kimi',          name: 'Kimi CLI',        skillsPath: h('~/.kimi/skills'),                      skillFile: 'SKILL.md' },
  { id: 'kilocode',      name: 'Kilo Code',       skillsPath: h('~/.kilocode/skills'),                  skillFile: 'SKILL.md' },
  { id: 'trae',          name: 'Trae',            skillsPath: h('~/.trae/skills'),                      skillFile: 'SKILL.md' },
  { id: 'trae-cn',       name: 'Trae CN',         skillsPath: h('~/.trae-cn/skills'),                   skillFile: 'SKILL.md' },
  { id: 'augment',       name: 'Augment',         skillsPath: h('~/.augment/rules'),                    skillFile: 'SKILL.md' },
  { id: 'openhands',     name: 'OpenHands',       skillsPath: h('~/.openhands/skills'),                 skillFile: 'SKILL.md' },
  { id: 'replit',        name: 'Replit',          skillsPath: h('~/.replit/skills'),                    skillFile: 'SKILL.md' },
  { id: 'crush',         name: 'Crush',           skillsPath: h('~/.config/crush/skills'),              skillFile: 'SKILL.md' },
  // ── Tier 3: long tail ───────────────────────────────────────────
  { id: 'antigravity',   name: 'Antigravity',     skillsPath: h('~/.gemini/antigravity/skills'),        skillFile: 'SKILL.md' },
  { id: 'droid',         name: 'Droid',           skillsPath: h('~/.factory/skills'),                   skillFile: 'SKILL.md' },
  { id: 'openclaw',      name: 'OpenClaw',        skillsPath: h('~/.openclaw/skills'),                  skillFile: 'SKILL.md' },
  { id: 'codebuddy',     name: 'CodeBuddy',       skillsPath: h('~/.codebuddy/skills'),                 skillFile: 'SKILL.md' },
  { id: 'commandcode',   name: 'Command Code',    skillsPath: h('~/.commandcode/skills'),               skillFile: 'SKILL.md' },
  { id: 'kode',          name: 'Kode',            skillsPath: h('~/.kode/skills'),                      skillFile: 'SKILL.md' },
  { id: 'mistralvibe',   name: 'Mistral Vibe',    skillsPath: h('~/.vibe/skills'),                      skillFile: 'SKILL.md' },
  { id: 'mux',           name: 'Mux',             skillsPath: h('~/.mux/skills'),                       skillFile: 'SKILL.md' },
  { id: 'openclaude',    name: 'OpenClaude IDE',  skillsPath: h('~/.openclaude/skills'),                skillFile: 'SKILL.md' },
  { id: 'qoder',         name: 'Qoder',           skillsPath: h('~/.qoder/skills'),                     skillFile: 'SKILL.md' },
  { id: 'qwen',          name: 'Qwen Code',       skillsPath: h('~/.qwen/skills'),                      skillFile: 'SKILL.md' },
  { id: 'neovate',       name: 'Neovate',         skillsPath: h('~/.neovate/skills'),                   skillFile: 'SKILL.md' },
  { id: 'adal',          name: 'AdaL',            skillsPath: h('~/.adal/skills'),                      skillFile: 'SKILL.md' },
];

export function agentById(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function agentSkillPath(agent: Agent, skillName: string): string {
  return join(agent.skillsPath, skillName);
}

/**
 * Returns agents whose skills directory already exists on disk.
 * Used to pre-select agents in install/scan prompts.
 */
export function detectInstalledAgents(): Agent[] {
  return AGENTS.filter((a) => existsSync(a.skillsPath));
}
