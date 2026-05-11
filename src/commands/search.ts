/**
 * augy search [query]
 *
 * Search all registered taps for available skills. Optionally filter by name.
 * Results show whether each skill is already installed and at what SHA.
 */

import { intro, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';

import { listSkills, readRegistry, shortSha } from '../registry.js';
import { searchTaps, TapSearchResult } from '../taps.js';
import { RemoteSkill } from '../github.js';

export async function searchCommand(query?: string): Promise<void> {
  const registry = await readRegistry();
  const taps = Object.keys(registry.taps);

  if (!taps.length) {
    console.log(
      chalk.dim('No taps registered. Add one first:\n') +
        `  ${chalk.bold('augy tap add owner/repo')}`,
    );
    return;
  }

  const s = spinner();
  s.start(
    query
      ? `Searching ${taps.length} tap(s) for "${query}"…`
      : `Fetching skill index from ${taps.length} tap(s)…`,
  );

  let results: TapSearchResult[];
  try {
    results = await searchTaps(registry, query);
  } catch (err) {
    s.stop(chalk.red('Search failed'));
    console.error(String(err));
    process.exit(1);
  }

  const totalMatches = results.reduce((n, r) => n + r.skills.length, 0);
  s.stop(
    totalMatches > 0
      ? `Found ${chalk.green(String(totalMatches))} skill(s)`
      : chalk.yellow('No skills found'),
  );

  if (!totalMatches) {
    if (query) {
      console.log(chalk.dim(`\nNo skills match "${query}". Try a broader term.`));
    }
    return;
  }

  // Build installed-skill lookup for status badges
  const installed = new Map(listSkills(registry).map((s) => [s.name, s]));

  console.log();

  for (const result of results) {
    if (result.skills.length === 0 && !result.error) continue;

    console.log(chalk.bold(result.tapKey) + chalk.dim(`  (${result.tap.skillsPath || 'root'})`));

    if (result.error) {
      console.log(`  ${chalk.red('Error:')} ${result.error}`);
      console.log();
      continue;
    }

    for (const skill of result.skills) {
      printSkillRow(skill, installed);
    }

    console.log();
  }
}

function printSkillRow(
  skill: RemoteSkill,
  installed: Map<string, ReturnType<typeof listSkills>[number]>,
): void {
  const inst = installed.get(skill.name);

  let statusBadge: string;
  if (!inst) {
    statusBadge = chalk.dim('not installed');
  } else if (inst.sha === skill.sha) {
    statusBadge = chalk.green('✓ up to date');
  } else {
    statusBadge = chalk.yellow(`↑ update available  ${chalk.dim(inst.shortSha + ' → ' + shortSha(skill.sha))}`);
  }

  console.log(
    `  ${chalk.cyan.bold(skill.name.padEnd(24))}  ${chalk.dim('@' + shortSha(skill.sha))}  ${statusBadge}`,
  );
}
