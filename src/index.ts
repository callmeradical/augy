#!/usr/bin/env node
/**
 * augy — Homebrew for AI agent skills
 *
 * Commands:
 *   scan                       Find skills installed outside augy and import them
 *   bundle                     Write augy.json manifest from installed skills
 *   sync [path]                Install/update skills from an augy.json manifest
 *   install [url]              Install skills from a GitHub URL or bare name (via taps)
 *   update  [skill]            Check + upgrade skills with upstream changes
 *   list                       Show all installed skills + versions
 *   info <skill>               Detailed metadata, history, and description
 *   diff <skill> [sha] [sha2]  Browse file-level diffs between versions
 *   search [query]             Search all taps for available skills
 *   tap add|remove|list        Manage trusted repos (taps)
 *   rollback <skill> [sha]     Restore a skill to a previous version
 *   set-source <skill> <url>   Attach a source URL to an untracked skill
 *   uninstall <skill>          Remove a skill from agents + registry
 *   pin <skill>                Pin a skill so it is skipped during updates
 *   unpin <skill>              Unpin a previously pinned skill
 */

import { Command } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { readFileSync } from 'fs';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
  version: string;
};

const program = new Command();

program
  .name('augy')
  .description('Homebrew for AI agent skills — install, version, update, rollback')
  .version(pkg.version);

// ---------------------------------------------------------------------------
// install
// ---------------------------------------------------------------------------
program
  .command('install [url]')
  .description('Install skills from a GitHub URL or owner/repo[/path]')
  .option('-a, --agent <agents...>', 'Target agent(s): opencode, claude, codex')
  .action(async (url?: string, opts?: { agent?: string[] }) => {
    const { installCommand } = await import('./commands/install.js');
    await installCommand(url, opts ?? {});
  });

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
program
  .command('update [skill]')
  .description('Check for upstream changes and upgrade installed skills')
  .action(async (skill?: string) => {
    const { updateCommand } = await import('./commands/update.js');
    await updateCommand(skill);
  });

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------
program
  .command('list')
  .description('Show all installed skills with version + agent info')
  .option('--json', 'Output raw JSON registry')
  .action(async (opts?: { json?: boolean }) => {
    const { listCommand } = await import('./commands/list.js');
    await listCommand(opts ?? {});
  });

// ---------------------------------------------------------------------------
// diff
// ---------------------------------------------------------------------------
program
  .command('diff <skill> [sha1] [sha2]')
  .description(
    'Browse file-level diffs for a skill\n' +
    '  augy diff <skill>              installed ↔ upstream HEAD\n' +
    '  augy diff <skill> <sha>        installed ↔ specific SHA (archive or GitHub)\n' +
    '  augy diff <skill> <sha1> <sha2> two local archives side-by-side',
  )
  .action(async (skill: string, sha1?: string, sha2?: string) => {
    const { diffCommand } = await import('./commands/diff.js');
    await diffCommand(skill, sha1, sha2);
  });

// ---------------------------------------------------------------------------
// bundle
// ---------------------------------------------------------------------------
program
  .command('bundle')
  .description('Write an augy.json manifest from installed skills for team sharing')
  .option('-o, --output <path>', 'Output path (default: ./augy.json)')
  .option('--include-untracked', 'Include skills without a known source')
  .action(async (opts: { output?: string; includeUntracked?: boolean }) => {
    const { bundleCommand } = await import('./commands/bundle.js');
    await bundleCommand(opts);
  });

// ---------------------------------------------------------------------------
// sync
// ---------------------------------------------------------------------------
program
  .command('sync [path]')
  .description('Install/update skills from an augy.json manifest (default: ./augy.json)')
  .option('--dry-run', 'Preview changes without applying them')
  .option('-a, --agent <agents...>', 'Target agent(s) (default: all detected)')
  .action(async (path?: string, opts?: { dryRun?: boolean; agent?: string[] }) => {
    const { syncCommand } = await import('./commands/sync.js');
    await syncCommand(path, opts ?? {});
  });

// ---------------------------------------------------------------------------
// scan
// ---------------------------------------------------------------------------
program
  .command('scan')
  .description('Find skills installed outside augy and optionally import them into the registry')
  .action(async () => {
    const { scanCommand } = await import('./commands/scan.js');
    await scanCommand();
  });

// ---------------------------------------------------------------------------
// info
// ---------------------------------------------------------------------------
program
  .command('info <skill>')
  .description('Show full metadata, version history, and description for an installed skill')
  .action(async (skill: string) => {
    const { infoCommand } = await import('./commands/info.js');
    await infoCommand(skill);
  });

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------
program
  .command('search [query]')
  .description('Search all taps for available skills (optionally filter by name)')
  .action(async (query?: string) => {
    const { searchCommand } = await import('./commands/search.js');
    await searchCommand(query);
  });

// ---------------------------------------------------------------------------
// tap (nested subcommands)
// ---------------------------------------------------------------------------
const tap = program
  .command('tap')
  .description('Manage trusted repos (taps) for skill name resolution');

tap
  .command('add <repo>')
  .description('Register a tap  e.g. augy tap add owner/repo')
  .option('--path <skills-dir>', 'Subdirectory where skills live (default: skills)')
  .option('--description <text>', 'Optional description')
  .action(async (repo: string, opts: { path?: string; description?: string }) => {
    const { tapAddCommand } = await import('./commands/tap.js');
    await tapAddCommand(repo, opts);
  });

tap
  .command('remove <repo>')
  .description('Unregister a tap')
  .action(async (repo: string) => {
    const { tapRemoveCommand } = await import('./commands/tap.js');
    await tapRemoveCommand(repo);
  });

tap
  .command('list')
  .description('List all registered taps')
  .action(async () => {
    const { tapListCommand } = await import('./commands/tap.js');
    await tapListCommand();
  });

// ---------------------------------------------------------------------------
// set-source
// ---------------------------------------------------------------------------
program
  .command('set-source <skill> <url>')
  .description('Attach a GitHub source URL to a skill imported without one')
  .action(async (skill: string, url: string) => {
    const { setSourceCommand } = await import('./commands/set-source.js');
    await setSourceCommand(skill, url);
  });

// ---------------------------------------------------------------------------
// uninstall
// ---------------------------------------------------------------------------
program
  .command('uninstall <skill>')
  .description('Remove a skill from all agent paths and the registry')
  .action(async (skill: string) => {
    const { uninstallCommand } = await import('./commands/uninstall.js');
    await uninstallCommand(skill);
  });

// ---------------------------------------------------------------------------
// rollback
// ---------------------------------------------------------------------------
program
  .command('rollback <skill> [sha]')
  .description('Restore a skill to a previous archived version')
  .action(async (skill: string, sha?: string) => {
    const { rollbackCommand } = await import('./commands/rollback.js');
    await rollbackCommand(skill, sha);
  });

// ---------------------------------------------------------------------------
// pin / unpin
// ---------------------------------------------------------------------------
program
  .command('pin <skill>')
  .description('Pin a skill so it is skipped during `augy update`')
  .action(async (skill: string) => {
    await setPinned(skill, true);
  });

program
  .command('unpin <skill>')
  .description('Allow a pinned skill to receive updates again')
  .action(async (skill: string) => {
    await setPinned(skill, false);
  });

// ---------------------------------------------------------------------------
// Default: if no subcommand, launch interactive install
// ---------------------------------------------------------------------------
program.action(async () => {
  const { installCommand } = await import('./commands/install.js');
  await installCommand();
});

program.parse();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setPinned(skillName: string, pinned: boolean): Promise<void> {
  const chalk = (await import('chalk')).default;
  const { readRegistry, writeRegistry, getSkill } = await import('./registry.js');

  const registry = await readRegistry();
  const skill = getSkill(registry, skillName);

  if (!skill) {
    console.error(chalk.red(`Skill "${skillName}" not found in registry.`));
    process.exit(1);
  }

  skill.pinned = pinned;
  registry.skills[skillName] = skill;
  await writeRegistry(registry);

  const action = pinned ? chalk.yellow('pinned') : chalk.green('unpinned');
  console.log(`${chalk.cyan(skillName)} is now ${action}.`);
}
