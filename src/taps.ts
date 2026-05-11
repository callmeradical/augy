/**
 * taps.ts
 *
 * Tap resolution — given a bare skill name or partial query, search across all
 * registered taps and return matching RemoteSkill candidates.
 *
 * A tap is a trusted GitHub repo that contains skills. Once added, users can
 * run `augy install <skill-name>` without specifying a full URL — augy resolves
 * it via the tap index.
 */

import { discoverSkills, parseGitHubUrl, RemoteSkill } from './github.js';
import { listTaps, Registry, Tap, tapKey } from './registry.js';

export interface TapSkill extends RemoteSkill {
  tapKey: string;
  tap: Tap;
}

export interface TapSearchResult {
  tapKey: string;
  tap: Tap;
  skills: RemoteSkill[];
  error?: string;
}

/**
 * Search all registered taps for skills whose names match `query`.
 * Empty/undefined query returns all skills across all taps.
 *
 * Results are fetched in parallel across taps.
 */
export async function searchTaps(
  registry: Registry,
  query?: string,
): Promise<TapSearchResult[]> {
  const taps = listTaps(registry);
  if (!taps.length) return [];

  const results = await Promise.allSettled(
    taps.map(async (tap) => {
      const source = tapSource(tap.owner, tap.repo, tap.skillsPath);
      const coords = parseGitHubUrl(source);
      const skills = await discoverSkills(coords);

      const filtered = query
        ? skills.filter((s) =>
            s.name.toLowerCase().includes(query.toLowerCase()),
          )
        : skills;

      return {
        tapKey: tapKey(tap.owner, tap.repo),
        tap,
        skills: filtered,
      } satisfies TapSearchResult;
    }),
  );

  return results.map((r, i) => {
    const tap = taps[i]!;
    if (r.status === 'fulfilled') return r.value;
    return {
      tapKey: tapKey(tap.owner, tap.repo),
      tap,
      skills: [],
      error: String((r as PromiseRejectedResult).reason),
    };
  });
}

/**
 * Resolve a bare skill name to a single TapSkill.
 * Returns undefined if not found. Throws if found in multiple taps
 * and the caller must disambiguate.
 */
export async function resolveSkillFromTaps(
  registry: Registry,
  name: string,
): Promise<TapSkill | TapSkill[] | undefined> {
  const results = await searchTaps(registry, name);

  const matches: TapSkill[] = [];
  for (const result of results) {
    for (const skill of result.skills) {
      if (skill.name.toLowerCase() === name.toLowerCase()) {
        matches.push({ ...skill, tapKey: result.tapKey, tap: result.tap });
      }
    }
  }

  if (!matches.length) return undefined;
  if (matches.length === 1) return matches[0];
  return matches; // caller handles disambiguation
}

/**
 * Build the GitHub shorthand used to discover skills in a tap.
 * e.g. "anomalyco/agent-skills" with skillsPath "skills"
 *   → "anomalyco/agent-skills/skills"
 */
export function tapSource(owner: string, repo: string, skillsPath: string): string {
  return skillsPath ? `${owner}/${repo}/${skillsPath}` : `${owner}/${repo}`;
}

/**
 * Parse a tap argument. Accepts:
 *   owner/repo
 *   https://github.com/owner/repo
 */
export function parseTapArg(input: string): { owner: string; repo: string } {
  input = input.trim().replace(/\/$/, '');
  if (input.startsWith('https://github.com/') || input.startsWith('http://github.com/')) {
    const url = new URL(input.replace('http://', 'https://'));
    const parts = url.pathname.replace(/^\//, '').split('/');
    return { owner: parts[0] ?? '', repo: parts[1] ?? '' };
  }
  const parts = input.split('/');
  if (parts.length < 2) throw new Error(`Invalid tap format "${input}" — expected owner/repo`);
  return { owner: parts[0]!, repo: parts[1]! };
}
