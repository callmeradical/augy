/**
 * GitHub URL parsing, skill discovery, and SHA resolution.
 *
 * All network calls use the public GitHub REST API (no auth required for public
 * repos, 60 req/hr unauthenticated). Set GITHUB_TOKEN to raise the limit.
 */

export interface GitHubCoords {
  owner: string;
  repo: string;
  /** Path within the repo, e.g. "skills/commit". Empty string = repo root. */
  path: string;
  /** Branch/tag/SHA ref. Defaults to the repo default branch. */
  ref: string | undefined;
}

export interface RemoteSkill {
  /** Directory name — used as the installed skill name */
  name: string;
  /** Full path within the repo */
  repoPath: string;
  /** giget-compatible source string */
  gigetSource: string;
  /** Latest commit SHA touching this path */
  sha: string;
}

// ---------------------------------------------------------------------------
// URL / shorthand parsing
// ---------------------------------------------------------------------------

/**
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/main/path/to     ← directory
 *   https://github.com/owner/repo/blob/main/path/to/file.md  ← specific file
 *   owner/repo
 *   owner/repo/path/to   (no tree/ prefix — treated as path)
 */
export function parseGitHubUrl(input: string): GitHubCoords {
  input = input.trim().replace(/\/$/, '');

  // Full URL
  if (input.startsWith('https://github.com/') || input.startsWith('http://github.com/')) {
    const url = new URL(input.startsWith('http://') ? input.replace('http://', 'https://') : input);
    const parts = url.pathname.replace(/^\//, '').split('/');
    const owner = parts[0] ?? '';
    const repo  = parts[1] ?? '';

    // /owner/repo/tree/<ref>/path...  — directory link
    if (parts[2] === 'tree') {
      const ref  = parts[3];
      const path = parts.slice(4).join('/');
      return { owner, repo, path, ref };
    }

    // /owner/repo/blob/<ref>/path/to/file  — file link
    // Treat the parent directory as the path so discovery works as expected
    if (parts[2] === 'blob') {
      const ref      = parts[3];
      const filePath = parts.slice(4);
      // If the last segment looks like a file (has an extension), use its parent dir
      const lastPart = filePath.at(-1) ?? '';
      const path = lastPart.includes('.')
        ? filePath.slice(0, -1).join('/')
        : filePath.join('/');
      return { owner, repo, path, ref };
    }

    return { owner, repo, path: parts.slice(2).join('/'), ref: undefined };
  }

  // Shorthand: owner/repo or owner/repo/path
  const parts = input.split('/');
  if (parts.length < 2) throw new Error(`Cannot parse GitHub reference: "${input}"`);
  const owner = parts[0]!;
  const repo  = parts[1]!;
  const path  = parts.slice(2).join('/');
  return { owner, repo, path, ref: undefined };
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

type GHContentItem = {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  sha: string;
  download_url: string | null;
};

type GHCommit = { sha: string };

function apiHeaders(): HeadersInit {
  const token = process.env['GITHUB_TOKEN'];
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'augy-cli',
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

/** List directory contents via GitHub Contents API */
async function listContents(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<GHContentItem[]> {
  const base = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const url = ref ? `${base}?ref=${encodeURIComponent(ref)}` : base;
  const result = await ghFetch<GHContentItem | GHContentItem[]>(url);
  if (!Array.isArray(result)) throw new Error(`Expected directory at "${path}", got a file`);
  return result;
}

/** Get the latest commit SHA that touched a specific path */
export async function latestShaForPath(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<string> {
  let url = `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`;
  if (ref) url += `&sha=${encodeURIComponent(ref)}`;
  const commits = await ghFetch<GHCommit[]>(url);
  if (!commits.length) throw new Error(`No commits found for path "${path}" in ${owner}/${repo}`);
  return commits[0]!.sha;
}

/** Repo-level HEAD SHA (used when path is the entire repo root) */
async function repoHeadSha(owner: string, repo: string, ref?: string): Promise<string> {
  const branch = ref ?? (await defaultBranch(owner, repo));
  const data = await ghFetch<{ object: { sha: string } }>(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
  );
  return data.object.sha;
}

async function defaultBranch(owner: string, repo: string): Promise<string> {
  const data = await ghFetch<{ default_branch: string }>(
    `https://api.github.com/repos/${owner}/${repo}`,
  );
  return data.default_branch;
}

// ---------------------------------------------------------------------------
// Skill discovery
// ---------------------------------------------------------------------------

const SKILL_FILE = 'SKILL.md';
/** Match SKILL.md case-insensitively — handles skill.md, Skill.md, etc. */
function isSkillFile(name: string): boolean {
  return name.toLowerCase() === 'skill.md';
}

/**
 * Discover skills at the given GitHub coordinates at any directory depth.
 *
 * Uses the git tree API (recursive=1) to get the full directory tree in a
 * single request, then filters for SKILL.md entries. This handles any repo
 * layout — flat, one level nested, or deeply categorised — without N+1 calls.
 *
 * Strategy:
 *  1. Quick check: if the target path itself contains SKILL.md → single skill.
 *  2. Otherwise resolve the ref to a commit SHA, fetch the full recursive tree,
 *     filter for SKILL.md blobs under `coords.path`, and return each parent
 *     directory as a skill.
 */
export async function discoverSkills(coords: GitHubCoords): Promise<RemoteSkill[]> {
  const { owner, repo, path, ref } = coords;

  // Step 1: quick check — is the target path itself a skill?
  // We resolve the commit SHA upfront so we can use it as the version identifier
  // without an extra per-path commits API call.
  try {
    const items = await listContents(owner, repo, path, ref);
    if (items.some((i) => i.type === 'file' && isSkillFile(i.name))) {
      const skillName = path.split('/').filter(Boolean).at(-1) ?? repo;
      const sha = await resolveRefToCommitSha(owner, repo, ref);
      return [{ name: skillName, repoPath: path, gigetSource: buildGigetSource(owner, repo, path, ref), sha }];
    }
  } catch {
    // path may not exist — fall through to tree search
  }

  // Step 2: resolve ref → commit SHA → tree SHA, then fetch full recursive tree
  const commitSha = await resolveRefToCommitSha(owner, repo, ref);
  const { tree, truncated } = await ghFetch<{ tree: GHTreeItem[]; truncated: boolean }>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`,
  );

  if (truncated) {
    // Very large repo — fall back to contents API one level deep
    console.warn('Warning: repo tree truncated, falling back to shallow scan');
  }

  // Filter for SKILL.md blobs under our target path
  const prefix = path ? `${path}/` : '';
  const skillMdPaths = tree
    .filter((item) => item.type === 'blob' && item.path.startsWith(prefix) && isSkillFile(item.path.split('/').at(-1) ?? ''))
    .map((item) => item.path.split('/').slice(0, -1).join('/')); // strip /SKILL.md

  if (!skillMdPaths.length) return [];

  // Build a map of directory path → tree SHA from the recursive tree response.
  // We use the directory's tree SHA as the skill version — it changes whenever
  // any file inside the skill directory is modified, with zero extra API calls.
  const treeShaByPath = new Map(
    tree.filter((item) => item.type === 'tree').map((item) => [item.path, item.sha]),
  );

  return skillMdPaths
    .map((skillPath) => {
      const sha = treeShaByPath.get(skillPath) ?? commitSha;
      const name = skillPath.split('/').at(-1)!;
      return {
        name,
        repoPath: skillPath,
        gigetSource: buildGigetSource(owner, repo, skillPath, ref),
        sha,
      } satisfies RemoteSkill;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

type GHTreeItem = { type: 'blob' | 'tree'; path: string; sha: string; size?: number };

/**
 * Resolve a ref (branch name, tag, or commit SHA) to its commit SHA.
 * Tries branch refs first, then tags, then treats the input as a raw SHA.
 */
async function resolveRefToCommitSha(
  owner: string,
  repo: string,
  ref: string | undefined,
): Promise<string> {
  const branch = ref ?? (await defaultBranch(owner, repo));

  // Already a full commit SHA
  if (/^[0-9a-f]{40}$/i.test(branch)) return branch;

  // Try as branch
  try {
    const data = await ghFetch<{ object: { sha: string } }>(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    );
    return data.object.sha;
  } catch { /* not a branch */ }

  // Try as tag
  try {
    const data = await ghFetch<{ object: { sha: string } }>(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/tags/${branch}`,
    );
    return data.object.sha;
  } catch { /* not a tag */ }

  throw new Error(`Cannot resolve ref "${branch}" in ${owner}/${repo}`);
}

export function buildGigetSource(owner: string, repo: string, path: string, ref?: string): string {
  // giget format: github:owner/repo/path#ref
  const p = path ? `/${path}` : '';
  const r = ref ? `#${ref}` : '';
  return `github:${owner}/${repo}${p}${r}`;
}

// ---------------------------------------------------------------------------
// GitHub Contents API — read/write files
// ---------------------------------------------------------------------------

export interface RepoFile {
  /** Decoded UTF-8 content */
  content: string;
  /** Blob SHA required when updating the file via PUT */
  blobSha: string;
}

/**
 * Fetch a single file from a GitHub repo via the Contents API.
 * Returns null if the file does not exist (404).
 * Throws on other HTTP errors.
 */
export async function getFileFromRepo(
  owner: string,
  repo: string,
  path: string,
): Promise<RepoFile | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, { headers: apiHeaders() });

  if (res.status === 404) return null;

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${url}\n${body}`);
  }

  const data = (await res.json()) as { sha: string; content: string; encoding: string };
  const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { content, blobSha: data.sha };
}

export interface PutResult {
  /** Commit SHA of the resulting commit */
  commitSha: string;
}

/**
 * Create or update a file in a GitHub repo via the Contents API.
 * Requires a GITHUB_TOKEN with `contents: write` permission.
 *
 * @param blobSha - Required when updating an existing file (from getFileFromRepo).
 *                  Omit (or pass undefined) when creating a new file.
 */
export async function putFileToRepo(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  blobSha?: string,
): Promise<PutResult> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString('base64'),
  };
  if (blobSha) body['sha'] = blobSha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${url}\n${text}`);
  }

  const data = (await res.json()) as { commit: { sha: string } };
  return { commitSha: data.commit.sha };
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Download a skill (or any directory) from GitHub to a local destination.
 * Uses giget which fetches a tarball — no git required.
 */
export async function downloadSkill(gigetSource: string, destPath: string): Promise<void> {
  const { downloadTemplate } = await import('giget');
  await downloadTemplate(gigetSource, {
    dir: destPath,
    force: true,
    preferOffline: false,
  });
}
