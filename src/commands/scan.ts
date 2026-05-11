/**
 * augy scan
 *
 * Walk every agent's skills directory and find skill folders (those containing
 * SKILL.md) that augy doesn't know about. Runs provenance detection up front
 * across all untracked skills and groups the display into:
 *
 *   ◆  Provenance detected   — source URL known, can auto-import
 *   ◇  No provenance found   — paths shown so user can inspect the files
 *
 * The import flow then uses the pre-detected provenance to avoid re-fetching.
 */

import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  spinner,
  text,
} from '@clack/prompts';
import chalk from 'chalk';
import { homedir } from 'os';

import { AGENTS, Agent } from '../agents.js';
import { discoverSkills, parseGitHubUrl } from '../github.js';
import {
  createSkillRecord,
  getSkill,
  listSkills,
  readRegistry,
  shortSha,
  writeRegistry,
  Registry,
} from '../registry.js';
import { resolveSkillFromTaps, TapSkill } from '../taps.js';
import {
  detectProvenance,
  injectSourceIntoSkillMd,
  ProvenanceResult,
} from '../provenance.js';
import { filterableMultiselect } from '../ui/filterable-multiselect.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UntrackedSkill {
  name: string;
  agents: Array<{ agent: Agent; path: string }>;
  /** Set after provenance detection step */
  provenance?: ProvenanceResult;
  /** First meaningful line from SKILL.md — shown when provenance is unknown */
  description?: string;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function scanCommand(): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — scan'));

  const registry = await readRegistry();

  // -------------------------------------------------------------------------
  // 1. Discover all on-disk skills across agents
  // -------------------------------------------------------------------------
  const s = spinner();
  s.start('Scanning agent skill directories…');
  const onDisk = await findAllOnDiskSkills();
  s.stop(`Scanned ${AGENTS.length} agent(s)`);

  // -------------------------------------------------------------------------
  // 2. Separate tracked from untracked
  // -------------------------------------------------------------------------
  const untracked: UntrackedSkill[] = [];
  for (const [name, agents] of onDisk) {
    if (!getSkill(registry, name)) {
      untracked.push({ name, agents });
    }
  }

  const tracked = listSkills(registry);

  if (!untracked.length) {
    outro(chalk.green('All installed skills are already tracked by augy.'));
    return;
  }

  // -------------------------------------------------------------------------
  // 3. Run provenance detection + SKILL.md preview for all untracked skills
  // -------------------------------------------------------------------------
  const s2 = spinner();
  s2.start(`Detecting provenance for ${untracked.length} skill(s)…`);

  await Promise.allSettled(
    untracked.map(async (sk) => {
      const firstPath = sk.agents[0]?.path;
      if (!firstPath) return;

      // Provenance: git → frontmatter → tap (in priority order)
      const result = await detectProvenance(firstPath, sk.name);
      if (result) {
        sk.provenance = result;
      } else {
        const tapMatch = await tryResolveTapSource(registry, sk.name);
        if (tapMatch) {
          sk.provenance = {
            source:      `${tapMatch.tapKey}/${tapMatch.repoPath}`,
            gigetSource: tapMatch.gigetSource,
            sha:         tapMatch.sha,
            confidence:  'tap',
            description: `tap: ${tapMatch.tapKey}`,
          };
        }
      }

      // SKILL.md preview for unknown skills — helps user identify the source
      if (!sk.provenance) {
        sk.description = await readSkillDescription(firstPath);
      }
    }),
  );

  const detected  = untracked.filter((sk) =>  sk.provenance);
  const unknown   = untracked.filter((sk) => !sk.provenance);

  s2.stop(
    detected.length === untracked.length
      ? chalk.green(`Provenance found for all ${detected.length} skill(s)`)
      : detected.length > 0
        ? `Provenance found for ${chalk.green(String(detected.length))} of ${untracked.length} · ` +
          chalk.yellow(`${unknown.length} unknown`)
        : chalk.yellow(`No provenance found for any of the ${untracked.length} skill(s)`),
  );

  // -------------------------------------------------------------------------
  // 4. Display results grouped by provenance status
  // -------------------------------------------------------------------------
  const managedNote = tracked.length
    ? chalk.dim(`  ${tracked.length} already managed by augy`)
    : '';

  console.log(
    `\n  ${chalk.bold(String(untracked.length))} untracked skill(s) found${managedNote}\n`,
  );

  if (detected.length) {
    console.log(
      chalk.bold('  Provenance detected') +
        chalk.dim(` (${detected.length})`) +
        '  ' +
        chalk.dim('─'.repeat(36)),
    );
    for (const sk of detected) {
      printDetected(sk);
    }
  }

  if (unknown.length) {
    console.log(
      chalk.bold('  No provenance found') +
        chalk.dim(` (${unknown.length})`) +
        '  ' +
        chalk.dim('─'.repeat(35)),
    );
    for (const sk of unknown) {
      printUnknown(sk);
    }
  }

  // -------------------------------------------------------------------------
  // 5. Ask whether to import
  // -------------------------------------------------------------------------
  const doImport = await confirm({ message: 'Import untracked skills into augy?' });
  if (isCancel(doImport) || !doImport) {
    cancel('No changes made.');
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // 6. Select which skills to import
  // -------------------------------------------------------------------------
  const toImport =
    untracked.length === 1
      ? untracked
      : await selectSkillsToImport(untracked);

  if (isCancel(toImport) || !(toImport as UntrackedSkill[]).length) {
    cancel('Cancelled');
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // 7. Import each selected skill
  // -------------------------------------------------------------------------
  let importedCount = 0;

  for (const sk of toImport as UntrackedSkill[]) {
    console.log();
    console.log(`  ${chalk.cyan.bold(sk.name)}`);

    const detected = sk.provenance;
    let resolvedSource: string | undefined;
    let resolvedGigetSource: string | undefined;
    let resolvedSha: string | undefined;
    let resolvedTap: string | undefined;

    if (detected) {
      const confidenceLabel: Record<string, string> = {
        git:         chalk.green('git remote'),
        frontmatter: chalk.cyan('SKILL.md frontmatter'),
        tap:         chalk.cyan('tap match'),
        unknown:     chalk.dim('unknown'),
      };
      console.log(
        `  ${chalk.dim('via')}     ${confidenceLabel[detected.confidence] ?? detected.confidence}\n` +
        `  ${chalk.dim('source')}  ${detected.source}` +
        (detected.sha ? `  ${chalk.dim('@' + shortSha(detected.sha))}` : ''),
      );

      const useDetected = await confirm({ message: 'Use detected source?', initialValue: true });
      if (isCancel(useDetected)) { cancel('Cancelled'); process.exit(0); }

      if (useDetected) {
        resolvedSource      = detected.source;
        resolvedGigetSource = detected.gigetSource;
        resolvedSha         = detected.sha;
        if (detected.confidence === 'tap') {
          const tm = await tryResolveTapSource(registry, sk.name);
          resolvedTap = tm?.tapKey;
        }
      }
    }

    // Manual fallback — show paths so the user can look up the source
    if (!resolvedSource) {
      if (!detected) {
        console.log(`  ${chalk.dim('Locations:')}`);
        for (const { agent, path } of sk.agents) {
          console.log(`    ${chalk.bold(agent.name.padEnd(10))}  ${chalk.dim(tildefy(path))}`);
        }
        if (sk.description) {
          console.log(`  ${chalk.dim('Description:')}  ${chalk.dim(sk.description)}`);
        }
        console.log();
      }

      const sourceInput = await text({
        message: 'GitHub URL or owner/repo[/path]',
        placeholder: 'https://github.com/owner/repo  (leave blank to import without source)',
        defaultValue: '',
      });
      if (isCancel(sourceInput)) { cancel('Cancelled'); process.exit(0); }
      resolvedSource = ((sourceInput as string | undefined) ?? '').trim();
      // Empty source is fine — skill is imported as "untracked source"
    }

    // Fetch / confirm SHA
    const s3 = spinner();
    let sha: string;
    let gigetSource: string;

    if (resolvedSha && resolvedGigetSource) {
      sha         = resolvedSha;
      gigetSource = resolvedGigetSource;
    } else if (!resolvedSource) {
      // No source — import as untracked, no SHA available
      sha         = 'unversioned';
      gigetSource = '';
    } else {
      s3.start(`Fetching SHA for ${chalk.cyan(sk.name)}…`);
      try {
        const coords = parseGitHubUrl(resolvedSource);
        const remote = await discoverSkills(coords);
        const match  = remote.find((r) => r.name === sk.name) ?? remote[0];
        if (!match) throw new Error('Skill not found at that source');
        sha         = match.sha;
        gigetSource = match.gigetSource;
        s3.stop(chalk.dim('@' + shortSha(sha)));
      } catch (err) {
        s3.stop(chalk.yellow('Could not fetch SHA — importing as unversioned'));
        console.log(chalk.dim(`  ${String(err)}`));
        sha         = 'unversioned';
        gigetSource = resolvedGigetSource ?? `github:${resolvedSource.replace('https://github.com/', '')}`;
      }
    }

    const record = createSkillRecord({
      name:       sk.name,
      source:     resolvedSource,
      gigetSource,
      sha,
      agentIds:   sk.agents.map((a) => a.agent.id),
      agentPaths: Object.fromEntries(sk.agents.map((a) => [a.agent.id, a.path])),
      tap:        resolvedTap,
    });

    registry.skills[sk.name] = record;
    importedCount++;

    // Save after every skill so a crash mid-loop doesn't lose previous imports
    await writeRegistry(registry);

    if (sha !== 'unversioned' && resolvedSource) {
      await injectSourceIntoSkillMd(sk.agents[0]!.path, resolvedSource).catch(() => undefined);
    }

    const sourceTag = !resolvedSource
      ? chalk.yellow('  (no source — add one later with `augy set-source`)')
      : sha !== 'unversioned'
        ? chalk.dim(`  @${shortSha(sha)}`)
        : chalk.yellow('  (unversioned)');

    console.log(`  ${chalk.green('✓')} ${chalk.cyan(sk.name)} imported${sourceTag}`);
  }

  outro(
    importedCount > 0
      ? chalk.green(`${importedCount} skill(s) imported into augy`)
      : chalk.dim('No skills imported.'),
  );
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function printDetected(sk: UntrackedSkill): void {
  const p = sk.provenance!;
  const confidenceColor: Record<string, (s: string) => string> = {
    git:         chalk.green,
    frontmatter: chalk.cyan,
    tap:         chalk.cyan,
  };
  const color  = confidenceColor[p.confidence] ?? chalk.dim;
  const agents = sk.agents.map((a) => chalk.bold(a.agent.name)).join(', ');

  console.log(
    `\n  ${chalk.cyan.bold(sk.name)}  ${chalk.dim('→')}  ${agents}`,
  );
  console.log(
    `  ${chalk.dim('source')}  ${p.source}` +
    (p.sha ? chalk.dim(`  @${shortSha(p.sha)}`) : '') +
    `  ${color(`[${p.confidence}]`)}`,
  );
}

function printUnknown(sk: UntrackedSkill): void {
  console.log(`\n  ${chalk.cyan.bold(sk.name)}  ${chalk.yellow('(no provenance found)')}`);

  for (const { agent, path } of sk.agents) {
    console.log(`  ${chalk.dim(agent.name.padEnd(10))}  ${tildefy(path)}`);
  }

  if (sk.description) {
    console.log(`  ${chalk.dim(sk.description)}`);
  }
}

// ---------------------------------------------------------------------------
// Skill selection prompt
// ---------------------------------------------------------------------------

async function selectSkillsToImport(skills: UntrackedSkill[]) {
  return filterableMultiselect<UntrackedSkill>({
    message: 'Which skills do you want to import?',
    options: skills.map((sk) => ({
      value:    sk,
      label:    sk.name,
      hint:     sk.provenance
                  ? chalk.green(sk.provenance.confidence) + '  ' + chalk.dim(sk.provenance.source)
                  : chalk.yellow('no provenance') + '  ' +
                    chalk.dim(tildefy(sk.agents[0]?.path ?? '')),
      selected: true,
    })),
  });
}

// ---------------------------------------------------------------------------
// File system helpers
// ---------------------------------------------------------------------------

async function findAllOnDiskSkills(): Promise<Map<string, UntrackedSkill['agents']>> {
  const result = new Map<string, UntrackedSkill['agents']>();

  await Promise.all(
    AGENTS.map(async (agent) => {
      if (!existsSync(agent.skillsPath)) return;
      let entries: string[];
      try {
        const dirents = await readdir(agent.skillsPath, { withFileTypes: true });
        entries = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
      } catch { return; }

      for (const name of entries) {
        const skillPath = join(agent.skillsPath, name);
        if (!existsSync(join(skillPath, agent.skillFile))) continue;
        if (!result.has(name)) result.set(name, []);
        result.get(name)!.push({ agent, path: skillPath });
      }
    }),
  );

  return result;
}

/** Read the first meaningful content line from SKILL.md, skipping frontmatter */
async function readSkillDescription(skillPath: string): Promise<string | undefined> {
  const skillMd = join(skillPath, 'SKILL.md');
  if (!existsSync(skillMd)) return undefined;
  try {
    const content = await readFile(skillMd, 'utf8');
    const lines   = content.split('\n');
    let inFrontmatter = false;
    let pastFrontmatter = false;

    for (const line of lines) {
      // Track YAML frontmatter block
      if (line.trim() === '---') {
        if (!pastFrontmatter) { inFrontmatter = !inFrontmatter; if (!inFrontmatter) pastFrontmatter = true; }
        continue;
      }
      if (inFrontmatter) continue;

      // Skip blank lines, headings
      if (!line.trim() || line.startsWith('#')) continue;

      return line.trim().slice(0, 80) + (line.trim().length > 80 ? '…' : '');
    }
  } catch { /* ignore */ }
  return undefined;
}

/** Replace home dir with ~ for compact display */
function tildefy(p: string): string {
  const home = homedir();
  return p.startsWith(home) ? '~' + p.slice(home.length) : p;
}

/** Try tap resolution silently */
async function tryResolveTapSource(
  registry: Registry,
  name: string,
): Promise<TapSkill | undefined> {
  if (!Object.keys(registry.taps).length) return undefined;
  try {
    const result = await resolveSkillFromTaps(registry, name);
    if (!result) return undefined;
    return Array.isArray(result) ? result[0] : result;
  } catch { return undefined; }
}
