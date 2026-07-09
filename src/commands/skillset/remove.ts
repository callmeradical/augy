/**
 * augy skillset remove <name> <skill...>
 *
 * Removes one or more skills from a named skillset.
 * Does not uninstall the skill itself — only removes the reference.
 */

import { intro, outro } from '@clack/prompts';
import chalk from 'chalk';

import { getSkillset, readSkillsets, writeSkillsets } from '../../skillsets.js';

export async function skillsetRemoveCommand(name: string, skills: string[]): Promise<void> {
  intro(chalk.bold('augy skillset') + chalk.dim(' remove'));

  const data = await readSkillsets();
  const set = getSkillset(data, name);

  if (!set) {
    console.error(chalk.red(`Skillset "${name}" not found.`));
    process.exit(1);
  }

  for (const skill of skills) {
    const idx = set.skills.indexOf(skill);
    if (idx === -1) {
      console.warn(chalk.yellow(`⚠  Skill "${skill}" is not in skillset "${name}".`));
    } else {
      set.skills.splice(idx, 1);
    }
  }

  set.updatedAt = new Date().toISOString();
  await writeSkillsets(data);

  outro(
    chalk.green('✓') +
      ` Removed ${chalk.cyan(skills.join(', '))} from skillset ${chalk.cyan(name)}`,
  );
}
