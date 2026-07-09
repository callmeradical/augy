/**
 * augy skillset create <name>
 *
 * Creates a new empty skillset.
 */

import { intro, outro } from '@clack/prompts';
import chalk from 'chalk';

import {
  createSkillset,
  getSkillset,
  isValidSkillsetName,
  readSkillsets,
  writeSkillsets,
} from '../../skillsets.js';

export async function skillsetCreateCommand(name: string): Promise<void> {
  intro(chalk.bold('augy skillset') + chalk.dim(' create'));

  if (!isValidSkillsetName(name)) {
    console.error(
      chalk.red(`Invalid skillset name: "${name}"\n`) +
        chalk.dim('Names must be alphanumeric and may include hyphens (e.g. my-set, engineering).'),
    );
    process.exit(1);
  }

  const data = await readSkillsets();

  if (getSkillset(data, name)) {
    console.error(chalk.red(`Skillset "${name}" already exists.`));
    process.exit(1);
  }

  createSkillset(data, name);
  await writeSkillsets(data);

  outro(
    chalk.green('✓') +
      ` Skillset ${chalk.cyan(name)} created` +
      chalk.dim('  (~/.augy/skillsets.json)'),
  );
}
