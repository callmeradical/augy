/**
 * augy sync [path] [--dry-run] [--agent <agents...>]
 *
 * Install and update skills from an augy.json manifest.
 * Designed for team environments: commit augy.json, teammates run augy sync.
 *
 * Behaviour:
 *   - Skills in the manifest but NOT installed → install them
 *   - Skills in the manifest AND installed but at a different SHA → offer upgrade
 *   - Skills installed but NOT in the manifest → left alone (never auto-removed)
 *   - Skills with an empty source string → skipped with a warning
 *
 * Use --dry-run to preview what would change without modifying anything.
 */

import {
  confirm,
  intro,
  isCancel,
  outro,
  spinner,
} from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { cwd } from 'process';
import { mkdir, rm } from 'fs/promises';

import { AGENTS, agentSkillPath, detectInstalledAgents } from '../agents.js';
import {
  buildGigetSource,
  discoverSkills,
  downloadSkill,
  latestShaForPath,
  parseGitHubUrl,
} from '../github.js';
import {
  createSkillRecord,
  getSkill,
  readRegistry,
  shortSha,
  writeRegistry,
} from '../registry.js';
import type { AugyBundle } from './bundle.js';

const DEFAULT_FILENAME = 'augy.json';

export async function syncCommand(
  pathArg?: string,
  opts: { dryRun?: boolean; agent?: string[] } = {},
): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — sync'));

  // -------------------------------------------------------------------------
  // 1. Read manifest
  // -------------------------------------------------------------------------
  const manifestPath = pathArg ?? join(cwd(), DEFAULT_FILENAME);

  if (!existsSync(manifestPath)) {
    console.error(
      chalk.red(`No manifest found at ${manifestPath}\n`) +
        chalk.dim('Run `augy bundle` to create one.'),
    );
    process.exit(1);
  }

  let bundle: AugyBundle;
  try {
    bundle = JSON.parse(await readFile(manifestPath, 'utf8')) as AugyBundle;
  } catch {
    console.error(chalk.red(`Could not parse ${manifestPath}`));
    process.exit(1);
  }

  const entries = Object.entries(bundle.skills);
  if (!entries.length) {
    outro(chalk.dim('Manifest is empty — nothing to sync.'));
    return;
  }

  console.log(
    chalk.dim(`\n  Manifest: ${manifestPath}`) +
      chalk.dim(`  (${entries.length} skill(s))\n`),
  );

  // -------------------------------------------------------------------------
  // 2. Determine target agents
  // -------------------------------------------------------------------------
  const targetAgents = opts.agent?.length
    ? AGENTS.filter((a) => opts.agent!.includes(a.id))
    : detectInstalledAgents();

  if (!targetAgents.length) {
    console.error(chalk.red('No agents detected. Install an agent or use --agent to specify one.'));
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // 3. Resolve manifest entries against registry
  // -------------------------------------------------------------------------
  const registry = await readRegistry();

  type Action = 'install' | 'upgrade' | 'up-to-date' | 'no-source';
  interface PlanEntry {
    name: string;
    source: string;
    action: Action;
    remoteSha?: string;
  }

  const s = spinner();
  s.start('Resolving skills…');

  const plan: PlanEntry[] = [];

  await Promise.allSettled(
    entries.map(async ([name, source]) => {
      if (!source) {
        plan.push({ name, source: '', action: 'no-source' });
        return;
      }

      const installed = getSkill(registry, name);

      try {
        const coords = parseGitHubUrl(source);
        const remoteSha = await latestShaForPath(
          coords.owner, coords.repo, coords.path || '.', coords.ref,
        );

        if (!installed) {
          plan.push({ name, source, action: 'install', remoteSha });
        } else if (installed.sha !== remoteSha) {
          plan.push({ name, source, action: 'upgrade', remoteSha });
        } else {
          plan.push({ name, source, action: 'up-to-date', remoteSha });
        }
      } catch {
        plan.push({ name, source, action: 'no-source' });
      }
    }),
  );

  // Sort: install first, then upgrade, then up-to-date, then no-source
  const order: Record<Action, number> = { install: 0, upgrade: 1, 'up-to-date': 2, 'no-source': 3 };
  plan.sort((a, b) => order[a.action] - order[b.action]);

  s.stop('Resolved');

  // -------------------------------------------------------------------------
  // 4. Print plan
  // -------------------------------------------------------------------------
  const toInstall = plan.filter((p) => p.action === 'install');
  const toUpgrade = plan.filter((p) => p.action === 'upgrade');
  const upToDate  = plan.filter((p) => p.action === 'up-to-date');
  const noSource  = plan.filter((p) => p.action === 'no-source');

  if (toInstall.length) {
    console.log(chalk.bold(`  Install (${toInstall.length})`));
    for (const p of toInstall) {
      console.log(`    ${chalk.cyan(p.name)}  ${chalk.dim(p.remoteSha ? '@' + shortSha(p.remoteSha) : '')}`);
    }
    console.log();
  }

  if (toUpgrade.length) {
    console.log(chalk.bold(`  Upgrade (${toUpgrade.length})`));
    for (const p of toUpgrade) {
      const installed = getSkill(registry, p.name)!;
      console.log(
        `    ${chalk.cyan(p.name)}  ${chalk.dim(installed.shortSha)} → ${chalk.green(shortSha(p.remoteSha!))}`,
      );
    }
    console.log();
  }

  if (upToDate.length) {
    console.log(chalk.dim(`  Up to date (${upToDate.length}): `) +
      chalk.dim(upToDate.map((p) => p.name).join(', ')));
    console.log();
  }

  if (noSource.length) {
    console.log(chalk.yellow(`  Skipped — no source (${noSource.length}): `) +
      chalk.dim(noSource.map((p) => p.name).join(', ')));
    console.log();
  }

  if (!toInstall.length && !toUpgrade.length) {
    outro(chalk.green('Everything is up to date.'));
    return;
  }

  if (opts.dryRun) {
    outro(chalk.dim('Dry run — no changes made.'));
    return;
  }

  // -------------------------------------------------------------------------
  // 5. Confirm and apply
  // -------------------------------------------------------------------------
  const actionCount = toInstall.length + toUpgrade.length;
  const ok = await confirm({
    message: `Apply ${actionCount} change(s) to ${targetAgents.map((a) => a.name).join(', ')}?`,
  });
  if (isCancel(ok) || !ok) {
    console.log(chalk.dim('Cancelled.'));
    process.exit(0);
  }

  for (const entry of [...toInstall, ...toUpgrade]) {
    const s2 = spinner();
    s2.start(`${entry.action === 'install' ? 'Installing' : 'Upgrading'} ${chalk.cyan(entry.name)}…`);

    try {
      const coords     = parseGitHubUrl(entry.source);
      const remote     = await discoverSkills(coords);
      const match      = remote.find((r) => r.name === entry.name) ?? remote[0];
      if (!match) throw new Error('Skill not found at source');

      const agentPaths: Record<string, string> = {};
      for (const agent of targetAgents) {
        const dest = agentSkillPath(agent, entry.name);
        agentPaths[agent.id] = dest;
        await rm(dest, { recursive: true, force: true });
        await mkdir(dest, { recursive: true });
        await downloadSkill(match.gigetSource, dest);
      }

      const existing = getSkill(registry, entry.name);
      const record   = createSkillRecord({
        name:        entry.name,
        source:      entry.source,
        gigetSource: match.gigetSource,
        sha:         match.sha,
        agentIds:    targetAgents.map((a) => a.id),
        agentPaths,
      });
      if (existing) {
        record.installedAt = existing.installedAt;
        record.pinned      = existing.pinned;
        record.history     = existing.history;
      }

      registry.skills[entry.name] = record;
      await writeRegistry(registry);

      s2.stop(
        `${chalk.green('✓')} ${chalk.cyan(entry.name)}  ${chalk.dim('@' + shortSha(match.sha))}`,
      );
    } catch (err) {
      s2.stop(`${chalk.red('✗')} ${chalk.cyan(entry.name)} — ${String(err)}`);
    }
  }

  outro(chalk.green(`Sync complete  ${chalk.dim(`(${actionCount} change(s) applied)`)}`));
}
