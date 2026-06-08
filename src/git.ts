/**
 * Thin wrappers around the git CLI.
 *
 * Uses the user's existing git config for authentication — SSH keys,
 * credential helpers, etc. No tokens required.
 */

import { execFile } from 'child_process';

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/**
 * Convert an owner/repo shorthand to a full HTTPS GitHub clone URL.
 * Full URLs (https:// or git@) are returned unchanged.
 */
export function repoToUrl(ownerRepoOrUrl: string): string {
  if (ownerRepoOrUrl.startsWith('https://') || ownerRepoOrUrl.startsWith('git@')) {
    return ownerRepoOrUrl;
  }
  return `https://github.com/${ownerRepoOrUrl}.git`;
}

// ---------------------------------------------------------------------------
// Git operations
// ---------------------------------------------------------------------------

/** Shallow-clone a repository into destDir. */
export async function cloneRepo(url: string, destDir: string): Promise<void> {
  await run('git', ['clone', '--depth=1', url, destDir]);
}

/** Stage all changes (new, modified, deleted) in dir. */
export async function gitAddAll(dir: string): Promise<void> {
  await run('git', ['-C', dir, 'add', '-A']);
}

/** Commit staged changes in dir with the given message. */
export async function gitCommit(dir: string, message: string): Promise<void> {
  await run('git', ['-C', dir, 'commit', '-m', message]);
}

/** Push the current branch in dir to its upstream remote. */
export async function gitPush(dir: string): Promise<void> {
  await run('git', ['-C', dir, 'push']);
}
