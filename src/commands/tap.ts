/**
 * augy tap add <owner/repo> [--path <skills-dir>] [--description <text>]
 * augy tap remove <owner/repo>
 * augy tap list
 *
 * Manage trusted repos (taps) so skills can be installed by name
 * without specifying full GitHub URLs.
 */

import { cancel, confirm, intro, isCancel, outro, spinner, text } from '@clack/prompts';
import chalk from 'chalk';

import {
  addTap,
  listTaps,
  readRegistry,
  removeTap,
  Tap,
  tapKey,
  writeRegistry,
} from '../registry.js';
import { parseTapArg, tapSource } from '../taps.js';
import { discoverSkills, parseGitHubUrl } from '../github.js';

// ---------------------------------------------------------------------------
// tap add
// ---------------------------------------------------------------------------

export async function tapAddCommand(
  repoArg: string,
  opts: { path?: string; description?: string },
): Promise<void> {
  intro(chalk.bold('augy tap') + chalk.dim(' — add'));

  let parsed: { owner: string; repo: string };
  try {
    parsed = parseTapArg(repoArg);
  } catch (err) {
    cancel(String(err));
    process.exit(1);
  }

  const { owner, repo } = parsed;
  const key = tapKey(owner, repo);

  const registry = await readRegistry();
  if (registry.taps[key]) {
    cancel(`Tap "${key}" is already registered.`);
    process.exit(0);
  }

  // Determine skills path — prompt if not provided via flag
  let skillsPath = opts.path;
  if (skillsPath === undefined) {
    const answer = await text({
      message: 'Path within the repo where skills live (leave blank for repo root)',
      placeholder: 'skills',
      defaultValue: 'skills',
    });
    if (isCancel(answer)) { cancel('Cancelled'); process.exit(0); }
    skillsPath = (answer as string).trim();
  }

  // Validate by discovering skills
  const s = spinner();
  s.start(`Verifying ${chalk.cyan(key)}…`);

  let skillCount = 0;
  try {
    const source = tapSource(owner, repo, skillsPath);
    const coords = parseGitHubUrl(source);
    const skills = await discoverSkills(coords);
    skillCount = skills.length;
    s.stop(`Found ${chalk.green(String(skillCount))} skill(s) in ${chalk.cyan(key)}`);
  } catch (err) {
    s.stop(chalk.yellow('Could not verify tap — will add anyway'));
    console.log(chalk.dim(`  ${String(err)}`));
  }

  const tap: Tap = {
    owner,
    repo,
    skillsPath,
    addedAt: new Date().toISOString(),
    ...(opts.description ? { description: opts.description } : {}),
  };

  addTap(registry, tap);
  await writeRegistry(registry);

  outro(
    chalk.green(`Tap ${chalk.bold(key)} added`) +
      chalk.dim(skillCount ? ` (${skillCount} skills available)` : ''),
  );
}

// ---------------------------------------------------------------------------
// tap remove
// ---------------------------------------------------------------------------

export async function tapRemoveCommand(repoArg: string): Promise<void> {
  intro(chalk.bold('augy tap') + chalk.dim(' — remove'));

  let parsed: { owner: string; repo: string };
  try {
    parsed = parseTapArg(repoArg);
  } catch (err) {
    cancel(String(err));
    process.exit(1);
  }

  const key = tapKey(parsed.owner, parsed.repo);
  const registry = await readRegistry();

  if (!registry.taps[key]) {
    cancel(`Tap "${key}" is not registered.`);
    process.exit(1);
  }

  // Warn if installed skills came from this tap
  const affected = Object.values(registry.skills).filter((sk) => sk.tap === key);
  if (affected.length) {
    console.log(
      chalk.yellow(
        `  ${affected.length} installed skill(s) came from this tap: ` +
          affected.map((s) => chalk.cyan(s.name)).join(', '),
      ),
    );
    console.log(chalk.dim('  They will remain installed but lose their tap association.\n'));
  }

  const ok = await confirm({ message: `Remove tap "${key}"?` });
  if (isCancel(ok) || !ok) { cancel('Cancelled'); process.exit(0); }

  // Clear tap reference from affected skills
  for (const sk of affected) {
    delete sk.tap;
    registry.skills[sk.name] = sk;
  }

  removeTap(registry, key);
  await writeRegistry(registry);

  outro(chalk.green(`Tap ${chalk.bold(key)} removed`));
}

// ---------------------------------------------------------------------------
// tap list
// ---------------------------------------------------------------------------

export async function tapListCommand(): Promise<void> {
  const registry = await readRegistry();
  const taps = listTaps(registry);

  if (!taps.length) {
    console.log(
      chalk.dim('No taps registered.\n') +
        chalk.dim('Add one with: ') +
        chalk.bold('augy tap add owner/repo'),
    );
    return;
  }

  console.log(`\n${chalk.bold('Registered taps')}  ${chalk.dim(`(${taps.length} total)`)}\n`);

  for (const tap of taps) {
    const skillsFrom = Object.values(registry.skills).filter((s) => s.tap === tap.key).length;
    const pathLabel = tap.skillsPath ? chalk.dim(`/${tap.skillsPath}`) : '';
    console.log(
      `  ${chalk.cyan.bold(tap.key)}${pathLabel}` +
        (tap.description ? `  ${chalk.dim('—')}  ${tap.description}` : ''),
    );
    console.log(`  ${chalk.dim('added:')}    ${new Date(tap.addedAt).toLocaleDateString()}`);
    if (skillsFrom > 0) {
      console.log(`  ${chalk.dim('installed:')} ${skillsFrom} skill(s) from this tap`);
    }
    console.log();
  }
}
