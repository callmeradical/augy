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
 * Score a skill name against a query for fuzzy matching.
 *
 * Returns a score 0–100:
 *   100 — exact case-insensitive match
 *    90 — name starts with query
 *    70 — name contains query as a substring
 *    40 — query is a subsequence of name (all chars appear in order)
 *     0 — no match
 */
function fuzzyScore(name: string, query: string): number {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  if (n === q) return 100;
  if (n.startsWith(q)) return 90;
  if (n.includes(q)) return 70;
  // subsequence check: every char of q appears in n in order
  let ni = 0;
  for (const ch of q) {
    const found = n.indexOf(ch, ni);
    if (found === -1) return 0;
    ni = found + 1;
  }
  return 40;
}

/**
 * Search all registered taps for skills whose names match `query`.
 * Empty/undefined query returns all skills across all taps.
 *
 * When a query is provided, results are fuzzy-matched and sorted by score
 * (best match first within each tap).
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

      let filtered: RemoteSkill[];
      if (query) {
        const scored = skills
          .map((s) => ({ skill: s, score: fuzzyScore(s.name, query) }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score);
        filtered = scored.map((x) => x.skill);
      } else {
        filtered = skills;
      }

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
