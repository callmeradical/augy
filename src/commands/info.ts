/**
 * augy info <skill>
 *
 * Display full metadata for an installed skill:
 *   - Source, tap, SHA, dates, pin status
 *   - Agent deployment paths
 *   - Full version history
 *   - First meaningful lines of SKILL.md as a description
 */

import chalk from 'chalk';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

import { AGENTS } from '../agents.js';
import { getSkill, listTaps, readRegistry, shortSha } from '../registry.js';
import { archiveExists } from '../versions.js';

export async function infoCommand(nameArg: string): Promise<void> {
  const registry = await readRegistry();
  const skill = getSkill(registry, nameArg);

  if (!skill) {
    console.error(
      chalk.red(`Skill "${nameArg}" not found.`) +
        chalk.dim(' Run `augy list` to see installed skills.'),
    );
    process.exit(1);
  }

  const hr = chalk.dim('─'.repeat(50));

  // Header
  console.log();
  console.log(`  ${chalk.cyan.bold(skill.name)}` + (skill.label ? `  ${chalk.dim(skill.label)}` : ''));
  console.log(`  ${hr}`);

  // Source + tap
  console.log(`  ${label('source')}  ${skill.source}`);
  if (skill.tap) {
    const tap = registry.taps[skill.tap];
    const tapDesc = tap?.description ? `  ${chalk.dim('—')}  ${tap.description}` : '';
    console.log(`  ${label('tap')}     ${chalk.cyan(skill.tap)}${tapDesc}`);
  }

  // SHA + dates
  console.log(
    `  ${label('sha')}     ${chalk.green(skill.shortSha)}` +
      chalk.dim(`  (full: ${skill.sha})`),
  );
  console.log(`  ${label('installed')} ${fmtDate(skill.installedAt)}`);
  if (skill.updatedAt !== skill.installedAt) {
    console.log(`  ${label('updated')}   ${fmtDate(skill.updatedAt)}`);
  }
  console.log(
    `  ${label('pinned')}    ${skill.pinned ? chalk.yellow('yes  (skipped during `augy update`)') : chalk.dim('no')}`,
  );

  // Agent deployments
  console.log();
  console.log(`  ${chalk.bold('Agents')}`);
  const agentEntries = Object.entries(skill.agents);
  if (!agentEntries.length) {
    console.log(`  ${chalk.dim('  (none)')}`);
  } else {
    for (const [agentId, install] of agentEntries) {
      const agentDef = AGENTS.find((a) => a.id === agentId);
      const agentName = agentDef?.name ?? agentId;
      const exists = existsSync(install.path);
      const pathStatus = exists
        ? chalk.dim(install.path)
        : chalk.red(install.path) + chalk.red('  (missing!)');
      const active = install.active ? '' : chalk.dim('  [inactive]');
      console.log(`    ${chalk.bold(agentName.padEnd(10))}  ${pathStatus}${active}`);
    }
  }

  // Version history
  console.log();
  console.log(`  ${chalk.bold('Version history')}`);
  if (!skill.history.length) {
    console.log(`  ${chalk.dim('  No previous versions')}`);
  } else {
    const entries = [...skill.history].reverse(); // most recent first
    for (const v of entries) {
      const archived = archiveExists(skill.name, v.sha);
      const archiveTag = archived ? chalk.dim('  [archived]') : chalk.red('  [archive missing]');
      console.log(
        `    ${chalk.dim(shortSha(v.sha))}  ${fmtDate(v.installedAt)}${archiveTag}`,
      );
    }
  }

  // SKILL.md preview
  const description = await readSkillDescription(skill);
  if (description) {
    console.log();
    console.log(`  ${chalk.bold('Description')}`);
    for (const line of description) {
      console.log(`  ${chalk.dim('│')}  ${line}`);
    }
  }

  console.log();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function label(text: string): string {
  return chalk.dim(text.padEnd(9));
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

/**
 * Read the first meaningful lines of SKILL.md from the installed path.
 * Skips the first h1 heading, returns up to 5 lines of actual content.
 */
async function readSkillDescription(
  skill: Awaited<ReturnType<typeof getSkill>> & object,
): Promise<string[] | null> {
  const activeEntry = Object.entries(skill.agents).find(([, a]) => a.active);
  if (!activeEntry) return null;

  const skillMdPath = join(activeEntry[1].path, 'SKILL.md');
  if (!existsSync(skillMdPath)) return null;

  try {
    const raw = await readFile(skillMdPath, 'utf8');
    const lines = raw.split('\n');

    const content: string[] = [];
    let skippedH1 = false;

    for (const line of lines) {
      // Skip first h1
      if (!skippedH1 && line.startsWith('# ')) {
        skippedH1 = true;
        continue;
      }
      // Skip empty lines before any content
      if (!content.length && !line.trim()) continue;
      // Stop at next heading or after 5 content lines
      if (content.length > 0 && line.startsWith('#')) break;
      if (line.trim()) content.push(line);
      if (content.length >= 5) break;
    }

    return content.length ? content : null;
  } catch {
    return null;
  }
}
