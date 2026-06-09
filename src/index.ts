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
 *   home set <repo>            Set your personal home repo for skill backup
 *   home push                  Push your skills manifest to the home repo
 *   home pull                  Fetch and sync skills from the home repo
 *   home show                  Show the current home repo configuration
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
// context
// ---------------------------------------------------------------------------
const ctx = program
  .command('context')
  .description('Set or show this machine\'s context (work / personal / custom)');

ctx
  .command('set <context>')
  .description('Mark this machine\'s context  e.g. augy context set work')
  .action(async (context: string) => {
    const { contextSetCommand } = await import('./commands/context.js');
    await contextSetCommand(context);
  });

ctx
  .command('show')
  .description('Show the current machine context')
  .action(async () => {
    const { contextShowCommand } = await import('./commands/context.js');
    await contextShowCommand();
  });

ctx
  .command('clear')
  .description('Remove the machine context')
  .action(async () => {
    const { contextSetCommand } = await import('./commands/context.js');
    await contextSetCommand(undefined);
  });

// ---------------------------------------------------------------------------
// tag (nested subcommands)
// ---------------------------------------------------------------------------
const tag = program
  .command('tag')
  .description('Manage skill context tags  (personal / work / universal / custom)');

tag
  .command('set <skill> [contexts...]')
  .description('Set context tags on a skill  e.g. augy tag set tdd work universal')
  .action(async (skill: string, contexts: string[]) => {
    const { tagSetCommand } = await import('./commands/tag.js');
    await tagSetCommand(skill, contexts ?? []);
  });

tag
  .command('show <skill>')
  .description('Show current context tags for a skill')
  .action(async (skill: string) => {
    const { tagShowCommand } = await import('./commands/tag.js');
    await tagShowCommand(skill);
  });

tag
  .command('migrate')
  .description('Interactively assign context tags to all untagged skills')
  .action(async () => {
    const { tagMigrateCommand } = await import('./commands/tag.js');
    await tagMigrateCommand();
  });

// ---------------------------------------------------------------------------
// author (nested subcommands)
// ---------------------------------------------------------------------------
const author = program
  .command('author')
  .description('Create and edit self-authored skills');

author
  .command('new <name>')
  .description('Scaffold a new skill and open it in $EDITOR')
  .option('--no-edit', 'Skip opening the editor after creating')
  .action(async (name: string, opts: { edit: boolean }) => {
    const { authorNewCommand } = await import('./commands/author.js');
    await authorNewCommand(name, { noEdit: !opts.edit });
  });

author
  .command('edit <name>')
  .description('Open an existing skill in $EDITOR')
  .action(async (name: string) => {
    const { authorEditCommand } = await import('./commands/author.js');
    await authorEditCommand(name);
  });

// ---------------------------------------------------------------------------
// home (nested subcommands)
// ---------------------------------------------------------------------------
const home = program
  .command('home')
  .description('Manage a personal GitHub repo for backing up your skills manifest');

home
  .command('set <repo>')
  .description('Set the home repo  e.g. augy home set alice/my-skills')
  .option('--path <file>', 'Manifest path within the repo (default: augy.json)')
  .option('--skills-path <dir>', 'Dir for authored skills in the repo (default: skills)')
  .action(async (repo: string, opts: { path?: string; skillsPath?: string }) => {
    const { homeSetCommand } = await import('./commands/home.js');
    await homeSetCommand(repo, opts);
  });

home
  .command('push')
  .description('Push your installed skills manifest to the home repo')
  .action(async () => {
    const { homePushCommand } = await import('./commands/home.js');
    await homePushCommand();
  });

home
  .command('pull')
  .description('Fetch the manifest from the home repo and sync skills')
  .option('--dry-run', 'Preview changes without applying them')
  .option('-a, --agent <agents...>', 'Target agent(s) (default: all detected)')
  .option('--context <ctx>', 'Pre-select only skills matching this context (e.g. work, personal)')
  .action(async (opts: { dryRun?: boolean; agent?: string[]; context?: string }) => {
    const { homePullCommand } = await import('./commands/home.js');
    await homePullCommand(opts);
  });

home
  .command('show')
  .description('Show the current home repo configuration')
  .action(async () => {
    const { homeShowCommand } = await import('./commands/home.js');
    await homeShowCommand();
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
