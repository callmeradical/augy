/**
 * augy list
 *
 * Displays all installed skills with their current SHA, agent deployments,
 * and version history count.
 */

import chalk from 'chalk';
import { listSkills, readRegistry, RegistrySkill } from '../registry.js';
import { AGENTS } from '../agents.js';

export async function listCommand(opts: { json?: boolean } = {}): Promise<void> {
  const registry = await readRegistry();
  const skills = listSkills(registry);

  if (opts.json) {
    console.log(JSON.stringify(registry, null, 2));
    return;
  }

  if (!skills.length) {
    console.log(chalk.dim('No skills installed. Run `augy install` to get started.'));
    return;
  }

  console.log(
    `\n${chalk.bold('Installed skills')}  ${chalk.dim(`(${skills.length} total)`)}\n`,
  );

  for (const skill of skills) {
    printSkill(skill);
  }

  console.log();
}

function printSkill(skill: RegistrySkill): void {
  const pinTag = skill.pinned ? chalk.yellow(' [pinned]') : '';
  const historyTag =
    skill.history.length > 0
      ? chalk.dim(` (${skill.history.length} previous version${skill.history.length === 1 ? '' : 's'})`)
      : '';

  const noSource   = !skill.source || skill.sha === 'unversioned';
  const shaDisplay = noSource
    ? chalk.yellow('untracked')
    : chalk.green('@' + skill.shortSha);
  const sourceNote = noSource
    ? chalk.yellow('  ⚠ no source — run `augy set-source ' + skill.name + ' <url>` to enable updates')
    : '';

  console.log(
    `  ${chalk.cyan.bold(skill.name)}${pinTag}  ${shaDisplay}${historyTag}${sourceNote}`,
  );

  // Source
  if (skill.source) {
    console.log(`  ${chalk.dim('source:')}  ${skill.source}`);
  } else {
    console.log(`  ${chalk.dim('source:')}  ${chalk.dim('unknown')}`);
  }

  // Agents
  const agentEntries = Object.entries(skill.agents);
  if (agentEntries.length) {
    const agentLabels = agentEntries.map(([id, install]) => {
      const agent = AGENTS.find((a) => a.id === id);
      const name = agent?.name ?? id;
      const status = install.active ? chalk.green(name) : chalk.dim(`${name} (inactive)`);
      return status;
    });
    console.log(`  ${chalk.dim('agents:')}   ${agentLabels.join(chalk.dim(', '))}`);
  }

  // Dates
  const updated = new Date(skill.updatedAt).toLocaleDateString();
  console.log(`  ${chalk.dim('updated:')}  ${updated}`);

  // History
  if (skill.history.length > 0) {
    const prev = skill.history.slice(-3).reverse();
    const lines = prev.map(
      (v) =>
        `    ${chalk.dim(v.sha.slice(0, 7))}  ${chalk.dim(new Date(v.installedAt).toLocaleDateString())}`,
    );
    console.log(`  ${chalk.dim('history:')}`);
    lines.forEach((l) => console.log(l));
  }

  console.log();
}
