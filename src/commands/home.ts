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

import { intro, isCancel, multiselect, outro, spinner } from '@clack/prompts';
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
// upsertSkill is used in homePullCommand
import { cloneRepo, gitAddAll, gitCommit, gitPush, repoToUrl } from '../git.js';
import type { AugyBundle } from './bundle.js';
import { agentSkillPath, detectInstalledAgents, AGENTS } from '../agents.js';
import { createSkillRecord } from '../registry.js';
import { filterableMultiselect } from '../ui/filterable-multiselect.js';

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
  for (const skill of authored) {
    // Find the first agent path that exists on disk
    const sourcePath = Object.values(skill.agents).find((a) => a.active && existsSync(a.path))?.path;
    if (!sourcePath) continue;

    const destPath = home.skillsPath
      ? join(cloneDir, home.skillsPath, skill.name)
      : join(cloneDir, skill.name);

    await mkdir(destPath, { recursive: true });
    await cp(sourcePath, destPath, { recursive: true, force: true });
    // source stays '' — authored skills are identified by their files in
    // skills/, not by a URL. Setting a home-repo URL would cause sync to
    // try (and fail) to install from a private repo on pull.
  }

  // -------------------------------------------------------------------------
  // Write the manifest (external skills only — authored are handled by files)
  // -------------------------------------------------------------------------
  const bundle: AugyBundle = { version: 1, skills: {} };
  for (const skill of external) {
    bundle.skills[skill.name] = skill.source;
  }
  // Include authored skill names with empty source so the manifest is a
  // complete record, but sync will skip empty sources on pull.
  for (const skill of authored) {
    bundle.skills[skill.name] = '';
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

interface PullSkill {
  name:       string;
  source:     string;  // '' = authored, non-empty = external
  isAuthored: boolean;
}

export async function homePullCommand(
  opts: { dryRun?: boolean; agent?: string[] } = {},
): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — home pull'));

  const registry = await readRegistry();
  const home = getHomeConfig(registry);

  if (!home) {
    console.error(chalk.red('No home repo configured.') + '\nRun `augy home set <owner/repo>` first.');
    process.exit(1);
  }

  const cloneDir = join(tmpdir(), `augy-home-pull-${Date.now()}`);

  const s = spinner();
  s.start(`Cloning ${chalk.cyan(home.repo)}…`);
  await cloneRepo(repoToUrl(home.repo), cloneDir);
  s.stop(`${chalk.green('✓')} Cloned`);

  // -------------------------------------------------------------------------
  // Discover available skills: authored from files + external from manifest
  // -------------------------------------------------------------------------
  const available: PullSkill[] = [];

  const skillsDir = home.skillsPath ? join(cloneDir, home.skillsPath) : cloneDir;
  if (existsSync(skillsDir)) {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) available.push({ name: e.name, source: '', isAuthored: true });
    }
  }

  const manifestPath = join(cloneDir, home.path);
  if (existsSync(manifestPath)) {
    const { readFile } = await import('fs/promises');
    const bundle = JSON.parse(await readFile(manifestPath, 'utf8')) as AugyBundle;
    for (const [name, source] of Object.entries(bundle.skills)) {
      if (source && !available.find((s) => s.name === name)) {
        available.push({ name, source, isAuthored: false });
      }
    }
  }

  if (!available.length) {
    outro(chalk.dim('No skills found in home repo.'));
    return;
  }

  // -------------------------------------------------------------------------
  // Skill picker
  // -------------------------------------------------------------------------
  const selected = await filterableMultiselect<PullSkill>({
    message: `Select skills to install  ${chalk.dim(`(${available.length} available)`)}`,
    options: available.map((sk) => ({
      value:    sk,
      label:    sk.name,
      hint:     sk.isAuthored ? chalk.dim('authored') : chalk.dim(sk.source),
      selected: true,
    })),
  });

  if (isCancel(selected) || !(selected as PullSkill[]).length) {
    console.log(chalk.dim('Cancelled.'));
    process.exit(0);
  }

  // Re-resolve selected items through `available` — the picker may return
  // stale object references if options were filtered mid-session.
  const toInstall = (selected as PullSkill[])
    .map((sk) => available.find((a) => a.name === sk.name) ?? sk);

  // -------------------------------------------------------------------------
  // Agent picker (skip if --agent was passed)
  // -------------------------------------------------------------------------
  let targetAgents = opts.agent?.length
    ? AGENTS.filter((a) => opts.agent!.includes(a.id))
    : detectInstalledAgents();

  if (!opts.agent?.length) {
    const agentResult = await multiselect<string>({
      message: 'Install to which agents?',
      options: targetAgents.map((a) => ({ value: a.id, label: a.name })),
      initialValues: targetAgents.map((a) => a.id),
    });
    if (isCancel(agentResult)) { console.log(chalk.dim('Cancelled.')); process.exit(0); }
    targetAgents = AGENTS.filter((a) => (agentResult as string[]).includes(a.id));
  }

  if (!targetAgents.length) {
    console.error(chalk.red('No agents selected.'));
    process.exit(1);
  }

  if (opts.dryRun) {
    for (const sk of toInstall) {
      console.log(`  ${chalk.cyan('+')} ${sk.name}  ${chalk.dim(sk.isAuthored ? 'authored' : sk.source)}`);
    }
    outro(chalk.dim('Dry run — no changes made.'));
    return;
  }

  // -------------------------------------------------------------------------
  // Install authored skills from clone
  // -------------------------------------------------------------------------
  const authoredToInstall = toInstall.filter((sk) => sk.isAuthored);
  for (const sk of authoredToInstall) {
    const srcPath    = join(skillsDir, sk.name);
    const agentPaths: Record<string, string> = {};
    for (const agent of targetAgents) {
      const dest = agentSkillPath(agent, sk.name);
      await mkdir(dest, { recursive: true });
      await cp(srcPath, dest, { recursive: true, force: true });
      agentPaths[agent.id] = dest;
    }
    const record = createSkillRecord({
      name: sk.name, source: '', gigetSource: '', sha: 'home',
      agentIds: targetAgents.map((a) => a.id), agentPaths,
    });
    upsertSkill(registry, record);
  }
  if (authoredToInstall.length) await writeRegistry(registry);

  // -------------------------------------------------------------------------
  // Sync selected external skills via a filtered manifest
  // -------------------------------------------------------------------------
  // External = not authored AND source does not point back at the home repo
  // (guards against stale home-repo URLs from pre-0.6.0 pushes)
  const externalToInstall = toInstall.filter(
    (sk) => !sk.isAuthored && sk.source && !sk.source.includes(home!.repo),
  );
  if (externalToInstall.length) {
    const { tmpdir: td } = await import('os');
    const { writeFile: wf } = await import('fs/promises');
    const filteredBundle: AugyBundle = { version: 1, skills: {} };
    for (const sk of externalToInstall) filteredBundle.skills[sk.name] = sk.source;
    const tmpManifest = join(td(), `augy-home-pull-manifest-${Date.now()}.json`);
    await wf(tmpManifest, JSON.stringify(filteredBundle, null, 2) + '\n', 'utf8');
    const { syncCommand } = await import('./sync.js');
    await syncCommand(tmpManifest, { ...opts, agent: targetAgents.map((a) => a.id) });
  }
}
