/**
 * augy uninstall <skill>
 *
 * Remove a skill from all agent paths and the registry.
 * Optionally prune archived versions from the version store.
 */

import { cancel, confirm, intro, isCancel, outro, select, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

import { getSkill, readRegistry, removeSkill, versionsDir, writeRegistry } from '../registry.js';
import { pruneVersions } from '../versions.js';

export async function uninstallCommand(nameArg: string): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — uninstall'));

  const registry = await readRegistry();
  const skill = getSkill(registry, nameArg);

  if (!skill) {
    cancel(`Skill "${nameArg}" not found in registry.`);
    process.exit(1);
  }

  // Show what will be removed
  const agentPaths = Object.entries(skill.agents)
    .filter(([, a]) => a.active)
    .map(([id, a]) => ({ id, path: a.path }));

  console.log(`\n  ${chalk.cyan.bold(skill.name)}  ${chalk.dim('@' + skill.shortSha)}\n`);

  if (agentPaths.length) {
    console.log(`  ${chalk.dim('Agent paths to remove:')}`);
    for (const { id, path } of agentPaths) {
      const exists = existsSync(path);
      console.log(
        `    ${chalk.bold(id)}  ${path}` + (exists ? '' : chalk.dim('  (already missing)')),
      );
    }
  }

  const archiveCount = skill.history.length;
  if (archiveCount > 0) {
    console.log(
      `\n  ${chalk.dim(`${archiveCount} archived version(s) in version store`)}`,
    );
  }

  console.log();

  // Confirm
  const ok = await confirm({ message: `Uninstall "${nameArg}"?` });
  if (isCancel(ok) || !ok) {
    cancel('Uninstall cancelled');
    process.exit(0);
  }

  // Ask about version archives only if they exist
  let pruneArchives = false;
  if (archiveCount > 0) {
    const pruneAnswer = await confirm({
      message: `Also delete ${archiveCount} archived version(s) from the version store?`,
      initialValue: false,
    });
    if (isCancel(pruneAnswer)) {
      cancel('Uninstall cancelled');
      process.exit(0);
    }
    pruneArchives = pruneAnswer as boolean;
  }

  // Remove from agent paths
  const s = spinner();
  s.start(`Removing ${chalk.cyan(nameArg)}…`);

  const errors: string[] = [];

  for (const { path } of agentPaths) {
    if (existsSync(path)) {
      try {
        await rm(path, { recursive: true, force: true });
      } catch (err) {
        errors.push(`Failed to remove ${path}: ${String(err)}`);
      }
    }
  }

  // Prune version archives
  if (pruneArchives) {
    try {
      await pruneVersions(nameArg);
      // Also try to remove the parent skill dir under versions/
      const skillVersionDir = join(versionsDir(), nameArg);
      if (existsSync(skillVersionDir)) {
        await rm(skillVersionDir, { recursive: true, force: true });
      }
    } catch (err) {
      errors.push(`Failed to prune archives: ${String(err)}`);
    }
  }

  // Remove from registry
  removeSkill(registry, nameArg);
  await writeRegistry(registry);

  if (errors.length) {
    s.stop(chalk.yellow(`Uninstalled with warnings`));
    for (const e of errors) console.log(`  ${chalk.yellow('!')} ${e}`);
  } else {
    s.stop(`${chalk.green('✓')} ${chalk.cyan(nameArg)} uninstalled`);
  }

  outro(
    pruneArchives
      ? chalk.dim('Skill and all version archives removed.')
      : chalk.dim('Skill removed. Version archives retained in ~/.augy/versions/.'),
  );
}
