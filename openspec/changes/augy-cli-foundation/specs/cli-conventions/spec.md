# Spec Delta

## Purpose

Product-wide rules that every augy command follows: where skills come from, what a skill and a version are, where augy keeps its state, how commands behave interactively and in automation, and what augy will never remove on its own. Per-feature behavior lives in the sibling changes named in each requirement.

## ADDED Requirements

### Requirement: GitHub is the only skill registry
augy SHALL obtain skills only from GitHub repositories, public or private, and SHALL NOT require an augy account, a registry API key, or any hosted augy service. Access to GitHub and the user's own machine SHALL be sufficient to use every command. Sources: US-1, US-10, US-11, PD: "Decentralized by design. No central index, account, or hosted service." Install and GitHub access details: changes `skill-installation` and `multi-agent-support`.

#### Scenario: Install with only GitHub access
- **WHEN** a user whose only credentials are their own GitHub access installs a skill from a GitHub repo
- **THEN** the install completes without any augy sign-up, account, registry key, or call to a non-GitHub augy service

#### Scenario: Private repo treated like a public one
- **WHEN** a user with GitHub access to a private repo installs a skill from it
- **THEN** the skill is installed and tracked the same way as a skill from a public repo

### Requirement: The user decides which sources are trusted
augy SHALL install skills only from a GitHub location the user named or from a tap the user registered. No third party SHALL decide which sources a user's installs can resolve to. Sources: US-12, US-13, PD: "the user chooses which ones to trust." Tap behavior: change `taps-and-discovery`.

#### Scenario: Bare name resolves only through the user's taps
- **WHEN** the user installs a skill by bare name
- **THEN** augy resolves it only against repos the user has registered as taps

#### Scenario: No registered source matches
- **WHEN** the user installs a bare name that none of their taps contain
- **THEN** augy installs nothing and fails rather than fetching the skill from a source the user didn't choose

### Requirement: A skill is a directory containing SKILL.md
augy SHALL treat any directory that contains a `SKILL.md` file as a skill and SHALL NOT require any other packaging format or metadata. Any GitHub repo whose directories contain `SKILL.md` SHALL be a valid source. Source: PD: "A skill is a directory with a `SKILL.md`." Discovery details: change `skill-installation`.

#### Scenario: Plain folder with SKILL.md
- **WHEN** a GitHub repo contains a folder holding only a `SKILL.md` file and no manifest or package metadata
- **THEN** augy can install that folder as a skill

### Requirement: A version is an upstream commit SHA
augy SHALL identify each installed skill's version by an upstream commit SHA and SHALL express drift, diffs, and rollbacks in those SHAs. Sources: US-2, PD: "A version is a commit SHA." Lifecycle details: change `skill-versioning`.

#### Scenario: Lockfile records the commit
- **WHEN** a skill is installed
- **THEN** the lockfile records the source the skill came from and the upstream commit SHA of the installed version

#### Scenario: Version shown as a SHA
- **WHEN** augy shows the user an installed skill's version
- **THEN** the version is shown as that commit SHA (or its short form)

### Requirement: The lockfile is a user-owned plain JSON file
augy SHALL keep its lockfile at `~/.augy/registry.json` as plain, human-readable JSON that the user can read, diff, commit, and share with ordinary tools. Sources: US-2, US-3, PD: "The lockfile is user-owned."

#### Scenario: Lockfile readable without augy
- **WHEN** the user opens `~/.augy/registry.json` after installing a skill
- **THEN** it parses as standard JSON and shows the skill's source and version without any augy tool

### Requirement: AUGY_HOME relocates augy's home directory
When `AUGY_HOME` is set, augy SHALL use that directory in place of `~/.augy` for all of its state. Source: PD: "`AUGY_HOME` relocates augy's whole home directory." Store and environment details: change `multi-agent-support`.

#### Scenario: Lockfile under AUGY_HOME
- **WHEN** the user sets `AUGY_HOME` to a directory and installs a skill
- **THEN** the lockfile is written under that directory and `~/.augy/registry.json` is not created or changed

### Requirement: Previous versions are archived locally before an upgrade
Before an upgrade overwrites a skill, augy SHALL archive the previous version on the user's machine under `~/.augy/versions/<skill>/<sha>/`, so that rolling back needs no hosted service. Sources: US-8, PD: "Local version history." Details: change `skill-versioning`.

#### Scenario: Upgrade keeps the old version
- **WHEN** an update replaces a skill at SHA `A` with a newer version
- **THEN** the content of version `A` remains available under `~/.augy/versions/<skill>/A/`

#### Scenario: Rollback uses the local archive
- **WHEN** the user rolls a skill back to a version archived on this machine
- **THEN** augy restores it from the local archive without depending on any hosted service

### Requirement: Package-manager lifecycle verbs
augy SHALL provide commands to install, update, diff, roll back, pin, and uninstall skills, operating on the versions recorded in the lockfile. Sources: US-1, US-6, US-7, US-8, US-9, PD (Solution): "install, update, diff, roll back, pin, uninstall." Details: changes `skill-installation` and `skill-versioning`.

#### Scenario: Update all skills
- **WHEN** upstream has changed for several installed skills and the user runs the update command
- **THEN** augy brings those skills to their new upstream versions

#### Scenario: Review before upgrading
- **WHEN** the user runs the diff command for a skill with upstream changes
- **THEN** augy shows what changed upstream without installing it

#### Scenario: Pinned skill stays fixed
- **WHEN** a skill is pinned and upstream changes
- **THEN** updating does not move that skill off its pinned version

### Requirement: One copy deployed to many agents
augy SHALL store each skill once and deploy that single copy to every agent the user chose, so that all chosen agents see the same content and an update reaches all of them at once. Sources: US-4, PD: "One copy, many agents." Details: change `multi-agent-support`.

#### Scenario: Same content in every agent
- **WHEN** a skill is installed to three agents
- **THEN** all three agents' skill folders show the same content, backed by one stored copy

### Requirement: Detected agents are the default targets
augy SHALL detect which supported agents are installed on the machine and offer those as the default targets, so the user isn't asked to choose among agents they don't use. Sources: US-5. Details: change `multi-agent-support`.

#### Scenario: Only installed agents pre-selected
- **WHEN** the user installs a skill interactively on a machine with two supported agents installed
- **THEN** those two agents are the pre-selected targets and the others are not

### Requirement: Interactive by default
When a command faces an ambiguous choice and is running interactively, augy SHALL prompt the user with a picker rather than guess. Source: PD: "Commands prompt with pickers when choices are ambiguous."

#### Scenario: Ambiguous choice prompts
- **WHEN** an interactive command finds more than one candidate for a choice the user hasn't made
- **THEN** augy shows a picker and waits for the user's selection

### Requirement: Scriptable non-interactive modes
augy SHALL offer non-interactive flags (`--yes`, `--all`, `--dry-run`) on the commands that automation needs, at least install, update, and sync. In non-interactive mode a command SHALL NOT wait for input; where it would need a choice it cannot make, it SHALL fail with a non-zero exit. Sources: US-17, PD: "Interactive by default, scriptable on demand." Per-command flags: sibling changes.

#### Scenario: CI install without prompts
- **WHEN** a CI job runs install with `--yes` and a source
- **THEN** the command completes without prompting

#### Scenario: Missing choice fails instead of hanging
- **WHEN** a non-interactive run reaches a choice it cannot resolve on its own
- **THEN** augy exits non-zero without waiting for input

### Requirement: Never remove skills the user didn't remove
augy SHALL NOT uninstall a skill as a side effect of syncing from a manifest or switching skillsets, and deleting a skillset SHALL NOT delete any skill files. Sources: US-22, PD: "Conservative about removal." Details: changes `team-manifests` and `skillsets`.

#### Scenario: Sync leaves extra skills installed
- **WHEN** the user syncs from a manifest that omits a skill they have installed
- **THEN** that skill remains installed and tracked

#### Scenario: Switching skillsets does not uninstall
- **WHEN** the user switches to a skillset that excludes an installed skill
- **THEN** the skill remains tracked in the lockfile and its stored files remain on disk

#### Scenario: Deleting a skillset keeps skill files
- **WHEN** the user deletes a skillset
- **THEN** no skill files are deleted

### Requirement: Feature areas are reachable from the augy command
The `augy` command SHALL expose the product's feature areas as subcommands. Each area's behavior is specified in its sibling change. Sources: US-13, US-14, US-15, US-16, US-18, US-19, US-20, US-21, PD (Feature map).

#### Scenario: Taps and short names
- **WHEN** the user wants to register a trusted repo and install from it by short name
- **THEN** augy provides tap commands and bare-name install (change `taps-and-discovery`)

#### Scenario: Adopt hand-installed skills
- **WHEN** the user has skills installed by hand in agent folders
- **THEN** augy provides a command that finds them and brings them under management without reinstalling (change `adopting-existing-skills`)

#### Scenario: Team manifest
- **WHEN** a team lead publishes a manifest of the team's skills and a teammate syncs from it
- **THEN** the teammate's machine ends up with the manifest's skills (change `team-manifests`)

#### Scenario: Home repo backup and restore
- **WHEN** the user backs up their setup to their own GitHub repo and later restores it on a new machine
- **THEN** augy provides home commands for both steps (change `home-repo`)

#### Scenario: Machine contexts and tags
- **WHEN** the user tags skills by context and marks a machine's context
- **THEN** augy provides context and tag commands so that each machine gets only the skills that belong on it (change `machine-contexts-and-tags`)

#### Scenario: Skillsets
- **WHEN** the user wants their agents to load only the skills for one kind of work
- **THEN** augy provides named skillsets the user can activate (change `skillsets`)

#### Scenario: Authoring
- **WHEN** the user wants to write their own skill
- **THEN** augy provides author commands to scaffold and edit it as a managed, backed-up skill (change `skill-authoring`)

### Requirement: Distribution
augy SHALL be published to npm as `@callmeradical/augy`, SHALL install a command named `augy`, SHALL run on Node.js 18 or later, and SHALL be licensed MIT. Source: PD: "Distribution."

#### Scenario: Installed from npm
- **WHEN** a user installs `@callmeradical/augy` from npm on Node.js 18 or later
- **THEN** an `augy` command is available on their PATH

#### Scenario: License
- **WHEN** a user inspects the published package's license
- **THEN** it is MIT
