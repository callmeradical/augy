# Spec Delta

## Purpose

Gives a developer read-only views of the skills augy manages, as a compact list of every skill, a raw JSON dump for scripts, and a detailed report on one skill, all answered from the local lockfile without network access.

## ADDED Requirements

### Requirement: List shows every registered skill
`augy list` SHALL print one entry for every skill in the registry, in the order the skills were first added (not sorted). Each entry SHALL show the skill's name, its source, the agents it is deployed to, and its last-updated date. (US-1, US-3, PD: "Skills appear in the order they were first added to the registry.")

#### Scenario: Skills in insertion order
- **WHEN** the registry contains skills added in the order `zeta`, `alpha`, `mid`
- **AND** the user runs `augy list`
- **THEN** the output lists `zeta`, `alpha`, `mid` in that order

#### Scenario: Entry contents
- **WHEN** the registry contains skill `tdd` with source `owner/repo/tdd`, deployed to two agents
- **AND** the user runs `augy list`
- **THEN** the `tdd` entry shows its name, the source `owner/repo/tdd`, both agents, and its last-updated date

### Requirement: List shows the short SHA of tracked skills
For a skill with a source and a SHA other than `unversioned`, `augy list` SHALL show `@<7-character short SHA>`. (US-2, PD: "Otherwise list shows `@<short SHA>`.")

#### Scenario: Short SHA
- **WHEN** a skill has a source and SHA `abcdef1234567890`
- **AND** the user runs `augy list`
- **THEN** its entry shows `@abcdef1`

### Requirement: List marks untracked skills and gives the set-source fix
`augy list` SHALL show a skill as "untracked" when it has no source or its SHA is `unversioned`. A skill with no source SHALL show "source: unknown" and a warning containing the exact `augy set-source` command to run for that skill. (US-7, PD: "What counts as 'untracked' in list.")

#### Scenario: Sourceless skill
- **WHEN** a skill `mystery` has an empty source and SHA `unversioned`
- **AND** the user runs `augy list`
- **THEN** its entry shows "untracked" and "source: unknown"
- **AND** shows the `augy set-source` command to run for `mystery`

#### Scenario: Sourced but unversioned skill
- **WHEN** a skill has a source but SHA `unversioned`
- **AND** the user runs `augy list`
- **THEN** its entry shows "untracked" instead of a short SHA

### Requirement: List marks inactive deployments
`augy list` SHALL mark each agent deployment whose active flag is false as "(inactive)". (US-4)

#### Scenario: One inactive agent
- **WHEN** a skill is deployed to agent A (active) and agent B (inactive)
- **AND** the user runs `augy list`
- **THEN** agent B is shown with "(inactive)" and agent A is not

### Requirement: List shows a pinned badge
`augy list` SHALL show a `[pinned]` badge on every pinned skill and on no unpinned skill. (US-5)

#### Scenario: Pinned and unpinned
- **WHEN** skill `a` is pinned and skill `b` is not
- **AND** the user runs `augy list`
- **THEN** `a` shows `[pinned]` and `b` does not

### Requirement: List summarizes version history
For each skill, `augy list` SHALL show the total number of previous versions and the three most recent previous versions, newest first. (US-6, PD: "List shows the three most recent previous versions, newest first, plus a total count.")

#### Scenario: More than three previous versions
- **WHEN** a skill has five previous versions in its history
- **AND** the user runs `augy list`
- **THEN** its entry shows a count of five and exactly the three most recent versions, newest first

### Requirement: Empty list points to install
When the registry contains no skills, `augy list` SHALL print a "No skills installed" hint that points the user to `augy install`. (US-8)

#### Scenario: Empty registry
- **WHEN** the registry has no skills
- **AND** the user runs `augy list`
- **THEN** the output says no skills are installed and mentions `augy install`

### Requirement: List JSON prints the entire registry
`augy list --json` SHALL print the entire registry as formatted, parseable JSON matching the lockfile on disk, including the `version` field, all `taps`, all `skills`, and the `home` and `machineContext` settings when set. (US-9, US-23, PD: "`--json` prints the entire registry, not only the skills.")

#### Scenario: Output matches the lockfile
- **WHEN** the registry has skills, taps, a home configuration, and a machine context
- **AND** the user runs `augy list --json`
- **THEN** the output parses as JSON and is equal to the parsed contents of `registry.json`

#### Scenario: Empty registry as JSON
- **WHEN** the registry has no skills
- **AND** the user runs `augy list --json`
- **THEN** the output is a valid, empty registry document

### Requirement: Info shows source, tap, and SHA
`augy info <skill>` SHALL show the skill's source, the tap it came from with the tap's description when it has a tap, its short SHA, and its full SHA. (US-10)

#### Scenario: Skill from a tap
- **WHEN** skill `lint` has source `owner/repo/lint`, came from tap `team` whose description is "Team skills", and has SHA `abcdef1234567890`
- **AND** the user runs `augy info lint`
- **THEN** the output shows `owner/repo/lint`, the tap `team` with "Team skills", `abcdef1`, and `abcdef1234567890`

### Requirement: Info shows dates, pin status, and label
`augy info <skill>` SHALL show the install date, the last-updated date when it differs from the install date, and whether the skill is pinned, stating for pinned skills that they are skipped by `augy update`. When the skill has a `label`, info SHALL display it. (US-15, PD: "An optional free-text `label` is displayed by `info` when present.")

#### Scenario: Pinned skill
- **WHEN** skill `a` is pinned
- **AND** the user runs `augy info a`
- **THEN** the output says `a` is pinned and that pinned skills are skipped during update

#### Scenario: Updated after install
- **WHEN** a skill's updated date differs from its install date
- **AND** the user runs `augy info` for it
- **THEN** both dates are shown

#### Scenario: Never updated
- **WHEN** a skill's updated date equals its install date
- **AND** the user runs `augy info` for it
- **THEN** only the install date is shown

#### Scenario: Label present
- **WHEN** a skill's lockfile entry has a `label`
- **AND** the user runs `augy info` for it
- **THEN** the label is displayed

### Requirement: Info shows each deployment path with its disk status
`augy info <skill>` SHALL list each agent the skill is deployed to with its exact filesystem path, marking inactive deployments and marking a path "(missing!)" when it doesn't exist on disk. (US-11, US-12, PD: "Info checks every agent deployment path")

#### Scenario: Paths shown
- **WHEN** a skill is deployed to two agents
- **AND** the user runs `augy info` for it
- **THEN** each agent is shown with its deployment path

#### Scenario: Deleted outside augy
- **WHEN** one of a skill's deployment paths has been deleted from disk
- **AND** the user runs `augy info` for it
- **THEN** that path is marked "(missing!)"

#### Scenario: Inactive deployment
- **WHEN** one of a skill's deployments is inactive
- **AND** the user runs `augy info` for it
- **THEN** that deployment is marked as inactive

### Requirement: Info shows full version history with archive status
`augy info <skill>` SHALL show every entry in the skill's version history, newest first, marking each as archived when its snapshot folder exists or "[archive missing]" when it doesn't. (US-13, PD: "Info shows all of them.")

#### Scenario: Newest first
- **WHEN** a skill has five history entries
- **AND** the user runs `augy info` for it
- **THEN** all five are shown, newest first

#### Scenario: Missing archive
- **WHEN** the snapshot folder for one history entry has been deleted
- **AND** the user runs `augy info` for it
- **THEN** that entry is marked "[archive missing]" and the others are marked archived

### Requirement: Info previews the skill's SKILL.md
`augy info <skill>` SHALL show a preview of `SKILL.md` read from the skill's first active agent deployment: skipping any YAML frontmatter and the first top-level heading, up to five non-empty lines, stopping at the next heading. (US-14, PD: "Description preview."; Further Notes present showing raw frontmatter as a defect)

#### Scenario: Prose preview
- **WHEN** a skill's `SKILL.md` has a `# Title` followed by seven non-empty prose lines and no heading among them
- **AND** the user runs `augy info` for it
- **THEN** the preview shows the first five prose lines and not the title

#### Scenario: Stops at the next heading
- **WHEN** a skill's `SKILL.md` has a `# Title`, two prose lines, then `## Usage`
- **AND** the user runs `augy info` for it
- **THEN** the preview shows only the two prose lines

#### Scenario: Frontmatter is not previewed
- **WHEN** a skill's `SKILL.md` starts with a `---` frontmatter block followed by `# Title` and prose
- **AND** the user runs `augy info` for it
- **THEN** the preview shows the prose and none of the frontmatter lines

### Requirement: Info reports an unknown skill
`augy info <skill>` with a name not in the registry SHALL print an error saying the skill was not found, point the user to `augy list`, and exit with a non-zero status. (US-16, PD: "Not-found handling.")

#### Scenario: Mistyped name
- **WHEN** the user runs `augy info no-such-skill`
- **THEN** the output says the skill was not found and mentions `augy list`
- **AND** the command exits with a non-zero status

### Requirement: Inventory commands are read-only and offline
`augy list`, `augy list --json`, and `augy info` SHALL NOT change the registry or any skill files and SHALL NOT make network calls; all their information SHALL come from the lockfile and local disk checks. (US-22, PD: "Both commands are read-only.")

#### Scenario: No network
- **WHEN** the machine has no network access
- **AND** the user runs `augy list`, `augy list --json`, and `augy info <skill>`
- **THEN** each command succeeds with its normal output

#### Scenario: Nothing changes
- **WHEN** the user runs `augy list` and `augy info <skill>`
- **THEN** `registry.json` and the skill's files are byte-identical to before
