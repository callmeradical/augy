# Spec Delta

## Purpose

Keeps installed skills current with their GitHub sources: records each skill's exact version, detects upstream drift, and applies upgrades interactively or unattended, archiving the previous version first.

## ADDED Requirements

### Requirement: Version identity recorded per installed skill
For every installed skill the lockfile SHALL record its source (a GitHub URL or `owner/repo[/path]`), its current SHA and short SHA, when it was installed and last updated, a pinned flag, and an ordered history of earlier versions, oldest first, each with its SHA and when it was installed. Source: PD: "Each installed skill records its source ..., its current SHA and short SHA, the time it was installed and last updated, a pinned flag, and an ordered history".

#### Scenario: Fresh install
- **WHEN** the user installs a skill from `acme/skills/skills/tdd`
- **THEN** its lockfile entry has that source, a SHA and short SHA, install and update times, pinned set to false, and an empty history

### Requirement: Drift detection by SHA
`augy update` SHALL report an upgrade for a skill exactly when the SHA discovered upstream for the skill's source differs from the recorded SHA; it SHALL NOT compare file contents. When a source covers several skills, the upstream skill SHALL be matched by name. Source: US-1; PD: "Drift means the SHA discovered upstream for the skill's source is different from the recorded SHA."; PD: "the upstream skill is matched by name".

#### Scenario: Upstream changed
- **WHEN** the upstream SHA for installed skill `tdd` differs from its recorded SHA and the user runs `augy update`
- **THEN** `tdd` is listed as an available upgrade

#### Scenario: Upstream unchanged
- **WHEN** the upstream SHA equals the recorded SHA for every eligible skill
- **THEN** `augy update` reports that all skills are up to date and changes nothing

#### Scenario: Multi-skill source matched by name
- **WHEN** skill `grilling` was installed from `acme/skills`, which contains several skills, and only `grilling` changed upstream
- **THEN** `augy update` compares against the upstream skill named `grilling` and lists only `grilling`

### Requirement: No spurious drift from inconsistent identifiers
A skill whose upstream files have not changed SHALL NOT be offered as an upgrade, whether it was installed by bare name through a tap or by its direct path, and a commit that touches only other files in the source repo SHALL NOT count as drift for that skill. Source: US-1, US-3; PD: Further Notes "Spurious 'update available' from inconsistent SHAs (likely bug)".

#### Scenario: First update after a bare-name install
- **WHEN** the user installs `tdd` by bare name from a tap and runs `augy update` with no upstream change
- **THEN** no upgrade is offered for `tdd`

#### Scenario: Unrelated commit in the source repo
- **WHEN** `tdd` was installed from `acme/skills/skills/tdd` and a new commit changes only `skills/other/SKILL.md`
- **THEN** `augy update` offers no upgrade for `tdd`

### Requirement: Missing upstream skill is reported, not substituted
If a skill's source no longer contains a skill with that skill's name, `augy update` SHALL report that skill as a per-skill failure and SHALL NOT deploy a different skill in its place. Source: US-9; PD: Further Notes "Name fallback can deploy the wrong skill" (defect against name matching).

#### Scenario: Skill renamed upstream
- **WHEN** installed skill `tdd` came from `acme/skills` and that source now has `test-first` but no `tdd`
- **THEN** `augy update` reports `tdd` as not found at its source and the installed `tdd` files are unchanged

### Requirement: Update all or one skill
`augy update` with no argument SHALL check every eligible installed skill. `augy update <skill>` SHALL check only that skill. Naming a skill that is not in the lockfile SHALL be an error, and running update with nothing installed SHALL be a friendly no-op. Source: US-1, US-2; PD: "Naming a skill that isn't in the lockfile is an error. Updating with nothing installed is a friendly no-op."

#### Scenario: Single skill update
- **WHEN** both `tdd` and `grilling` have upstream changes and the user runs `augy update tdd`
- **THEN** only `tdd` is offered and `grilling` is unchanged

#### Scenario: Unknown skill named
- **WHEN** the user runs `augy update nosuchskill`
- **THEN** the command fails with an error naming the unknown skill

#### Scenario: Nothing installed
- **WHEN** the lockfile has no installed skills and the user runs `augy update`
- **THEN** augy says there is nothing to update and the command does not fail

### Requirement: Upgrades listed as old to new SHA
Before anything changes, `augy update` SHALL list each available upgrade with the skill name and its current and new SHA in the form `old-sha → new-sha`. Source: US-3.

#### Scenario: Upgrade list
- **WHEN** `tdd` is recorded at `abc1234` and upstream is at `def5678`
- **THEN** the list shows `tdd` with `abc1234 → def5678` before any prompt or change

### Requirement: Interactive selection and confirmation
Without `--all`, when exactly one upgrade is available augy SHALL ask for confirmation; when several are available augy SHALL show a multi-select of the upgrades that requires at least one selection, then ask for confirmation. Only selected upgrades SHALL be applied. Source: US-4, US-5; PD: "With one candidate, augy asks for confirmation. With several, it shows a required multi-select and then asks for confirmation."

#### Scenario: Choose a subset
- **WHEN** upgrades exist for `tdd` and `grilling` and the user selects only `tdd` and confirms
- **THEN** only `tdd` is upgraded and `grilling` keeps its recorded SHA and files

#### Scenario: Single candidate confirmation
- **WHEN** only `tdd` has an upgrade and the user runs `augy update`
- **THEN** augy asks for confirmation before applying it

### Requirement: Cancelling an interactive update changes nothing
Cancelling the multi-select or declining the confirmation SHALL exit leaving the lockfile and the files on disk unchanged. Source: US-5; PD: "Cancelling at either step exits without changes."

#### Scenario: Cancel at confirmation
- **WHEN** the user declines the confirmation
- **THEN** the lockfile and every skill's files are unchanged

#### Scenario: Cancel at the picker
- **WHEN** the user cancels the multi-select
- **THEN** the lockfile and every skill's files are unchanged

### Requirement: Unattended updates with --all
`augy update --all` SHALL apply every available upgrade without showing a picker or a confirmation. Source: US-6; PD: "`--all` applies every candidate with no picker and no confirmation."

#### Scenario: CI nightly update
- **WHEN** CI runs `augy update --all` with no terminal input available and three skills have upgrades
- **THEN** all three are upgraded without any prompt

### Requirement: Archive before overwrite
Before upgrading a skill, augy SHALL archive its current files to `versions/<skill>/<old-sha>/` under the augy home. If that archive already exists it SHALL be reused rather than overwritten. Source: US-7; PD: "the current files are archived first to `~/.augy/versions/<skill>/<old-sha>/`. If that archive already exists it is reused rather than overwritten."

#### Scenario: Old files archived
- **WHEN** `tdd` at SHA `abc...` is upgraded
- **THEN** `~/.augy/versions/tdd/<abc-full-sha>/` contains the files `tdd` had before the upgrade

#### Scenario: Existing archive reused
- **WHEN** `versions/tdd/<old-sha>/` already exists before an upgrade
- **THEN** its contents are left as they were

### Requirement: Upgrade reaches every agent using the skill
An upgrade SHALL replace the skill's single canonical copy so every agent that links to it sees the new version immediately. For skills installed by older augy versions as separate per-agent copies, each active agent's copy SHALL be replaced. Source: US-8; PD: "the new version replaces the skill's single canonical copy, and every agent that links to it sees the new version immediately."

#### Scenario: Linked agents see the upgrade
- **WHEN** `tdd` is linked into two agents' skill folders and the user upgrades it
- **THEN** both agents' `tdd` folders show the new files

#### Scenario: Legacy per-agent copies
- **WHEN** `tdd` was installed by an older augy as separate copies in two active agents and is upgraded
- **THEN** both copies contain the new files

### Requirement: Lockfile updated after upgrade
After a skill is upgraded, its old SHA SHALL be appended to the end of its history and its recorded SHA SHALL become the new SHA. Source: US-7; PD: "After an upgrade, the old SHA is added to the skill's history and the recorded SHA becomes the new one."

#### Scenario: History grows
- **WHEN** `tdd` with history `[A]` is upgraded from `B` to `C`
- **THEN** its history is `[A, B]` and its recorded SHA is `C`

### Requirement: Failed upgrade leaves the previous version usable
If downloading or deploying a skill's new version fails, the skill SHALL remain installed with its previous files in every agent and its lockfile entry SHALL still record the previous SHA. Source: US-7, US-9; PD: Further Notes "A failed download leaves the skill broken" (defect).

#### Scenario: Download fails mid-upgrade
- **WHEN** the user confirms an upgrade of `tdd` and the download of the new version fails
- **THEN** every agent still has the previous `tdd` files, the lockfile still records the old SHA, and the failure is reported

### Requirement: Per-skill failures don't block others
Update checks SHALL run concurrently, and a skill that cannot be checked or upgraded (network, auth, missing source) SHALL be reported with its error while the other skills are still checked and upgraded. Source: US-9; PD: "Checks run concurrently. Failures are printed per skill and don't stop the others."

#### Scenario: One source unreachable
- **WHEN** `tdd`'s source is unreachable and `grilling` has an upgrade, and the user runs `augy update --all`
- **THEN** `tdd` is reported with its error and `grilling` is upgraded

### Requirement: Failures visible to automation
When any check or upgrade fails, `augy update` (including `--all`) SHALL exit with a failure status and SHALL NOT report that all skills are up to date. Source: US-6, US-9; PD: Further Notes "Exit status hides failures from CI" (defect against US-6).

#### Scenario: Every check fails
- **WHEN** every eligible skill's source is unreachable and CI runs `augy update --all`
- **THEN** the errors are printed, no "all up to date" message is shown, and the exit status is non-zero

#### Scenario: Partial failure
- **WHEN** one skill fails and another is upgraded under `--all`
- **THEN** the exit status is non-zero

### Requirement: Ineligible skills skipped with a notice
`augy update` SHALL check only skills that are not pinned and have a non-empty source that does not point at the configured home repo. It SHALL list skipped skills by name in a notice, grouped as pinned and as authored (no source, or a home-repo source), and SHALL point home-repo-sourced and self-authored skills to `augy home push`. Source: US-12, US-13, US-14; PD: "Skipped groups are listed by name in a dim notice".

#### Scenario: Pinned skill skipped
- **WHEN** `tdd` is pinned and has an upstream change, and the user runs `augy update`
- **THEN** `tdd` is not offered and the notice names `tdd` as pinned

#### Scenario: Self-authored skill skipped
- **WHEN** `my-skill` has no source and the user runs `augy update`
- **THEN** no fetch is attempted for `my-skill` and the notice names it as authored

#### Scenario: Home-repo-sourced skill skipped
- **WHEN** the home repo is `alice/skills` and installed skill `notes` has source `alice/skills/skills/notes`
- **THEN** `notes` is not checked and the notice names it and points to `augy home push`

### Requirement: Home-repo skip matches only the home repo
A skill SHALL be skipped as home-repo-sourced only when its source points at the configured home repo itself, not when the source merely contains the home repo's `owner/repo` text. Source: US-14; PD: Further Notes "Home-repo detection is a substring match" (defect).

#### Scenario: Similarly named repo is not skipped
- **WHEN** the home repo is `alice/skills` and skill `extra` has source `alice/skills-extra/extra`
- **THEN** `extra` is checked for updates like any other sourced skill

### Requirement: Update never uninstalls
`augy update` SHALL NOT uninstall or remove any skill. Source: PD: "Nothing is uninstalled or removed by update."

#### Scenario: Skills remain after update
- **WHEN** the user runs `augy update` and applies, declines or fails any upgrades
- **THEN** every skill that was installed before is still installed
