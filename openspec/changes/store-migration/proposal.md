# Proposal

## Why

Since v0.11.0 augy keeps one canonical copy of each skill in `~/.augy/store/<skill>/` and links every agent to it, but every skill installed before v0.11.0, and every skill produced by sync, home pull, authoring, rollback or scan adoption, is still a set of separate per-agent copies. Those users quietly lose updates (agents' copies freeze after the first update while augy reports the skill as current), can't use skillsets, see copies drift apart, and use disk per agent, with no supported way to convert short of reinstalling, which loses history and pins and is impossible for skills with no source (PRD: docs/prd/store-migration.md, Problem Statement).

## What Changes

- Add one safe migration command that brings every tracked copy-based skill under the canonical store: one authoritative copy in the store (under `AUGY_HOME` when set), each recorded agent install replaced by a symlink to it, and the registry recording the skill as store-backed, which is the same end state as a fresh v0.11.0 install.
- Carry every registry detail over unchanged: source, SHA, version history, pin state, tags, source tap, and the list of agents.
- Migrate skills with no source (adopted with `augy scan` or authored) as well as GitHub-sourced ones.
- Make migration safe to repeat: skills already store-backed are skipped, and a second run reports that everything is already migrated.
- Contain failures: a failure on one skill leaves that skill's agent installs as they were and doesn't affect other skills. Skills that can't be migrated are listed with the reason.
- Touch only skills in the registry and only their recorded agent paths.
- Make migrated skills work with every other command: `update` reaches every agent, `use` can link and unlink them, `uninstall` removes the symlinks and the stored copy.
- Allow migration to run without prompts, for CI.
- **Not yet decided** (PRD open items, carried into design.md Open Questions): the command's name and placement, repairing store-backed skills whose agents still hold copies, handling diverged copies, preview and confirmation (`--dry-run`/`--yes`), automatic migration, and closing the commands that still produce copies.

## Capabilities

### New Capabilities

- `store-migration`: Converting tracked copy-based skills to the canonical-store layout, including what is carried over, which skills and paths are touched, repeat-safety, failure containment, reporting, and how migrated skills behave with other commands.

### Modified Capabilities

None.

## Impact

- New CLI command for migration. Its name and placement are an open question (the draft uses a top-level `augy migrate`; `augy tag migrate` already exists and means something unrelated).
- Files the user sees: agent skills folders (copies become symlinks), the canonical store `store/<skill>/` under the augy home, and the registry (`registry.json`) entry for each migrated skill, which becomes store-backed with all other details unchanged.
- Not touched: untracked skills, unrecorded agent paths, and the version archive under `~/.augy/versions/`.
- Related changes and PRDs: multi-agent-support (the canonical store and link model), skill-versioning (history and pins that must survive), skillsets (`augy use` needs links), team-manifests and home-repo (`augy sync` and `augy home pull` still produce copies), adopting-existing-skills (`augy scan` brings untracked skills under management first).
- Status: the PRD is a draft and not shipped. Work that depends on its open questions is blocked in tasks.md until they are resolved.
