/**
 * augy context set <ctx>   — mark this machine's context (work / personal / custom)
 * augy context show        — display the current machine context
 * augy context clear       — remove the machine context
 *
 * The machine context is stored locally in ~/.augy/registry.json and is
 * never pushed to the home repo. It is used as the default filter for
 * `augy home pull` so you don't have to pass --context on every pull.
 *
 * Example:
 *   augy context set work
 *   augy home pull          ← automatically pre-selects work + universal skills
 */

import chalk from 'chalk';

import {
  getMachineContext,
  readRegistry,
  setMachineContext,
  writeRegistry,
} from '../registry.js';

export async function contextSetCommand(ctx: string | undefined): Promise<void> {
  const registry = await readRegistry();
  setMachineContext(registry, ctx);
  await writeRegistry(registry);

  if (ctx) {
    console.log(`${chalk.bold('Machine context')} set to ${chalk.cyan(ctx)}`);
    console.log(chalk.dim('  `augy home pull` will now pre-select skills tagged ' + ctx + ' or universal.'));
  } else {
    console.log(chalk.dim('Machine context cleared — `augy home pull` will pre-select all skills.'));
  }
}

export async function contextShowCommand(): Promise<void> {
  const registry = await readRegistry();
  const ctx      = getMachineContext(registry);

  if (ctx) {
    console.log(`${chalk.bold('Machine context:')} ${chalk.cyan(ctx)}`);
  } else {
    console.log(chalk.dim('No machine context set.'));
    console.log(chalk.dim('Run `augy context set <ctx>` to set one (e.g. work, personal).'));
  }
}
