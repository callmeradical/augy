# Spec Delta

## Purpose

Lets users switch one agent's active skills to match a skillset with `augy use`, by adding and removing symlinks to augy's canonical skill copies, without ever copying or deleting a skill.

## ADDED Requirements

### Requirement: augy use makes one agent's linked skills match the set
`augy use <name>` SHALL make the chosen agent's symlinked skills match the skillset: symlinks in the agent's skills folder whose names are in the set stay as already active, every other symlink there is removed, and each installed skill in the set that isn't linked yet gets a new symlink. Source: US-14; PD: "A symlink whose name is in the set counts as already active. Every other symlink in the folder is removed."

#### Scenario: Switching from one working mode to another
- **WHEN** the agent's skills folder holds symlinks `tdd` and `commit`, the skillset `research` contains the installed skills `search` and `summarize`, and the user runs `augy use research --agent <id>`
- **THEN** the `tdd` and `commit` symlinks are gone from the agent's skills folder
- **AND** the folder holds symlinks named `search` and `summarize`

#### Scenario: Mixed folder of in-set links, out-of-set links and copies
- **WHEN** the agent's skills folder holds an in-set symlink `tdd`, an out-of-set symlink `grammar`, and a plain-copy directory `notes`, and the set `engineering` contains the installed skills `tdd` and `commit`
- **THEN** after `augy use engineering` the folder holds symlinks `tdd` and `commit`
- **AND** the `grammar` symlink is gone
- **AND** the `notes` directory and its contents are unchanged

### Requirement: Switching never deletes skill files
`augy use` SHALL remove only symlinks. Removing a link SHALL never delete or change the files of the skill it pointed to. Source: US-15; PD: "Removing a link never deletes the skill's files."

#### Scenario: Removed link leaves the skill intact
- **WHEN** the agent's skills folder holds a symlink `tdd` pointing at augy's canonical copy of `tdd`, and the user switches to a skillset that doesn't contain `tdd`
- **THEN** the `tdd` symlink is removed
- **AND** the canonical copy of `tdd` and all its files still exist unchanged

### Requirement: Plain copies are never touched
`augy use` SHALL leave entries in the agent's skills folder that are not symlinks (copies) in place and unchanged, whether or not their names are in the skillset. Source: US-16; PD: "Entries that aren't symlinks (copies) are never removed."

#### Scenario: Copy not in the set survives a switch
- **WHEN** the agent's skills folder holds a hand-copied skill directory `legacy-skill` and the user switches to a skillset that doesn't contain it
- **THEN** `legacy-skill` is still in the folder with its contents unchanged

### Requirement: New links point at the canonical copy
Each symlink `augy use` creates SHALL point at augy's canonical copy of the skill. If the skill has no canonical copy, the link SHALL point at this agent's recorded location for the skill, and failing that at another agent's recorded location that still exists. Source: US-27; PD: "a symlink is created pointing at the skill's canonical copy. If there isn't one, it points at this agent's recorded location ... and failing that at any other agent's recorded location that still exists."

#### Scenario: Linking a store-backed skill
- **WHEN** the installed skill `tdd` has a canonical copy in augy's store and `augy use engineering` links it for an agent
- **THEN** the agent's `tdd` symlink resolves to the canonical copy
- **AND** a later `augy update` of `tdd` is visible through that link

#### Scenario: Falling back to another agent's location
- **WHEN** the installed skill `notes` has no canonical copy and no recorded location for the chosen agent, but another agent's recorded location for `notes` still exists
- **THEN** `augy use` links the chosen agent's `notes` to that other agent's location

#### Scenario: No location to link to
- **WHEN** an installed skill in the set has no canonical copy and none of its recorded locations exist
- **THEN** augy reports a per-skill error for that skill
- **AND** the rest of the switch still proceeds

### Requirement: Switching never copies skills
`augy use` SHALL never copy a skill's files. A skill that belongs to several skillsets SHALL exist on disk only once no matter which set is active. Source: US-17; PD: "creating a link never copies anything."

#### Scenario: Skill shared by two skillsets
- **WHEN** the store-backed skill `github` is in both the `engineering` and `research` skillsets and the user runs `augy use engineering` and then `augy use research` for the same agent
- **THEN** after each run there is exactly one copy of `github`'s files on disk, its canonical copy
- **AND** the agent's `github` entry is a symlink to it

### Requirement: The plan is printed before any change
`augy use` SHALL print its plan before making any change: the agent, the skillset, and the lists of skills to remove, to add, and already active. Source: US-18; PD: "The plan is always printed first: agent, skillset, Remove list, Add list, Already-active list."

#### Scenario: Plan shown on a real run
- **WHEN** the user runs `augy use engineering --agent <id>` and the switch removes `grammar`, adds `commit`, and keeps `tdd`
- **THEN** before the changes are applied the output names the agent and the skillset
- **AND** lists `grammar` under Remove, `commit` under Add, and `tdd` under Already active

### Requirement: Dry run previews the switch without changing anything
`augy use <name> --dry-run` SHALL print the same plan a real run would carry out and then stop, leaving the agent's skills folder unchanged. Source: US-18; PD: "`--dry-run` stops after the plan."

#### Scenario: Previewing a switch
- **WHEN** the user runs `augy use research --dry-run --agent <id>`
- **THEN** the output shows the Remove, Add and Already-active lists
- **AND** the agent's skills folder is exactly as it was before the command
- **AND** a following real run of `augy use research --agent <id>` carries out the plan that was shown

### Requirement: Only the chosen agent is affected
`augy use --agent <id>` SHALL change only that agent's skills folder. Each run SHALL affect exactly one agent. Source: US-19; PD: "Only one agent is affected per run."

#### Scenario: Other agents are untouched
- **WHEN** two agents both have skill symlinks and the user runs `augy use research --agent <first-agent>`
- **THEN** only the first agent's skills folder changes
- **AND** the second agent's skills folder is unchanged

### Requirement: AUGY_DEFAULT_AGENT sets the default agent
When `--agent` is not given, `augy use` SHALL target the agent named by `AUGY_DEFAULT_AGENT`. When `--agent` is given, it SHALL take precedence over `AUGY_DEFAULT_AGENT`. Source: US-20; PD: "The agent is chosen by `--agent`, then `AUGY_DEFAULT_AGENT`, then the first detected agent."

#### Scenario: Default agent from the environment
- **WHEN** `AUGY_DEFAULT_AGENT` names agent A and the user runs `augy use research` with no `--agent`
- **THEN** agent A's skills folder is switched

#### Scenario: --agent beats the environment
- **WHEN** `AUGY_DEFAULT_AGENT` names agent A and the user runs `augy use research --agent B`
- **THEN** agent B's skills folder is switched
- **AND** agent A's skills folder is unchanged

### Requirement: Fall back to the first detected agent
When neither `--agent` nor `AUGY_DEFAULT_AGENT` is given, `augy use` SHALL target the first detected agent in augy's fixed agent order. Source: US-21; PD: "then the first detected agent in augy's fixed agent order."

#### Scenario: Auto-detected agent
- **WHEN** neither `--agent` nor `AUGY_DEFAULT_AGENT` is set and two agents are detected
- **THEN** `augy use research` switches the detected agent that comes first in augy's agent order
- **AND** the plan names that agent

### Requirement: Unknown or missing agent is an error listing known IDs
`augy use` SHALL fail with an error that lists the known agent IDs when the chosen agent ID isn't one augy recognizes, or when no agent is given and none is detected. It SHALL change nothing in that case. Source: US-22; PD: "An unknown agent ID, or no detected agent, is an error."

#### Scenario: Unknown agent ID
- **WHEN** the user runs `augy use research --agent not-an-agent`
- **THEN** the command fails with an error that lists the known agent IDs
- **AND** no skills folder is changed

#### Scenario: Unknown agent ID from the environment
- **WHEN** `AUGY_DEFAULT_AGENT` is `not-an-agent`, no `--agent` is given, and the user runs `augy use research`
- **THEN** the command fails with an error that lists the known agent IDs

#### Scenario: No agent detected
- **WHEN** no `--agent` or `AUGY_DEFAULT_AGENT` is given and no agent is detected
- **THEN** `augy use research` fails with an error that lists the known agent IDs

### Requirement: Skills that aren't installed are skipped with a warning
`augy use` SHALL warn about each skill in the set that isn't installed (not in the skills lockfile), skip it, and carry on with the rest of the switch. If none of the set's skills are installed, augy SHALL warn and change nothing. Source: US-23; PD: "Skills in the set that aren't in the lockfile are warned about and skipped. If none of the set's skills are installed, augy warns and changes nothing."

#### Scenario: One skill not installed
- **WHEN** the skillset `research` contains the installed skill `search` and the uninstalled skill `summarize`
- **THEN** `augy use research` warns that `summarize` is not installed and skips it
- **AND** `search` is linked for the agent

#### Scenario: No skill in the set is installed
- **WHEN** none of the skills in the skillset `writing` are installed and the agent's skills folder holds symlinks
- **THEN** `augy use writing` warns and changes nothing
- **AND** the agent's existing symlinks are all still present

### Requirement: An empty skillset changes nothing
`augy use` on a skillset with no skills SHALL warn, exit successfully and change nothing. This check SHALL happen before an agent is chosen, so it applies even when no agent can be resolved. Source: US-24; PD: "An empty skillset gives a warning, exits successfully, and changes nothing. This check runs before the agent is chosen."

#### Scenario: Using an empty skillset
- **WHEN** the skillset `empty` has no skills and the user runs `augy use empty --agent <id>`
- **THEN** augy warns that the set is empty
- **AND** the command exits successfully
- **AND** the agent's skills folder is unchanged

#### Scenario: Empty skillset with no agent detected
- **WHEN** the skillset `empty` has no skills, no agent is given and none is detected
- **THEN** `augy use empty` warns that the set is empty and exits successfully, without an agent error

### Requirement: Re-running a switch reports already up to date
When the agent's linked skills already match the skillset, `augy use` SHALL report that it is already up to date and change nothing. Source: US-25.

#### Scenario: Running the same switch twice
- **WHEN** the user runs `augy use engineering --agent <id>` and then runs it again
- **THEN** the second run reports "already up to date"
- **AND** the second run changes nothing in the agent's skills folder

### Requirement: Per-skill problems are collected and don't abort the switch
A failure on one skill (unlinking, linking, or no location to link to) SHALL not stop augy from applying the other planned changes. Such failures SHALL be collected and reported at the end. Source: US-26; PD: "Problems with individual skills ... are collected and reported at the end. They don't abort the other changes."

#### Scenario: One link fails
- **WHEN** a switch plans to add `commit` and `github`, and linking `commit` fails
- **THEN** `github` is still linked
- **AND** the end-of-run report names `commit` and the reason it failed

### Requirement: Summary after the switch
After applying a switch, `augy use` SHALL print a summary with the number of skills removed, added and unchanged, plus any per-skill errors. Source: US-26.

#### Scenario: Summary counts
- **WHEN** a switch removes one symlink, adds two, and keeps one
- **THEN** the summary reports 1 removed, 2 added and 1 unchanged

### Requirement: Using a skillset that doesn't exist is an error
`augy use <name>` SHALL fail with an error and change nothing when no skillset with that name exists. Source: PD: "Any command naming a skillset that doesn't exist is an error."

#### Scenario: Unknown skillset
- **WHEN** no skillset `nope` exists and the user runs `augy use nope --agent <id>`
- **THEN** the command fails with an error
- **AND** the agent's skills folder is unchanged

### Requirement: Corrupted skillsets file stops augy use
When the skillsets file is not valid JSON, `augy use` SHALL stop with an error asking the user to fix or delete the file, change nothing in any agent's skills folder, and leave the file as it was. Source: US-29.

#### Scenario: Corrupted file on use
- **WHEN** `skillsets.json` contains invalid JSON and the user runs `augy use engineering --agent <id>`
- **THEN** the command fails with an error
- **AND** the agent's skills folder and the skillsets file are unchanged
