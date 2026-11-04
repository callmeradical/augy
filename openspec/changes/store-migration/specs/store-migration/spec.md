# Spec Delta

## Purpose

Lets users bring tracked skills that are still per-agent copies under augy's canonical store with one safe command, so that every agent links to a single stored copy and the skill behaves like a fresh v0.11.0 install.

Note: the migration command's name and placement are an open question (see design.md). Requirements below refer to it as "the migration command".

## ADDED Requirements

### Requirement: Migration produces the canonical-store layout
For each tracked skill it migrates, the migration command SHALL leave exactly one copy of the skill in the canonical store at `store/<skill>/` under the augy home, make each of the skill's recorded agent installs a symlink to that copy, and record the skill as store-backed in the registry. Source: US-1, US-4; PD: "one stored copy, with every agent install of that skill a symlink to it, and the registry recording the skill as store-backed."

#### Scenario: Migrating a skill copied into two agents
- **WHEN** `AUGY_HOME` is not set, a tracked skill `tdd` installed before v0.11.0 exists as identical real directories in two agents' skills folders, and the user runs the migration command
- **THEN** `~/.augy/store/tdd/` holds one copy of the skill with the same content
- **AND** each of the two agent paths is a symlink that resolves to `~/.augy/store/tdd/`
- **AND** the registry records `tdd` as store-backed

#### Scenario: Migrating every copy-based skill in one run
- **WHEN** the registry tracks several copy-based skills and the user runs the migration command once
- **THEN** every one of them that can be migrated ends in the canonical-store layout

### Requirement: Registry details are carried over unchanged
Migration SHALL leave each migrated skill's source, SHA, version history, pin state, tags, source tap, and list of agents exactly as they were. Only where the skill's files live changes. Source: US-2, US-3; PD: "Carried over unchanged: source, SHA, version history, pin state, tags, the source tap, and the list of agents."

#### Scenario: Pinned, tagged skill with history
- **WHEN** a copy-based skill is pinned, has tags, a source tap, a recorded SHA, two recorded agents and earlier versions in its history, and the user migrates it
- **THEN** after migration its pin state, tags, tap, SHA, agent list, source and version history in the registry are identical to before

#### Scenario: Rolling back after migration
- **WHEN** a migrated skill had earlier versions recorded before migration
- **THEN** `augy rollback` can still select those earlier versions

### Requirement: Migration uses the store under AUGY_HOME
When `AUGY_HOME` is set, migration SHALL use the store under that home and not `~/.augy/store/`. Source: US-19; PD: "the store that shipped in v0.11.0, `~/.augy/store/<skill>/`, which follows `AUGY_HOME`."

#### Scenario: Custom augy home
- **WHEN** `AUGY_HOME` is `/tmp/augy-sandbox` and the user runs the migration command
- **THEN** migrated skills are stored under `/tmp/augy-sandbox/store/<skill>/` and agent links resolve there
- **AND** nothing is written under `~/.augy/`

### Requirement: Repeat runs are safe
The migration command SHALL skip skills that are already fully store-backed. A run when every tracked skill is already migrated SHALL change nothing and report that every skill is already migrated. Running it again after a partial failure SHALL finish migrating the remaining skills without damaging those already migrated. Source: US-9; PD: "Safe to repeat: skills already fully store-backed are skipped."

#### Scenario: Second run
- **WHEN** the user runs the migration command and then runs it again
- **THEN** the second run changes nothing on disk or in the registry
- **AND** it reports that every skill is already migrated

#### Scenario: Re-running after a partial failure
- **WHEN** a previous run migrated skill `a` but failed on skill `b`, the cause of the failure has been fixed, and the user runs the migration command again
- **THEN** `b` ends in the canonical-store layout
- **AND** `a` is unchanged by the second run

#### Scenario: Freshly installed skills are left as they are
- **WHEN** a skill was installed fresh on v0.11.0 and is already store-backed with every agent install a symlink to the store
- **THEN** the migration command skips it and changes none of its files or registry details

### Requirement: Only tracked skills and recorded paths are touched
Migration SHALL change only skills in the registry and, for each, only the agent paths recorded for it. Untracked skills and unrecorded paths SHALL be left as they are. Source: US-20; PD: "migration touches only skills in the registry and only the agent paths recorded for them."

#### Scenario: Untracked skill in an agent folder
- **WHEN** an agent's skills folder contains a skill directory that isn't in the registry and the user runs the migration command
- **THEN** that directory is unchanged
- **AND** no store copy is created for it

#### Scenario: Unrecorded copy of a tracked skill
- **WHEN** a tracked skill is recorded for agent A only, and a hand-made copy of it also sits in agent B's skills folder
- **THEN** after migration agent A's path is a symlink to the stored copy
- **AND** agent B's copy is unchanged

### Requirement: A failure on one skill is contained
When migrating a skill fails, that skill's agent installs SHALL be as they were before the run, the registry SHALL not record it as store-backed, and other skills SHALL still be migrated. No agent SHALL be left without a working copy of the skill. Source: US-11; PD: "a failure on one skill must not change that skill's files or affect any other skill."

#### Scenario: Linking fails partway through one skill
- **WHEN** a skill is recorded for three agents and replacing the second agent's copy with a link fails
- **THEN** all three agents' installs of that skill are the same real directories, with the same content, as before the run
- **AND** the registry does not record that skill as store-backed
- **AND** the other skills in the run are migrated

### Requirement: Skills that can't be migrated are skipped and reported
A skill with no usable real directory among its recorded agent installs SHALL be skipped and left untouched. At the end of a run, the migration command SHALL report which skills were migrated and list each skill that couldn't be migrated with the reason. Source: US-10; PD: "skips skills with no real directory and reports them."

#### Scenario: No usable real directory
- **WHEN** a tracked, not-yet-store-backed skill's recorded agent paths are all missing
- **THEN** the migration command skips that skill without changing its paths or registry entry
- **AND** the end-of-run report lists it with the reason it was skipped

#### Scenario: Summary of a mixed run
- **WHEN** a run migrates two skills and skips one
- **THEN** the report names the two migrated skills and the skipped skill with its reason

### Requirement: Skills without a source are migrated
Migration SHALL migrate tracked skills that have no source, such as skills adopted with `augy scan` or created with `augy author new`, the same way as skills installed from GitHub. Source: US-12, US-13.

#### Scenario: Authored skill
- **WHEN** a tracked skill created with `augy author new` exists as a copy in an agent's folder and has no source
- **THEN** after migration it has one stored copy, the agent path is a symlink to it, and it is recorded as store-backed
- **AND** its registry entry still records no source

#### Scenario: Adopted skill
- **WHEN** a skill adopted with `augy scan` is tracked as copies in two agents
- **THEN** after migration both agent paths are symlinks to one stored copy

### Requirement: Migrated skills work with other commands
A migrated skill SHALL behave with other augy commands like a skill installed fresh on v0.11.0: `augy update` reaches every recorded agent, `augy use` can link and unlink it, and `augy list`, `augy info` and `augy diff` work on it. Source: US-14, US-16; PD: "That is the same end state as a fresh v0.11.0 install."

#### Scenario: Update after migration
- **WHEN** a migrated skill recorded for two agents has a newer version available and the user runs `augy update`
- **THEN** both agents see the new version
- **AND** a second `augy update` with another newer version also reaches both agents

#### Scenario: Skillsets after migration
- **WHEN** a skill that was a copy before migration is in a skillset and the user runs `augy use` with a skillset that excludes it, then with one that includes it
- **THEN** the first run removes the agent's link to it and the second run links it again, without a "Could not link" error

#### Scenario: Inventory and diff after migration
- **WHEN** the user runs `augy list`, `augy info` and `augy diff` on a migrated skill
- **THEN** each command succeeds and reports the skill's recorded details

### Requirement: Uninstalling a migrated skill removes everything
`augy uninstall` of a migrated skill SHALL remove its symlink from every recorded agent and remove its stored copy. Source: US-17.

#### Scenario: Uninstall after migration
- **WHEN** the user uninstalls a migrated skill recorded for two agents
- **THEN** neither agent's skills folder has an entry for it
- **AND** its folder under the store is gone

### Requirement: Migration can run without prompts
The migration command SHALL be able to run to completion without interactive input, so that CI can migrate provisioned machines. Source: US-18. The means (for example a `--yes` flag) depends on open questions OQ-2 and OQ-3 in design.md.

#### Scenario: Migration in CI
- **WHEN** a CI job runs the migration command non-interactively on a machine with copy-based skills, using whatever non-interactive form the command provides
- **THEN** the command finishes without waiting for input
- **AND** the migratable skills end in the canonical-store layout
