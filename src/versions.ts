/**
 * Version store — manages archived copies of skills in ~/.augy/versions/.
 *
 * Layout:
 *   ~/.augy/versions/<skill-name>/<sha>/   ← frozen snapshot of the skill dir
 *
 * On upgrade: current deployment is copied here before being overwritten.
 * On rollback: archived copy is copied back to agent paths.
 */

import { cp, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { versionArchivePath } from './registry.js';

/**
 * Archive the current on-disk files of a skill before overwriting them.
 * @param sourcePath  Absolute path to the currently installed skill dir
 * @param skillName   Registry key
 * @param sha         The SHA being archived (the version about to be replaced)
 */
export async function archiveVersion(
  sourcePath: string,
  skillName: string,
  sha: string,
): Promise<string> {
  const dest = versionArchivePath(skillName, sha);
  if (existsSync(dest)) {
    // Already archived — skip copy to save time
    return dest;
  }
  await mkdir(dest, { recursive: true });
  await cp(sourcePath, dest, { recursive: true });
  return dest;
}

/**
 * Restore a previously archived version to one or more agent paths.
 * @param skillName   Registry key
 * @param sha         The SHA to restore
 * @param destPaths   Absolute paths (one per agent) to restore into
 */
export async function restoreVersion(
  skillName: string,
  sha: string,
  destPaths: string[],
): Promise<void> {
  const src = versionArchivePath(skillName, sha);
  if (!existsSync(src)) {
    throw new Error(
      `No archived version found for "${skillName}" @ ${sha.slice(0, 7)}.\n` +
        `Archive path: ${src}`,
    );
  }
  await Promise.all(
    destPaths.map(async (dest) => {
      await rm(dest, { recursive: true, force: true });
      await mkdir(dest, { recursive: true });
      await cp(src, dest, { recursive: true });
    }),
  );
}

/**
 * Delete all archived versions of a skill (e.g. when uninstalling).
 */
export async function pruneVersions(skillName: string, keepShas: string[] = []): Promise<void> {
  const { join } = await import('path');
  const { versionArchivePath: archivePath, versionsDir } = await import('./registry.js');
  const skillVersionsDir = join(versionsDir(), skillName);
  if (!existsSync(skillVersionsDir)) return;

  const { readdir } = await import('fs/promises');
  const entries = await readdir(skillVersionsDir);
  await Promise.all(
    entries
      .filter((e) => !keepShas.includes(e))
      .map((e) => rm(join(skillVersionsDir, e), { recursive: true, force: true })),
  );
}

/**
 * Return whether a specific archive exists locally.
 */
export function archiveExists(skillName: string, sha: string): boolean {
  return existsSync(versionArchivePath(skillName, sha));
}
