import { homedir } from 'os';
import { join } from 'path';

export interface Agent {
  id: string;
  name: string;
  /** Absolute path where skills are stored for this agent */
  skillsPath: string;
  /** Filename that marks a directory as a skill */
  skillFile: string;
}

function resolveHome(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

function codexSkillsPath(): string {
  const codexHome = process.env['CODEX_HOME'];
  if (codexHome) return join(codexHome, 'skills');
  return resolveHome('~/.codex/skills');
}

export const AGENTS: Agent[] = [
  {
    id: 'opencode',
    name: 'OpenCode',
    skillsPath: resolveHome('~/.opencode/skills'),
    skillFile: 'SKILL.md',
  },
  {
    id: 'claude',
    name: 'Claude',
    skillsPath: resolveHome('~/.claude/skills'),
    skillFile: 'SKILL.md',
  },
  {
    id: 'codex',
    name: 'Codex',
    skillsPath: codexSkillsPath(),
    skillFile: 'SKILL.md',
  },
];

export function agentById(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function agentSkillPath(agent: Agent, skillName: string): string {
  return join(agent.skillsPath, skillName);
}
