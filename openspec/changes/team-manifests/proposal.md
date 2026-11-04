# Proposal

## Why

Teams that rely on AI coding agents want everyone working from the same skills, but without a shared definition each developer installs skills by hand, the sets drift, and new teammates spend their first day hunting for sources. The per-machine lockfile can't fill this role: it holds machine-specific paths and personal settings, and no command reads another machine's lockfile.

## What Changes

- A small, committable manifest file, `augy.json` (format version 1), that maps skill names to GitHub sources.
- New `augy bundle` command that writes `augy.json` from the local registry. By default it includes only skills with a known source and reports how many were left out; `--include-untracked` adds sourceless skills with an empty source; `--output <path>` writes somewhere other than `./augy.json`.
- New `augy sync [path]` command that reads a manifest (default `./augy.json`), compares each entry with the local registry and upstream GitHub, prints a plan grouped into Install, Upgrade, Up to date, and Skipped, and after confirmation installs missing skills and upgrades out-of-date ones into the target agents.
  - `--dry-run` shows the plan without changing anything.
  - `--agent` limits which agents receive skills (default: every detected agent).
  - `--yes` applies without prompting, for CI and automation.
- Sync never removes skills that are missing from the manifest, installs each skill independently, and saves the registry after each successful skill.
- The same manifest format is used by the home-repo feature (`augy home push` / `augy home pull`).

## Capabilities

### New Capabilities

- `manifest-bundle`: Producing an `augy.json` manifest from the local registry, and the manifest's format as written by `augy bundle`.
- `manifest-sync`: Reading an `augy.json` manifest and bringing the local machine's agents and registry in line with it via `augy sync`.

### Modified Capabilities

None.

## Impact

- New commands: `augy bundle [--include-untracked] [--output <path>]`, `augy sync [path] [--dry-run] [--agent ...] [--yes]`.
- Files the user sees: `augy.json` (written by bundle, read by sync), each target agent's skills folder (skills installed or replaced by sync), and `~/.augy/registry.json` (entries added or updated by sync).
- Requires the GitHub CLI (`gh`) installed and logged in for sync.
- Related PRDs/changes: `home-repo` (`augy home push` / `pull` reuse the manifest format and sync; the optional `contexts` field), `skill-inventory` (the lockfile is not the shareable artifact), `adopting-existing-skills` (sourceless skills), `skill-installation` and `skill-versioning` (install, update, pins, history), `skillsets` and `store-migration` (canonical-store layout that sync does not use).
- Out of scope: pruning skills not in the manifest, pinning versions in the manifest, bundling a subset, merging bundles, including authored skill files, context-aware sync, fetching manifests from a URL, validating the manifest `version` field.
