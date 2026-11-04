# Spec Delta

## Purpose

Lets a user restore a skill to an earlier version from a local, plain-directory archive kept on their machine, without depending on any external service, and undo that restore later.

## ADDED Requirements

### Requirement: Interactive rollback picker
`augy rollback <skill>` with no SHA SHALL show a picker of the skill's history entries, newest first, with each entry's install date, and SHALL mark any entry whose archive is missing. It SHALL NOT offer the currently installed version as a target. Source: US-23, US-24; PD: "with no SHA shows a picker of history entries, newest first"; PD: Further Notes "History can contain the current version" (defect).

#### Scenario: Picker ordering and dates
- **WHEN** `tdd` has history `[A, B]` (oldest first) with archives for both and the user runs `augy rollback tdd`
- **THEN** the picker lists `B` then `A`, each with its install date

#### Scenario: Missing archive marked
- **WHEN** the archive for history entry `A` has been deleted from disk
- **THEN** the picker marks `A` as missing

#### Scenario: Current version not offered
- **WHEN** after upgrade A→B, rollback to A and upgrade to B again, the user runs `augy rollback tdd`
- **THEN** `B` (the installed version) is not offered as a rollback target

### Requirement: Rollback by SHA prefix
`augy rollback <skill> <sha>` SHALL accept a SHA prefix and roll back to the first history entry that matches it. Source: US-19, US-23; PD: "takes a SHA prefix, and the first matching history entry wins."

#### Scenario: Short SHA rollback
- **WHEN** `tdd`'s history contains `abc1234...` and the user runs `augy rollback tdd abc1234`
- **THEN** `tdd` is restored to version `abc1234...`

### Requirement: Unknown SHA lists available versions
When the given SHA matches no history entry, rollback SHALL fail with an error that lists the versions available for the skill. Source: US-26.

#### Scenario: Typo in SHA
- **WHEN** the user runs `augy rollback tdd zzz999` and no history entry matches
- **THEN** the command fails and lists `tdd`'s available history SHAs, and nothing changes

### Requirement: Rollback preconditions
A skill with no history SHALL be reported as having nothing to roll back to, without failing. A target whose archive is missing SHALL be an error, and nothing SHALL change. Source: US-24; PD: "A skill with no history can't be rolled back (friendly no-op). A target whose archive is missing is an error."

#### Scenario: No history
- **WHEN** `tdd` has never been upgraded and the user runs `augy rollback tdd`
- **THEN** augy says there are no earlier versions and the command does not fail

#### Scenario: Target archive missing
- **WHEN** the user rolls back to a history entry whose archive directory doesn't exist
- **THEN** the command fails with an error and the installed files and lockfile are unchanged

### Requirement: Displaced version archived first
Before restoring, rollback SHALL archive the current version's complete files to `versions/<skill>/<current-sha>/`, so the rollback can be undone. A failed or interrupted archive attempt SHALL NOT leave behind an archive that a later attempt treats as complete. Source: US-25; PD: "The current version is archived before it's overwritten."; PD: Further Notes "Rollback is broken for symlinked installs" (defect, data-loss risk).

#### Scenario: Current version archived
- **WHEN** `tdd` is at `C` and the user rolls back to `B`
- **THEN** `versions/tdd/<C>/` contains `tdd`'s files as they were at `C`

#### Scenario: Symlinked install archived completely
- **WHEN** `tdd` is installed as agent symlinks to one canonical copy and the user rolls it back
- **THEN** the displaced version's archive contains the skill's real files (not empty and not a link), and the rollback succeeds on the first attempt

### Requirement: Target restored to every agent
Rollback SHALL restore the target archive's files byte for byte so that every active agent location recorded for the skill shows the restored version. Source: US-23; PD: "The target archive is then restored into every active agent location recorded for the skill."

#### Scenario: Two agents restored
- **WHEN** `tdd` is recorded for two agents and the user rolls back to `B`
- **THEN** both agents' `tdd` folders contain files identical to `versions/tdd/<B>/`

### Requirement: Rolled-back skills keep receiving updates
After rolling back a skill installed as links to a canonical copy, every agent SHALL keep seeing the one canonical copy, so a later `augy update` reaches every agent and the skill stays under skillset management. Source: US-8, US-23; PD: Further Notes "Rollback turns symlinks into copies, which then stop receiving updates" (defect).

#### Scenario: Update after rollback
- **WHEN** a symlinked `tdd` is rolled back to `B` and the user then runs `augy update` and applies the upgrade
- **THEN** every agent's `tdd` folder shows the upgraded files

### Requirement: History swapped on rollback
After a rollback, the restored entry SHALL be removed from the history, the displaced current version SHALL be added to it, and the recorded SHA SHALL become the restored SHA, so rolling forward again undoes the rollback. Source: US-25; PD: "the restored entry is removed and the displaced current version is added. The recorded SHA becomes the restored one."

#### Scenario: Roll back and forward
- **WHEN** `tdd` is at `C` with history `[A, B]`, the user rolls back to `B`, then rolls back to `C`
- **THEN** after the first rollback the recorded SHA is `B` and history contains `A` and `C` but not `B`; after the second the recorded SHA is `C` and the files equal the original `C` files

### Requirement: Rollback does not pin
Rollback SHALL NOT pin the skill; a later `augy update` SHALL offer to upgrade it again. Source: PD: "Rollback doesn't pin the skill."

#### Scenario: Update offered after rollback
- **WHEN** the user rolls `tdd` back from `C` to `B` and upstream is still at `C`
- **THEN** `augy update` offers `tdd` with `B → C`

### Requirement: Archive is plain local directories
Archived versions SHALL be stored as plain, human-readable directory snapshots at `versions/<skill>/<full-sha>/` under the augy home (`~/.augy`, or `$AUGY_HOME` when set), and any archive location the lockfile records SHALL point at that same place. Source: US-27; PD: "Version archive (user-visible layout)"; PD: Further Notes "The history entries' archive locations ignore `AUGY_HOME`" (defect).

#### Scenario: Inspect an archive by hand
- **WHEN** `tdd` has been upgraded from `A`
- **THEN** `~/.augy/versions/tdd/<A-full-sha>/` is an ordinary directory containing `SKILL.md` and the skill's other files

#### Scenario: AUGY_HOME set
- **WHEN** `AUGY_HOME` is `/tmp/ah` and `tdd` is upgraded from `A`
- **THEN** the archive is at `/tmp/ah/versions/tdd/<A-full-sha>/` and the lockfile does not point any history entry at `~/.augy`

### Requirement: Rollback works offline
Rollback SHALL restore archived versions without contacting GitHub or any other external service. Source: US-29.

#### Scenario: Offline rollback
- **WHEN** the machine has no network and the user rolls `tdd` back to an archived version
- **THEN** the rollback succeeds

### Requirement: Archives kept unless the user chooses to delete them
Archives SHALL never be pruned automatically. `augy uninstall` SHALL ask whether to delete the skill's archives, defaulting to no, and SHALL keep them unless the user agrees. Source: US-28; PD: "Archives are never pruned automatically. `augy uninstall` asks, defaulting to no, whether to delete a skill's archives."

#### Scenario: Uninstall keeps archives by default
- **WHEN** the user uninstalls `tdd` and accepts the default at the archive prompt
- **THEN** `versions/tdd/` still exists

#### Scenario: Uninstall with pruning
- **WHEN** the user uninstalls `tdd` and agrees to delete its archives
- **THEN** `versions/tdd/` no longer exists
