/**
 * augy skillset show <name>
 *
 * Prints the skills in the named skillset, one per line.
 */

import { intro, outro } from '@clack/prompts';
import chalk from 'chalk';

import { getSkillset, readSkillsets } from '../../skillsets.js';

export async function skillsetShowCommand(name: string): Promise<void> {
  intro(chalk.bold('augy skillset') + chalk.dim(' show'));

  const data = await readSkillsets();
  const set = getSkillset(data, name);

  if (!set) {
    console.error(chalk.red(`Skillset "${name}" not found.`));
    process.exit(1);
  }

  console.log(`\n  ${chalk.bold(set.name)}`);
  console.log(chalk.dim(`  Created: ${new Date(set.createdAt).toLocaleString()}`));
  console.log(chalk.dim(`  Updated: ${new Date(set.updatedAt).toLocaleString()}`));
  console.log();

  if (!set.skills.length) {
    console.log(chalk.dim('  (no skills — add some with: augy skillset add ' + name + ' <skill...>)'));
  } else {
    for (const skill of set.skills) {
      console.log(`  ${chalk.cyan(skill)}`);
    }
  }

  outro(chalk.dim(`${set.skills.length} skill(s) in "${set.name}"`));
}
