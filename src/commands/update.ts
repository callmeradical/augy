/**
 * augy update [skill-name]
 *
 * Checks installed skills for SHA drift against their upstream GitHub source.
 * For each changed skill, archives the current version and deploys the new one.
 */

import { cancel, confirm, intro, isCancel, multiselect, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { cp, mkdir, rm } from 'fs/promises';

import { agentById, agentSkillPath } from '../agents.js';
import { discoverSkills, downloadSkill, parseGitHubUrl } from '../github.js';
import {
  InstalledVersion,
  listSkills,
  readRegistry,
  RegistrySkill,
  shortSha,
  skillStorePath,
  writeRegistry,
} from '../registry.js';
import { archiveVersion } from '../versions.js';

interface UpdateCandidate {
  skill: RegistrySkill;
  remoteSha: string;
  remoteShortSha: string;
  gigetSource: string;
}

export async function updateCommand(nameArg?: string, opts: { all?: boolean } = {}): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — update'));

  const registry = await readRegistry();
  let skills = listSkills(registry);

  if (!skills.length) {
    cancel('No skills installed. Run `augy install` first.');
    process.exit(0);
  }

  if (nameArg) {
    const found = skills.find((s) => s.name === nameArg);
    if (!found) {
      cancel(`Skill "${nameArg}" not found in registry.`);
      process.exit(1);
    }
    skills = [found];
  }

  // Filter out pinned skills
  const unpinned = skills.filter((s) => !s.pinned);
  const pinned = skills.filter((s) => s.pinned);
  if (pinned.length) {
    console.log(
      chalk.dim(`Skipping ${pinned.length} pinned skill(s): `) +
        chalk.dim(pinned.map((s) => s.name).join(', ')),
    );
  }

  if (!unpinned.length) {
    outro(chalk.yellow('All skills are pinned — nothing to update.'));
    return;
  }

  // Skip authored skills and skills whose source points at the home repo
  // (stale entries from pre-0.6.0 — run `augy home push` to clean them up)
  const homeRepo = registry.home?.repo;
  const authored = unpinned.filter(
    (s) => !s.source || (homeRepo && s.source.includes(homeRepo)),
  );
  const withSource = unpinned.filter(
    (s) => s.source && !(homeRepo && s.source.includes(homeRepo)),
  );

  if (authored.length) {
    console.log(
      chalk.dim(`Skipping ${authored.length} authored skill(s) — run \`augy home push\` to re-sync: `) +
        chalk.dim(authored.map((s) => s.name).join(', ')),
    );
  }

  if (!withSource.length) {
    outro(chalk.dim('No externally-sourced skills to update.'));
    return;
  }

  // Check each skill for updates
  const s = spinner();
  s.start(`Checking ${withSource.length} skill(s) for updates…`);

  const candidates: UpdateCandidate[] = [];
  const errors: { name: string; err: string }[] = [];

  await Promise.allSettled(
    withSource.map(async (skill) => {
      try {
        const coords = parseGitHubUrl(skill.source);
        const remote = await discoverSkills(coords);
        // Match the specific skill by name
        const match = remote.find((r) => r.name === skill.name) ?? remote[0];
        if (!match) return;
        if (match.sha !== skill.sha) {
          candidates.push({
            skill,
            remoteSha: match.sha,
            remoteShortSha: shortSha(match.sha),
            gigetSource: match.gigetSource,
          });
        }
      } catch (err) {
        errors.push({ name: skill.name, err: String(err) });
      }
    }),
  );

  s.stop();

  if (errors.length) {
    for (const { name, err } of errors) {
      console.log(`  ${chalk.red('✗')} ${chalk.cyan(name)} — ${err}`);
    }
  }

  if (!candidates.length) {
    outro(chalk.green('All skills are up to date!'));
    return;
  }

  // Display candidates
  console.log(
    `\n${chalk.bold(String(candidates.length))} skill(s) have updates available:\n`,
  );
  for (const c of candidates) {
    console.log(
      `  ${chalk.cyan(c.skill.name)}  ` +
        chalk.dim(shortSha(c.skill.sha)) +
        chalk.dim(' → ') +
        chalk.green(c.remoteShortSha),
    );
  }
  console.log();

  // --all skips both the selection picker and confirmation prompt (CI-friendly)
  let toUpdate: UpdateCandidate[];
  if (opts.all) {
    toUpdate = candidates;
    console.log(chalk.dim(`  Upgrading all ${candidates.length} skill(s) (--all)…\n`));
  } else {
    const selected =
      candidates.length === 1
        ? candidates
        : await promptUpdateSelection(candidates);

    if (isCancel(selected) || !selected.length) {
      cancel('Update cancelled');
      process.exit(0);
    }
    toUpdate = selected as UpdateCandidate[];

    const ok = await confirm({ message: `Upgrade ${toUpdate.length} skill(s)?` });
    if (isCancel(ok) || !ok) {
      cancel('Update cancelled');
      process.exit(0);
    }
  }

  // Perform upgrades
  for (const candidate of toUpdate) {
    const { skill, remoteSha, remoteShortSha, gigetSource } = candidate;
    const s2 = spinner();
    s2.start(`Upgrading ${chalk.cyan(skill.name)}…`);

    try {
      // Archive current version from the canonical store (preferred) or first agent path
      const archiveSource = skill.storePath ?? Object.values(skill.agents).find(a => a.active)?.path;
      if (archiveSource) {
        await archiveVersion(archiveSource, skill.name, skill.sha);
      }

      // Download new version to the canonical store
      const storePath = skillStorePath(skill.name);
      await rm(storePath, { recursive: true, force: true });
      await mkdir(storePath, { recursive: true });
      await downloadSkill(gigetSource, storePath);

      // Agent symlinks already point at the store — no per-agent work needed.
      // For legacy copies (no storePath), update each agent path directly.
      if (!skill.storePath) {
        for (const [agentId, install] of Object.entries(skill.agents)) {
          if (!install.active) continue;
          const agent = agentById(agentId);
          if (!agent) continue;
          const dest = agentSkillPath(agent, skill.name);
          await rm(dest, { recursive: true, force: true });
          await mkdir(dest, { recursive: true });
          await downloadSkill(gigetSource, dest);
        }
      }

      skill.storePath = storePath;

      // Push old SHA to history
      const archivedEntry: InstalledVersion = {
        sha: skill.sha,
        installedAt: skill.updatedAt,
        archivePath: `${process.env['HOME'] ?? '~'}/.augy/versions/${skill.name}/${skill.sha}`,
      };
      skill.history.push(archivedEntry);

      // Update registry record
      skill.sha = remoteSha;
      skill.shortSha = reShort(remoteSha);
      skill.updatedAt = new Date().toISOString();
      registry.skills[skill.name] = skill;

      s2.stop(
        `${chalk.green('✓')} ${chalk.cyan(skill.name)} ` +
          chalk.dim(shortSha(skill.sha.slice(0, 7))) +
          ' → ' +
          chalk.green(reShort(remoteSha)),
      );
    } catch (err) {
      s2.stop(`${chalk.red('✗')} ${chalk.cyan(skill.name)} — ${String(err)}`);
    }
  }

  await writeRegistry(registry);
  outro(chalk.green('Update complete!'));
}

function reShort(sha: string): string {
  return sha.slice(0, 7);
}

async function promptUpdateSelection(candidates: UpdateCandidate[]) {
  return multiselect({
    message: 'Which skills do you want to upgrade?',
    options: candidates.map((c) => ({
      value: c,
      label: c.skill.name,
      hint:
        chalk.dim(shortSha(c.skill.sha)) +
        ' → ' +
        chalk.green(c.remoteShortSha),
    })),
    required: true,
  });
}
