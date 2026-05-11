/**
 * augy bundle [--output <path>]
 *
 * Writes an augy.json manifest from currently installed skills.
 * Commit this file to share a reproducible skill set with your team.
 *
 * Skills without a known source are listed with an empty string — a note
 * for teammates to fill in. Use --include-untracked to include them,
 * or omit them entirely with --tracked-only (default).
 */

import { outro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { cwd } from 'process';

import { listSkills, readRegistry } from '../registry.js';

export interface AugyBundle {
  version: 1;
  /**
   * Map of skill name → source URL/shorthand.
   * Empty string means source is unknown — fill in before sharing.
   */
  skills: Record<string, string>;
}

const DEFAULT_FILENAME = 'augy.json';

export async function bundleCommand(opts: {
  output?: string;
  includeUntracked?: boolean;
}): Promise<void> {
  const registry = await readRegistry();
  const skills   = listSkills(registry);

  if (!skills.length) {
    console.log(chalk.dim('No skills installed. Nothing to bundle.'));
    return;
  }

  const tracked   = skills.filter((s) => s.source);
  const untracked = skills.filter((s) => !s.source);

  // Build the manifest
  const bundle: AugyBundle = {
    version: 1,
    skills: {},
  };

  for (const skill of tracked) {
    bundle.skills[skill.name] = skill.source;
  }

  if (opts.includeUntracked) {
    for (const skill of untracked) {
      bundle.skills[skill.name] = '';
    }
  }

  const outputPath = opts.output ?? join(cwd(), DEFAULT_FILENAME);
  const s = spinner();
  s.start(`Writing ${chalk.cyan(outputPath)}…`);

  await writeFile(outputPath, JSON.stringify(bundle, null, 2) + '\n', 'utf8');

  s.stop(`${chalk.green('✓')} Bundle written  ${chalk.dim(outputPath)}`);

  const skillCount  = Object.keys(bundle.skills).length;
  const skippedNote = !opts.includeUntracked && untracked.length > 0
    ? chalk.dim(`\n  ${untracked.length} untracked skill(s) omitted — use --include-untracked to add them`)
    : '';

  outro(
    `${chalk.bold(String(skillCount))} skill(s) bundled${skippedNote}\n` +
    chalk.dim('  Commit augy.json to share this skill set with your team.\n') +
    chalk.dim('  Teammates run `augy sync` to install from it.'),
  );
}
