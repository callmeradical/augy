# Spec Delta

## Purpose

Keeps one canonical copy of each installed skill in augy's home and links every target agent to it, so that all agents see the same version, an update reaches them all at once, and one command removes the skill everywhere. Also covers where augy keeps its state and how per-agent deployments are tracked.

## ADDED Requirements

### Requirement: One stored copy linked into every target agent
`augy install` SHALL download each skill into `~/.augy/store/<skill>/`, replacing any previous store copy, and SHALL make each selected agent's `<skills directory>/<skill>` a symbolic link to that store folder. Sources: US-1, US-2, PD: "`augy install` downloads each skill into `store/<skill>/` ... each selected agent's `<skills directory>/<skill>` becomes a symbolic link to that store folder."

#### Scenario: Install to three agents
- **WHEN** a skill is installed to Claude, Codex, and Cursor
- **THEN** there is exactly one copy under `~/.augy/store/<skill>/`, and each of the three agent paths is a link that resolves to it

#### Scenario: Change visible through every agent
- **WHEN** the content of `~/.augy/store/<skill>/` changes
- **THEN** reading the skill through any of its agent paths shows the changed content

### Requirement: Install repairs whatever is at the agent path
Install SHALL replace whatever already exists at an agent's skill path, including a stale copy or a broken link, with a fresh link to the store copy. Sources: US-25, PD: "replacing whatever was there before."

#### Scenario: Stale copy
- **WHEN** an agent's skill path holds an old real copy of the skill and the user re-installs it
- **THEN** the path becomes a link to the store copy

#### Scenario: Broken link
- **WHEN** an agent's skill path is a link whose target no longer exists and the user re-installs the skill
- **THEN** the path becomes a working link to the store copy

### Requirement: Update refreshes every agent at once
`augy update` SHALL archive the current store copy, download the new version into the store, and leave the agent links in place, so that every linked agent sees the new version and the registry's SHA matches it. Sources: US-3, PD: "`augy update` archives the current store copy, downloads the new version into the store, and doesn't touch agent paths." Version history details: change `skill-versioning`.

#### Scenario: Update a skill deployed to two agents
- **WHEN** upstream changes for a skill linked into Claude and Codex and the user runs `augy update`
- **THEN** both agents show the new version, the registry records the new SHA, and the previous version is archived under `~/.augy/versions/<skill>/<old sha>/`

### Requirement: Uninstall removes every deployment and the store copy
`augy uninstall` SHALL remove every recorded agent path for the skill and its store folder. Sources: US-20, PD: "`augy uninstall` removes every recorded agent path and the store folder." Flow details: change `skill-installation`.

#### Scenario: Nothing left behind
- **WHEN** the user uninstalls a skill linked into three agents
- **THEN** no agent path for the skill and no `~/.augy/store/<skill>/` folder remains

### Requirement: The registry records each skill's store location and agents
For each skill placed through the store, the registry SHALL record its store location and each agent it is deployed to, with that agent's skill path. `augy list` and `augy info` SHALL show which agents each skill is deployed to. Sources: US-19, PD: "registry.json ← lockfile; each skill records its store location and per-agent paths." Display details: change `skill-inventory`.

#### Scenario: Registry after install
- **WHEN** a skill is installed to Claude and OpenCode
- **THEN** its registry entry records the store location and both agents with their skill paths

#### Scenario: Coverage at a glance
- **WHEN** the user runs `augy list` or `augy info <skill>`
- **THEN** the output names the agents the skill is deployed to

### Requirement: Scan records extra copies of tracked skills
When a tracked skill is present in an agent that the registry doesn't list for it, `augy scan` SHALL notice that copy and offer to record the agent for the skill. It SHALL do so even when there are no untracked skills to adopt. Sources: US-21; the PRD's Further Notes report as a defect that scan exits early with "All installed skills are already tracked" and never records the extra installs it found. Adoption details: change `adopting-existing-skills`.

#### Scenario: Hand-copied into another agent
- **WHEN** skill `tdd` is tracked for Claude only, the user has copied it into `~/.gemini/skills/tdd`, and they run `augy scan`
- **THEN** scan reports the Gemini CLI copy and, if the user accepts, the registry lists Gemini CLI for `tdd`

#### Scenario: Nothing untracked
- **WHEN** every skill on disk is already tracked but one has an unrecorded copy in another agent
- **THEN** scan still offers to record that agent rather than exiting with nothing to do

### Requirement: Skills installed before the store stay tracked and removable
Skills whose registry entries predate the store (no store location, real copies in each agent) SHALL stay tracked and usable as copies, and `augy uninstall` SHALL remove their per-agent copies. Re-running `augy install` on such a skill SHALL replace each selected agent's copy with a link to the store. Sources: US-22, PD: "Skills installed before the store existed (migration status)." A dedicated migration command belongs to change `store-migration`.

#### Scenario: Old registry after upgrading augy
- **WHEN** the user upgrades augy with a registry whose skills have no store location
- **THEN** those skills are still listed as tracked and their agent copies are left working

#### Scenario: Uninstall a pre-store skill
- **WHEN** the user uninstalls a pre-store skill deployed as copies in two agents
- **THEN** both copies are removed and the registry entry is gone

#### Scenario: Re-install converts to links
- **WHEN** the user re-installs a pre-store skill to the same agents
- **THEN** the skill gains a store copy, each selected agent's path becomes a link to it, and the registry records the store location

### Requirement: Updates keep reaching pre-store skills' agents
Every `augy update` that finds an upstream change for a skill that was installed before the store SHALL leave every agent the skill is deployed to showing the new version, on the first update and on every later one. Sources: US-3, US-22; the PRD's Further Notes report as a likely bug that after the second update the agents' real copies stay on the older version while the registry reports the newer SHA.

#### Scenario: Two updates of a pre-store skill
- **WHEN** a pre-store skill deployed as copies in Claude and Codex gets two upstream changes, each followed by `augy update`
- **THEN** after the second update both agents show the latest version, matching the SHA in the registry

### Requirement: AUGY_HOME relocates all of augy's state
When `AUGY_HOME` is set, augy SHALL keep its lockfile, store, version archives, and skillset definitions under that directory instead of `~/.augy`, and archive paths recorded in version history SHALL be under it too. Sources: US-13, PD: "`AUGY_HOME` | Moves augy's state root (default `~/.augy`): lockfile, store, version archives, skillsets." Recorded paths are covered because the PRD's Further Notes report them as always under `$HOME/.augy/versions`.

#### Scenario: Sandbox home
- **WHEN** `AUGY_HOME=/tmp/sandbox` is set and the user installs a skill, updates it, and creates a skillset
- **THEN** `registry.json`, `store/<skill>/`, `versions/<skill>/<sha>/`, and `skillsets.json` are under `/tmp/sandbox`, and the real `~/.augy` is unchanged

#### Scenario: Recorded archive path
- **WHEN** `AUGY_HOME` is set and an update archives a version
- **THEN** the archive path recorded in the skill's history is under `$AUGY_HOME/versions`

#### Scenario: Messages name the relocated home
- **WHEN** `AUGY_HOME` is set and a command prints a path inside augy's home
- **THEN** the printed path is under `$AUGY_HOME`, not `~/.augy`
