/**
 * augy rollback <skill-name> [sha]
 *
 * Restores a skill to a previous version from the local version store.
 * If no SHA is given, presents an interactive list of available snapshots.
 */

import { cancel, intro, isCancel, outro, select, spinner } from '@clack/prompts';
import chalk from 'chalk';

import { agentById, agentSkillPath } from '../agents.js';
import { getSkill, readRegistry, shortSha, writeRegistry } from '../registry.js';
import { archiveExists, restoreVersion } from '../versions.js';

export async function rollbackCommand(nameArg: string, shaArg?: string): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — rollback'));

  const registry = await readRegistry();
  const skill = getSkill(registry, nameArg);

  if (!skill) {
    cancel(`Skill "${nameArg}" not found in registry. Run \`augy list\` to see installed skills.`);
    process.exit(1);
  }

  if (!skill.history.length) {
    cancel(`No previous versions for "${nameArg}". Cannot roll back.`);
    process.exit(0);
  }

  // Determine target SHA
  let targetSha: string;

  if (shaArg) {
    // Allow short SHAs — match by prefix
    const match = skill.history.find((v) => v.sha.startsWith(shaArg));
    if (!match) {
      cancel(
        `Version "${shaArg}" not found in history for "${nameArg}".\n` +
          `Available: ${skill.history.map((v) => v.sha.slice(0, 7)).join(', ')}`,
      );
      process.exit(1);
    }
    targetSha = match.sha;
  } else {
    // Interactive selection — most recent first
    const versions = [...skill.history].reverse();
    const chosen = await select({
      message: `Roll back "${nameArg}" to which version?`,
      options: versions.map((v) => {
        const exists = archiveExists(nameArg, v.sha);
        return {
          value: v.sha,
          label: shortSha(v.sha),
          hint:
            new Date(v.installedAt).toLocaleDateString() +
            (exists ? '' : chalk.red('  [archive missing]')),
        };
      }),
    });

    if (isCancel(chosen)) {
      cancel('Rollback cancelled');
      process.exit(0);
    }
    targetSha = chosen as string;
  }

  if (!archiveExists(nameArg, targetSha)) {
    cancel(
      `Archive not found for "${nameArg}" @ ${shortSha(targetSha)}.\n` +
        `The snapshot may have been pruned.`,
    );
    process.exit(1);
  }

  // Resolve agent destination paths
  const destPaths = Object.entries(skill.agents)
    .filter(([, install]) => install.active)
    .map(([agentId]) => {
      const agent = agentById(agentId);
      return agent ? agentSkillPath(agent, nameArg) : null;
    })
    .filter((p): p is string => p !== null);

  const s = spinner();
  s.start(`Restoring ${chalk.cyan(nameArg)} to ${chalk.yellow(shortSha(targetSha))}…`);

  try {
    // Archive the current version before overwriting
    const currentDest = destPaths[0];
    if (currentDest) {
      const { archiveVersion } = await import('../versions.js');
      await archiveVersion(currentDest, nameArg, skill.sha);
    }

    await restoreVersion(nameArg, targetSha, destPaths);

    // Update registry: swap current ↔ history entry
    const restoredEntry = skill.history.find((v) => v.sha === targetSha)!;
    const displacedEntry = {
      sha: skill.sha,
      installedAt: skill.updatedAt,
      archivePath: `${process.env['HOME'] ?? '~'}/.augy/versions/${nameArg}/${skill.sha}`,
    };

    // Remove the restored entry from history, add the displaced one
    skill.history = skill.history.filter((v) => v.sha !== targetSha);
    skill.history.push(displacedEntry);

    skill.sha = targetSha;
    skill.shortSha = shortSha(targetSha);
    skill.updatedAt = new Date().toISOString();
    registry.skills[nameArg] = skill;

    await writeRegistry(registry);

    s.stop(
      `${chalk.green('✓')} Rolled back ${chalk.cyan(nameArg)} to ` +
        chalk.yellow(shortSha(targetSha)),
    );
    outro(chalk.dim(`Previous version archived for future rollback.`));
  } catch (err) {
    s.stop(`${chalk.red('✗')} Rollback failed — ${String(err)}`);
    process.exit(1);
  }
}
