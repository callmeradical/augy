# Proposal

## Why

Many developers use more than one AI coding agent, and each one reads skills from its own folder with its own conventions. Keeping one skill in several agents means knowing every agent's folder, copying the skill into each, and noticing when the copies drift. Guessing which agents are installed from whether their skills folders exist is wrong over time, because augy creates those folders itself (PRD: Problem Statement).

## What Changes

- augy knows the skills folders of 33 agents, including the unusual ones (US-18).
- augy detects installed agents from real evidence (a command on `PATH`, an app bundle, editor-extension storage, an agent-written config file, or an environment variable), never from a skills folder (US-4, US-5, US-16, US-17).
- Detected agents are listed first and pre-selected when picking agents, and are the defaults for non-interactive operations. Undetected agents remain reachable (US-6 to US-11).
- `augy install` stores each skill once under `~/.augy/store/<skill>/` and links every selected agent's skill folder to that copy. `augy update` refreshes every agent at once, and `augy uninstall` cleans up everywhere (US-1, US-2, US-3, US-20, US-25).
- The registry records which agents have each skill; `list`, `info`, and `scan` reflect that (US-19, US-21).
- Skills installed before the store existed stay tracked and removable, and re-installing switches them to links (US-22). A dedicated migration command belongs to the sibling change `store-migration`.
- Environment variables: `AUGY_HOME` relocates augy's state, `CODEX_HOME` moves Codex's skills folder and counts as Codex evidence, and `AUGY_DEFAULT_AGENT` sets the default agent for `augy use` (US-12 to US-15).
- augy reaches GitHub through the user's existing GitHub CLI login, so private repos and CI tokens (`GH_TOKEN`, `GITHUB_TOKEN`) work without an augy-specific token (US-23, US-24).

## Capabilities

### New Capabilities
- `agent-detection`: The supported agents and their skills folders, evidence-based detection, how detection shapes agent pickers and default targets across commands, and the `CODEX_HOME` and `AUGY_DEFAULT_AGENT` variables.
- `skill-store`: One canonical copy per skill under augy's home, linked into each target agent; how install, update, and uninstall act on it; per-agent deployment tracking; pre-store skills; and `AUGY_HOME` relocation.
- `github-access`: Reaching GitHub through the user's GitHub CLI login and credentials for every lookup and download, and reporting GitHub access failures clearly.

### Modified Capabilities
<!-- None: no specs exist yet. -->

## Impact

- Commands: `--agent <ids...>` on `augy install`, `augy sync`, and `augy home pull`; agent defaults for `augy install --yes`, `augy sync`, `augy home pull`, `augy author new`, and `augy use`; store behavior of `augy install`, `augy update`, and `augy uninstall`; agent display in `augy list` and `augy info`; extra-copy recording in `augy scan`.
- Files the user sees: `~/.augy/registry.json`, `~/.augy/store/<skill>/`, `~/.augy/versions/<skill>/<sha>/`, `~/.augy/skillsets.json`, and each agent's `<skills directory>/<skill>`.
- Environment: `AUGY_HOME`, `CODEX_HOME`, `AUGY_DEFAULT_AGENT`, `GH_TOKEN`/`GITHUB_TOKEN`; requires an installed, authenticated GitHub CLI (`gh`).
- Related changes: `skill-installation` (install and uninstall flows), `skill-versioning` (update, rollback, archives), `skillsets` (`augy use` linking), `team-manifests` (`augy sync`), `home-repo` (`augy home pull`), `skill-authoring` (`augy author new`), `adopting-existing-skills` (`augy scan`), `skill-inventory` (`augy list`, `augy info`), `store-migration` (converting pre-store copies; draft, not shipped), `augy-cli-foundation` (product-wide rules).
- Source PRD: `docs/prd/multi-agent-support.md`.
