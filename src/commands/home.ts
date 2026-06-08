/**
 * augy home set <repo> [--path <file>] [--skills-path <dir>]
 * augy home push
 * augy home pull [--dry-run] [--agent <agents...>]
 * augy home show
 *
 * Manage a personal GitHub repo for skill authoring and backup.
 *
 * The home repo serves two roles:
 *   1. Source of truth for self-authored skills (skills with no external upstream).
 *      Their files are committed directly into the repo under <skillsPath>/<name>/.
 *   2. Manifest store for all other skills (externally-sourced).
 *      augy.json records name → source so they can be re-installed on a new machine.
 *
 * Authentication uses the user's existing git config — SSH keys, credential
 * helpers, etc. No token required.
 *
 * Set once:
 *   augy home set alice/my-skills
 *   augy home set alice/my-skills --path config/augy.json --skills-path authored
 *
 * Then after installing or authoring skills:
 *   augy home push
 *
 * On a new machine:
 *   augy home pull
 */

import { intro, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { cp, mkdir, readdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  getHomeConfig,
  listSkills,
  readRegistry,
  setHomeConfig,
  upsertSkill,
  writeRegistry,
} from '../registry.js';
import { cloneRepo, gitAddAll, gitCommit, gitPush, repoToUrl } from '../git.js';
import type { AugyBundle } from './bundle.js';
import { agentSkillPath, detectInstalledAgents, AGENTS } from '../agents.js';
import { createSkillRecord } from '../registry.js';

const DEFAULT_PATH       = 'augy.json';
const DEFAULT_SKILLS_DIR = 'skills';

// ---------------------------------------------------------------------------
// home set
// ---------------------------------------------------------------------------

export async function homeSetCommand(
  repo: string,
  opts: { path?: string; skillsPath?: string } = {},
): Promise<void> {
  const parts = repo.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repo "${repo}" — expected owner/repo format (e.g. alice/my-skills)`);
  }

  const path       = opts.path       ?? DEFAULT_PATH;
  const skillsPath = opts.skillsPath ?? DEFAULT_SKILLS_DIR;

  const registry = await readRegistry();
  setHomeConfig(registry, { repo, path, skillsPath });
  await writeRegistry(registry);

  outro(
    `${chalk.green('✓')} Home repo set to ${chalk.cyan(repo)}\n` +
    chalk.dim(`  manifest : ${path}\n`) +
    chalk.dim(`  skills   : ${skillsPath}/`),
  );
}

// ---------------------------------------------------------------------------
// home show
// ---------------------------------------------------------------------------

export async function homeShowCommand(): Promise<void> {
  const registry = await readRegistry();
  const home = getHomeConfig(registry);

  if (!home) {
    console.log(chalk.dim('No home repo configured. Run `augy home set <owner/repo>` to set one.'));
    return;
  }

  console.log(`${chalk.bold('Home repo')}  ${chalk.cyan(home.repo)}`);
  console.log(`${chalk.dim('manifest ')}  ${home.path}`);
  console.log(`${chalk.dim('skills   ')}  ${home.skillsPath}/`);
}

// ---------------------------------------------------------------------------
// home push
// ---------------------------------------------------------------------------

export async function homePushCommand(): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — home push'));

  const registry = await readRegistry();
  const home = getHomeConfig(registry);

  if (!home) {
    console.error(
      chalk.red('No home repo configured.') +
      '\nRun `augy home set <owner/repo>` first.',
    );
    process.exit(1);
  }

  const allSkills = listSkills(registry);
  // Self-authored: no external source. Their files get committed to the home repo.
  const authored  = allSkills.filter((s) => !s.source);
  // Externally sourced: record in the manifest only.
  const external  = allSkills.filter((s) => s.source);

  const cloneDir = join(tmpdir(), `augy-home-push-${Date.now()}`);

  const s = spinner();
  s.start(`Cloning ${chalk.cyan(home.repo)}…`);
  await cloneRepo(repoToUrl(home.repo), cloneDir);
  s.stop(`${chalk.green('✓')} Cloned`);

  // -------------------------------------------------------------------------
  // Copy authored skill files into the clone
  // -------------------------------------------------------------------------
  const homeRepo = home.repo;
  for (const skill of authored) {
    // Find the first agent path that exists on disk
    const sourcePath = Object.values(skill.agents).find((a) => a.active && existsSync(a.path))?.path;
    if (!sourcePath) continue;

    const destPath = home.skillsPath
      ? join(cloneDir, home.skillsPath, skill.name)
      : join(cloneDir, skill.name);

    await mkdir(destPath, { recursive: true });
    await cp(sourcePath, destPath, { recursive: true, force: true });

    // Register the home repo as the source for this skill going forward
    const newSource = `https://github.com/${homeRepo}/tree/main/${home.skillsPath ? home.skillsPath + '/' : ''}${skill.name}`;
    skill.source = newSource;
    upsertSkill(registry, skill);
  }

  // -------------------------------------------------------------------------
  // Write the manifest (all skills)
  // -------------------------------------------------------------------------
  const bundle: AugyBundle = { version: 1, skills: {} };
  for (const skill of allSkills) {
    bundle.skills[skill.name] = skill.source; // authored skills now have a source set above
  }
  await writeFile(
    join(cloneDir, home.path),
    JSON.stringify(bundle, null, 2) + '\n',
    'utf8',
  );

  // -------------------------------------------------------------------------
  // Commit and push
  // -------------------------------------------------------------------------
  const s2 = spinner();
  s2.start('Committing and pushing…');
  await gitAddAll(cloneDir);

  const skillCount = allSkills.length;
  const authoredNote = authored.length ? ` (${authored.length} authored)` : '';
  await gitCommit(cloneDir, `chore: update skills via augy — ${skillCount} skill(s)${authoredNote}`);
  await gitPush(cloneDir);
  s2.stop(`${chalk.green('✓')} Pushed`);

  // Persist updated sources for authored skills
  if (authored.length) await writeRegistry(registry);

  outro(
    `${chalk.bold(String(skillCount))} skill(s) saved to ${chalk.cyan(home.repo)}\n` +
    (authored.length
      ? chalk.dim(`  ${authored.length} authored skill(s) committed + source registered\n`)
      : '') +
    chalk.dim(`  Run \`augy home pull\` on a new machine to restore.`),
  );
}

// ---------------------------------------------------------------------------
// home pull
// ---------------------------------------------------------------------------

export async function homePullCommand(
  opts: { dryRun?: boolean; agent?: string[] } = {},
): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — home pull'));

  const registry = await readRegistry();
  const home = getHomeConfig(registry);

  if (!home) {
    console.error(
      chalk.red('No home repo configured.') +
      '\nRun `augy home set <owner/repo>` first.',
    );
    process.exit(1);
  }

  const cloneDir = join(tmpdir(), `augy-home-pull-${Date.now()}`);

  const s = spinner();
  s.start(`Cloning ${chalk.cyan(home.repo)}…`);
  await cloneRepo(repoToUrl(home.repo), cloneDir);
  s.stop(`${chalk.green('✓')} Cloned`);

  // -------------------------------------------------------------------------
  // Determine target agents
  // -------------------------------------------------------------------------
  const targetAgents = opts.agent?.length
    ? AGENTS.filter((a) => opts.agent!.includes(a.id))
    : detectInstalledAgents();

  if (!targetAgents.length) {
    console.error(chalk.red('No agents detected. Install an agent or use --agent to specify one.'));
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Install authored skills directly from the clone
  // -------------------------------------------------------------------------
  const skillsDir = home.skillsPath
    ? join(cloneDir, home.skillsPath)
    : cloneDir;

  const authoredInstalled: string[] = [];

  if (existsSync(skillsDir)) {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    const skillDirs = entries.filter((e) => e.isDirectory());

    for (const dir of skillDirs) {
      const skillName = dir.name;
      const srcPath   = join(skillsDir, skillName);
      const source    = `https://github.com/${home.repo}/tree/main/${home.skillsPath ? home.skillsPath + '/' : ''}${skillName}`;

      if (opts.dryRun) {
        console.log(`  ${chalk.cyan('+')} ${skillName}  ${chalk.dim('(authored)')}`);
        continue;
      }

      const agentPaths: Record<string, string> = {};
      for (const agent of targetAgents) {
        const dest = agentSkillPath(agent, skillName);
        await mkdir(dest, { recursive: true });
        await cp(srcPath, dest, { recursive: true, force: true });
        agentPaths[agent.id] = dest;
      }

      const record = createSkillRecord({
        name:        skillName,
        source,
        gigetSource: '',
        sha:         'home',
        agentIds:    targetAgents.map((a) => a.id),
        agentPaths,
      });
      upsertSkill(registry, record);
      authoredInstalled.push(skillName);
    }
  }

  // -------------------------------------------------------------------------
  // Sync externally-sourced skills via the manifest
  // -------------------------------------------------------------------------
  const manifestPath = join(cloneDir, home.path);
  if (existsSync(manifestPath)) {
    const { syncCommand } = await import('./sync.js');
    await syncCommand(manifestPath, opts);
  }

  if (!opts.dryRun && authoredInstalled.length) {
    await writeRegistry(registry);
  }

  if (opts.dryRun) {
    outro(chalk.dim('Dry run — no changes made.'));
  }
}
