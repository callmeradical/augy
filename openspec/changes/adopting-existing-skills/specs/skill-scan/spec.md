# Spec Delta

## Purpose

Lets a developer bring skills that are already on disk in agent skills folders under augy management, without reinstalling them, by discovering untracked skills, detecting where they came from, and importing them into the registry after confirmation.

## ADDED Requirements

### Requirement: Scan searches every supported agent's skills folder
`augy scan` SHALL search the skills folder of every agent augy supports, whether or not augy detects that agent as installed on the machine. (US-1, US-2, PD: "Every agent's skills folder is scanned")

#### Scenario: Skill in an undetected agent's folder is found
- **WHEN** an untracked skill directory exists in the skills folder of a supported agent that augy does not detect as installed
- **AND** the user runs `augy scan`
- **THEN** scan reports that skill as untracked

#### Scenario: Skills across several agents are all found
- **WHEN** untracked skill directories exist in the skills folders of several different supported agents
- **AND** the user runs `augy scan`
- **THEN** scan reports every one of them

### Requirement: A skill is a directory containing SKILL.md
Scan SHALL treat any directory that contains a `SKILL.md` file as a skill named after the directory. It SHALL search directories without `SKILL.md` recursively, and SHALL NOT search inside a directory once it has identified it as a skill. (US-3, PD: "A skill is a directory that contains `SKILL.md`")

#### Scenario: Nested skill in a category folder is found
- **WHEN** an agent's skills folder contains `category/my-skill/SKILL.md` and `category/` has no `SKILL.md`
- **AND** the user runs `augy scan`
- **THEN** scan reports an untracked skill named `my-skill`

#### Scenario: Directories inside a skill are not reported as skills
- **WHEN** an agent's skills folder contains `outer/SKILL.md` and `outer/inner/SKILL.md`
- **AND** the user runs `augy scan`
- **THEN** scan reports `outer` as a skill and does not report `inner`

#### Scenario: Directory without SKILL.md is not a skill
- **WHEN** an agent's skills folder contains a directory with no `SKILL.md` anywhere beneath it
- **AND** the user runs `augy scan`
- **THEN** scan does not report that directory as a skill

### Requirement: Symlinked skill directories are found
Scan SHALL find skill directories that are present in an agent's skills folder as symbolic links, both when reporting untracked skills and when looking for additional agent locations of tracked skills. (US-1, US-18; Further Notes present "Symlinked skill folders are invisible to scan" as a gap)

#### Scenario: Untracked symlinked skill is reported
- **WHEN** an agent's skills folder contains a symlink to a directory containing `SKILL.md` and no skill of that name is in the registry
- **AND** the user runs `augy scan`
- **THEN** scan reports that skill as untracked

#### Scenario: Symlinked copy of a tracked skill is offered as an additional install
- **WHEN** a tracked skill is not registered for an agent, and that agent's skills folder contains a symlink with the skill's name pointing at a directory containing `SKILL.md`
- **AND** the user runs `augy scan`
- **THEN** scan offers that agent path as an additional install of the tracked skill

### Requirement: Only untracked skills are reported for import
Scan SHALL report for import only skill directories whose name is not already in the registry. (US-1, US-26)

#### Scenario: Tracked skill is not offered for import
- **WHEN** a skill named `tdd` is in the registry and a `tdd/SKILL.md` directory exists in an agent's skills folder
- **AND** the user runs `augy scan`
- **THEN** `tdd` does not appear among the untracked skills offered for import

#### Scenario: Everything tracked
- **WHEN** every skill directory in every agent's skills folder is already in the registry and registered for that agent
- **AND** the user runs `augy scan`
- **THEN** scan says that all installed skills are already tracked and exits without prompting or changing the registry

### Requirement: Same-named folders are one skill
Scan SHALL treat skill directories with the same name in different agents' skills folders as a single skill with several agent locations, and an import SHALL create one registry entry that records every agent location where the skill was found. (US-15, PD: "Identity across agents is by name.")

#### Scenario: Skill in two agents is reported once
- **WHEN** an untracked skill named `review` exists in the skills folders of two agents
- **AND** the user runs `augy scan`
- **THEN** scan lists `review` once, with both agent paths

#### Scenario: Import records every location
- **WHEN** the user imports the skill `review` found in two agents' skills folders
- **THEN** the registry contains exactly one `review` entry
- **AND** that entry lists both agents with their paths

### Requirement: Provenance from the git origin remote
When an untracked skill sits inside a git checkout whose `origin` remote points at github.com over HTTPS or SSH, scan SHALL detect the source as `owner/repo/<path of the skill within the repo>`, with the SHA of the last local commit that touched that path and the label `git`. HTTPS and SSH remotes for the same repo SHALL give the same source. (US-4, US-5, PD: "Git provenance uses only the `origin` remote")

#### Scenario: HTTPS remote
- **WHEN** an untracked skill is at `skills/x` inside a git checkout whose `origin` is `https://github.com/owner/repo.git`
- **AND** the user runs `augy scan`
- **THEN** scan reports the skill under "provenance detected" with source `owner/repo/skills/x`, a SHA, and the label `git`

#### Scenario: SSH remote gives the same source
- **WHEN** the same checkout instead has `origin` set to `git@github.com:owner/repo.git`
- **AND** the user runs `augy scan`
- **THEN** scan reports the same source `owner/repo/skills/x` with the label `git`

#### Scenario: SHA is the last commit touching the skill's path
- **WHEN** the checkout's most recent commit changed only files outside `skills/x`, and an earlier commit was the last to change `skills/x`
- **AND** the user runs `augy scan`
- **THEN** the reported SHA is that earlier commit's SHA

### Requirement: Only GitHub origin remotes count as git provenance
Scan SHALL NOT derive git provenance from remotes other than `origin`, or from an `origin` that does not point at github.com. (PD: "Only GitHub sources are recognized.")

#### Scenario: Non-GitHub origin
- **WHEN** an untracked skill sits in a git checkout whose `origin` points at a host other than github.com, and the skill has no frontmatter source and no tap match
- **AND** the user runs `augy scan`
- **THEN** scan lists the skill under "no provenance found"

#### Scenario: GitHub remote that is not origin
- **WHEN** an untracked skill sits in a git checkout whose only GitHub remote is named something other than `origin`, and the skill has no frontmatter source and no tap match
- **AND** the user runs `augy scan`
- **THEN** scan lists the skill under "no provenance found"

### Requirement: Provenance from SKILL.md frontmatter
When git provenance does not apply, scan SHALL read a `source`, `repo`, or `origin` field from the skill's `SKILL.md` frontmatter and, if it is a GitHub URL or `owner/repo[/path]` shorthand, report it with the label `frontmatter`. A GitHub tree URL in frontmatter SHALL resolve to the same repo and path the URL names. (US-6, PD: "Frontmatter sources must be GitHub URLs or `owner/repo[/path]` shorthand"; Further Notes present tree-URL mis-resolution as a defect)

#### Scenario: Shorthand source field
- **WHEN** an untracked skill's `SKILL.md` frontmatter contains `source: owner/repo` and the skill is not in a GitHub git checkout
- **AND** the user runs `augy scan`
- **THEN** scan reports the skill under "provenance detected" with source `owner/repo` and the label `frontmatter`

#### Scenario: repo or origin field
- **WHEN** an untracked skill's frontmatter has no `source` field but has `repo: owner/repo` (or `origin: owner/repo`)
- **AND** the user runs `augy scan`
- **THEN** scan reports source `owner/repo` with the label `frontmatter`

#### Scenario: Tree URL in frontmatter resolves to its repo and path
- **WHEN** an untracked skill's frontmatter contains `source: https://github.com/o/r/tree/main/skills/x`
- **AND** the user imports it through `augy scan`
- **THEN** augy resolves the source to repo `o/r` and path `skills/x`, not to a path beginning with `tree/main`
- **AND** the skill is imported with a resolved SHA rather than `unversioned` when that path exists upstream

#### Scenario: Non-GitHub frontmatter source is ignored
- **WHEN** an untracked skill's frontmatter `source` points at a host other than github.com, and the skill has no git provenance and no tap match
- **AND** the user runs `augy scan`
- **THEN** scan lists the skill under "no provenance found"

### Requirement: Provenance from a matching tap
When neither git nor frontmatter provenance applies and at least one tap is registered, scan SHALL suggest the tap entry whose skill name matches the untracked skill, labeled `tap`. If several tap entries share the name, the first one SHALL be used. Importing with that source SHALL record the tap on the skill. (US-7, PD: "Tap matching needs at least one tap.")

#### Scenario: Name matches a tap entry
- **WHEN** an untracked skill `lint` has no git or frontmatter provenance and a registered tap offers a skill named `lint`
- **AND** the user runs `augy scan`
- **THEN** scan reports `lint` under "provenance detected" with that tap entry's source and the label `tap`

#### Scenario: Tap recorded on import
- **WHEN** the user imports `lint` and accepts the tap-detected source
- **THEN** the registry entry for `lint` records that tap

#### Scenario: No taps registered
- **WHEN** no taps are registered and an untracked skill has no git or frontmatter provenance
- **AND** the user runs `augy scan`
- **THEN** scan lists the skill under "no provenance found"

### Requirement: Provenance is tried in a fixed order
Scan SHALL try provenance sources in the order git remote, then frontmatter, then tap, and SHALL use the first that matches. (PD: "Provenance is tried in a fixed order")

#### Scenario: Git wins over frontmatter
- **WHEN** an untracked skill is in a github.com `origin` checkout and also has a different `source` in its frontmatter
- **AND** the user runs `augy scan`
- **THEN** scan reports the git-derived source with the label `git`

#### Scenario: Frontmatter wins over tap
- **WHEN** an untracked skill has no git provenance, has a frontmatter `source`, and its name also matches a tap entry with a different source
- **AND** the user runs `augy scan`
- **THEN** scan reports the frontmatter source with the label `frontmatter`

### Requirement: Results are grouped by provenance
Scan SHALL present untracked skills in two groups. "Provenance detected" SHALL show each skill with its source, its SHA when known, and its label (`git`, `frontmatter`, or `tap`). "No provenance found" SHALL show each skill with its path in every agent where it was found and the first line of its `SKILL.md` content. (US-8, US-9)

#### Scenario: Mixed results
- **WHEN** one untracked skill has git provenance and another has none
- **AND** the user runs `augy scan`
- **THEN** the first appears under "provenance detected" with its source, SHA, and label `git`
- **AND** the second appears under "no provenance found" with its agent paths and the first line of its `SKILL.md`

#### Scenario: First line skips frontmatter and headings
- **WHEN** a skill with no provenance has a `SKILL.md` that starts with a frontmatter block, then a `# Title` heading, then a prose line longer than 80 characters
- **AND** the user runs `augy scan`
- **THEN** the line shown for that skill is the prose line, truncated to 80 characters

### Requirement: Nothing is imported without confirmation
Scan SHALL ask the user to confirm before importing anything. Declining SHALL leave the registry and all skill files unchanged. (US-10, PD: "Scan is read-only until the user confirms.")

#### Scenario: Declining the import prompt
- **WHEN** scan finds untracked skills and the user declines the import prompt
- **THEN** the registry is unchanged
- **AND** no `SKILL.md` file is modified

### Requirement: User selects skills from a pre-selected filterable list
After the user confirms the import, scan SHALL let the user choose which untracked skills to import from a filterable list in which every skill starts selected. Only the chosen skills SHALL be imported. (US-11)

#### Scenario: All pre-selected
- **WHEN** scan shows the selection list
- **THEN** every untracked skill is selected initially

#### Scenario: Deselected skill is not imported
- **WHEN** the user deselects `experiment` and confirms the selection
- **THEN** `experiment` is not added to the registry and the other selected skills are

### Requirement: Detected sources are confirmed per skill
For each selected skill with a detected source, scan SHALL ask whether to use the detected source, defaulting to yes. If the user says no, scan SHALL fall back to manual source entry for that skill. A detected source SHALL never be recorded without that confirmation. (US-12, PD: "Detected sources are never applied without confirmation.")

#### Scenario: Accepting the detected source
- **WHEN** the user accepts the detected source for a skill
- **THEN** the skill is imported with that source

#### Scenario: Rejecting a wrong guess
- **WHEN** the detected source for a skill is a dotfiles repo and the user rejects it
- **THEN** scan asks the user for a source for that skill
- **AND** the dotfiles repo is not recorded as the skill's source

### Requirement: Manual source entry during import
For a selected skill without a detected source, or whose detected source was rejected, scan SHALL let the user type a GitHub URL or `owner/repo[/path]` shorthand, and SHALL import the skill with that source. (US-13)

#### Scenario: Typed shorthand
- **WHEN** the user types `owner/repo/skills/x` for a skill with no provenance
- **THEN** the skill is imported with source `owner/repo/skills/x`

### Requirement: Import without a source
If the user leaves the source blank, scan SHALL import the skill with an empty source and the SHA `unversioned`. (US-14, PD: "Importing without a source is allowed.")

#### Scenario: Blank source
- **WHEN** the user leaves the source field blank for a skill
- **THEN** the registry contains the skill with an empty source and SHA `unversioned`
- **AND** the skill appears in `augy list`

### Requirement: SHA lookup for frontmatter and typed sources
For a source that does not already carry a SHA (frontmatter, tap, or typed), scan SHALL look up a SHA from GitHub during import. If the lookup fails, scan SHALL still import the skill with the given source and the SHA `unversioned`. (US-17, PD: "A failed SHA lookup doesn't block the import.")

#### Scenario: SHA resolved from GitHub
- **WHEN** the user imports a skill with a frontmatter-detected source that exists on GitHub
- **THEN** the registry entry has that source and a resolved commit SHA

#### Scenario: SHA lookup fails
- **WHEN** the user imports a skill with a source whose SHA cannot be fetched (for example, no network or no access)
- **THEN** the skill is still added to the registry with that source and SHA `unversioned`
- **AND** the remaining selected skills continue to be imported

### Requirement: Each import is saved immediately
Scan SHALL save the registry after each imported skill, so that skills already imported remain in the registry if the scan is cancelled or crashes partway through. (US-16, PD: "The registry is saved after each imported skill")

#### Scenario: Cancelled partway
- **WHEN** the user has completed the import of two skills and cancels during the third
- **THEN** the registry contains the first two skills

### Requirement: Adopted skills stay where they are
Scan SHALL record each imported skill at its current location in each agent and SHALL NOT move it into the canonical store under `~/.augy/store/` or replace it with a symlink. (PD: "Adopted skills stay where they are.")

#### Scenario: Files untouched in place
- **WHEN** the user imports a skill found as a plain directory in an agent's skills folder
- **THEN** that directory is still a plain directory at the same path
- **AND** no copy of the skill is created under `~/.augy/store/`
- **AND** the registry records that path for the agent

### Requirement: Scan writes the confirmed source into SKILL.md
After importing a skill with a source and a resolved SHA, scan SHALL add `source: <source>` to the frontmatter of the skill's `SKILL.md` at its first agent location, creating a frontmatter block if there is none. It SHALL NOT overwrite an existing `source` field. (US-19, PD: "The source is written back into `SKILL.md`.")

#### Scenario: Frontmatter block exists without source
- **WHEN** a skill whose `SKILL.md` has frontmatter but no `source` field is imported with source `owner/repo/x` and a resolved SHA
- **THEN** that `SKILL.md` frontmatter contains `source: owner/repo/x`

#### Scenario: No frontmatter block
- **WHEN** a skill whose `SKILL.md` has no frontmatter is imported with a source and a resolved SHA
- **THEN** that `SKILL.md` begins with a frontmatter block containing the `source:` line

#### Scenario: Existing source field is kept
- **WHEN** a skill whose `SKILL.md` already has a `source` field is imported with a different source
- **THEN** the existing `source` field is unchanged

#### Scenario: No write-back without a resolved SHA
- **WHEN** a skill is imported with an empty source or with SHA `unversioned`
- **THEN** its `SKILL.md` is not modified

#### Scenario: Only the first agent location is written
- **WHEN** a skill found in two agents' folders is imported with a source and resolved SHA
- **THEN** the `source:` line is added to the `SKILL.md` at the first agent location only

### Requirement: Scan offers to register additional agent locations of tracked skills
Scan SHALL find tracked skills that also exist, under the same name, in the skills folder of an agent the registry doesn't list for them. It SHALL list them and ask a single yes/no question; on yes, it SHALL add each path under its agent in the registry. This SHALL happen even when there are no untracked skills or the user declines the import. (US-18, PD: "once (a single yes/no) to register any additional agent paths"; Further Notes present the skipped step as a defect)

#### Scenario: Copy found after an import
- **WHEN** the user imports untracked skills and a tracked skill `tdd` also exists in an agent's folder not registered for it
- **THEN** scan lists that agent path for `tdd` and asks once whether to register additional agent paths
- **AND** on yes, the registry lists that path under that agent for `tdd`

#### Scenario: Copy found when nothing is untracked
- **WHEN** there are no untracked skills, and a tracked skill exists in an agent's folder not registered for it
- **AND** the user runs `augy scan`
- **THEN** scan offers to register that agent path

#### Scenario: Copy found after declining import
- **WHEN** the user declines the import prompt, and a tracked skill exists in an agent's folder not registered for it
- **THEN** scan still offers to register that agent path

#### Scenario: Declining additional paths
- **WHEN** scan offers additional agent paths and the user says no
- **THEN** the registry's agent locations are unchanged

### Requirement: GitHub access uses the user's GitHub CLI login
Scan SHALL resolve GitHub sources and SHAs through the user's existing GitHub CLI login, so that sources in private repos the user can access resolve without separate token setup. Git provenance SHALL use the `git` available on the user's PATH. (US-24, PD: "GitHub access goes through the GitHub CLI.")

#### Scenario: Private repo source
- **WHEN** the user is logged in to the GitHub CLI with access to private repo `org/private`, and imports a skill with source `org/private/skills/x`
- **THEN** the skill is imported with a resolved SHA
