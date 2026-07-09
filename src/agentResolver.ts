/**
 * resolveAgent — shared agent resolution for commands that accept --agent.
 *
 * Priority order:
 *  1. --agent flag (passed as `flagValue`)
 *  2. AUGY_DEFAULT_AGENT env var
 *  3. Interactive agent selection / detectInstalledAgents()
 *
 * Returns a single Agent or undefined when interactive fallback should be used.
 * Exits with a clear error message if the resolved value is unknown.
 */

import chalk from 'chalk';
import { AGENTS, agentById, detectInstalledAgents } from './agents.js';
import type { Agent } from './agents.js';

/**
 * Resolve a single target agent.
 *
 * @param flagValue - value of --agent CLI flag (may be undefined)
 * @returns the resolved Agent, or undefined if no agent was specified and the
 *          caller should fall back to interactive detection
 */
export function resolveAgent(flagValue?: string): Agent | undefined {
  // 1. CLI flag wins
  const raw = flagValue ?? process.env['AUGY_DEFAULT_AGENT'];
  if (!raw) return undefined; // no explicit preference — caller falls back to detection

  const agent = agentById(raw);
  if (!agent) {
    console.error(
      chalk.red(`Unknown agent: "${raw}"\n`) +
        chalk.dim('Known agents: ' + AGENTS.map((a) => a.id).join(', ')),
    );
    process.exit(1);
  }
  return agent;
}

/**
 * Resolve a single target agent; if none specified, fall back to auto-detection
 * and return the first detected agent. Exits if nothing is found.
 */
export function resolveAgentRequired(flagValue?: string): Agent {
  const explicit = resolveAgent(flagValue);
  if (explicit) return explicit;

  const detected = detectInstalledAgents();
  if (!detected.length) {
    console.error(
      chalk.red('No agent detected and --agent was not set.\n') +
        chalk.dim(
          'Pass --agent <id> or set AUGY_DEFAULT_AGENT.\n' +
            'Known agents: ' +
            AGENTS.map((a) => a.id).join(', '),
        ),
    );
    process.exit(1);
  }
  return detected[0]!;
}
