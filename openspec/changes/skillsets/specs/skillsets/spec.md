# Spec Delta

## Purpose

Lets users group installed skills into named skillsets for different kinds of work, and create, edit, inspect and delete those sets without ever installing or uninstalling a skill.

## ADDED Requirements

### Requirement: Create an empty skillset
`augy skillset create <name>` SHALL create a new skillset with the given name and an empty skill list, recording when it was created and last updated. Source: US-1; PD: "New sets start empty."

#### Scenario: Creating a new skillset
- **WHEN** the user runs `augy skillset create engineering` and no skillset named `engineering` exists
- **THEN** the command succeeds
- **AND** the skillsets file contains a skillset named `engineering` with an empty skill list and created and updated timestamps

### Requirement: Skillset names are letters, digits and hyphens
augy SHALL accept a skillset name only if it consists of letters, digits and hyphens, and SHALL reject any other name with an error without creating a skillset. Source: US-2; PD: "the name must match letters, digits, and hyphens."

#### Scenario: Valid names are accepted
- **WHEN** the user creates skillsets named `engineering` and `my-set`
- **THEN** both are created

#### Scenario: Names with spaces, underscores or punctuation are rejected
- **WHEN** the user tries to create a skillset named `my set`, `my_set` or `my.set!`
- **THEN** the command fails with an error
- **AND** no skillset with that name is added to the skillsets file

### Requirement: Duplicate skillset names are rejected
`augy skillset create` SHALL fail with an error when a skillset with the same name already exists, and SHALL leave the existing skillset unchanged. Source: US-3; PD: "Duplicate names are rejected."

#### Scenario: Creating a skillset that already exists
- **WHEN** a skillset `engineering` with skills `tdd` and `commit` exists and the user runs `augy skillset create engineering`
- **THEN** the command fails with an error
- **AND** the `engineering` skillset still contains `tdd` and `commit`

### Requirement: Add several skills in one command
`augy skillset add <name> <skill...>` SHALL add every named skill to the existing skillset in one command, keep skills in the order they were added, and update the skillset's last-updated time. Source: US-4; PD: "skills keep the order they were added in."

#### Scenario: Adding multiple skills
- **WHEN** the skillset `engineering` is empty and the user runs `augy skillset add engineering tdd github commit`
- **THEN** the skillset contains `tdd`, `github`, `commit` in that order
- **AND** its last-updated time is later than before the command

### Requirement: Adding a skill that isn't installed warns but proceeds
When a skill passed to `augy skillset add` is not installed, augy SHALL warn about it and still add it to the skillset. Adding a skill SHALL never install it. Source: US-5; PD: "Skills that aren't installed are added anyway, with a warning."

#### Scenario: Planning a set before installing its skills
- **WHEN** the user runs `augy skillset add research summarize` and `summarize` is not installed
- **THEN** augy prints a warning that `summarize` is not installed
- **AND** `summarize` is in the `research` skillset
- **AND** no skill is installed

### Requirement: Adding a skill already in the set is skipped
When a skill passed to `augy skillset add` is already in the skillset, augy SHALL skip it with a note so the set never contains duplicates, and SHALL not report the skipped skill as added. Source: US-6; PD: "Duplicates are skipped with a note."

#### Scenario: Adding a duplicate skill
- **WHEN** the skillset `engineering` contains `tdd` and the user runs `augy skillset add engineering tdd commit`
- **THEN** augy notes that `tdd` is already in the set
- **AND** the skillset contains `tdd` exactly once, followed by `commit`
- **AND** the output does not report `tdd` as added

### Requirement: Removing skills from a set never uninstalls them
`augy skillset remove <name> <skill...>` SHALL remove the named skills from the skillset and update its last-updated time, and SHALL not uninstall, delete or change any skill's files or the skills lockfile. Source: US-7; PD: "Nothing is uninstalled."

#### Scenario: Removing a skill from a set
- **WHEN** the skillset `engineering` contains `tdd` and `commit`, both installed, and the user runs `augy skillset remove engineering commit`
- **THEN** the skillset contains only `tdd`
- **AND** `commit` is still installed, with its files and lockfile entry unchanged

### Requirement: Removing a skill not in the set warns
When a skill passed to `augy skillset remove` is not in the skillset, augy SHALL warn about it and SHALL not report it as removed. Source: US-8; PD: "Skills not in the set get a warning."

#### Scenario: Removing a misspelled skill name
- **WHEN** the skillset `engineering` contains `tdd` and the user runs `augy skillset remove engineering tddd`
- **THEN** augy warns that `tddd` is not in the set
- **AND** the output does not report `tddd` as removed
- **AND** the skillset still contains `tdd`

### Requirement: List skillsets
`augy skillset list` SHALL show every skillset as a table with its name, skill count and last-updated date, sorted by name. Source: US-9; PD: "a table of name, skill count, and last-updated date, sorted by name."

#### Scenario: Listing several skillsets
- **WHEN** skillsets `writing` (2 skills), `engineering` (3 skills) and `research` (0 skills) exist and the user runs `augy skillset list`
- **THEN** the output lists `engineering`, `research`, `writing` in that order
- **AND** each row shows the skillset's skill count and last-updated date

### Requirement: Show one skillset
`augy skillset show <name>` SHALL show the skillset's created and last-updated timestamps, followed by its skills one per line. Source: US-10; PD: "created and updated timestamps, then the skills one per line."

#### Scenario: Showing a skillset
- **WHEN** the skillset `engineering` contains `tdd` and `commit` and the user runs `augy skillset show engineering`
- **THEN** the output shows when `engineering` was created and last updated
- **AND** then lists `tdd` and `commit`, each on its own line

### Requirement: Delete a skillset after confirmation
`augy skillset delete <name>` SHALL ask for confirmation, stating that no skills will be uninstalled, and SHALL delete the skillset only if the user confirms. Deleting SHALL never change skill files or the skills lockfile. Source: US-11; PD: "The confirmation states that no skills will be uninstalled. Skill files are never touched."

#### Scenario: Confirming a delete
- **WHEN** the user runs `augy skillset delete engineering` and confirms
- **THEN** the confirmation prompt said no skills will be uninstalled
- **AND** `engineering` is gone from the skillsets file
- **AND** every other skillset, every skill's files and the skills lockfile are unchanged

#### Scenario: Declining a delete
- **WHEN** the user runs `augy skillset delete engineering` and declines the confirmation
- **THEN** the skillsets file is unchanged

### Requirement: Delete without a prompt using --yes
`augy skillset delete <name> --yes` SHALL delete the skillset without asking for confirmation, under the same no-uninstall guarantee. Source: US-12; PD: "asks for confirmation unless `--yes` is given."

#### Scenario: Scripted delete
- **WHEN** a script runs `augy skillset delete engineering --yes`
- **THEN** no prompt is shown
- **AND** `engineering` is gone from the skillsets file
- **AND** skill files and the skills lockfile are unchanged

### Requirement: Bare skillset command shows help
`augy skillset` with no subcommand SHALL show help that lists its subcommands. Source: US-13.

#### Scenario: Running skillset with no subcommand
- **WHEN** the user runs `augy skillset`
- **THEN** augy shows help listing `create`, `add`, `remove`, `list`, `show` and `delete`

### Requirement: Naming a skillset that doesn't exist is an error
Any skillset command that names a skillset that doesn't exist (`add`, `remove`, `show`, `delete`) SHALL fail with an error and change nothing. Source: PD: "Any command naming a skillset that doesn't exist is an error."

#### Scenario: Adding to a missing skillset
- **WHEN** no skillset `nope` exists and the user runs `augy skillset add nope tdd`
- **THEN** the command fails with an error
- **AND** the skillsets file is unchanged

#### Scenario: Showing a missing skillset
- **WHEN** no skillset `nope` exists and the user runs `augy skillset show nope`
- **THEN** the command fails with an error

### Requirement: Skillsets are kept in a readable file under the augy home
augy SHALL store skillsets in `skillsets.json` under the augy home (`~/.augy/`, or `AUGY_HOME` when set), separate from the skills lockfile, as `{ "version": 1, "skillsets": { "<name>": { "name", "skills": [...], "createdAt", "updatedAt" } } }`. Source: US-28; PD: "Skillsets live in their own file, `~/.augy/skillsets.json` (under `AUGY_HOME` if set)."

#### Scenario: Default location
- **WHEN** `AUGY_HOME` is not set and the user creates a skillset
- **THEN** the skillset is written to `~/.augy/skillsets.json` in the documented format
- **AND** the skills lockfile is not changed

#### Scenario: Custom augy home
- **WHEN** `AUGY_HOME` is set to `/tmp/augy-sandbox` and the user creates a skillset
- **THEN** the skillset is written to `/tmp/augy-sandbox/skillsets.json`
- **AND** `~/.augy/skillsets.json` is not created or changed

#### Scenario: Hand edits are honored
- **WHEN** the user edits `skillsets.json` by hand to add `commit` to the `engineering` skills list, keeping valid JSON
- **THEN** `augy skillset show engineering` lists `commit`

### Requirement: A skillset holds skill names only
A skillset SHALL record only skill names, matched by name, and SHALL not record sources, versions or agents for its skills. Source: US-17; PD: "A skillset holds skill names only. It doesn't record sources, versions, or agents."

#### Scenario: Stored skillset contents
- **WHEN** the user adds the installed skill `tdd` to the skillset `engineering`
- **THEN** the `engineering` entry in the skillsets file lists `tdd` by name
- **AND** it contains no source, version or agent information for `tdd`

### Requirement: A corrupted skillsets file stops augy with an error
When the skillsets file is not valid JSON, every command that reads skillsets SHALL stop with an error that asks the user to fix or delete the file, and SHALL leave the file exactly as it was. augy SHALL never silently reset it. Source: US-29; PD: "If the file has invalid JSON, every skillset command stops with an error asking the user to fix or delete it."

#### Scenario: Corrupted file on list
- **WHEN** `skillsets.json` contains invalid JSON and the user runs `augy skillset list`
- **THEN** the command fails with an error telling the user to fix or delete the file
- **AND** the file's contents are unchanged

#### Scenario: Corrupted file on create
- **WHEN** `skillsets.json` contains invalid JSON and the user runs `augy skillset create research`
- **THEN** the command fails with an error
- **AND** the file's contents are unchanged and no new skillset is written
