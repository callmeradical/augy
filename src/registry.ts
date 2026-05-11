/**
 * Registry — the ~/.augy/registry.json lockfile.
 *
 * Tracks every installed skill: source, SHA, agents, version history, and taps.
 */

import { homedir } from 'os';
import { join } from 'path';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstalledVersion {
  sha: string;
  installedAt: string;
  /** Absolute path to the archived copy in ~/.augy/versions/<name>/<sha>/ */
  archivePath: string;
}

export interface AgentInstall {
  /** Absolute path where the skill is deployed for this agent */
  path: string;
  /** Whether the skill is currently active at this path */
  active: boolean;
}

export interface RegistrySkill {
  name: string;
  /** Human-readable label if set by user */
  label?: string;
  /**
   * Original source URL/shorthand as provided by the user.
   * Empty string means source is unknown — skill was imported from disk
   * without a known upstream. Use `augy set-source` to add one later.
   */
  source: string;
  /** giget-compatible download string. Empty when source is unknown. */
  gigetSource: string;
  /** Current HEAD SHA. "unversioned" when source is unknown. */
  sha: string;
  /** Short SHA (7 chars) for display */
  shortSha: string;
  installedAt: string;
  updatedAt: string;
  /** Whether augy should skip this skill during `augy update` */
  pinned: boolean;
  /** Which agents have this skill deployed, keyed by agent ID */
  agents: Record<string, AgentInstall>;
  /** Ordered list of previous versions (oldest first) */
  history: InstalledVersion[];
  /** "owner/repo" key of the tap this skill was installed from, if any */
  tap?: string;
}

export interface Tap {
  owner: string;
  repo: string;
  /**
   * Path within the repo where skills live.
   * Empty string means repo root. Defaults to "skills" on add.
   */
  skillsPath: string;
  addedAt: string;
  /** Optional free-text description set by the user */
  description?: string;
}

export interface Registry {
  version: 1;
  taps: Record<string, Tap>;   // key: "owner/repo"
  skills: Record<string, RegistrySkill>;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function augyHome(): string {
  const env = process.env['AUGY_HOME'];
  return env ?? join(homedir(), '.augy');
}

export function registryPath(): string {
  return join(augyHome(), 'registry.json');
}

export function versionsDir(): string {
  return join(augyHome(), 'versions');
}

export function versionArchivePath(skillName: string, sha: string): string {
  return join(versionsDir(), skillName, sha);
}

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

const EMPTY_REGISTRY: Registry = { version: 1, taps: {}, skills: {} };

export async function readRegistry(): Promise<Registry> {
  const p = registryPath();
  if (!existsSync(p)) return structuredClone(EMPTY_REGISTRY);
  try {
    const raw = await readFile(p, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Registry>;
    // Migrate older registries that pre-date the taps field
    return { ...structuredClone(EMPTY_REGISTRY), ...parsed };
  } catch {
    return structuredClone(EMPTY_REGISTRY);
  }
}

export async function writeRegistry(registry: Registry): Promise<void> {
  const p = registryPath();
  const tmp = `${p}.tmp`;
  await mkdir(join(p, '..'), { recursive: true });
  await writeFile(tmp, JSON.stringify(registry, null, 2) + '\n', 'utf8');
  await rename(tmp, p); // atomic on POSIX — no partial writes visible to readers
}

// ---------------------------------------------------------------------------
// Skill helpers
// ---------------------------------------------------------------------------

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

export function getSkill(registry: Registry, name: string): RegistrySkill | undefined {
  return registry.skills[name];
}

export function listSkills(registry: Registry): RegistrySkill[] {
  return Object.values(registry.skills);
}

export function upsertSkill(registry: Registry, skill: RegistrySkill): void {
  registry.skills[skill.name] = skill;
}

export function removeSkill(registry: Registry, name: string): void {
  delete registry.skills[name];
}

/** Create a fresh RegistrySkill for a new installation */
export function createSkillRecord(opts: {
  name: string;
  source: string;
  gigetSource: string;
  sha: string;
  agentIds: string[];
  agentPaths: Record<string, string>;
  tap?: string;
}): RegistrySkill {
  const now = new Date().toISOString();
  return {
    name: opts.name,
    source: opts.source,
    gigetSource: opts.gigetSource,
    sha: opts.sha,
    shortSha: shortSha(opts.sha),
    installedAt: now,
    updatedAt: now,
    pinned: false,
    tap: opts.tap,
    agents: Object.fromEntries(
      opts.agentIds.map((id) => [
        id,
        { path: opts.agentPaths[id] ?? '', active: true } satisfies AgentInstall,
      ]),
    ),
    history: [],
  };
}

// ---------------------------------------------------------------------------
// Tap helpers
// ---------------------------------------------------------------------------

export function tapKey(owner: string, repo: string): string {
  return `${owner}/${repo}`;
}

export function getTap(registry: Registry, key: string): Tap | undefined {
  return registry.taps[key];
}

export function listTaps(registry: Registry): Array<{ key: string } & Tap> {
  return Object.entries(registry.taps).map(([key, tap]) => ({ key, ...tap }));
}

export function addTap(registry: Registry, tap: Tap): void {
  registry.taps[tapKey(tap.owner, tap.repo)] = tap;
}

export function removeTap(registry: Registry, key: string): void {
  delete registry.taps[key];
}
