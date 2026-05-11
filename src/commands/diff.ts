/**
 * augy diff <skill> [sha1] [sha2]
 *
 * Interactive diff browser — three modes:
 *
 *   augy diff <skill>              installed files  ↔  upstream HEAD
 *   augy diff <skill> <sha>        installed files  ↔  specific SHA
 *                                  (uses local archive if available, else GitHub)
 *   augy diff <skill> <sha1> <sha2>  local archive  ↔  local archive
 */

import { cancel, intro, isCancel, outro, select, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';

import { discoverSkills, parseGitHubUrl } from '../github.js';
import { getSkill, readRegistry, shortSha, versionArchivePath } from '../registry.js';
import { archiveExists } from '../versions.js';
import {
  computeFileDiffs,
  diffBadge,
  fetchGitHubFiles,
  FileDiff,
  readLocalFiles,
  renderPatch,
  statusSigil,
} from '../fileDiff.js';

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function diffCommand(
  skillName: string,
  sha1Arg?: string,
  sha2Arg?: string,
): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — diff browser'));

  const registry = await readRegistry();
  const skill = getSkill(registry, skillName);

  if (!skill) {
    cancel(`Skill "${skillName}" not found. Run \`augy list\` to see installed skills.`);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Resolve the two file sets based on mode
  // -------------------------------------------------------------------------

  let oldFiles: Map<string, string>;
  let newFiles: Map<string, string>;
  let oldLabel: string;
  let newLabel: string;

  if (sha1Arg && sha2Arg) {
    // Mode 3: archive ↔ archive
    ({ files: oldFiles, label: oldLabel } = await resolveLocalArchive(skillName, sha1Arg, skill.history));
    ({ files: newFiles, label: newLabel } = await resolveLocalArchive(skillName, sha2Arg, skill.history));
  } else if (sha1Arg) {
    // Mode 2: installed ↔ specific SHA
    ({ files: oldFiles, label: oldLabel } = await resolveInstalledFiles(skill));
    ({ files: newFiles, label: newLabel } = await resolveArbitraryRef(skill, sha1Arg));
  } else {
    // Mode 1: installed ↔ upstream HEAD
    ({ files: oldFiles, label: oldLabel } = await resolveInstalledFiles(skill));
    ({ files: newFiles, label: newLabel } = await resolveUpstream(skill));
  }

  // -------------------------------------------------------------------------
  // Compute diffs
  // -------------------------------------------------------------------------

  const diffs = computeFileDiffs(oldFiles, newFiles);
  const changed = diffs.filter((d) => d.status !== 'unchanged');

  if (!changed.length) {
    outro(chalk.green(`No differences found between ${oldLabel} and ${newLabel}.`));
    return;
  }

  // -------------------------------------------------------------------------
  // Print summary header
  // -------------------------------------------------------------------------

  printSummary(skillName, oldLabel, newLabel, changed);

  // -------------------------------------------------------------------------
  // Interactive file browser loop
  // -------------------------------------------------------------------------

  await browseFiles(changed, oldLabel, newLabel);

  outro(chalk.dim('Done.'));
}

// ---------------------------------------------------------------------------
// File-set resolvers
// ---------------------------------------------------------------------------

async function resolveInstalledFiles(
  skill: Awaited<ReturnType<typeof getSkill>> & object,
): Promise<{ files: Map<string, string>; label: string }> {
  // Use the first active agent's path
  const activeEntry = Object.entries(skill.agents).find(([, a]) => a.active);
  if (!activeEntry) throw new Error('No active agent installation found.');
  const [, install] = activeEntry;

  if (!existsSync(install.path)) {
    throw new Error(`Installed path does not exist: ${install.path}`);
  }

  const s = spinner();
  s.start('Reading installed files…');
  const files = await readLocalFiles(install.path);
  s.stop(`Read ${files.size} local file(s)`);

  return { files, label: shortSha(skill.sha) + ' (installed)' };
}

async function resolveUpstream(
  skill: Awaited<ReturnType<typeof getSkill>> & object,
): Promise<{ files: Map<string, string>; label: string }> {
  const s = spinner();
  s.start('Fetching upstream from GitHub…');

  const coords = parseGitHubUrl(skill.source);
  const remote = await discoverSkills(coords);
  const match = remote.find((r) => r.name === skill.name) ?? remote[0];
  if (!match) throw new Error('Could not find skill on GitHub.');

  const files = await fetchGitHubFiles(
    { ...coords, path: match.repoPath },
    match.sha,
  );
  s.stop(`Fetched ${files.size} remote file(s)  ${chalk.dim('@' + shortSha(match.sha))}`);

  const label =
    match.sha === skill.sha
      ? shortSha(match.sha) + ' (upstream = installed)'
      : shortSha(match.sha) + ' (upstream)';

  return { files, label };
}

async function resolveArbitraryRef(
  skill: Awaited<ReturnType<typeof getSkill>> & object,
  shaPrefix: string,
): Promise<{ files: Map<string, string>; label: string }> {
  // Expand short SHA from history
  const histEntry = skill.history.find((v) => v.sha.startsWith(shaPrefix));
  const fullSha = histEntry?.sha ?? shaPrefix;

  // Prefer local archive if available
  if (archiveExists(skill.name, fullSha)) {
    const archivePath = versionArchivePath(skill.name, fullSha);
    const s = spinner();
    s.start(`Reading local archive ${shortSha(fullSha)}…`);
    const files = await readLocalFiles(archivePath);
    s.stop(`Read ${files.size} archived file(s)`);
    return { files, label: shortSha(fullSha) + ' (archive)' };
  }

  // Fall back to GitHub fetch
  const s = spinner();
  s.start(`Fetching GitHub @ ${shortSha(fullSha)}…`);
  const coords = parseGitHubUrl(skill.source);
  const remote = await discoverSkills(coords);
  const match = remote.find((r) => r.name === skill.name) ?? remote[0];
  if (!match) throw new Error('Could not resolve skill path on GitHub.');

  const files = await fetchGitHubFiles(
    { ...coords, path: match.repoPath },
    fullSha,
  );
  s.stop(`Fetched ${files.size} file(s)  ${chalk.dim('@' + shortSha(fullSha))}`);
  return { files, label: shortSha(fullSha) };
}

async function resolveLocalArchive(
  skillName: string,
  shaPrefix: string,
  history: Array<{ sha: string }>,
): Promise<{ files: Map<string, string>; label: string }> {
  const histEntry = history.find((v) => v.sha.startsWith(shaPrefix));
  const fullSha = histEntry?.sha ?? shaPrefix;

  if (!archiveExists(skillName, fullSha)) {
    throw new Error(
      `No local archive for "${skillName}" @ ${shortSha(fullSha)}.\n` +
        `Available: ${history.map((v) => shortSha(v.sha)).join(', ')}`,
    );
  }

  const archivePath = versionArchivePath(skillName, fullSha);
  const s = spinner();
  s.start(`Reading archive ${shortSha(fullSha)}…`);
  const files = await readLocalFiles(archivePath);
  s.stop(`Read ${files.size} archived file(s)`);
  return { files, label: shortSha(fullSha) };
}

// ---------------------------------------------------------------------------
// Summary printer
// ---------------------------------------------------------------------------

function printSummary(
  skillName: string,
  oldLabel: string,
  newLabel: string,
  diffs: FileDiff[],
): void {
  const totalAdd = diffs.reduce((n, d) => n + d.additions, 0);
  const totalDel = diffs.reduce((n, d) => n + d.deletions, 0);

  console.log();
  console.log(
    `  ${chalk.bold(skillName)}  ` +
      chalk.dim(oldLabel) +
      chalk.dim('  →  ') +
      chalk.green(newLabel),
  );
  console.log(
    `  ${chalk.bold(String(diffs.length))} file(s) changed  ` +
      chalk.green(`+${totalAdd}`) +
      '  ' +
      chalk.red(`-${totalDel}`),
  );
  console.log();

  // File list
  for (const d of diffs) {
    const sigil = statusSigil(d.status);
    const badge = diffBadge(d);
    console.log(`    ${sigil}  ${chalk.bold(d.path)}  ${badge}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Interactive file browser
// ---------------------------------------------------------------------------

const EXIT_SENTINEL = '__EXIT__';

async function browseFiles(
  diffs: FileDiff[],
  oldLabel: string,
  newLabel: string,
): Promise<void> {
  while (true) {
    const chosen = await select({
      message: 'Select a file to inspect',
      options: [
        ...diffs.map((d) => ({
          value: d.path,
          label: `${statusSigil(d.status)}  ${chalk.bold(d.path)}`,
          hint: diffBadge(d),
        })),
        { value: EXIT_SENTINEL, label: chalk.dim('── done ──'), hint: '' },
      ],
    });

    if (isCancel(chosen) || chosen === EXIT_SENTINEL) break;

    const diff = diffs.find((d) => d.path === chosen)!;
    console.log();
    console.log(renderPatch(diff, oldLabel, newLabel));
    console.log();
  }
}
