/**
 * Skillsets — the ~/.augy/skillsets.json store.
 *
 * A skillset is a named group of skills. `augy use <name>` atomically swaps
 * the active skill symlinks for a target agent to match the skillset.
 */

import { homedir } from 'os';
import { join } from 'path';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { augyHome } from './registry.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Skillset {
  name: string;
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillsetsFile {
  version: 1;
  skillsets: Record<string, Skillset>;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function skillsetsPath(): string {
  return join(augyHome(), 'skillsets.json');
}

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

const EMPTY_SKILLSETS: SkillsetsFile = { version: 1, skillsets: {} };

export async function readSkillsets(): Promise<SkillsetsFile> {
  const p = skillsetsPath();
  if (!existsSync(p)) return structuredClone(EMPTY_SKILLSETS);
  let raw: string;
  try {
    raw = await readFile(p, 'utf8');
  } catch {
    return structuredClone(EMPTY_SKILLSETS);
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SkillsetsFile>;
    return { ...structuredClone(EMPTY_SKILLSETS), ...parsed };
  } catch {
    console.error(`Error: ${p} contains invalid JSON. Please fix or delete the file.`);
    process.exit(1);
  }
}

export async function writeSkillsets(data: SkillsetsFile): Promise<void> {
  const p = skillsetsPath();
  const tmp = `${p}.tmp`;
  await mkdir(join(p, '..'), { recursive: true });
  await writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await rename(tmp, p); // atomic on POSIX
}

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

export function getSkillset(data: SkillsetsFile, name: string): Skillset | undefined {
  return data.skillsets[name];
}

export function listSkillsets(data: SkillsetsFile): Skillset[] {
  return Object.values(data.skillsets);
}

/** Validate skillset name: alphanumeric + hyphens only */
export function isValidSkillsetName(name: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(name);
}

export function createSkillset(data: SkillsetsFile, name: string): Skillset {
  const now = new Date().toISOString();
  const skillset: Skillset = { name, skills: [], createdAt: now, updatedAt: now };
  data.skillsets[name] = skillset;
  return skillset;
}

export function deleteSkillset(data: SkillsetsFile, name: string): void {
  delete data.skillsets[name];
}
