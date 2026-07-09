# augy

[![npm](https://img.shields.io/npm/v/@callmeradical/augy?label=%40callmeradical%2Faugy&color=7c3aed)](https://www.npmjs.com/package/@callmeradical/augy)
[![license](https://img.shields.io/github/license/callmeradical/augy)](LICENSE)
[![node](https://img.shields.io/node/v/@callmeradical/augy)](package.json)

**Homebrew for AI agent skills.** No marketplace. No accounts. No central service. Just Git repos, a lockfile, and full control over what runs in your agents.

```
augy install tdd              # install by name via a tap
augy update                   # upgrade everything with upstream changes
augy diff tdd                 # browse what changed before upgrading
augy rollback tdd abc1234     # something broke — go back
```

---

## The philosophy

Other skill managers route you through a hosted registry — a central service you have to trust, that can go down, that doesn't work with private repos, and that you can't use behind a firewall.

augy works differently. **Skills are just files in Git repos. GitHub is the registry.**

- Any GitHub repo is a valid skill source — public or private
- `~/.augy/registry.json` is your lockfile — a plain JSON file you can read, diff, commit, and share
- No account required. No API key for the registry. No SaaS dependency
- Works in enterprise environments, behind proxies, with internal repos
- You decide which repos to trust — not a third-party curation team

The tap system is Homebrew's model: register a repo once, install skills by name. Remove the tap and you've unregistered the source. Simple, transparent, yours.

---

## Install

```bash
npm install -g @callmeradical/augy
```

> The npm package is `@callmeradical/augy`. The CLI command is `augy`.

Requires Node.js ≥ 18.

---

## How it works

Skills are directories containing a `SKILL.md` file that an AI agent loads as context. augy tracks which skills you have installed, where they came from (a GitHub path), and what exact version (commit SHA) is on disk — then lets you update, diff, and roll back just like a package manager.

**Supported agents**

augy auto-detects which agents are installed on your machine and pre-selects them in the install prompt. All 33 are supported:

Claude · OpenCode · Codex · Cursor · Windsurf · GitHub Copilot · Gemini CLI · Goose · Amp · Roo Code · Cline · Kiro · Kimi CLI · Kilo Code · Trae · Trae CN · Augment · OpenHands · Replit · Crush · Antigravity · Droid · OpenClaw · CodeBuddy · Command Code · Kode · Mistral Vibe · Mux · OpenClaude IDE · Qoder · Qwen Code · Neovate · AdaL

A single skill can be deployed to multiple agents simultaneously and stays in sync on every update.

---

## Quick start

```bash
# 1. Add a tap — a GitHub repo you trust
augy tap add mattpocock/skills

# 2. See what's available
augy search

# 3. Install by name
augy install tdd

# Already have skills installed manually? Bring them under augy management:
augy scan
```

---

## Commands

### `augy install [url]`
Install skills from a GitHub URL, `owner/repo[/path]` shorthand, or a bare name resolved via a tap. When a repo contains multiple skills, shows a filterable picker.

```bash
augy install tdd                                          # via tap
augy install mattpocock/skills                            # all skills in a repo
augy install https://github.com/mattpocock/skills/tree/main
augy install tdd --agent opencode claude                  # specific agents
```

### `augy scan`
Walk all agent skill directories, find skills augy doesn't know about, auto-detect their GitHub source via git remotes and `SKILL.md` frontmatter, and import them into the registry. Skills without a detectable source show their filesystem path so you can look them up.

```bash
augy scan
```

### `augy update [skill]`
Check all installed skills for upstream SHA drift. Archives the current version, then deploys the new one.

```bash
augy update              # check + upgrade everything
augy update tdd          # single skill
```

### `augy diff <skill> [sha1] [sha2]`
Interactive file-level diff browser. Three modes:

```bash
augy diff tdd                    # installed ↔ upstream HEAD
augy diff tdd abc1234            # installed ↔ specific SHA
augy diff tdd abc1234 def5678    # two local archives side-by-side
```

### `augy rollback <skill> [sha]`
Restore a skill to any previously archived version. Without a SHA, shows an interactive picker.

```bash
augy rollback tdd
augy rollback tdd abc1234
```

### `augy list`
Show all installed skills, their SHAs, agents, and version history.

```bash
augy list
augy list --json    # raw registry JSON
```

### `augy info <skill>`
Full metadata: source, SHA, agents with paths, version history, and a description preview from `SKILL.md`.

```bash
augy info tdd
```

### `augy search [query]`
Search all registered taps for available skills. Shows install status and whether each skill is up to date.

```bash
augy search           # full index across all taps
augy search tdd       # filter by name
```

### `augy tap add|remove|list`
Manage trusted repos. Once tapped, install by bare name.

```bash
augy tap add mattpocock/skills
augy tap add org/internal-skills          # private repos work too
augy tap add mattpocock/skills --path skills/engineering
augy tap list
augy tap remove mattpocock/skills
```

### `augy bundle`
Generate an `augy.json` manifest from your currently installed skills. Commit this file so teammates can reproduce your exact skill set with `augy sync`.

```bash
augy bundle                       # writes ./augy.json
augy bundle --output ~/augy.json  # custom path
augy bundle --include-untracked   # include skills with no known source
```

`augy.json` format:
```json
{
  "version": 1,
  "skills": {
    "tdd": "mattpocock/skills/skills/engineering/tdd",
    "commit": "anomalyco/agent-skills/skills/commit"
  }
}
```

### `augy sync [path]`
Install and update skills from an `augy.json` manifest. Skills in your registry but not in the manifest are left alone — nothing is auto-removed.

```bash
augy sync                         # reads ./augy.json
augy sync ~/team/augy.json        # explicit path
augy sync --dry-run               # preview changes without applying
augy sync --agent opencode claude # target specific agents
```

### `augy set-source <skill> <url>`
Attach a GitHub source to a skill imported without one. Accepts tree and blob URLs. Enables updates, diffs, and rollbacks.

```bash
augy set-source commit https://github.com/owner/repo/tree/main/skills/commit
```

### `augy uninstall <skill>`
Remove a skill from all agent paths and the registry. Optionally prune version archives.

```bash
augy uninstall tdd
```

### `augy pin|unpin <skill>`
Pin a skill to freeze it at the current version, skipping it during `augy update`.

```bash
augy pin tdd
augy unpin tdd
```

---

## Skillsets

A **skillset** is a named group of skills. Use `augy use <name>` to instantly swap your active skills to match a skillset — removing symlinks that don't belong and creating ones that do.

This is the fastest way to maintain separate skill contexts (engineering, research, writing) and switch between them without manually managing what's enabled.

### Concept

```
engineering  → tdd, github, commit, refactor
research     → search, summarize, citations
writing      → grammar, markdown, outline
```

Skills are shared on disk — a skill that appears in two skillsets has only one copy. Only symlinks are managed; skills installed as copies are left untouched.

### End-to-end example

```bash
# Create two skillsets
augy skillset create engineering
augy skillset create research

# Populate them
augy skillset add engineering tdd github commit
augy skillset add research search summarize

# See what you have
augy skillset list
# Name              Skills  Updated
# ─────────────────────────────────────────────────────────────
# engineering       3       7/8/2026
# research          2       7/8/2026

# Inspect a skillset
augy skillset show engineering
# engineering
#   tdd
#   github
#   commit

# Switch to engineering mode (removes research symlinks, adds engineering ones)
augy use engineering --agent claude
# Agent:    Claude (claude)
# Skillset: engineering (3 skills)
#
#   Remove (1)
#     – summarize
#
#   Add (2)
#     + tdd
#     + github
#
# ✓ engineering applied to Claude (−1 removed, +2 added, 1 unchanged)

# Preview a switch without making changes
augy use research --agent claude --dry-run

# Remove a skillset you no longer need (does NOT uninstall skills)
augy skillset delete research --yes
```

### Skillset commands

#### `augy skillset create <name>`
Create a new empty skillset. Names must be alphanumeric and may include hyphens.

```bash
augy skillset create engineering
augy skillset create my-writing-set
```

#### `augy skillset add <name> <skill...>`
Add one or more skills to a skillset. Warns if a skill is not installed, but still records it (install it later with `augy install`).

```bash
augy skillset add engineering tdd github commit
```

#### `augy skillset remove <name> <skill...>`
Remove skills from a skillset. Does not uninstall the skill itself.

```bash
augy skillset remove engineering commit
```

#### `augy skillset list`
Print a table of all skillsets: name, skill count, and last-updated date.

```bash
augy skillset list
```

#### `augy skillset show <name>`
Print every skill in the named skillset.

```bash
augy skillset show engineering
```

#### `augy skillset delete <name> [--yes]`
Delete a skillset. Prompts for confirmation unless `--yes` is passed. Does **not** uninstall or remove any skill files.

```bash
augy skillset delete research
augy skillset delete research --yes   # skip confirmation
```

### `augy use <name>`

Swap the active skill symlinks for the target agent to match the named skillset:

- **Removes** symlinks not in the skillset
- **Creates** symlinks for skills in the skillset that aren't already linked
- **Ignores** skills installed as copies (not symlinks)
- Warns and skips any skill in the set that isn't installed
- Exits with a warning (no changes) if the skillset is empty

```bash
augy use engineering                       # auto-detect agent
augy use engineering --agent opencode      # explicit agent
augy use engineering --dry-run             # preview without changes
AUGY_DEFAULT_AGENT=claude augy use research  # via env var
```

---

## Taps

Taps are GitHub repos you trust as skill sources. The tap system is how augy stays decentralized — there is no central index, just repos you choose to register.

```bash
augy tap add mattpocock/skills        # public repo
augy tap add your-org/private-skills  # private repo — works the same way
augy install tdd                      # resolves via taps automatically
```

Any GitHub repo containing a `SKILL.md` file (or subdirectories that do) is a valid tap. The source of truth is GitHub. augy just tracks what you've installed and from where.

---

## Version storage

Every upgrade archives the current skill files to `~/.augy/versions/<skill>/<sha>/` before overwriting. No external service required — snapshots live on your machine.

```
~/.augy/
  registry.json             ← lockfile — plain JSON, human-readable
  versions/
    tdd/
      7afa86d.../           ← snapshot before last upgrade
      abc1234.../           ← older snapshot
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `AUGY_HOME` | `~/.augy` | Override augy's home directory |
| `AUGY_DEFAULT_AGENT` | — | Default agent ID used by `augy use` and other commands that accept `--agent`. The `--agent` flag always takes precedence. Example: `AUGY_DEFAULT_AGENT=opencode` |
| `CODEX_HOME` | `~/.codex` | Override Codex agent path |
| `GITHUB_TOKEN` | — | Raise GitHub API rate limit from 60 → 5,000 req/hr |

---

## Docs

Full documentation at **[callmeradical.github.io/augy](https://callmeradical.github.io/augy)**

---

## License

MIT
