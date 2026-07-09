/**
 * augy skillset delete <name> [--yes]
 *
 * Deletes a skillset from skillsets.json.
 * Does NOT uninstall or remove any skill files.
 * Prompts for confirmation unless --yes is passed.
 */

import { confirm, intro, isCancel, outro } from '@clack/prompts';
import chalk from 'chalk';

import { deleteSkillset, getSkillset, readSkillsets, writeSkillsets } from '../../skillsets.js';

export async function skillsetDeleteCommand(
  name: string,
  opts: { yes?: boolean } = {},
): Promise<void> {
  intro(chalk.bold('augy skillset') + chalk.dim(' delete'));

  const data = await readSkillsets();
  const set = getSkillset(data, name);

  if (!set) {
    console.error(chalk.red(`Skillset "${name}" not found.`));
    process.exit(1);
  }

  if (!opts.yes) {
    const ok = await confirm({
      message: `Delete skillset "${name}" (${set.skills.length} skill(s))? This does not uninstall any skills.`,
    });
    if (isCancel(ok) || !ok) {
      console.log(chalk.dim('Cancelled.'));
      process.exit(0);
    }
  }

  deleteSkillset(data, name);
  await writeSkillsets(data);

  outro(chalk.green('✓') + ` Skillset ${chalk.cyan(name)} deleted.`);
}
