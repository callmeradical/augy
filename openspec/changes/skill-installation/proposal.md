# Proposal

## Why

Installing an agent skill from GitHub by hand means finding the right folder, downloading it, and copying it into each agent's skills directory. Afterward nothing records where it came from or which version is on disk, so later updates, diffs, and rollbacks are guesswork, and removing it means hunting down every copy. CI jobs and provisioning scripts can't answer prompts, so they need a one-command install that fails clearly when the request is ambiguous (PRD: Problem Statement).

## What Changes

- `augy install [source]` accepts a repo URL, a `tree/<ref>/<path>` URL, a `blob/` URL to a `SKILL.md`, `owner/repo[/path]` shorthand, or a bare skill name resolved through the user's taps (US-1 to US-7, US-24).
- Discovery finds every skill at the location at any depth and recognizes `SKILL.md` in any case (US-8, US-9).
- Interactive installs show a filterable multi-select skill picker, an agent picker with detected agents first, and a final summary that must be confirmed before anything is written (US-10 to US-17).
- Plain `augy` with no subcommand starts the interactive install flow (US-18).
- `--yes` makes install non-interactive for CI, with fail-fast non-zero exits for every case that would otherwise need a prompt or would install nothing (US-19 to US-23).
- Private and internal repos install with the user's existing GitHub CLI login (US-25).
- Each installed skill is tracked in `~/.augy/registry.json` with its source, version, tap, agents, and install time; re-installing keeps what augy already knew about it (US-26, US-27).
- A failure on one skill doesn't stop the others (US-28).
- `augy uninstall <skill>` previews what it will remove, removes the skill from every agent and from augy's store, optionally deletes archived versions (default no), and always removes the registry entry (US-29 to US-33).

## Capabilities

### New Capabilities
- `skill-install`: Resolving a source to skills on GitHub, choosing skills and agents, confirming, writing skills to the store and agents, the `--yes` contract, and the lockfile record each install creates or updates.
- `skill-uninstall`: Previewing, confirming, and removing a tracked skill from every agent, the store, and the registry, with optional deletion of archived versions.

### Modified Capabilities
<!-- None: no specs exist yet. -->

## Impact

- Commands: `augy install [source]` with `--agent <ids...>` and `--yes`; plain `augy`; `augy uninstall <skill>`.
- Files the user sees: `~/.augy/registry.json`, `~/.augy/store/<skill>/`, `~/.augy/versions/<skill>/`, and `<agent skills dir>/<skill>` in each target agent.
- Depends on the user's GitHub CLI login for GitHub access.
- Related changes: `multi-agent-support` (agent detection, the store and linking, GitHub access), `taps-and-discovery` (registering taps), `skill-versioning` (update, diff, rollback, pin, version history), `skillsets` (uninstall does not touch skillsets), `augy-cli-foundation` (product-wide rules).
- Source PRD: `docs/prd/skill-installation.md`.
