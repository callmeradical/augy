/**
 * augy use <skillset-name> [--agent <agent>] [--dry-run]
 *
 * Atomically swaps the active skill symlinks for the target agent to match
 * the named skillset.
 *
 * Behaviour:
 *  - Only touches symlinks (files installed as copies are left alone).
 *  - Removes symlinks in the agent skills dir NOT in the target skillset.
 *  - Creates symlinks for skills in the skillset that aren't already linked.
 *  - Skills listed in the skillset but not installed → warn and skip.
 *  - Empty skillset → warn and exit without changes.
 *  - AUGY_DEFAULT_AGENT env var is used when --agent is not passed.
 *  - --dry-run prints the plan without making any changes.
 */

import { intro, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { lstat, mkdir, readdir, symlink, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

import { agentSkillPath } from '../agents.js';
import { resolveAgentRequired } from '../agentResolver.js';
import { readRegistry } from '../registry.js';
import { getSkillset, readSkillsets } from '../skillsets.js';

export async function useCommand(
  name: string,
  opts: { agent?: string; dryRun?: boolean } = {},
): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' use'));

  // -------------------------------------------------------------------------
  // 1. Load skillset
  // -------------------------------------------------------------------------
  const data = await readSkillsets();
  const set = getSkillset(data, name);

  if (!set) {
    console.error(chalk.red(`Skillset "${name}" not found.`));
    process.exit(1);
  }

  if (!set.skills.length) {
    console.warn(chalk.yellow(`Skillset "${name}" is empty — no changes made.`));
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // 2. Resolve agent
  // -------------------------------------------------------------------------
  const agent = resolveAgentRequired(opts.agent);

  // -------------------------------------------------------------------------
  // 3. Cross-reference with registry
  // -------------------------------------------------------------------------
  const registry = await readRegistry();
  const installedNames = new Set(Object.keys(registry.skills));

  const validSkills: string[] = [];
  for (const skill of set.skills) {
    if (!installedNames.has(skill)) {
      console.warn(chalk.yellow(`⚠  Skill "${skill}" is not installed — skipping.`));
    } else {
      validSkills.push(skill);
    }
  }

  if (!validSkills.length) {
    console.warn(chalk.yellow('No installed skills in this skillset — no changes made.'));
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // 4. Scan agent skill directory for existing symlinks
  // -------------------------------------------------------------------------
  const skillsDir = agent.skillsPath;
  const desiredSet = new Set(validSkills);

  // Ensure the skills dir exists (mkdir is safe even when dir already exists)
  if (!existsSync(skillsDir)) {
    if (!opts.dryRun) {
      await mkdir(skillsDir, { recursive: true });
    }
  }

  // Collect existing entries in the skills directory
  let existingEntries: string[] = [];
  try {
    existingEntries = await readdir(skillsDir);
  } catch {
    existingEntries = [];
  }

  // Separate into symlinks and non-symlinks
  const toRemove: string[] = [];
  const alreadyActive: string[] = [];

  for (const entry of existingEntries) {
    const fullPath = join(skillsDir, entry);
    let stat;
    try {
      stat = await lstat(fullPath);
    } catch {
      continue;
    }
    if (!stat.isSymbolicLink()) continue; // skip copies — out of scope
    if (desiredSet.has(entry)) {
      alreadyActive.push(entry);
    } else {
      toRemove.push(entry);
    }
  }

  const activeSet = new Set(alreadyActive);
  const toAdd = validSkills.filter((s) => !activeSet.has(s));

  // -------------------------------------------------------------------------
  // 5. Print plan
  // -------------------------------------------------------------------------
  const dryLabel = opts.dryRun ? chalk.yellow(' [dry-run]') : '';

  console.log(`\n  Agent:    ${chalk.bold(agent.name)} ${chalk.dim('(' + agent.id + ')')}`);
  console.log(`  Skillset: ${chalk.cyan(name)} ${chalk.dim('(' + set.skills.length + ' skill(s))')}\n`);

  if (toRemove.length) {
    console.log(chalk.bold(`  Remove (${toRemove.length})`) + dryLabel);
    for (const s of toRemove) console.log(`    ${chalk.red('–')} ${s}`);
    console.log();
  }

  if (toAdd.length) {
    console.log(chalk.bold(`  Add (${toAdd.length})`) + dryLabel);
    for (const s of toAdd) console.log(`    ${chalk.green('+')} ${s}`);
    console.log();
  }

  if (alreadyActive.length) {
    console.log(chalk.dim(`  Already active (${alreadyActive.length}): ` + alreadyActive.join(', ')));
    console.log();
  }

  if (!toRemove.length && !toAdd.length) {
    outro(chalk.green('Already up to date — no changes needed.'));
    return;
  }

  if (opts.dryRun) {
    outro(chalk.dim('Dry run — no changes made.'));
    return;
  }

  // -------------------------------------------------------------------------
  // 6. Apply changes
  // -------------------------------------------------------------------------
  const s = spinner();
  s.start('Applying skillset…');

  let removed = 0;
  let added = 0;
  const errors: string[] = [];

  // Remove stale symlinks
  for (const skillName of toRemove) {
    const dest = join(skillsDir, skillName);
    try {
      await unlink(dest);
      removed++;
    } catch (err) {
      errors.push(`Could not remove "${skillName}": ${String(err)}`);
    }
  }

  // Create new symlinks
  for (const skillName of toAdd) {
    const skillRecord = registry.skills[skillName];
    if (!skillRecord) continue;

    // The installed skill source path for this agent (or fall back to any agent)
    const agentInstall = skillRecord.agents[agent.id];
    let sourcePath: string;

    if (agentInstall?.path && existsSync(agentInstall.path)) {
      sourcePath = agentInstall.path;
    } else {
      // Try to find a source path from another agent install
      const otherInstall = Object.values(skillRecord.agents).find(
        (ai) => ai.path && existsSync(ai.path),
      );
      if (!otherInstall) {
        errors.push(`Skill "${skillName}" has no resolvable path — skipping.`);
        continue;
      }
      sourcePath = otherInstall.path;
    }

    const dest = agentSkillPath(agent, skillName);
    try {
      await symlink(sourcePath, dest);
      added++;
    } catch (err) {
      errors.push(`Could not link "${skillName}": ${String(err)}`);
    }
  }

  s.stop('Done');

  for (const e of errors) console.error(chalk.red('  ✗ ' + e));

  outro(
    chalk.green('✓') +
      `  ${chalk.cyan(name)} applied to ${chalk.bold(agent.name)}` +
      chalk.dim(`  (−${removed} removed, +${added} added, ${alreadyActive.length} unchanged)`),
  );
}
