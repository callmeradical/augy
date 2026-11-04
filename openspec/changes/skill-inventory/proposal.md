# Proposal

## Why

Once skills are spread across several AI agents, a developer can't easily answer what is installed, where each skill came from, which version is on disk, which agents have it, whether it is pinned, and what earlier versions are available. Agents keep no such record, and hosted marketplaces keep it on servers the user can't inspect, script against, or version-control.

## What Changes

- augy keeps all inventory state in one plain-JSON lockfile, `~/.augy/registry.json`, that the user owns: human-readable, pretty-printed, written atomically, tolerant of older formats, and relocatable with `AUGY_HOME`.
- `augy list` prints a compact, read-only summary of every skill: name, `[pinned]` badge, short SHA or "untracked", count of previous versions, source, agents (inactive ones marked), last-updated date, and the three most recent previous versions. Sourceless skills get the exact `augy set-source` command to run. An empty registry points the user at `augy install`.
- `augy list --json` prints the whole registry (version, taps, skills, home configuration, machine context) as formatted JSON for scripts.
- `augy info <skill>` shows everything about one skill: source and tap (with description), short and full SHA, install and updated dates, pin status, each agent's deployment path (flagged if missing or inactive), full version history newest first with archive status, and a preview of `SKILL.md`.
- Both commands work offline and never change the registry or skill files.

## Capabilities

### New Capabilities

- `skill-inventory`: The read-only `augy list`, `augy list --json`, and `augy info <skill>` views of installed skills.
- `registry-lockfile`: The `~/.augy/registry.json` lockfile and augy home layout as a user-facing artifact: location, `AUGY_HOME`, format, per-skill contents, atomic writes, and handling of missing, older, or unreadable files.

### Modified Capabilities

None.

## Impact

- Commands: `augy list`, `augy list --json`, `augy info <skill>`.
- Files the user sees: `~/.augy/registry.json` and the augy home layout (`store/`, `versions/`, `skillsets.json`), all relocatable via the `AUGY_HOME` environment variable.
- Every augy command that writes the registry is bound by the lockfile write and format requirements.
- Related PRDs/changes: `adopting-existing-skills` (sourceless skills and `augy set-source`), `team-manifests` (`augy.json` is the shareable artifact, not the lockfile), `skill-versioning` (version history and archives), `home-repo` and `machine-contexts-and-tags` (home and machine-context sections of the lockfile), `skillsets` (`skillsets.json`).
- Out of scope: filtering, sorting, or searching; upstream freshness checks; `--json` for info; editing metadata such as `label`; showing context tags or store path in list/info; importing another machine's registry; lockfile schema validation or repair.
