/**
 * fileDiff.ts
 *
 * Core diff engine:
 *  - Read files from a local directory into a content map
 *  - Fetch files from GitHub at a specific commit SHA into a content map
 *  - Compute per-file diffs between two content maps
 *  - Render colorized unified-diff patches
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { createPatch } from 'diff';
import chalk from 'chalk';
import type { GitHubCoords } from './github.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileStatus = 'modified' | 'added' | 'deleted' | 'unchanged';

export interface FileDiff {
  path: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  /** Raw unified diff patch string (empty for unchanged) */
  patch: string;
  oldContent: string;
  newContent: string;
}

// ---------------------------------------------------------------------------
// Local file reading
// ---------------------------------------------------------------------------

/** Recursively read all files under `dir`. Returns relative-path → content map. */
export async function readLocalFiles(dir: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  await walk(dir, dir, result);
  return result;
}

async function walk(root: string, current: string, out: Map<string, string>): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(root, full, out);
      } else if (entry.isFile()) {
        const rel = relative(root, full);
        const content = await readFile(full, 'utf8').catch(() => '');
        out.set(rel, content);
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// GitHub file fetching at a specific SHA
// ---------------------------------------------------------------------------

type GHCommitDetail = { tree: { sha: string } };
type GHTreeItem = { type: 'blob' | 'tree'; path: string; sha: string };
type GHTree = { tree: GHTreeItem[] };
type GHBlob = { content: string; encoding: 'base64' | 'utf-8' };

function apiHeaders(): HeadersInit {
  const token = process.env['GITHUB_TOKEN'];
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function ghFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: apiHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${url}\n${body}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch all files inside `skillRepoPath` at the given `commitSha`.
 *
 * Strategy:
 *  1. Resolve the commit → root tree SHA
 *  2. Fetch the full recursive tree for the repo
 *  3. Filter blobs under `skillRepoPath`
 *  4. Fetch each blob's content in parallel
 *
 * Rate-limit note: 1 + 1 + N calls where N = file count. Set GITHUB_TOKEN
 * to raise the unauthenticated 60 req/hr ceiling.
 */
export async function fetchGitHubFiles(
  coords: GitHubCoords,
  commitSha: string,
): Promise<Map<string, string>> {
  const { owner, repo, path: skillRepoPath } = coords;

  // Step 1: commit → root tree SHA
  const commit = await ghFetch<GHCommitDetail>(
    `https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`,
  );
  const rootTreeSha = commit.tree.sha;

  // Step 2: full recursive tree
  const tree = await ghFetch<GHTree>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${rootTreeSha}?recursive=1`,
  );

  // Step 3: filter to blobs inside the skill directory
  const prefix = skillRepoPath ? `${skillRepoPath}/` : '';
  const blobs = tree.tree.filter(
    (item) => item.type === 'blob' && item.path.startsWith(prefix),
  );

  // Step 4: fetch each blob in parallel
  const result = new Map<string, string>();
  await Promise.all(
    blobs.map(async (blob) => {
      const data = await ghFetch<GHBlob>(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs/${blob.sha}`,
      );
      const content =
        data.encoding === 'base64'
          ? Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')
          : data.content;
      const relPath = prefix ? blob.path.slice(prefix.length) : blob.path;
      result.set(relPath, content);
    }),
  );

  return result;
}

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------

/**
 * Compare two file-content maps and return a FileDiff for every path that
 * appears in either map (sorted: modified, added, deleted, unchanged).
 */
export function computeFileDiffs(
  oldFiles: Map<string, string>,
  newFiles: Map<string, string>,
): FileDiff[] {
  const allPaths = new Set([...oldFiles.keys(), ...newFiles.keys()]);
  const diffs: FileDiff[] = [];

  for (const path of allPaths) {
    const oldContent = oldFiles.get(path) ?? '';
    const newContent = newFiles.get(path) ?? '';

    const status: FileStatus = !oldFiles.has(path)
      ? 'added'
      : !newFiles.has(path)
        ? 'deleted'
        : oldContent === newContent
          ? 'unchanged'
          : 'modified';

    if (status === 'unchanged') continue;

    const patch = createPatch(path, oldContent, newContent, undefined, undefined, {
      context: 3,
    });

    const { additions, deletions } = countChanges(patch);
    diffs.push({ path, status, additions, deletions, patch, oldContent, newContent });
  }

  // Sort: modified → added → deleted
  const order: Record<FileStatus, number> = {
    modified: 0,
    added: 1,
    deleted: 2,
    unchanged: 3,
  };
  return diffs.sort((a, b) => order[a.status] - order[b.status]);
}

function countChanges(patch: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of patch.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }
  return { additions, deletions };
}

// ---------------------------------------------------------------------------
// Patch rendering
// ---------------------------------------------------------------------------

/** Render a colorized unified-diff patch for terminal display. */
export function renderPatch(diff: FileDiff, oldLabel: string, newLabel: string): string {
  if (!diff.patch) return chalk.dim('(no changes)');

  const lines = diff.patch.split('\n');
  const rendered: string[] = [];

  for (const line of lines) {
    if (line.startsWith('---')) {
      rendered.push(chalk.dim(`--- ${oldLabel}/${diff.path}`));
    } else if (line.startsWith('+++')) {
      rendered.push(chalk.dim(`+++ ${newLabel}/${diff.path}`));
    } else if (line.startsWith('@@')) {
      rendered.push(chalk.cyan(line));
    } else if (line.startsWith('+')) {
      rendered.push(chalk.green(line));
    } else if (line.startsWith('-')) {
      rendered.push(chalk.red(line));
    } else if (line.startsWith('\\')) {
      rendered.push(chalk.dim(line));
    } else {
      rendered.push(line);
    }
  }

  return rendered.join('\n');
}

/** One-line summary badge for a FileDiff (used in the file picker hint). */
export function diffBadge(diff: FileDiff): string {
  const parts: string[] = [];
  if (diff.additions > 0) parts.push(chalk.green(`+${diff.additions}`));
  if (diff.deletions > 0) parts.push(chalk.red(`-${diff.deletions}`));
  return parts.join(' ') || chalk.dim('no changes');
}

/** Status sigil for display in the file list. */
export function statusSigil(status: FileStatus): string {
  switch (status) {
    case 'modified': return chalk.yellow('M');
    case 'added':    return chalk.green('A');
    case 'deleted':  return chalk.red('D');
    default:         return ' ';
  }
}
