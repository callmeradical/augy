/**
 * augy skillset add <name> <skill...>
 *
 * Appends one or more skills to a named skillset.
 * Warns if a skill is not in the installed registry, but still adds it.
 */

import { intro, outro } from '@clack/prompts';
import chalk from 'chalk';

import { getSkillset, readSkillsets, writeSkillsets } from '../../skillsets.js';
import { readRegistry } from '../../registry.js';

export async function skillsetAddCommand(name: string, skills: string[]): Promise<void> {
  intro(chalk.bold('augy skillset') + chalk.dim(' add'));

  const data = await readSkillsets();
  const set = getSkillset(data, name);

  if (!set) {
    console.error(chalk.red(`Skillset "${name}" not found.`));
    process.exit(1);
  }

  const registry = await readRegistry();
  const installedNames = new Set(Object.keys(registry.skills));

  for (const skill of skills) {
    if (!installedNames.has(skill)) {
      console.warn(chalk.yellow(`⚠  Skill "${skill}" is not installed — adding anyway. Run \`augy install\` to install it.`));
    }
    if (!set.skills.includes(skill)) {
      set.skills.push(skill);
    } else {
      console.log(chalk.dim(`  "${skill}" is already in ${name} — skipping.`));
    }
  }

  set.updatedAt = new Date().toISOString();
  await writeSkillsets(data);

  outro(
    chalk.green('✓') +
      ` Added ${chalk.cyan(skills.join(', '))} to skillset ${chalk.cyan(name)}`,
  );
}
