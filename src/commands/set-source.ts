/**
 * augy set-source <skill> <url>
 *
 * Attach a GitHub source URL to a skill that was imported without one.
 * Supports tree URLs (directories) and blob URLs (specific files — the
 * parent directory is used as the skill root).
 */

import { cancel, intro, outro, spinner } from '@clack/prompts';
import chalk from 'chalk';

import { parseGitHubUrl, buildGigetSource, latestShaForPath } from '../github.js';
import {
  getSkill,
  readRegistry,
  shortSha,
  writeRegistry,
} from '../registry.js';
import { injectSourceIntoSkillMd } from '../provenance.js';

export async function setSourceCommand(skillName: string, sourceArg: string): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(' — set-source'));

  const registry = await readRegistry();
  const skill    = getSkill(registry, skillName);

  if (!skill) {
    cancel(`Skill "${skillName}" not found. Run \`augy list\` to see installed skills.`);
    process.exit(1);
  }

  const s = spinner();
  s.start(`Resolving ${chalk.cyan(sourceArg)}…`);

  let sha: string;
  let gigetSource: string;

  try {
    const coords = parseGitHubUrl(sourceArg);
    const { owner, repo, path, ref } = coords;

    // Fetch SHA for the resolved path directly — no need for full skill discovery,
    // so this works regardless of what the skill file is named.
    sha         = await latestShaForPath(owner, repo, path || '.', ref);
    gigetSource = buildGigetSource(owner, repo, path, ref);

    s.stop(
      `Resolved  ${chalk.dim(`${owner}/${repo}/${path}`)}  ${chalk.green('@' + shortSha(sha))}`,
    );
  } catch (err) {
    s.stop(chalk.red('Failed to resolve source'));
    cancel(String(err));
    process.exit(1);
  }

  // Update registry
  skill.source      = sourceArg;
  skill.gigetSource = gigetSource;
  skill.sha         = sha;
  skill.shortSha    = shortSha(sha);
  skill.updatedAt   = new Date().toISOString();
  registry.skills[skillName] = skill;
  await writeRegistry(registry);

  // Inject source into SKILL.md frontmatter for future scans
  for (const [, install] of Object.entries(skill.agents)) {
    if (install.active) {
      await injectSourceIntoSkillMd(install.path, sourceArg).catch(() => undefined);
    }
  }

  outro(
    chalk.green(`${skillName} source set`) +
      chalk.dim(`  @${shortSha(sha)}`) +
      `\n  ${chalk.dim('Updates and diffs are now available.')}`,
  );
}
