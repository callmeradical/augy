/**
 * augy skillset list
 *
 * Prints a table of all skillsets: name | skill count | last updated.
 */

import { intro, outro } from '@clack/prompts';
import chalk from 'chalk';

import { listSkillsets, readSkillsets } from '../../skillsets.js';

export async function skillsetListCommand(): Promise<void> {
  intro(chalk.bold('augy skillset') + chalk.dim(' list'));

  const data = await readSkillsets();
  const sets = listSkillsets(data);

  if (!sets.length) {
    outro(chalk.dim('No skillsets found. Create one with: augy skillset create <name>'));
    return;
  }

  const COL_NAME  = 28;
  const COL_COUNT =  8;

  const header =
    chalk.bold('Name'.padEnd(COL_NAME)) +
    chalk.bold('Skills'.padEnd(COL_COUNT)) +
    chalk.bold('Updated');
  console.log('\n' + chalk.dim('  ') + header);
  console.log(chalk.dim('  ' + '─'.repeat(COL_NAME + COL_COUNT + 22)));

  for (const s of sets.sort((a, b) => a.name.localeCompare(b.name))) {
    const updated = new Date(s.updatedAt).toLocaleDateString();
    console.log(
      chalk.dim('  ') +
        chalk.cyan(s.name.padEnd(COL_NAME)) +
        String(s.skills.length).padEnd(COL_COUNT) +
        chalk.dim(updated),
    );
  }

  outro(chalk.dim(`${sets.length} skillset(s)`));
}
