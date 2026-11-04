# Proposal

## Why

Skills are instructions an AI agent loads as context, so an upstream change changes how the agent behaves. Developers who copy skills by hand can't tell when a skill they depend on has changed, can't see what changed before taking it, and can't get back to the version that worked when an upgrade makes things worse. Teams and CI jobs need a non-interactive way to stay current, and some skills (self-written, or a known-good version) should never move without someone deciding to move them.

## What Changes

- Treat installed skills like packages in a lockfile: every installed skill records its upstream source, an exact version identifier (SHA), install and update times, a pinned flag, and an ordered history of earlier versions.
- `augy update [skill]` checks eligible skills for SHA drift against their GitHub source, lists upgrades as `old-sha → new-sha`, and after selection and confirmation (or immediately with `--all`) archives the current files and deploys the new version to every agent that uses the skill. Pinned, self-authored and home-repo-sourced skills are skipped with a notice.
- `augy pin <skill>` / `augy unpin <skill>` freeze a skill so `augy update` leaves it alone, and release it again. Pinned status is shown in `augy list` and `augy info`.
- `augy diff <skill> [sha1] [sha2]` opens an interactive file-level diff browser in three modes: installed vs. upstream HEAD, installed vs. a specific SHA (local archive first, GitHub as fallback), and archive vs. archive.
- `augy rollback <skill> [sha]` restores an archived version, chosen from a picker or by short SHA, after archiving the version it replaces.
- A local version archive under `~/.augy/versions/<skill>/<sha>/` holds plain directory snapshots on the user's machine. It is never pruned automatically, and `augy uninstall` asks before deleting it.

## Capabilities

### New Capabilities
- `skill-update`: recording each installed skill's version, detecting upstream drift, and applying upgrades interactively or with `--all`, archiving the previous version first.
- `skill-pinning`: freezing and releasing a skill's version with respect to `augy update`, and showing pinned status.
- `skill-diff`: the interactive file-level diff browser comparing installed, upstream and archived versions of a skill.
- `skill-rollback`: restoring archived versions of a skill, and the local, plain-directory version archive that makes that possible.

### Modified Capabilities
<!-- None: no existing specs in openspec/specs/. -->

## Impact

- CLI commands: new `augy update [skill] [--all]`, `augy pin`, `augy unpin`, `augy diff`, `augy rollback`; `augy list` and `augy info` show pinned status; `augy uninstall` asks whether to delete a skill's archives.
- User files: per-skill version fields and history in the lockfile `~/.augy/registry.json` (or under `AUGY_HOME`); archive directories under `~/.augy/versions/<skill>/<full-sha>/` (or `$AUGY_HOME/versions/...`); the skill files every agent sees after an update or rollback.
- Prerequisites: GitHub access for update checks and upstream diffs. Rollback and archive-to-archive diffs need no network.
- Related PRDs: taps-and-discovery (shared upstream version identifiers), home-repo (`augy home push`, home-repo-sourced skills), skill-installation and multi-agent-support (canonical copy linked into agents), skillsets (`augy use`), team-manifests (sync and pinning), skill-inventory (`augy list`, `augy info`).
