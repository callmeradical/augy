/**
 * augy migrate
 *
 * Migrates existing skills from per-agent directories to a canonical store at
 * ~/.augy/skills/<name>/, then replaces each agent's copy with a symlink.
 *
 * Safe to run multiple times — skills already in the canonical store are skipped.
 */

import { intro, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { cp, mkdir, rm, symlink } from 'fs/promises';
import { existsSync } from 'fs';
import { lstat } from 'fs/promises';

import { agentById } from '../agents.js';
import {
  canonicalSkillPath,
  canonicalSkillsDir,
  listSkills,
  readRegistry,
  writeRegistry,
} from '../registry.js';

export async function migrateCommand(): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' migrate'));

  const registry = await readRegistry();
  const skills = listSkills(registry);

  const toMigrate = skills.filter((s) => !s.canonicalPath);
  const alreadyDone = skills.length - toMigrate.length;

  if (alreadyDone > 0) {
    console.log(chalk.dim(`  ${alreadyDone} skill(s) already in canonical store — skipping.`));
  }

  if (!toMigrate.length) {
    outro(chalk.green('All skills are already using the canonical store.'));
    return;
  }

  console.log(`\n  Migrating ${chalk.bold(String(toMigrate.length))} skill(s) to ${chalk.cyan(canonicalSkillsDir())}\n`);

  await mkdir(canonicalSkillsDir(), { recursive: true });

  const s = spinner();
  s.start('Migrating…');

  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const skill of toMigrate) {
    const canonical = canonicalSkillPath(skill.name);

    // Find the first real directory (not a symlink) among agent installs
    let sourceDir: string | undefined;
    for (const [, install] of Object.entries(skill.agents)) {
      if (!install.path || !existsSync(install.path)) continue;
      const stat = await lstat(install.path);
      if (!stat.isSymbolicLink()) {
        sourceDir = install.path;
        break;
      }
    }

    if (!sourceDir) {
      skipped++;
      errors.push(`${skill.name}: no real directory found among agent paths — skipped.`);
      continue;
    }

    try {
      // Copy source → canonical (cp -r)
      await rm(canonical, { recursive: true, force: true });
      await cp(sourceDir, canonical, { recursive: true });

      // Replace each agent path with a symlink → canonical
      for (const [agentId, install] of Object.entries(skill.agents)) {
        if (!install.path) continue;
        const agent = agentById(agentId);
        if (!agent) continue;

        await rm(install.path, { recursive: true, force: true });
        await mkdir(install.path.replace(/\/[^/]+$/, ''), { recursive: true });
        await symlink(canonical, install.path);
      }

      skill.canonicalPath = canonical;
      registry.skills[skill.name] = skill;
      migrated++;
    } catch (err) {
      errors.push(`${skill.name}: ${String(err)}`);
    }
  }

  s.stop('Done');

  for (const e of errors) {
    console.log(`  ${chalk.yellow('!')} ${e}`);
  }

  await writeRegistry(registry);

  outro(
    chalk.green('✓') +
      `  ${migrated} skill(s) migrated` +
      (skipped ? chalk.yellow(`  ${skipped} skipped`) : '') +
      chalk.dim(`  → ${canonicalSkillsDir()}`),
  );
}
