# augy

**Homebrew for AI agent skills** — install, version, update, and rollback skills across OpenCode, Claude, and Codex from a single CLI.

```
augy install tdd              # install by name via a tap
augy update                   # upgrade everything with upstream changes
augy diff tdd                 # browse what changed before upgrading
augy rollback tdd abc1234     # something broke — go back
```

---

## Install

```bash
npm install -g @callmeradical/augy
```

Requires Node.js ≥ 18.

---

## How it works

Skills are directories containing a `SKILL.md` file that an AI agent loads as context. augy tracks which skills you have installed, where they came from (GitHub), and what version (commit SHA) is on disk — then lets you update, diff, and roll back just like a package manager.

**Supported agents**

| Agent | Default skills path |
|---|---|
| OpenCode | `~/.opencode/skills/` |
| Claude | `~/.claude/skills/` |
| Codex | `~/.codex/skills/` (or `$CODEX_HOME/skills`) |

A single skill can be deployed to multiple agents simultaneously.

---

## Commands

### `augy install [url]`
Install skills from a GitHub URL, `owner/repo[/path]` shorthand, or a bare name resolved via a registered tap.

```bash
augy install https://github.com/mattpocock/skills/tree/main
augy install mattpocock/skills/skills/engineering/tdd
augy install tdd                    # resolves via taps
augy install tdd --agent opencode   # target a specific agent
```

### `augy scan`
Find skills already on disk that augy doesn't know about. Auto-detects provenance via git remotes and `SKILL.md` frontmatter, groups results into *detected* vs *no provenance found* with filesystem paths shown for unknown skills. Imports them into the registry.

```bash
augy scan
```

### `augy update [skill]`
Check all installed skills for upstream SHA drift. Shows a list of available upgrades, lets you select which to apply, archives the current version before overwriting.

```bash
augy update              # check + upgrade everything
augy update tdd          # single skill
```

### `augy diff <skill> [sha1] [sha2]`
Interactive file-level diff browser. Three modes:

```bash
augy diff tdd                    # installed ↔ upstream HEAD
augy diff tdd abc1234            # installed ↔ specific SHA
augy diff tdd abc1234 def5678    # two local archives
```

### `augy rollback <skill> [sha]`
Restore a skill to any previously archived version.

```bash
augy rollback tdd                # interactive version picker
augy rollback tdd abc1234        # specific SHA (short or full)
```

### `augy list`
Show all installed skills, their SHAs, agents, and update status.

```bash
augy list
augy list --json    # raw registry JSON
```

### `augy info <skill>`
Full metadata: source, SHA, agents with paths, version history, and a preview of the skill description.

```bash
augy info tdd
```

### `augy search [query]`
Search all registered taps for available skills.

```bash
augy search           # full index
augy search tdd       # filter by name
```

### `augy tap add|remove|list`
Manage trusted repos (taps) — once added, skills can be installed by bare name.

```bash
augy tap add mattpocock/skills
augy tap add mattpocock/skills --path skills/engineering
augy tap list
augy tap remove mattpocock/skills
```

### `augy set-source <skill> <url>`
Attach a GitHub source to a skill imported without one (e.g. via `augy scan`). Enables updates and diffs. Accepts tree and blob URLs.

```bash
augy set-source commit https://github.com/owner/repo/tree/main/skills/commit
```

### `augy uninstall <skill>`
Remove a skill from all agent paths and the registry. Optionally prune version archives.

```bash
augy uninstall tdd
```

### `augy pin|unpin <skill>`
Pin a skill to skip it during `augy update`.

```bash
augy pin tdd
augy unpin tdd
```

---

## Taps

Taps are trusted GitHub repos containing skills. Add one and install by name without knowing the full URL:

```bash
augy tap add mattpocock/skills
augy install tdd        # resolves to mattpocock/skills automatically
```

---

## Version storage

Every upgrade archives the current skill to `~/.augy/versions/<skill>/<sha>/` before overwriting it — giving you a full local snapshot history to diff or rollback to at any time.

```
~/.augy/
  registry.json             ← lockfile (human-readable JSON)
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
| `CODEX_HOME` | `~/.codex` | Override Codex agent path |
| `GITHUB_TOKEN` | — | Raise GitHub API rate limit from 60 to 5000 req/hr |

---

## Docs

Full documentation at **[augy.dev](https://augy.dev)** *(coming soon — see `docs/` for the source)*.

---

## License

MIT
