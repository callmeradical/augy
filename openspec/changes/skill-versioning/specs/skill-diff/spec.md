# Spec Delta

## Purpose

Lets a user review, file by file, what differs between the installed copy of a skill, its upstream HEAD, a specific version, or two archived versions before deciding to upgrade or roll back.

## ADDED Requirements

### Requirement: Diff installed against upstream HEAD
`augy diff <skill>` SHALL compare the skill's installed files with the files at the upstream HEAD SHA of its source, and the label SHALL say when upstream equals the installed version. Source: US-16; PD: "`augy diff <skill>`: installed files compared with the files at the upstream HEAD SHA. The label says when upstream equals the installed version."

#### Scenario: Upstream has changes
- **WHEN** `tdd`'s upstream changed `SKILL.md` since install and the user runs `augy diff tdd`
- **THEN** the browser compares the installed files with upstream HEAD and lists `SKILL.md` as modified

#### Scenario: Upstream equals installed
- **WHEN** upstream HEAD is the installed version and the user runs `augy diff tdd`
- **THEN** the label indicates that upstream is the installed version

### Requirement: Upstream diff works for skills from multi-skill sources
Diffing against upstream SHALL work for a skill whose source is a whole repo or folder of several skills, comparing against that skill's own files upstream. Source: US-16; PD: Further Notes "Upstream diff likely fails for skills from multi-skill sources" (defect against US-16).

#### Scenario: Skill installed from a repo of skills
- **WHEN** `grilling` was installed via `augy install acme/skills` and the user runs `augy diff grilling`
- **THEN** the browser compares installed `grilling` with upstream `grilling` without error

### Requirement: Diff installed against a specific SHA
`augy diff <skill> <sha>` SHALL compare the installed files with that version, using the local archive of that version when one exists and fetching it from GitHub otherwise. Source: US-17; PD: "A local archive is used if one exists, and GitHub is used otherwise."

#### Scenario: Archived version used
- **WHEN** `versions/tdd/<sha>/` exists and the user runs `augy diff tdd <sha>`
- **THEN** the diff compares the installed files with that archive and needs no network

#### Scenario: GitHub fallback
- **WHEN** no local archive exists for `<sha>` and the user runs `augy diff tdd <sha>`
- **THEN** augy fetches that version of `tdd` from GitHub and compares the installed files with it

### Requirement: Diff two archived versions
`augy diff <skill> <sha1> <sha2>` SHALL compare the two locally archived versions. If either is not archived locally, it SHALL fail with an error listing the SHAs available in the skill's history. Source: US-18; PD: "Both must exist locally, and if one doesn't, the error lists the available history SHAs."

#### Scenario: Two archives compared
- **WHEN** archives for `A` and `B` exist for `tdd` and the user runs `augy diff tdd A B`
- **THEN** the browser shows the differences between those two archives

#### Scenario: One archive missing
- **WHEN** `B` is not archived and the user runs `augy diff tdd A B`
- **THEN** the command fails and lists the SHAs in `tdd`'s history

### Requirement: Short SHA prefixes in diff
SHA arguments to `augy diff` SHALL accept short prefixes, expanded from the skill's history. Source: US-19; PD: "A short SHA is expanded from the skill's history."

#### Scenario: Prefix expanded
- **WHEN** `tdd`'s history contains `abc1234def...` and the user runs `augy diff tdd abc1234`
- **THEN** the diff uses the full SHA `abc1234def...`

### Requirement: Change summary
The diff browser SHALL begin with a header giving the number of changed files and the total added and removed line counts, followed by a list of changed files marked as added, modified or deleted, each with its `+/-` line counts, ordered modified, then added, then deleted. Source: US-20; PD: "a header with the file count and total `+/-`, a file list ordered modified, then added, then deleted".

#### Scenario: Mixed changes
- **WHEN** between two versions `SKILL.md` is modified (3 lines added, 1 removed), `examples.md` is added (10 lines) and `old.md` is deleted (4 lines)
- **THEN** the header shows 3 files, +13 and -5, and the list shows `SKILL.md` (modified, +3/-1), then `examples.md` (added, +10), then `old.md` (deleted, -4)

### Requirement: Interactive per-file diff
After the summary, augy SHALL offer a picker of the changed files. Choosing a file SHALL show its colorized unified diff with three lines of context, then return to the picker, until the user chooses "done". Source: US-21; PD: "an interactive file picker that shows each file's unified diff with three lines of context until the user picks 'done'".

#### Scenario: Browse two files then finish
- **WHEN** the user picks `SKILL.md`, then `examples.md`, then "done"
- **THEN** augy shows each file's unified diff with three lines of context in turn and then exits

### Requirement: No differences message
When the two compared file sets are identical, augy SHALL say there are no differences instead of opening the browser. Source: US-22.

#### Scenario: Identical versions
- **WHEN** the installed files equal the compared version's files
- **THEN** augy reports no differences and shows no file picker

### Requirement: Installed files read from the first active agent location
For modes that compare the installed copy, the installed files SHALL be read from the skill's first active agent location. Source: PD: "'Installed files' are read from the skill's first active agent location."

#### Scenario: Skill in two agents
- **WHEN** `tdd` is installed for two agents and the user runs `augy diff tdd`
- **THEN** the installed side of the diff is the files at the first active agent's location

### Requirement: Diff reports problems clearly
When a diff can't run (the skill has no source for an upstream comparison, has no active agent, its installed location is missing, or its source no longer contains a skill with that name), augy SHALL fail with a clear message naming the problem rather than a raw error, and SHALL NOT diff against a different skill. Source: US-16, US-17; PD: Further Notes "Diff errors are uncaught" and "Name fallback can deploy the wrong skill" (defects).

#### Scenario: Unsourced skill
- **WHEN** the user runs `augy diff my-skill` on a skill with no source
- **THEN** augy fails with a message that the skill has no upstream source, with no stack trace

#### Scenario: Renamed upstream
- **WHEN** `tdd`'s source no longer has a skill named `tdd` and the user runs `augy diff tdd`
- **THEN** augy reports that `tdd` was not found at its source

### Requirement: Upstream fetch uses the user's GitHub access
Fetching upstream files for a diff SHALL succeed for any source the user's GitHub login can access, including private repos, without requiring a separately configured token. Source: US-16, US-17; PD: Further Notes "The diff browser's GitHub fetch bypasses the user's GitHub login" (defect).

#### Scenario: Private source without GITHUB_TOKEN
- **WHEN** `tdd` came from a private repo the user's GitHub CLI login can see, `GITHUB_TOKEN` is unset, and the user runs `augy diff tdd`
- **THEN** the upstream files are fetched and the diff is shown
