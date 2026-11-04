# Spec Delta

## Purpose

Lets users create and edit their own skills with augy, keeps those self-authored (source-less) skills first-class across update, home push and pull, and tagging, and ships a bundled `author` skill that teaches an AI agent the authoring workflow.

## ADDED Requirements

### Requirement: Scaffold a new skill
`augy author new <name>` SHALL create `<agent skills folder>/<name>/SKILL.md` for each chosen agent, from the starter template. Source: US-1, PD: "For each chosen agent, it creates `<agent skills folder>/<name>/SKILL.md` from the starter template."

#### Scenario: Skill created in the chosen agent
- **WHEN** Claude Code is the chosen agent and the user runs `augy author new my-skill --no-edit`
- **THEN** Claude Code's skills folder contains `my-skill/SKILL.md`

#### Scenario: Several agents
- **WHEN** the user chooses Claude Code and Codex for `augy author new my-skill --no-edit`
- **THEN** both agents' skills folders contain `my-skill/SKILL.md`

### Requirement: Starter template
The scaffolded `SKILL.md` SHALL be a Markdown file titled `# Skill: <name>` with `Overview`, `Workflow` (holding one empty numbered step), and `Notes` sections, each holding a placeholder comment. Source: US-2, PD: "Starter template contract."

#### Scenario: Template structure
- **WHEN** the user runs `augy author new my-skill --no-edit`
- **THEN** the new `SKILL.md` starts with `# Skill: my-skill` and has `Overview`, `Workflow`, and `Notes` sections, each with a placeholder comment, and `Workflow` contains one empty numbered step

### Requirement: Choose target agents
`augy author new` SHALL let the user choose among the agents detected on this machine, with all of them pre-selected. When exactly one agent is detected, it SHALL use that agent without asking. Source: US-3, US-4, PD: "With exactly one detected agent, no prompt appears."

#### Scenario: Several detected agents
- **WHEN** Claude Code, Codex, and opencode are detected and the user runs `augy author new my-skill`
- **THEN** augy asks which agents to use, with all three pre-selected, and offers no undetected agent

#### Scenario: One detected agent
- **WHEN** only Claude Code is detected and the user runs `augy author new my-skill --no-edit`
- **THEN** no agent question is asked and the skill is created for Claude Code

### Requirement: No agents detected
When no agents are detected on the machine, `augy author new` SHALL fail with a clear error telling the user to install an agent, and SHALL create and register nothing. Source: US-9.

#### Scenario: No agents
- **WHEN** no agent is detected and the user runs `augy author new my-skill`
- **THEN** the command fails with an error about no detected agents, and no folder or lockfile entry is created

### Requirement: Independent copy per agent
Each chosen agent SHALL get its own independent copy of the new skill folder. Authored skills SHALL NOT be placed in augy's shared store (`~/.augy/store/`). Source: PD: "Each agent gets an independent copy. Authored skills don't use augy's shared store."

#### Scenario: Not store-backed
- **WHEN** the user runs `augy author new my-skill --no-edit` for Claude Code and Codex
- **THEN** each agent's `my-skill` folder is its own directory, not a link to a shared copy, and nothing for `my-skill` is created under `~/.augy/store/`

### Requirement: Register as authored
`augy author new` SHALL register the skill in augy's lockfile right away, with an empty source, version label `unversioned`, and the chosen agents' locations, so that it appears in `augy list` and works with other augy commands. Source: US-10, PD: "Definition of authored."

#### Scenario: Lockfile entry
- **WHEN** the user runs `augy author new my-skill --no-edit` for Claude Code
- **THEN** the lockfile has `my-skill` with an empty source, version `unversioned`, and a Claude Code location

#### Scenario: Listed
- **WHEN** the user has run `augy author new my-skill --no-edit`
- **THEN** `augy list` includes `my-skill`

### Requirement: Open the new skill in the editor
After scaffolding, `augy author new` SHALL open the skill's folder in the user's editor, resolved as `$EDITOR`, then `$VISUAL`, then `vi`. Source: US-5, PD: "Editor rule."

#### Scenario: EDITOR used
- **WHEN** `$EDITOR` is `code` and the user runs `augy author new my-skill`
- **THEN** `code` is launched on the new `my-skill` folder

#### Scenario: VISUAL fallback
- **WHEN** `$EDITOR` is unset, `$VISUAL` is `nano`, and the user runs `augy author new my-skill`
- **THEN** `nano` is launched on the new `my-skill` folder

#### Scenario: vi fallback
- **WHEN** neither `$EDITOR` nor `$VISUAL` is set and the user runs `augy author new my-skill`
- **THEN** `vi` is launched on the new `my-skill` folder

### Requirement: Skip the editor
`augy author new <name> --no-edit` SHALL scaffold and register the skill without launching any editor. Source: US-6.

#### Scenario: No editor launched
- **WHEN** `$EDITOR` is set and the user runs `augy author new my-skill --no-edit`
- **THEN** the skill is created and registered and no editor is launched

### Requirement: Report location and backup step
`augy author new` SHALL print where the skill was created and remind the user to run `augy home push` to back it up. Source: US-7.

#### Scenario: Creation message
- **WHEN** the user runs `augy author new my-skill --no-edit`
- **THEN** the output shows the path of the created skill and mentions `augy home push`

### Requirement: Refuse a tracked name
`augy author new <name>` SHALL refuse a name already registered in augy's lockfile, point the user to `augy author edit`, and write nothing. Source: US-8, PD: "Name uniqueness is checked only against augy's lockfile."

#### Scenario: Duplicate name
- **WHEN** `my-skill` is in the lockfile and the user runs `augy author new my-skill`
- **THEN** the command fails, mentions `augy author edit`, and the existing skill's files and lockfile entry are unchanged

### Requirement: Edit an installed skill
`augy author edit <name>` SHALL open the first active location recorded for the skill in the user's editor (resolved as for `author new`). It SHALL work for any installed skill, authored or not. Source: US-11, PD: "`author edit` opens the first active location recorded for the skill."

#### Scenario: Reopen an authored skill
- **WHEN** `my-skill` is installed for Claude Code and Codex, with Claude Code recorded first, and the user runs `augy author edit my-skill`
- **THEN** the editor is launched on Claude Code's `my-skill` folder

#### Scenario: External skill
- **WHEN** external skill `tdd` is installed and the user runs `augy author edit tdd`
- **THEN** the editor is launched on `tdd`'s first active location

### Requirement: Edit errors
`augy author edit <name>` SHALL fail with a clear error pointing to `augy list` when the skill isn't in the lockfile, and SHALL fail with a clear error when the skill has no active location on disk. It SHALL launch no editor in either case. Source: US-12, US-13.

#### Scenario: Unknown skill
- **WHEN** no skill `my-skil` is in the lockfile and the user runs `augy author edit my-skil`
- **THEN** the command fails, says the skill isn't found, mentions `augy list`, and no editor is launched

#### Scenario: No active location
- **WHEN** `my-skill` is in the lockfile but has no active location, and the user runs `augy author edit my-skill`
- **THEN** the command fails, says the skill has no active location, and no editor is launched

### Requirement: Update skips authored skills
`augy update` SHALL never check or upgrade authored skills (empty source), or skills whose source points at the user's configured home repo. It SHALL print a note naming the skipped skills and pointing to `augy home push`. Source: US-14, PD: "Update exclusion."

#### Scenario: Authored skill skipped
- **WHEN** authored skill `my-skill` and external skill `tdd` are installed and the user runs `augy update`
- **THEN** `my-skill` is not checked against any upstream and its files are unchanged, and the output names `my-skill` as skipped and mentions `augy home push`

#### Scenario: Home-repo-sourced skill skipped
- **WHEN** the home repo is `alice/skills` and skill `old` has a source pointing at `alice/skills`
- **THEN** `augy update` skips `old` and names it in the same note

### Requirement: Authored skills back up through the home repo
`augy home push` SHALL commit the files of authored skills to the home repo and list them in the manifest with an empty source. `augy home pull` SHALL restore them onto another machine from those files. Source: US-15, US-16, PD: "Backup path."

#### Scenario: Push then pull on a new machine
- **WHEN** the user creates `my-skill` with `augy author new`, runs `augy home push`, then runs `augy home pull` on another machine and selects `my-skill`
- **THEN** the second machine's chosen agent has `my-skill` with the same files, recorded as authored

### Requirement: Authored skills keep an empty source
Authored skills SHALL keep an empty source in the lockfile and in the home repo manifest through push and pull, and SHALL never be given a home-repo URL as their source. Source: US-17, PD: "The manifest lists authored skills with an empty source so the inventory is complete."

#### Scenario: Source after push
- **WHEN** the user pushes authored `my-skill`
- **THEN** the lockfile and the manifest both record `my-skill` with an empty source

### Requirement: Authored skills can be tagged
Authored skills SHALL accept context tags through `augy tag set` like any other installed skill. Source: US-18.

#### Scenario: Tag an authored skill
- **WHEN** the user runs `augy author new my-skill --no-edit` and then `augy tag set my-skill personal`
- **THEN** `augy tag show my-skill` reports `personal`

### Requirement: Bundled author skill is installable
The augy package and repository SHALL ship a skill named `author` in their `skills/` directory. Users SHALL be able to install it into an agent by registering the augy repository as a tap (`augy tap add callmeradical/augy --path skills`) and installing `author` like any other skill. No augy command SHALL install it automatically. Source: US-19, PD: "Bundled meta-skill."

#### Scenario: Install via tap
- **WHEN** the user runs `augy tap add callmeradical/augy --path skills` and then installs `author` to Claude Code
- **THEN** Claude Code's skills folder contains the `author` skill

#### Scenario: Not auto-installed
- **WHEN** a user runs augy for the first time
- **THEN** the `author` skill is not installed into any agent

### Requirement: Bundled skill teaches the authoring workflow
The bundled `author` skill SHALL explain what an augy skill is, give example agent skill folders, and describe the four-step workflow: scaffold with `augy author new`, write, test with trigger phrases, and back up with `augy home push`. Source: US-20, PD: "Content: what a skill is; example agent skill folders; the four-step workflow."

#### Scenario: Workflow content
- **WHEN** a user reads the bundled `author` skill's `SKILL.md`
- **THEN** it explains what a skill is, lists example agent skill folders, and describes scaffolding with `augy author new`, writing, testing with trigger phrases, and backing up with `augy home push`

### Requirement: Bundled skill describes a good SKILL.md
The bundled `author` skill SHALL describe what a good `SKILL.md` contains (a one-line description, trigger phrases, numbered workflow steps, examples, and references), and SHALL give writing tips: verb-first steps, concrete commands, fail states, one capability per skill, and splitting beyond about 150 lines. Source: US-21, US-22.

#### Scenario: Guidance and tips
- **WHEN** a user reads the bundled `author` skill's `SKILL.md`
- **THEN** it names description, trigger phrases, numbered workflow steps, examples, and references as parts of a good skill, and gives the five writing tips

### Requirement: Bundled skill includes a template
The bundled `author` skill SHALL include a copyable `SKILL.md` template. Source: US-23, PD: "a template."

#### Scenario: Template present
- **WHEN** a user reads the bundled `author` skill's `SKILL.md`
- **THEN** it contains a `SKILL.md` template that can be copied as the start of a new skill
