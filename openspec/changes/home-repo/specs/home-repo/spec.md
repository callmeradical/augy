# Spec Delta

## Purpose

Lets a user designate one personal GitHub repository as their home repo, back up the current machine's skills into it (including the files of self-authored skills), and restore them on any machine.

## ADDED Requirements

### Requirement: Register a home repo
`augy home set <owner/repo>` SHALL save the home repo configuration for this machine in augy's local lockfile (`~/.augy/registry.json`, or under `AUGY_HOME` when set). The configuration SHALL hold three values: the repo identifier, the manifest path inside the repo, and the authored-skills directory inside the repo. Source: US-1, PD: "One home repo per machine."

#### Scenario: Home repo saved to the lockfile
- **WHEN** the user runs `augy home set alice/skills`
- **THEN** augy's lockfile records `alice/skills` as the home repo, together with a manifest path and a skills directory

#### Scenario: AUGY_HOME is honored
- **WHEN** `AUGY_HOME` is set and the user runs `augy home set alice/skills`
- **THEN** the configuration is saved in the lockfile under `AUGY_HOME`, not under `~/.augy`

### Requirement: Default and custom repo layout
`augy home set` SHALL use `augy.json` at the repo root as the manifest path and `skills` as the authored-skills directory when the options are omitted. `--path` SHALL set the manifest path and `--skills-path` SHALL set the authored-skills directory. Source: US-3, US-4, US-5.

#### Scenario: Defaults applied
- **WHEN** the user runs `augy home set alice/skills` with no options
- **THEN** the saved manifest path is `augy.json` and the saved skills directory is `skills`

#### Scenario: Custom manifest path and skills directory
- **WHEN** the user runs `augy home set alice/dotfiles --path config/augy.json --skills-path agent-skills`
- **THEN** the saved manifest path is `config/augy.json` and the saved skills directory is `agent-skills`

### Requirement: Repo identifier validation
`augy home set` SHALL accept only an identifier containing exactly one `/` with a non-empty owner and a non-empty repo part. Anything else, including a full `https://github.com/...` URL, SHALL be rejected with an error, and the existing configuration SHALL be left unchanged. Source: US-2, PD: "Repo identifier format."

#### Scenario: Bare name rejected
- **WHEN** the user runs `augy home set skills`
- **THEN** the command fails with an error and no home configuration is saved

#### Scenario: Empty owner or repo rejected
- **WHEN** the user runs `augy home set /skills` or `augy home set alice/`
- **THEN** the command fails with an error and no home configuration is saved

#### Scenario: Extra path segment rejected
- **WHEN** the user runs `augy home set alice/skills/extra`
- **THEN** the command fails with an error and no home configuration is saved

#### Scenario: Full URL rejected
- **WHEN** the user runs `augy home set https://github.com/alice/skills`
- **THEN** the command fails with an error and no home configuration is saved

### Requirement: Confirm saved configuration
After saving, `augy home set` SHALL print the repo, the manifest path, and the skills directory it saved. Source: US-6.

#### Scenario: Confirmation output
- **WHEN** the user runs `augy home set alice/skills --skills-path mine`
- **THEN** the output shows `alice/skills`, the manifest path `augy.json`, and the skills directory `mine`

### Requirement: Re-running set replaces the configuration
Re-running `augy home set` SHALL replace the whole home configuration with the new values, applying defaults for omitted options, without prompting. Source: US-7, PD: "Re-running `home set` replaces the whole configuration without warning."

#### Scenario: Switch to a different repo
- **WHEN** the home repo is `alice/skills` and the user runs `augy home set alice/dotfiles`
- **THEN** the home repo is `alice/dotfiles`

#### Scenario: Omitted options revert to defaults
- **WHEN** the configuration has `--skills-path mine` and the user re-runs `augy home set alice/skills` without `--skills-path`
- **THEN** the saved skills directory is `skills`

### Requirement: Show the home configuration
`augy home show` SHALL print the configured repo, manifest path, and skills directory. When no home repo is configured, it SHALL say so and tell the user to run `augy home set`. Source: US-8, US-9.

#### Scenario: Configuration shown
- **WHEN** a home repo is configured and the user runs `augy home show`
- **THEN** the output shows the repo, the manifest path, and the skills directory

#### Scenario: No configuration
- **WHEN** no home repo is configured and the user runs `augy home show`
- **THEN** the output says no home repo is set and points to `augy home set`

### Requirement: Home commands require a configured home repo
`augy home push` and `augy home pull` SHALL fail with guidance to run `augy home set` when no home repo is configured, without contacting any repository. Source: US-16.

#### Scenario: Push without configuration
- **WHEN** no home repo is configured and the user runs `augy home push`
- **THEN** the command exits with a failure and tells the user to run `augy home set` first

#### Scenario: Pull without configuration
- **WHEN** no home repo is configured and the user runs `augy home pull`
- **THEN** the command exits with a failure and tells the user to run `augy home set` first

### Requirement: Push writes a full-inventory manifest
`augy home push` SHALL rewrite the manifest at the configured manifest path from the local lockfile. The manifest SHALL have `version` 1 and a `skills` map with every installed skill: each external skill mapped to its upstream source, and each authored skill mapped to `""`. Source: US-10, US-12, PD: "Push is a full snapshot of the local machine."

#### Scenario: External and authored skills recorded
- **WHEN** the lockfile has external skill `tdd` with source `github:org/skills/tdd` and authored skill `my-skill`, and the user runs `augy home push`
- **THEN** the pushed manifest contains `"version": 1` and a `skills` map with `"tdd": "github:org/skills/tdd"` and `"my-skill": ""`

#### Scenario: Manifest reflects only this machine
- **WHEN** the home repo manifest lists a skill that is not installed on this machine and the user runs `augy home push`
- **THEN** the pushed manifest lists exactly the skills in this machine's lockfile

### Requirement: Push writes context tags to the manifest
`augy home push` SHALL write a `contexts` map (skill name to tag list) into the manifest for every tagged skill, and SHALL omit `contexts` when no skill is tagged. The machine context SHALL never be written to the home repo. Source: US-13, PD: "`contexts`: `name → [tags]` for every tagged skill"; "The machine's own context is never written to the home repo."

#### Scenario: Tags saved
- **WHEN** `tdd` is tagged `universal` and `my-skill` is tagged `personal`, and the user runs `augy home push`
- **THEN** the pushed manifest has `"contexts": { "tdd": ["universal"], "my-skill": ["personal"] }`

#### Scenario: No tags
- **WHEN** no installed skill has tags and the user runs `augy home push`
- **THEN** the pushed manifest has no `contexts` field

#### Scenario: Machine context stays local
- **WHEN** the machine context is `work` and the user runs `augy home push`
- **THEN** nothing pushed to the home repo contains the machine context

### Requirement: Push writes the manifest at nested paths
`augy home push` SHALL write the manifest at the configured manifest path even when that path is inside a folder that does not yet exist in the repo. Source: US-3; the PRD's Further Notes report the failure on nested paths as a defect against `--path config/augy.json`.

#### Scenario: Nested manifest path on first push
- **WHEN** the manifest path is `config/augy.json`, the repo has no `config` folder, and the user runs `augy home push`
- **THEN** the push succeeds and the repo contains `config/augy.json`

### Requirement: Push backs up authored skill files
`augy home push` SHALL copy the files of each authored skill into `<skills-path>/<name>/` in the home repo, taken from the first active agent location of that skill that exists on disk. External skills' files SHALL NOT be copied. An authored skill with no copy on disk SHALL still be listed in the manifest. Source: US-11, US-12, PD: "Authored skill files are copied into `<skills-path>/<name>/`."

#### Scenario: Authored files committed
- **WHEN** authored skill `my-skill` exists in an agent's skills folder and the user runs `augy home push`
- **THEN** the home repo contains `skills/my-skill/` with that skill's files

#### Scenario: External files not copied
- **WHEN** external skill `tdd` is installed and the user runs `augy home push`
- **THEN** the home repo has no `skills/tdd/` folder created by the push, and `tdd` appears in the manifest only by source

#### Scenario: Authored skill missing on disk
- **WHEN** authored skill `gone` is in the lockfile but none of its locations exist on disk, and the user runs `augy home push`
- **THEN** the manifest lists `"gone": ""` and no files are added for it, and the push still completes

#### Scenario: Authored skill reached through a symlink
- **WHEN** the first active location of an authored skill is a symlink to a skill folder and the user runs `augy home push`
- **THEN** the skill's files are copied into the home repo and the push completes

### Requirement: Authored skills keep an empty source
Push and pull SHALL never give an authored skill a home-repo URL as its source. Its source SHALL remain empty in the lockfile and in the manifest. Source: US-11, Skill Authoring PRD US-17, PD: "Authored skills never get a home-repo URL as their source."

#### Scenario: Source empty after push
- **WHEN** the user pushes authored skill `my-skill`
- **THEN** the lockfile still records `my-skill` with an empty source

### Requirement: Push reclassifies stale home-repo sources
On push, a skill whose recorded source points at the configured home repo SHALL be reclassified as authored: its source is cleared, its version is marked unversioned, and the lockfile is saved. It is then pushed as an authored skill. Source: US-17, PD: "Stale home-repo source handling."

#### Scenario: Pre-v0.6.0 skill reclassified
- **WHEN** the home repo is `alice/skills`, skill `old` has source `github:alice/skills/skills/old`, and the user runs `augy home push`
- **THEN** the lockfile records `old` with an empty source and an unversioned version, and the manifest maps `"old": ""`

### Requirement: Descriptive push commit
`augy home push` SHALL commit with the message `chore: update skills via augy — <N> skill(s)`, appending ` (<M> authored)` when there are authored skills, and then push to the home repo. Source: US-14, PD: "Commit message contract."

#### Scenario: Message with authored count
- **WHEN** the user pushes 5 skills of which 2 are authored
- **THEN** the home repo gets a commit with message `chore: update skills via augy — 5 skill(s) (2 authored)`

#### Scenario: Message without authored skills
- **WHEN** the user pushes 3 skills and none are authored
- **THEN** the commit message is `chore: update skills via augy — 3 skill(s)`

### Requirement: Push with nothing to change succeeds
When a push produces no changes to commit, `augy home push` SHALL report "Nothing changed — home repo is already up to date" and exit successfully. Source: PD: "No-change push"; the PRD's Further Notes report the current failure as a bug.

#### Scenario: Second identical push
- **WHEN** the user runs `augy home push` twice with no local changes in between
- **THEN** the second run reports "Nothing changed — home repo is already up to date" and exits with success

### Requirement: Failed push is reported
When cloning, committing, or pushing fails for any reason other than having nothing to commit, `augy home push` SHALL stop with "Push failed", show git's error, and exit with a failure. Source: US-18, PD: "Any other git failure stops with 'Push failed' and surfaces the error."

#### Scenario: Rejected push
- **WHEN** the user lacks write access to the home repo and runs `augy home push`
- **THEN** the output contains "Push failed" and git's error text, and the command exits with a failure

### Requirement: Home repo reached with the user's git credentials
augy SHALL reach the home repo at `https://github.com/<owner>/<repo>.git` using the user's existing git configuration and credentials. augy SHALL NOT ask for, store, or require its own token or account, and SHALL NOT create the repo. Source: US-15, PD: "Authentication: relies entirely on the user's git configuration."

#### Scenario: Credential helper used
- **WHEN** the user's git has a GitHub credential helper configured and the user runs `augy home push`
- **THEN** the push authenticates through git without augy prompting for or saving any credential

#### Scenario: Missing repo not created
- **WHEN** the configured home repo does not exist on GitHub and the user runs `augy home push`
- **THEN** the command fails and no repository is created

### Requirement: Pull offers authored and external skills in one picker
`augy home pull` SHALL fetch the home repo and offer, in one picker, every directory in the skills directory as an authored skill and every manifest entry with a non-empty source as an external skill. When an authored directory and an external entry share a name, only the authored skill SHALL be offered. Source: US-19, PD: "Pull discovery rule."

#### Scenario: Combined picker
- **WHEN** the home repo has `skills/my-skill/` and a manifest entry `"tdd": "github:org/skills/tdd"`, and the user runs `augy home pull`
- **THEN** the picker lists both `my-skill` (authored) and `tdd` (external)

#### Scenario: Authored copy wins
- **WHEN** the home repo has `skills/foo/` and a manifest entry `"foo": "github:org/skills/foo"`
- **THEN** the picker lists `foo` once, as authored

#### Scenario: Empty-source entry without files
- **WHEN** the manifest maps `"bar": ""` and there is no `skills/bar/` directory
- **THEN** `bar` is not offered

### Requirement: Pull picker is filterable and informative
The pull picker SHALL let the user filter entries by typing. Each entry SHALL show its context tags and either that it is authored or which upstream source it comes from. The picker header SHALL show which context is in effect. Source: US-20, US-21, US-24.

#### Scenario: Type to filter
- **WHEN** the picker lists `tdd`, `commit-msg`, and `my-skill` and the user types `tdd`
- **THEN** the list narrows to entries matching `tdd`

#### Scenario: Entry hints
- **WHEN** `tdd` is external from `github:org/skills/tdd` tagged `universal`, and `my-skill` is authored tagged `personal`
- **THEN** the `tdd` entry shows `universal` and its source, and the `my-skill` entry shows `personal` and that it is authored

#### Scenario: Context in header
- **WHEN** the context in effect is `work`
- **THEN** the picker header shows `work`

### Requirement: Pull pre-selects by context
Pull SHALL pre-select skills using the context in effect: `--context` first, then the machine context, then none. With no context, all skills are pre-selected. With a context, a skill is pre-selected if untagged, tagged `universal`, or tagged with that context. Tags come from the home repo manifest, falling back to the local lockfile. Source: US-22, US-23, PD: "Pull pre-selection rule."

#### Scenario: No context
- **WHEN** no machine context is set, no `--context` is given, and the user runs `augy home pull`
- **THEN** every offered skill is pre-selected

#### Scenario: Machine context filters defaults
- **WHEN** the machine context is `personal`, and the manifest tags `a` as `work`, `b` as `personal`, `c` as `universal`, and leaves `d` untagged
- **THEN** `b`, `c`, and `d` are pre-selected and `a` is not

#### Scenario: Flag overrides machine context
- **WHEN** the machine context is `personal` and the user runs `augy home pull --context work`
- **THEN** pre-selection uses `work`, and the machine context setting is unchanged afterwards

#### Scenario: Manifest tags before local tags
- **WHEN** the manifest tags `a` as `work`, the local lockfile tags `a` as `personal`, and the context is `personal`
- **THEN** `a` is not pre-selected

#### Scenario: Pre-selection is only a default
- **WHEN** a skill is not pre-selected
- **THEN** the user can still select it, and can deselect any pre-selected skill

### Requirement: Pull chooses target agents
Without `--agent`, pull SHALL ask which agents to install to, listing only agents detected on this machine, all pre-selected. With `--agent <ids...>`, it SHALL skip that question, use the listed IDs, and ignore unknown IDs. If no agents result, pull SHALL fail with an error. Source: US-25, US-26, PD: "Pull agent rule."

#### Scenario: Agent picker lists detected agents
- **WHEN** Claude Code and Codex are detected and the user runs `augy home pull`
- **THEN** the agent picker lists those two agents, both pre-selected, and no undetected agents

#### Scenario: Flag skips the agent picker
- **WHEN** the user runs `augy home pull --agent claude`
- **THEN** no agent picker is shown and skills are installed only to Claude Code

#### Scenario: Unknown agent ID ignored
- **WHEN** the user runs `augy home pull --agent claude not-an-agent`
- **THEN** skills are installed to Claude Code and `not-an-agent` is ignored

#### Scenario: No agents
- **WHEN** the user runs `augy home pull --agent not-an-agent`, or deselects every agent
- **THEN** pull fails with an error and installs nothing

### Requirement: Pull restores authored skills from the home repo
Each selected authored skill SHALL be copied from the home repo's skills directory into each chosen agent's skills folder, and recorded in the lockfile as authored (empty source) with its tags from the manifest. It SHALL be installed only to the chosen agents. Source: US-28, PD: "Authored skills are copied from the cloned repo into each chosen agent's skill folder."

#### Scenario: Authored skill restored with tags
- **WHEN** the user selects authored `my-skill`, tagged `personal` in the manifest, and chooses Claude Code
- **THEN** Claude Code's skills folder contains `my-skill` with the repo's files, and the lockfile records `my-skill` with an empty source and tags `personal`

#### Scenario: Only chosen agents
- **WHEN** Claude Code and Codex are detected and the user chooses only Claude Code
- **THEN** the authored skill is installed to Claude Code and not to Codex

### Requirement: Pull installs external skills through sync
Selected external skills SHALL be installed through the same path as `augy sync`, given only the selected entries. That path SHALL resolve them, report each as install, upgrade, or up to date, and ask for confirmation before applying. When no external skill is selected, sync SHALL not run. Source: US-29, PD: "External skills are handed, as a filtered manifest, to the same engine as `augy sync`."

#### Scenario: Only selected externals synced
- **WHEN** the manifest lists external `tdd` and `lint`, and the user selects only `tdd`
- **THEN** the sync plan covers `tdd` only and asks for confirmation before applying

#### Scenario: No externals selected
- **WHEN** the user selects only authored skills
- **THEN** no sync plan or sync confirmation is shown

### Requirement: Pull excludes stale home-repo sources
External manifest entries whose source points at the configured home repo SHALL NOT be installed by pull. Source: US-17, PD: "On pull, external entries whose source contains the home repo string are excluded from installation."

#### Scenario: Stale entry not installed
- **WHEN** the home repo is `alice/skills`, the manifest maps `"old": "github:alice/skills/skills/old"` with no `skills/old/` directory, and the user selects `old`
- **THEN** `old` is not installed from GitHub

### Requirement: Pull dry run
`augy home pull --dry-run` SHALL run both pickers, then list the selected skills with their source or the word "authored", and change nothing on disk or in the lockfile. Source: US-27, PD: "Dry run."

#### Scenario: Preview only
- **WHEN** the user runs `augy home pull --dry-run` and selects `tdd` and `my-skill`
- **THEN** the output lists `tdd` with its source and `my-skill` as authored, and no agent folder or lockfile entry changes

### Requirement: Cancelling pull makes no changes
Cancelling the skill picker or the agent picker SHALL exit cleanly without installing anything or changing the lockfile. Source: US-30.

#### Scenario: Cancel skill picker
- **WHEN** the user cancels the skill picker
- **THEN** pull exits without an error and nothing is installed or recorded

#### Scenario: Cancel agent picker
- **WHEN** the user cancels the agent picker
- **THEN** pull exits without an error and nothing is installed or recorded

### Requirement: Empty home repo reported
When the home repo has no authored skill directories and no installable manifest entries, `augy home pull` SHALL tell the user no skills were found and install nothing. Source: US-31.

#### Scenario: Empty repo
- **WHEN** the configured home repo has no manifest and no skills directory, and the user runs `augy home pull`
- **THEN** the output says no skills were found and no picker is shown
