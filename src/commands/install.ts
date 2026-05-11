import {
  cancel,
  confirm,
  intro,
  isCancel,
  multiselect,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';
import chalk from 'chalk';
import { mkdir, rm } from 'fs/promises';

import { AGENTS, agentSkillPath, detectInstalledAgents } from '../agents.js';
import { discoverSkills, parseGitHubUrl, RemoteSkill } from '../github.js';
import {
  createSkillRecord,
  getSkill,
  readRegistry,
  shortSha,
  writeRegistry,
} from '../registry.js';
import { downloadSkill } from '../github.js';
import { resolveSkillFromTaps, TapSkill } from '../taps.js';
import { filterableMultiselect } from '../ui/filterable-multiselect.js';

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function installCommand(urlArg?: string, opts: { agent?: string[] } = {}): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — skill installer'));

  const registry = await readRegistry();

  // 1. Get the source — URL, owner/repo, or bare skill name resolved via taps
  const rawUrl = urlArg ?? (await promptUrl());
  if (isCancel(rawUrl) || !rawUrl) return bail();

  // 2. Detect if this is a bare name (no slash) → try tap resolution first
  const isBare = !String(rawUrl).includes('/') && !String(rawUrl).startsWith('http');
  let discovered: RemoteSkill[];
  let resolvedSource: string;
  let resolvedTap: string | undefined;

  if (isBare) {
    const s = spinner();
    s.start(`Searching taps for "${rawUrl}"…`);

    const tapResult = await resolveSkillFromTaps(registry, String(rawUrl));

    if (!tapResult) {
      s.stop(chalk.yellow(`"${rawUrl}" not found in any tap`));
      cancel(
        `No taps contain a skill named "${rawUrl}".\n` +
          `Try: augy install owner/repo/path   or add a tap with: augy tap add owner/repo`,
      );
      process.exit(1);
    }

    // Multiple tap matches → let user pick
    let chosen: TapSkill;
    if (Array.isArray(tapResult)) {
      s.stop(`Found "${rawUrl}" in ${tapResult.length} taps — please choose`);
      const pick = await select({
        message: 'Which tap should this skill be installed from?',
        options: tapResult.map((ts) => ({
          value: ts,
          label: ts.tapKey,
          hint: chalk.dim('@' + shortSha(ts.sha)),
        })),
      });
      if (isCancel(pick)) return bail();
      chosen = pick as TapSkill;
    } else {
      chosen = tapResult;
      s.stop(`Found in tap ${chalk.cyan(chosen.tapKey)}`);
    }

    discovered = [chosen];
    resolvedSource = `${chosen.tapKey}/${chosen.repoPath}`;
    resolvedTap = chosen.tapKey;
  } else {
    // 2b. Normal URL / owner/repo path
    const s = spinner();
    s.start('Resolving skills from GitHub…');

    try {
      const coords = parseGitHubUrl(String(rawUrl));
      discovered = await discoverSkills(coords);
      resolvedSource = String(rawUrl);
    } catch (err) {
      s.stop(chalk.red('Failed to resolve skills'));
      cancel(String(err));
      process.exit(1);
    }

    if (!discovered.length) {
      s.stop(chalk.yellow('No skills found at that location'));
      cancel('Make sure the path contains a SKILL.md file or subdirectories that do.');
      process.exit(1);
    }

    s.stop(`Found ${chalk.green(String(discovered.length))} skill(s)`);
  }

  // 3. Select skills — always show picker so the user knows what's available
  const selectedSkills = await promptSkillSelection(discovered);

  if (isCancel(selectedSkills) || !selectedSkills.length) return bail();

  // 4. Select agents
  const preselectedAgents = opts.agent ?? [];
  const selectedAgents =
    preselectedAgents.length > 0
      ? AGENTS.filter((a) => preselectedAgents.includes(a.id))
      : await promptAgentSelection();

  if (isCancel(selectedAgents) || !selectedAgents.length) return bail();

  // 5. Confirm
  const lines = selectedSkills.map(
    (sk) =>
      `  ${chalk.cyan(sk.name)} ${chalk.dim('@' + shortSha(sk.sha))}` +
      ` → ${selectedAgents.map((a) => chalk.bold(a.name)).join(', ')}`,
  );
  console.log('\n' + lines.join('\n') + '\n');

  const ok = await confirm({ message: 'Install the above skill(s)?' });
  if (isCancel(ok) || !ok) return bail();

  // 6. Install each skill
  for (const skill of selectedSkills) {
    const s2 = spinner();
    s2.start(`Installing ${chalk.cyan(skill.name)}…`);

    try {
      // Check if already installed — if so, this is a re-install
      const existing = getSkill(registry, skill.name);
      if (existing) {
        s2.message(`${chalk.cyan(skill.name)} already installed — updating record`);
      }

      // Build agent path map
      const agentPaths: Record<string, string> = {};
      for (const agent of selectedAgents) {
        agentPaths[agent.id] = agentSkillPath(agent, skill.name);
      }

      // Download to each agent path
      for (const agent of selectedAgents) {
        const dest = agentPaths[agent.id]!;
        await mkdir(dest, { recursive: true });
        await rm(dest, { recursive: true, force: true });
        await downloadSkill(skill.gigetSource, dest);
      }

      // Write / update registry
      const record = createSkillRecord({
        name: skill.name,
        source: resolvedSource,
        gigetSource: skill.gigetSource,
        sha: skill.sha,
        agentIds: selectedAgents.map((a) => a.id),
        agentPaths,
        tap: resolvedTap,
      });
      // Carry forward history + pinned status if re-installing
      if (existing) {
        record.installedAt = existing.installedAt;
        record.pinned = existing.pinned;
        record.history = existing.history;
      }

      registry.skills[skill.name] = record;

      s2.stop(`${chalk.green('✓')} ${chalk.cyan(skill.name)} ${chalk.dim('@' + shortSha(skill.sha))}`);
    } catch (err) {
      s2.stop(`${chalk.red('✗')} ${chalk.cyan(skill.name)} — ${String(err)}`);
    }
  }

  await writeRegistry(registry);

  outro(
    chalk.green('Done!') +
      chalk.dim(` Registry saved → ~/.augy/registry.json`),
  );
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

async function promptUrl(): Promise<string | symbol> {
  return text({
    message: 'GitHub URL or owner/repo[/path]',
    placeholder: 'https://github.com/owner/repo  or  owner/repo/skills/my-skill',
    validate: (v) => (v.trim() ? undefined : 'Please enter a URL or repo path'),
  });
}

async function promptSkillSelection(
  skills: Awaited<ReturnType<typeof discoverSkills>>,
) {
  const installed = new Set(Object.keys((await readRegistry()).skills));

  return filterableMultiselect({
    message: 'Select skills to install',
    options: skills.map((s) => {
      const isInstalled = installed.has(s.name);
      return {
        value: s,
        label: s.name,
        hint: chalk.dim('@' + shortSha(s.sha)) +
              (isInstalled
                ? chalk.yellow('  already installed')
                : '  ' + chalk.dim(s.repoPath)),
        selected: !isInstalled, // pre-select everything not yet installed
      };
    }),
  });
}

async function promptAgentSelection() {
  const detected = new Set(detectInstalledAgents().map((a) => a.id));
  return filterableMultiselect({
    message: 'Install for which agents?',
    options: AGENTS.map((a) => ({
      value: a,
      label: a.name,
      hint: detected.has(a.id)
        ? chalk.dim(a.skillsPath)
        : chalk.dim('not detected'),
      selected: detected.has(a.id),
    })),
  });
}

function bail(): void {
  cancel('Installation cancelled');
  process.exit(0);
}
