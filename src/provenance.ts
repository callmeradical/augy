/**
 * provenance.ts
 *
 * Attempts to automatically detect where an on-disk skill originally came from
 * so augy can track it without requiring manual URL entry.
 *
 * Detection strategies (tried in priority order):
 *
 *  1. Git remote   — if the skill path is inside a git repo, extract the
 *                    remote URL and the path-specific commit SHA. Most reliable
 *                    when skills were installed via git clone.
 *
 *  2. SKILL.md     — parse YAML frontmatter for a `source` field. Future
 *                    skills distributed with augy in mind should include this.
 *
 *  3. Tap match    — search registered taps by skill name (network call).
 *
 * Returns undefined when no provenance can be determined.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative } from 'path';

const exec = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProvenanceConfidence = 'git' | 'frontmatter' | 'tap' | 'unknown';

export interface ProvenanceResult {
  /** Full source string suitable for augy registry (owner/repo[/path] or URL) */
  source: string;
  /** giget-compatible source string */
  gigetSource: string;
  /** Commit SHA, or undefined if not determinable */
  sha: string | undefined;
  /** How this was detected */
  confidence: ProvenanceConfidence;
  /** Human-readable explanation for display */
  description: string;
}

// ---------------------------------------------------------------------------
// Main detector
// ---------------------------------------------------------------------------

export async function detectProvenance(
  skillPath: string,
  _skillName: string,
): Promise<ProvenanceResult | undefined> {
  // Try each strategy in order
  const git = await tryGitProvenance(skillPath);
  if (git) return git;

  const fm = await tryFrontmatterProvenance(skillPath);
  if (fm) return fm;

  // Tap matching is done by the caller (requires registry context)
  return undefined;
}

// ---------------------------------------------------------------------------
// Strategy 1: Git remote
// ---------------------------------------------------------------------------

async function tryGitProvenance(skillPath: string): Promise<ProvenanceResult | undefined> {
  try {
    // Is this path inside a git repo?
    const { stdout: root } = await exec('git', [
      '-C', skillPath, 'rev-parse', '--show-toplevel',
    ]);
    const repoRoot = root.trim();

    // Get the remote origin URL
    const { stdout: remoteRaw } = await exec('git', [
      '-C', skillPath, 'remote', 'get-url', 'origin',
    ]);
    const remoteUrl = remoteRaw.trim();

    // Normalise to https URL
    const httpsUrl = normaliseGitUrl(remoteUrl);
    if (!httpsUrl) return undefined;

    // Relative path of the skill within the repo
    const repoPath = relative(repoRoot, skillPath).replace(/\\/g, '/');

    // Latest commit SHA touching this specific path
    const { stdout: shaRaw } = await exec('git', [
      '-C', skillPath, 'log', '-1', '--format=%H', '--', '.',
    ]);
    const sha = shaRaw.trim() || undefined;

    // Build owner/repo[/path] shorthand
    const ownerRepo = githubOwnerRepo(httpsUrl);
    if (!ownerRepo) return undefined;

    const source = repoPath ? `${ownerRepo}/${repoPath}` : ownerRepo;
    const gigetSource = repoPath
      ? `github:${ownerRepo}/${repoPath}`
      : `github:${ownerRepo}`;

    return {
      source,
      gigetSource,
      sha,
      confidence: 'git',
      description: `git remote: ${httpsUrl}  path: ${repoPath || '(root)'}`,
    };
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Strategy 2: SKILL.md frontmatter
// ---------------------------------------------------------------------------

interface SkillFrontmatter {
  source?: string;
  repo?: string;
  origin?: string;
  version?: string;
  name?: string;
}

async function tryFrontmatterProvenance(
  skillPath: string,
): Promise<ProvenanceResult | undefined> {
  const skillMdPath = join(skillPath, 'SKILL.md');
  if (!existsSync(skillMdPath)) return undefined;

  try {
    const raw = await readFile(skillMdPath, 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm) return undefined;

    const sourceRaw = fm.source ?? fm.repo ?? fm.origin;
    if (!sourceRaw) return undefined;

    // Normalise to owner/repo[/path] shorthand
    const ownerRepo = githubOwnerRepo(normaliseGitUrl(sourceRaw) ?? sourceRaw);
    if (!ownerRepo) return undefined;

    return {
      source: ownerRepo,
      gigetSource: `github:${ownerRepo}`,
      sha: undefined, // frontmatter doesn't carry a SHA
      confidence: 'frontmatter',
      description: `SKILL.md frontmatter source: ${sourceRaw}`,
    };
  } catch {
    return undefined;
  }
}

/**
 * Parse YAML-like frontmatter between `---` delimiters.
 * Handles simple key: value pairs only — no full YAML parser needed.
 */
function parseFrontmatter(content: string): SkillFrontmatter | undefined {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return undefined;

  const block = match[1]!;
  const result: Record<string, string> = {};

  for (const line of block.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value) result[key] = value;
  }

  return result as SkillFrontmatter;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Normalise SSH or HTTPS git remote URLs to HTTPS */
function normaliseGitUrl(raw: string): string | undefined {
  raw = raw.trim();

  // Already HTTPS GitHub URL
  if (raw.startsWith('https://github.com/')) return raw.replace(/\.git$/, '');
  if (raw.startsWith('http://github.com/'))  return raw.replace('http://', 'https://').replace(/\.git$/, '');

  // SSH: git@github.com:owner/repo.git
  const sshMatch = raw.match(/^git@github\.com:(.+?)(?:\.git)?$/);
  if (sshMatch) return `https://github.com/${sshMatch[1]}`;

  // Bare owner/repo[/path] — treat as GitHub shorthand
  if (/^[\w.-]+\/[\w.-]/.test(raw)) return `https://github.com/${raw.replace(/\.git$/, '')}`;

  return undefined;
}

/** Extract "owner/repo[/path]" from a GitHub HTTPS URL */
function githubOwnerRepo(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://github.com/${url}`);
    if (!u.hostname.includes('github.com')) return undefined;
    return u.pathname.replace(/^\//, '').replace(/\.git$/, '');
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Frontmatter writer (for augy-installed skills going forward)
// ---------------------------------------------------------------------------

/**
 * Inject or update the `source` field in a SKILL.md frontmatter block.
 * If no frontmatter exists, prepend one. Used after import so future scans
 * self-identify without needing git or tap lookups.
 */
export async function injectSourceIntoSkillMd(
  skillPath: string,
  source: string,
): Promise<void> {
  const skillMdPath = join(skillPath, 'SKILL.md');
  if (!existsSync(skillMdPath)) return;

  const { writeFile } = await import('fs/promises');
  const raw = await readFile(skillMdPath, 'utf8');

  const hasFrontmatter = /^---\r?\n/.test(raw);

  let updated: string;
  if (hasFrontmatter) {
    // Inject source: into existing block if not already present
    if (/^source\s*:/m.test(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '')) {
      return; // already has a source field
    }
    updated = raw.replace(/^(---\r?\n)/, `$1source: ${source}\n`);
  } else {
    updated = `---\nsource: ${source}\n---\n\n${raw}`;
  }

  await writeFile(skillMdPath, updated, 'utf8');
}
