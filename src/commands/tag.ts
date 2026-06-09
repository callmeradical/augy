/**
 * augy tag <skill> [contexts...]   — set contexts on a skill
 * augy tag <skill>                 — show current contexts
 * augy tag migrate                 — interactively tag all untagged skills
 *
 * Contexts let you filter which skills get pre-selected when running
 * `augy home pull --context <ctx>` on a new machine.
 *
 * Built-in contexts (convention, not enforced):
 *   universal  — install on every machine (default when no context set)
 *   personal   — personal machine only
 *   work       — work machine only
 *
 * You can use any custom strings that make sense for your setup.
 */

import { intro, isCancel, multiselect, note, outro } from '@clack/prompts';
import chalk from 'chalk';

import {
  getSkill,
  listSkills,
  readRegistry,
  writeRegistry,
} from '../registry.js';

// Suggested contexts shown in the migrate picker
const SUGGESTED_CONTEXTS = [
  { value: 'universal', label: 'universal', hint: 'install on every machine' },
  { value: 'personal',  label: 'personal',  hint: 'personal machine only' },
  { value: 'work',      label: 'work',      hint: 'work machine only' },
];

// ---------------------------------------------------------------------------
// tag set
// ---------------------------------------------------------------------------

export async function tagSetCommand(skill: string, contexts: string[]): Promise<void> {
  const registry = await readRegistry();
  const record   = getSkill(registry, skill);

  if (!record) {
    throw new Error(`Skill "${skill}" not found in registry.`);
  }

  record.contexts = contexts;
  registry.skills[skill] = record;
  await writeRegistry(registry);

  const display = contexts.length
    ? contexts.map((c) => chalk.cyan(c)).join(chalk.dim(', '))
    : chalk.dim('(none — treated as universal)');

  console.log(`${chalk.cyan(skill)}  contexts: ${display}`);
}

// ---------------------------------------------------------------------------
// tag show
// ---------------------------------------------------------------------------

export async function tagShowCommand(skill: string): Promise<void> {
  const registry = await readRegistry();
  const record   = getSkill(registry, skill);

  if (!record) {
    throw new Error(`Skill "${skill}" not found in registry.`);
  }

  const contexts = record.contexts ?? [];
  const display  = contexts.length
    ? contexts.map((c) => chalk.cyan(c)).join(chalk.dim(', '))
    : chalk.dim('none  (treated as universal)');

  console.log(`${chalk.bold(skill)}  ${display}`);
}

// ---------------------------------------------------------------------------
// tag migrate
// ---------------------------------------------------------------------------

export async function tagMigrateCommand(): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — tag migrate'));

  const registry = await readRegistry();
  const all      = listSkills(registry);
  const untagged = all.filter((s) => !s.contexts || s.contexts.length === 0);

  if (!untagged.length) {
    outro(chalk.green('All skills already have context tags.'));
    return;
  }

  console.log(
    chalk.dim(`\n  ${all.length - untagged.length} skill(s) already tagged · `) +
    chalk.bold(String(untagged.length)) + chalk.dim(' to tag\n'),
  );

  let tagged = 0;

  for (const skill of untagged) {
    const sourceHint = skill.source
      ? chalk.dim(skill.source)
      : chalk.dim('authored (no external source)');

    note(
      `${chalk.bold(skill.name)}\n${sourceHint}`,
      'Tag this skill',
    );

    const result = await multiselect<string>({
      message: `Contexts for ${chalk.cyan(skill.name)}?`,
      options: SUGGESTED_CONTEXTS,
      required: false,
    });

    if (isCancel(result)) {
      console.log(chalk.dim('\nMigration paused — progress saved.'));
      return;
    }

    skill.contexts = result as string[];
    registry.skills[skill.name] = skill;

    // Save immediately — progress is never lost on crash or cancel
    await writeRegistry(registry);
    tagged++;

    const display = (result as string[]).length
      ? (result as string[]).map((c) => chalk.cyan(c)).join(chalk.dim(', '))
      : chalk.dim('(universal)');
    console.log(`  ${chalk.green('✓')} ${chalk.bold(skill.name)}  ${display}`);
  }

  outro(chalk.green(`${tagged} skill(s) tagged.`) +
    chalk.dim('\n  Run `augy home push` to save contexts to your home repo.'));
}
