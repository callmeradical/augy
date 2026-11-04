# Spec Delta

## Purpose

Lets a developer bring their machine in line with a shared `augy.json` manifest, installing missing skills and upgrading out-of-date ones into their agents, safely, repeatably, and without removing anything they already have.

## ADDED Requirements

### Requirement: Sync reads a manifest from a path or the current folder
`augy sync [path]` SHALL read the manifest at the given path, or `./augy.json` in the current folder when no path is given. (US-7, US-23, PD: "Sync's default manifest is `./augy.json`.")

#### Scenario: Default manifest
- **WHEN** the current folder contains `augy.json` listing skill `tdd`
- **AND** the user runs `augy sync --dry-run`
- **THEN** the plan includes `tdd`

#### Scenario: Explicit path
- **WHEN** the user runs `augy sync /work/project-a/skills.json --dry-run`
- **THEN** the plan is built from `/work/project-a/skills.json`

### Requirement: Sync fails clearly on a missing or malformed manifest
When the manifest file does not exist, is not valid JSON, or is valid JSON without a `skills` object, sync SHALL exit with a non-zero status and a clear message, suggesting `augy bundle` when the manifest is missing, and SHALL change nothing. (US-17, PD: "A missing file, invalid JSON, or no target agents ends sync with a non-zero exit."; Further Notes present a crash on a manifest with no `skills` object as a defect)

#### Scenario: Missing manifest
- **WHEN** there is no manifest at the given or default path
- **AND** the user runs `augy sync`
- **THEN** the command exits non-zero and suggests `augy bundle`

#### Scenario: Invalid JSON
- **WHEN** the manifest file contains invalid JSON
- **AND** the user runs `augy sync`
- **THEN** the command exits non-zero with a message that the manifest couldn't be read

#### Scenario: No skills object
- **WHEN** the manifest is valid JSON but has no `skills` object
- **AND** the user runs `augy sync`
- **THEN** the command exits non-zero with a clear message rather than an unhandled error

### Requirement: Empty skills map is nothing to sync
When the manifest's `skills` map is empty, sync SHALL report that there is nothing to sync and change nothing. (PD: "An empty `skills` map ends with 'nothing to sync'.")

#### Scenario: Empty map
- **WHEN** the manifest is `{"version": 1, "skills": {}}`
- **AND** the user runs `augy sync`
- **THEN** the output says there is nothing to sync and no files or registry entries change

### Requirement: Sync targets every detected agent by default
Without `--agent`, sync SHALL target every agent detected on the machine, without asking the user to pick. (US-8, PD: "Without it, sync targets every agent detected on the machine, with no picker.")

#### Scenario: Two detected agents
- **WHEN** two agents are detected on the machine and the user runs `augy sync --yes` with a manifest listing one not-installed skill
- **THEN** the skill is installed into both agents' skills folders without an agent-selection prompt

### Requirement: Agent flag selects exactly the target agents
With `--agent`, sync SHALL target exactly the listed agent IDs, ignore unknown IDs, and leave all other agents untouched. (US-9, PD: "With `--agent`, sync targets exactly the listed agent IDs. Unknown IDs are ignored.")

#### Scenario: One named agent
- **WHEN** agents A and B are detected and the user runs `augy sync --agent A --yes`
- **THEN** only agent A's skills folder receives files
- **AND** agent B's skills folder is unchanged

#### Scenario: Unknown agent ID
- **WHEN** the user runs `augy sync --agent A --agent not-an-agent --yes`
- **THEN** sync targets agent A only

### Requirement: Sync stops when there are no target agents
When no agents are detected and `--agent` is not given (or names no known agent), sync SHALL exit with a non-zero status and a message telling the user to install an agent or pass `--agent`. (US-18)

#### Scenario: No detected agents
- **WHEN** no agents are detected on the machine
- **AND** the user runs `augy sync`
- **THEN** the command exits non-zero and the message mentions installing an agent or passing `--agent`

### Requirement: Sync resolves each entry against current upstream
Sync SHALL resolve each manifest source to its current upstream version, on the default branch or on the branch or tag named in a tree URL. Sources SHALL accept GitHub repo, tree, and blob URLs and `owner/repo[/path]` shorthand. (US-22, PD: "Sync always resolves each entry to the current upstream version")

#### Scenario: Tree URL with a tag
- **WHEN** a manifest entry's source is `https://github.com/o/r/tree/v2/skills/x` and `v2` differs from the default branch
- **AND** sync installs it
- **THEN** the installed files and recorded SHA correspond to `v2`, not the default branch

#### Scenario: Shorthand follows the default branch
- **WHEN** a manifest entry's source is `o/r/skills/x`
- **AND** sync installs it
- **THEN** the installed files correspond to the current default branch of `o/r`

### Requirement: Sync classifies each entry into a plan
Sync SHALL print a plan in four groups: Install (not installed locally), Upgrade (installed but recorded SHA differs from upstream, shown old SHA → new SHA), Up to date (otherwise), and Skipped (empty source, or upstream can't be resolved). (US-11, PD: "How sync decides what to do with each entry")

#### Scenario: One entry in each group
- **WHEN** the manifest lists one not-installed skill, one installed skill whose upstream has changed, one installed skill whose upstream has not changed, and one entry with an empty source
- **AND** the user runs `augy sync --dry-run`
- **THEN** the plan shows one entry under each of Install, Upgrade, Up to date, and Skipped
- **AND** the Upgrade entry shows its old and new SHA

### Requirement: Placeholder entries are skipped with a warning
Manifest entries with an empty source SHALL be skipped with a visible warning and SHALL NOT stop the rest of the sync. (US-16, PD: "Empty source: skipped.")

#### Scenario: Placeholder in the manifest
- **WHEN** the manifest maps `mystery` to `""` and also lists a sourced, not-installed skill
- **AND** the user runs `augy sync --yes`
- **THEN** `mystery` is shown as skipped with a warning
- **AND** the sourced skill is installed

### Requirement: Re-running sync is a no-op when nothing changed upstream
An installed skill whose upstream has not changed since it was installed or last synced SHALL be classified Up to date and SHALL NOT be re-downloaded, so that running sync again immediately after a successful sync reports everything as up to date. (US-15; Testing Decisions: "Re-running sync immediately after a successful sync should report everything as up to date.")

#### Scenario: Immediate re-run
- **WHEN** `augy sync --yes` has just completed successfully and nothing has changed upstream
- **AND** the user runs `augy sync --dry-run`
- **THEN** every sourced manifest entry is listed under Up to date and none under Install or Upgrade

#### Scenario: Only changed skills upgrade
- **WHEN** two manifest skills are installed and only one has a new upstream commit
- **AND** the user runs `augy sync --yes`
- **THEN** only the changed skill is upgraded and the other's files are not rewritten

### Requirement: Dry run changes nothing
With `--dry-run`, sync SHALL print the plan and stop without changing any agent folder or the registry, even when `--yes` is also given. (US-10, PD: "`--dry-run` stops after printing the plan, even if `--yes` is also given.")

#### Scenario: Dry run with yes
- **WHEN** the manifest would install and upgrade skills
- **AND** the user runs `augy sync --dry-run --yes`
- **THEN** the plan is printed
- **AND** agent skills folders and `registry.json` are unchanged

### Requirement: Sync confirms once before applying
Without `--yes`, sync SHALL show the target agents and ask once for confirmation before applying the whole plan; declining SHALL change nothing. With `--yes`, it SHALL apply the plan without prompting. (US-12, US-13, PD: "Sync asks once before applying the whole plan, unless `--yes` is passed.")

#### Scenario: Prompt shows agents
- **WHEN** the plan has changes and the user runs `augy sync`
- **THEN** sync shows which agents it will write to and asks for confirmation once

#### Scenario: Declined
- **WHEN** the user declines the confirmation
- **THEN** agent skills folders and `registry.json` are unchanged

#### Scenario: Unattended run
- **WHEN** the user runs `augy sync --yes` with no terminal attached
- **THEN** the plan is applied without any prompt

### Requirement: Sync installs into every target agent and records the skill
After sync applies an install or upgrade, the skill SHALL exist in every target agent's skills folder under its manifest name, and the registry SHALL record it with the manifest's source and a SHA. (US-7; Testing Decisions: "each installed or upgraded skill exists in every target agent's skills folder")

#### Scenario: New skill installed
- **WHEN** the manifest maps `tdd` to `owner/repo/tdd`, `tdd` is not installed, and the user runs `augy sync --yes` with two target agents
- **THEN** a `tdd` folder containing `SKILL.md` exists in both agents' skills folders
- **AND** the registry entry for `tdd` has source `owner/repo/tdd` and a resolved SHA

### Requirement: Sync installs the skill the manifest names
When a manifest source contains several skills, sync SHALL install the skill whose name matches the manifest key. If no skill at the source matches, sync SHALL report that entry as failed rather than install a different skill under the manifest's name. (PD: "The manifest key is the skill's install name"; Further Notes present installing the first skill found on a mismatch as a defect)

#### Scenario: Name not found at the source
- **WHEN** the manifest maps `missing-skill` to a multi-skill repo that has no skill named `missing-skill`
- **AND** the user runs `augy sync --yes`
- **THEN** no `missing-skill` folder is created in any agent
- **AND** that entry is reported as failed

### Requirement: Sync never removes skills
Sync SHALL NOT uninstall or change any skill that is in the registry or an agent folder but not in the manifest. (US-14, PD: "Nothing is ever removed.")

#### Scenario: Personal skill left alone
- **WHEN** the user has skill `personal` installed and the manifest doesn't list it
- **AND** the user runs `augy sync --yes`
- **THEN** `personal`'s files and registry entry are unchanged

### Requirement: Per-skill failures are isolated and saved progress is kept
Sync SHALL install each skill independently: a failure SHALL be shown on that skill's line and the remaining skills SHALL continue. The registry SHALL be saved after each successful skill. (US-19, US-20, PD: "Each skill is installed independently.")

#### Scenario: One broken source
- **WHEN** the manifest lists three skills to install and the second fails to download
- **AND** the user runs `augy sync --yes`
- **THEN** the failure is shown for the second skill
- **AND** the first and third skills are installed and in the registry

#### Scenario: Interrupted sync
- **WHEN** sync is interrupted after two skills have been installed
- **THEN** the registry contains those two skills
- **AND** re-running sync plans only the remaining skills as Install

### Requirement: Sync reports failures truthfully
Sync SHALL report as applied only the changes that succeeded, SHALL distinguish entries whose upstream could not be resolved from up-to-date entries, and SHALL exit with a non-zero status when any entry failed to resolve or install, so CI can tell a broken sync from a clean one. (US-13, US-19; Further Notes present the success exit and "Everything is up to date." on failure as defects)

#### Scenario: Every entry unresolvable
- **WHEN** the GitHub CLI is not logged in and every manifest entry's upstream can't be resolved
- **AND** the user runs `augy sync --yes`
- **THEN** sync does not report that everything is up to date
- **AND** the command exits with a non-zero status

#### Scenario: Partial failure
- **WHEN** one of three installs fails during `augy sync --yes`
- **THEN** the summary counts two applied changes, not three
- **AND** the command exits with a non-zero status

### Requirement: Upgrades preserve pin, install date, and history
When sync upgrades a skill, it SHALL keep the skill's original install date, its pinned flag, and its existing version history. A pinned skill whose upstream changed SHALL still be upgraded and SHALL remain pinned. (US-24, US-25, PD: "Pins are kept but not honored."; PD: "What an upgrade keeps.")

#### Scenario: Pinned skill upgraded
- **WHEN** a pinned skill's upstream has changed and the user runs `augy sync --yes`
- **THEN** the skill is upgraded
- **AND** its registry entry is still pinned

#### Scenario: History and install date kept
- **WHEN** a skill with two history entries is upgraded by sync
- **THEN** its registry entry keeps its original install date and both existing history entries

### Requirement: Sync ignores manifest contexts
Sync SHALL ignore the optional `contexts` field: it SHALL NOT filter entries or apply tags based on it. (PD: "`augy sync` ignores it.")

#### Scenario: Manifest with contexts
- **WHEN** the manifest has a `contexts` entry tagging `tdd` with a context that doesn't match this machine
- **AND** the user runs `augy sync --dry-run`
- **THEN** `tdd` is planned exactly as it would be without the `contexts` field

### Requirement: Sync uses each developer's GitHub CLI login
Sync SHALL resolve and download manifest sources through the developer's own GitHub CLI login, so that skills in private repos the developer can access sync without a central service or shared token. (US-21, PD: "Sync requires `gh` to be installed and logged in.")

#### Scenario: Private team repo
- **WHEN** the developer is logged in to the GitHub CLI with access to private repo `org/skills`, and the manifest maps `internal` to `org/skills/internal`
- **AND** the user runs `augy sync --yes`
- **THEN** `internal` is installed into the target agents
