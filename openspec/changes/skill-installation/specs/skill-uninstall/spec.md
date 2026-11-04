# Spec Delta

## Purpose

Lets a user remove a tracked skill from every agent it was deployed to, from augy's store, and from the registry in one confirmed command, while keeping archived versions unless they choose to delete them.

## ADDED Requirements

### Requirement: Only tracked skills can be uninstalled
`augy uninstall <skill>` SHALL require the skill to be in the registry. If it isn't, uninstall SHALL exit with code 1 and remove nothing, even when a folder with that name exists in an agent's skills directory. Source: PD: "The skill must be in the registry. If it isn't, uninstall exits with code 1, even if a folder with that name exists on disk."

#### Scenario: Untracked name with a folder on disk
- **WHEN** the user runs `augy uninstall notes` and `notes` isn't in the registry but `~/.claude/skills/notes` exists
- **THEN** uninstall exits with code 1 and the folder is left in place

### Requirement: Preview before uninstalling
Before removing anything, uninstall SHALL show the skill, its short SHA, each agent path it will remove (marking any that are already missing as "already missing"), and how many archived versions exist. Sources: US-29, PD: "It shows the skill, its short SHA, each agent path it will remove (marked 'already missing' when absent), and how many archived versions exist."

#### Scenario: One agent path already gone
- **WHEN** the user uninstalls a skill recorded for Claude and Codex, and Codex's path no longer exists
- **THEN** the preview lists both paths, marks Codex's as "already missing", and shows the skill's short SHA and archived-version count

### Requirement: Uninstall always asks for confirmation
Uninstall SHALL always ask the user to confirm and SHALL remove nothing if they decline. Sources: US-29, PD: "Uninstall always asks for confirmation."

#### Scenario: User declines
- **WHEN** the user declines the uninstall confirmation
- **THEN** every agent path, the store copy, archives, and the registry entry are left unchanged

### Requirement: Remove the skill everywhere it was deployed
After confirmation, uninstall SHALL remove every agent path recorded for the skill and augy's stored copy, so that no agent still has the skill. Sources: US-30, PD: "It removes the agent paths recorded for the skill, augy's stored copy."

#### Scenario: Skill in three agents
- **WHEN** the user confirms uninstalling a skill recorded for three agents
- **THEN** none of the three agent paths exists afterward and `~/.augy/store/<skill>/` is gone

### Requirement: Broken links are removed too
When a recorded agent path is a link whose target no longer exists, uninstall SHALL remove the link and SHALL NOT leave it on disk. Source: US-30; the PRD's Further Notes report that such links are counted as "already missing" and left behind as broken links, as a defect.

#### Scenario: Dangling agent link
- **WHEN** an agent's recorded path is a link to a store folder that was already deleted, and the user confirms uninstall
- **THEN** that link is gone from the agent's skills folder afterward

### Requirement: Archived versions kept unless the user chooses otherwise
Uninstall SHALL ask whether to delete archived versions only when the skill has version history, with "no" as the default. If the user agrees, it SHALL delete the skill's whole archive folder, `~/.augy/versions/<skill>/`; otherwise the archives SHALL remain. Sources: US-31, US-32, PD: "It asks about deleting archives only if the skill has version history. The default answer is no."

#### Scenario: Accept the default
- **WHEN** the user uninstalls a skill with archived versions and accepts the default answer to the archive question
- **THEN** `~/.augy/versions/<skill>/` still exists with its snapshots

#### Scenario: Clean slate
- **WHEN** the user answers yes to deleting archived versions
- **THEN** `~/.augy/versions/<skill>/` no longer exists

#### Scenario: No history
- **WHEN** the user uninstalls a skill with no version history
- **THEN** augy does not ask about archives

### Requirement: Registry entry removed even when deletions fail
Uninstall SHALL show any failure to delete a file as a warning and SHALL remove the skill's registry entry regardless. Sources: US-33, PD: "Failures to delete files are shown as warnings. The registry entry is removed regardless."

#### Scenario: One path can't be deleted
- **WHEN** one recorded agent path can't be deleted during a confirmed uninstall
- **THEN** augy shows a warning for that path and the skill no longer appears in the registry
