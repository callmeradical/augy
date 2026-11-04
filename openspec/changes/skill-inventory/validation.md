# Validation: skill-inventory

Code checked: committed HEAD `c725774`, read with `git show HEAD:<path>`. Line numbers are for HEAD.

How the runs worked: `git archive HEAD` was extracted into a temp sandbox, then `npm ci --ignore-scripts` and `tsup` were run there. The built CLI ran with a temp `HOME` and a temp `AUGY_HOME`. For list and info, `PATH` had no `gh`, so no GitHub call could succeed.

The fixture lockfile had:

- skills added in the order zeta, alpha, mid
- a pinned skill
- a sourced but unversioned skill
- an empty-source skill
- a skill from a tap with a description, a label, five history entries (two with archive folders), and three deployments (one active, one inactive, one deleted from disk)
- SKILL.md previews with prose, a heading, and frontmatter
- `home` and `machineContext` sections

Extra runs:

- a missing lockfile
- a lockfile with a JSON syntax error
- a lockfile with no `taps` section
- a real store-model `augy install anthropics/skills/skills/pdf --agent claude gemini --yes`, followed by two `augy update pdf --all` runs forced by setting the recorded SHA to a fake value

## Summary

24 requirements (registry-lockfile 9, skill-inventory 15).

| Verdict | Count |
|---|---|
| Conforms | 20 |
| Deviates | 4 |
| Missing | 0 |
| Unverifiable | 0 |

## Results

### registry-lockfile

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Inventory lives in one plain-JSON lockfile | Conforms | src/registry.ts:95-163 | ran: after `augy install`, `$AUGY_HOME/registry.json` was valid JSON containing `pdf` | Skillsets are in a separate `skillsets.json` (src/skillsets.ts:35). The spec's list of inventory state doesn't include skillsets. |
| Lockfile is pretty-printed with stable formatting | Conforms | src/registry.ts:157-163 | ran: `augy pin zeta` run twice gave byte-identical files with 2-space indentation and a trailing newline | Key order is rebuilt on read (`{...EMPTY, ...parsed}`, registry.ts:151), so a hand-edited file with `skills` before `taps` gets reordered on its next write. |
| Lockfile writes are atomic | Conforms | src/registry.ts:157-163 | read: writes go to `registry.json.tmp`, then `rename` | Not killed mid-write. There's no fsync, and the fixed `.tmp` name is shared by concurrent writers. |
| Missing lockfile is an empty registry | Conforms | src/registry.ts:144-146; src/commands/list.ts:21-24 | ran: empty `AUGY_HOME` printed "No skills installed. Run \`augy install\` to get started." and exited 0 | |
| Older lockfile formats are upgraded in place | Conforms | src/registry.ts:149-151 | ran: a lockfile with no `taps` listed `old @1234567`; the next write (`augy context set work`) kept `old` and added `"taps": {}` | Only top-level sections are filled in. Per-skill fields are not migrated. |
| Unreadable lockfile is not silently discarded | Deviates | src/registry.ts:147-154 | ran: with a syntax error in `registry.json`, `augy list` printed "No skills installed" and exited 0. `augy context set work` then overwrote the file with `{"version":1,"taps":{},"skills":{},"machineContext":"work"}`, and the `keep` skill was lost | The `catch` returns an empty registry for parse errors as well as for a missing file. `list --json` likewise prints an empty registry. |
| AUGY_HOME relocates all augy state | Deviates | src/registry.ts:113-136; src/commands/update.ts:208; src/commands/rollback.ts:104 | ran: install and update with `AUGY_HOME` created `store/` and `versions/` only under it, and `$HOME/.augy` was never created. But both history entries recorded `archivePath: "$HOME/.augy/versions/pdf/<sha>"` | Recorded archive paths point outside `AUGY_HOME`. Also, `AUGY_HOME=` (empty string) puts `registry.json` in the current directory (`env ?? …`, registry.ts:115). Ran: `context set` with an empty value wrote `./registry.json`. |
| Augy home folder layout | Conforms | src/registry.ts:118-136; src/skillsets.ts:35; src/versions.ts:21-34 | ran: install gave `store/pdf/` with `~/.claude/skills/pdf` and `~/.gemini/skills/pdf` as symlinks to it; forced updates gave `versions/pdf/fake1…/` and `versions/pdf/fake2…/` | `skillsets.json` location confirmed by reading. |
| Per-skill lockfile contents | Deviates | src/registry.ts:30-68, 190-220; src/commands/sync.ts:233-246 | ran: the installed entry had name, source, full and short SHA, `installedAt`, `updatedAt`, `pinned`, both agents with path and active flag, `storePath`, and oldest-first history with sha, timestamp, and archivePath. But after `augy sync` upgraded a skill that had `contexts`, `tap`, `label`, and `storePath`, all four were gone (see team-manifests validation) | Per the proposal's Impact, every command that writes the registry is bound by this contract. `augy sync` rebuilds the entry and drops the optional fields. The history `archivePath` is also wrong under `AUGY_HOME` (previous row). |

### skill-inventory

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| List shows every registered skill | Conforms | src/commands/list.ts:12-35, 37-91 | ran: output order was zeta, alpha, mid, tdd, … matching the file; the `tdd` entry showed name, `source: owner/repo/tdd`, `agents: Claude, Gemini CLI (inactive), Codex`, `updated:` | Order is JS property order, so skill names that look like integers (for example `123`) would sort first. The `agents:` line is omitted when a skill has no agents. |
| List shows the short SHA of tracked skills | Conforms | src/commands/list.ts:44-47 | ran: `tdd  @abcdef1` | Uses the stored `shortSha` field, not a slice of `sha`. |
| List marks untracked skills and gives the set-source fix | Conforms | src/commands/list.ts:44-61 | ran: `mystery  untracked  ⚠ no source — run \`augy set-source mystery <url>\` …` and `source: unknown`; sourced `mid` with `unversioned` showed `untracked` | `mid` also gets the "no source" warning even though it has a source (see Behavior not covered). |
| List marks inactive deployments | Conforms | src/commands/list.ts:64-73 | ran: `Gemini CLI (inactive)`, while Claude and Codex were unmarked | |
| List shows a pinned badge | Conforms | src/commands/list.ts:38 | ran: `zeta [pinned]`; `alpha` had no badge | |
| List summarizes version history | Conforms | src/commands/list.ts:39-42, 80-88 | ran: `(5 previous versions)` then `h5sha00`, `h4sha00`, `h3sha00` | |
| Empty list points to install | Conforms | src/commands/list.ts:21-24 | ran: as in the missing-lockfile row | |
| List JSON prints the entire registry | Conforms | src/commands/list.ts:16-19 | ran: `list --json` output deep-equalled the parsed `registry.json` (with taps, home, and machineContext); an empty home printed `{"version":1,"taps":{},"skills":{}}` | Missing sections are filled with defaults rather than printed byte-for-byte as on disk. |
| Info shows source, tap, and SHA | Conforms | src/commands/info.ts:39-51 | ran: `source owner/repo/tdd`, `tap team — Team skills`, `abcdef1 (full: abcdef1234567890)` | For a sourceless skill the source line is blank (list shows "unknown"). |
| Info shows dates, pin status, and label | Conforms | src/commands/info.ts:36, 52-58 | ran: `tdd` showed label `My TDD label` and both installed and updated dates; `prev` (same dates) showed only installed; `zeta` showed `pinned yes (skipped during \`augy update\`)` | |
| Info shows each deployment path with its disk status | Conforms | src/commands/info.ts:60-77 | ran: three paths shown; Codex path marked `(missing!)`; Gemini marked `[inactive]` | |
| Info shows full version history with archive status | Conforms | src/commands/info.ts:79-93; src/versions.ts:84-86 | ran: all five newest first; h5 and h4 `[archived]`, h3 to h1 `[archive missing]` | `archiveExists` checks `versionArchivePath` under `AUGY_HOME`, not the recorded `archivePath`. |
| Info previews the skill's SKILL.md | Deviates | src/commands/info.ts:124-158 | ran: `# Title` plus 7 prose lines showed p1–p5; `# Title, p1, p2, ## Usage` showed p1, p2; a frontmatter file showed `---`, `name: fmprev`, `description: secret-fm`, `---`, `prose one` | Frontmatter isn't skipped. Fails "Frontmatter is not previewed". |
| Info reports an unknown skill | Conforms | src/commands/info.ts:24-30 | ran: `Skill "no-such-skill" not found. Run \`augy list\` to see installed skills.`, exit 1 | |
| Inventory commands are read-only and offline | Conforms | src/commands/list.ts:1-91; src/commands/info.ts:1-158 | ran: with no `gh` on PATH, `list`, `list --json`, and `info` (five skills) all succeeded; afterwards `registry.json` was byte-identical and every file under HOME was md5-identical | read: neither command imports github.ts or giget. Network was not disabled at the OS level. |

## Spec issues

- **"Interrupted write"** (atomic writes) can't be tested deterministically from outside the process. Killing during `writeFile` vs `rename` depends on timing, so the check is effectively a code read.
- **"Per-skill lockfile contents"** says context tags, tap, store path, and label "SHALL be recorded when present", but doesn't say whether later commands must preserve them. The proposal's Impact line ("every augy command that writes the registry is bound by …") suggests they must. That should be stated in the requirement itself.
- **"Inventory lives in one plain-JSON lockfile"** says all inventory state lives in `registry.json`, while "Augy home folder layout" puts skillsets in `skillsets.json`. The spec should say whether skillsets count as inventory state.
- **"Stable across rewrites"** doesn't define "without changing its content". The code is stable for files augy wrote, but it reorders top-level keys from hand-edited files. Hand-edited files may be out of scope.
- **"List shows every registered skill … in the order first added"** isn't fully achievable with a JSON object keyed by name. Integer-like keys always sort first, so the spec may want to exclude or forbid such names.

## Behavior not covered by the spec

- **A sourced but unversioned skill gets a misleading warning.** `augy list` prints "⚠ no source — run `augy set-source …`" for a skill that has a source and SHA `unversioned`, because `noSource` is `!source || sha === 'unversioned'` (list.ts:44-50).
- **Info on a sourceless skill** shows an empty source line and `unversi  (full: unversioned)` (info.ts:40, 49-50).
- **`AUGY_HOME=""` writes `registry.json` into the current working directory** (registry.ts:114-115).
- **Recorded history `archivePath` is never used.** It is wrong under `AUGY_HOME`, but info and rollback recompute the path, which hides the error.
- **`list --json` includes local-only `home` and `machineContext`.** This is intended per the spec, but sharing the output leaks them.
- **Dates are locale- and timezone-dependent.** `2026-01-01T00:00Z` was shown as `12/31/2025`.

## PRD factual errors

Checked every "Further Notes" bullet in `docs/prd/skill-inventory.md`. None is contradicted:

- A corrupted lockfile is treated as empty and then overwritten: reproduced.
- The info preview shows frontmatter: reproduced.
- Info shows sourceless skills oddly: confirmed by reading info.ts:40, 49-50.
- The preview reads from the first active agent folder: confirmed by reading info.ts:127-131.
- The README calls the lockfile shareable (README line 25), and its layout diagram shows only `registry.json` and `versions/`: confirmed.
- `--json` includes home and machine context: confirmed.
- The README says list shows "version history" (line 123): confirmed.
- List does not check the disk: confirmed.

The PRD doesn't mention the `archivePath`/`AUGY_HOME` defect found here.
