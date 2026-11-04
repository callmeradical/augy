# Spec Delta

## Purpose

Defines the registry lockfile and augy home layout as a user-owned artifact: one readable, diffable JSON file that holds all inventory state, is written safely, survives format upgrades, and can be relocated.

## ADDED Requirements

### Requirement: Inventory lives in one plain-JSON lockfile
augy SHALL keep all of its inventory state (skills, taps, home configuration, machine context) in a single plain-JSON file, `registry.json`, in the augy home folder (`~/.augy/` by default), readable in any editor with no other database or remote service holding that state. (US-17)

#### Scenario: Lockfile after an install
- **WHEN** the user installs a skill with augy
- **THEN** `~/.augy/registry.json` exists and is valid JSON containing that skill

### Requirement: Lockfile is pretty-printed with stable formatting
Every write of the lockfile SHALL produce pretty-printed JSON with stable formatting, so that writing the same registry content twice produces identical files. (US-18)

#### Scenario: Diffable output
- **WHEN** any augy command writes the registry
- **THEN** `registry.json` is indented, multi-line JSON

#### Scenario: Stable across rewrites
- **WHEN** an augy command rewrites the registry without changing its content
- **THEN** `registry.json` is byte-identical to before

### Requirement: Lockfile writes are atomic
augy SHALL write the lockfile atomically, so that an interrupted command leaves either the previous complete lockfile or the new complete lockfile, never a partial file. (US-19, PD: "Writes are atomic.")

#### Scenario: Interrupted write
- **WHEN** an augy command that writes the registry is killed while writing
- **THEN** `registry.json` parses as valid JSON and equals either its previous or its new content

### Requirement: Missing lockfile is an empty registry
When no lockfile exists, augy SHALL behave as if the registry were empty. (PD: "A missing lockfile is treated as an empty registry.")

#### Scenario: Fresh machine
- **WHEN** the augy home folder has no `registry.json`
- **AND** the user runs `augy list`
- **THEN** augy reports that no skills are installed and exits successfully

### Requirement: Older lockfile formats are upgraded in place
When the lockfile lacks a section that older formats didn't have (for example `taps`), augy SHALL treat that section as empty and keep working with the existing skills, without the user editing the file. (US-20)

#### Scenario: Lockfile without taps
- **WHEN** `registry.json` contains skills but no `taps` section
- **AND** the user runs `augy list`
- **THEN** every skill is listed and the command succeeds

#### Scenario: Next write fills the section
- **WHEN** `registry.json` has no `taps` section and an augy command writes the registry
- **THEN** the existing skills are preserved and the written file contains a `taps` section

### Requirement: Unreadable lockfile is not silently discarded
When `registry.json` exists but cannot be parsed as JSON, augy SHALL NOT silently treat it as empty and SHALL NOT overwrite it, so a hand-edit mistake can't drop every skill, tap, and home setting. (US-17; Further Notes present "A corrupted lockfile is silently treated as empty" as undercutting the readable, editable lockfile)

#### Scenario: Syntax error after a hand edit
- **WHEN** `registry.json` contains a JSON syntax error
- **AND** the user runs `augy list`
- **THEN** augy tells the user the lockfile could not be read rather than reporting that no skills are installed

#### Scenario: No overwrite of an unreadable lockfile
- **WHEN** `registry.json` contains a JSON syntax error
- **AND** the user runs an augy command that would write the registry
- **THEN** the original contents of `registry.json` are still on disk afterwards

### Requirement: AUGY_HOME relocates all augy state
When the `AUGY_HOME` environment variable is set, augy SHALL read and write the lockfile and all other augy state under that folder instead of `~/.augy/`. (US-21)

#### Scenario: Isolated environment
- **WHEN** `AUGY_HOME` is set to an empty temporary folder and the user installs a skill
- **THEN** `registry.json`, the skill's store copy, and any version archives are created under that folder
- **AND** `~/.augy/` is not created or modified

### Requirement: Augy home folder layout
The augy home folder SHALL contain `registry.json` (the lockfile), `store/<skill>/` (the canonical copy of each skill installed with the store model, which agent folders link to), `versions/<skill>/<sha>/` (archived snapshots), and `skillsets.json` (named skill groups). (PD: "On-disk layout under `~/.augy/` (or `$AUGY_HOME`)")

#### Scenario: Store-model install
- **WHEN** the user installs a skill `tdd` with the store model
- **THEN** its canonical copy is at `store/tdd/` under the augy home folder and the agent's skills folder links there

#### Scenario: Archived version
- **WHEN** a skill `tdd` is updated and its previous version at SHA `abc` is archived
- **THEN** the snapshot is at `versions/tdd/abc/` under the augy home folder

### Requirement: Per-skill lockfile contents
Each skill entry in the lockfile SHALL record its name, source (possibly empty), full and short SHA (`unversioned` when the source is unknown), install and update timestamps, pinned flag, a map of agent ID to deployment path and active flag, and an oldest-first version history whose entries each have a SHA, a timestamp, and an archive path. Context tags, tap, store path, and `label` SHALL be recorded when present. (PD: "Lockfile content per skill (user-visible contract)")

#### Scenario: Fields of an installed skill
- **WHEN** the user installs a skill from a source into two agents
- **THEN** its lockfile entry has the name, source, full and short SHA, install and update timestamps, pinned flag, and both agents with path and active flag

#### Scenario: History order
- **WHEN** a skill has been updated twice
- **THEN** its lockfile history lists the two previous versions oldest first, each with a SHA, timestamp, and archive path

#### Scenario: Sourceless skill entry
- **WHEN** a skill is recorded without a source
- **THEN** its lockfile entry has an empty source and SHA `unversioned`
