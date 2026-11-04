# Spec Delta

## Purpose

Lets a user, or an automated job, install one or more agent skills from any common way of pointing at them on GitHub into the agents they choose, and records each installed skill in the lockfile so it can be updated, diffed, and rolled back later.

## ADDED Requirements

### Requirement: Classify the install source
augy SHALL treat an install source that contains no `/` and doesn't start with `http` as a bare skill name to resolve through taps, and SHALL treat any other source as a GitHub reference. Source: PD: "If the input has no `/` and doesn't start with `http`, it's a bare skill name."

#### Scenario: Bare name
- **WHEN** the user runs `augy install tdd`
- **THEN** augy resolves `tdd` through the user's registered taps and does not treat it as a repo

#### Scenario: Shorthand is a GitHub reference
- **WHEN** the user runs `augy install owner/repo`
- **THEN** augy treats it as the GitHub repo `owner/repo`

#### Scenario: URL is a GitHub reference
- **WHEN** the user runs `augy install https://github.com/owner/repo`
- **THEN** augy treats it as the GitHub repo `owner/repo`

### Requirement: Install from a repo URL
augy SHALL accept `https://github.com/owner/repo` as a source. It SHALL also accept `http://`, treating it as `https`, and SHALL ignore a trailing slash. Sources: US-1, PD: "`http://` is accepted and upgraded to `https`, and a trailing slash is ignored."

#### Scenario: HTTPS repo URL
- **WHEN** the user installs from `https://github.com/owner/repo`
- **THEN** augy finds the skills in `owner/repo`

#### Scenario: HTTP and trailing slash
- **WHEN** the user installs from `http://github.com/owner/repo/`
- **THEN** augy resolves the same repo as `https://github.com/owner/repo` and installs from it

### Requirement: Install from a tree URL at a specific ref
augy SHALL accept `https://github.com/owner/repo/tree/<ref>/<path>` and install from that directory at that ref, where the ref is a branch, a tag, or a full 40-character commit SHA. Sources: US-2, US-24, PD: "installs from a directory at a specific branch, tag, or full 40-character commit SHA." Branch names containing `/` are covered because the PRD's Further Notes report splitting them as a defect.

#### Scenario: Folder at a branch
- **WHEN** the user installs from `https://github.com/owner/repo/tree/dev/skills/tdd`
- **THEN** augy installs the skill at `skills/tdd` as it exists on branch `dev`

#### Scenario: Pinned to a tag or full commit SHA
- **WHEN** a team lead installs from a `tree/<ref>/<path>` URL whose ref is a tag or a full 40-character commit SHA
- **THEN** augy installs the content at that tag or commit, not the default branch

#### Scenario: Branch name containing a slash
- **WHEN** the user installs from a `tree/` URL whose branch is `feature/x`
- **THEN** augy installs from branch `feature/x` at the intended path, not from a branch named `feature`

### Requirement: Install from a blob URL to SKILL.md
augy SHALL accept `https://github.com/owner/repo/blob/<ref>/<path>/SKILL.md` and install the directory that contains the file. When the last path segment contains a `.`, augy SHALL treat it as a file and use its parent directory. Sources: US-3, PD: "If the last segment contains a `.`, augy treats it as a file and uses the parent directory."

#### Scenario: Link to a SKILL.md file
- **WHEN** the user installs from `https://github.com/owner/repo/blob/main/skills/tdd/SKILL.md`
- **THEN** augy installs the skill folder `skills/tdd` at ref `main`

### Requirement: Install from owner/repo shorthand
augy SHALL accept `owner/repo` and `owner/repo/<path>` shorthand and install from the repo's default branch, whatever that branch is named. Sources: US-4, US-5, PD: "Shorthand has no way to specify a ref, so it uses the repo's default branch." Non-`main` defaults are covered because the PRD's Further Notes report them failing as a defect.

#### Scenario: Whole-repo shorthand
- **WHEN** the user runs `augy install owner/repo`
- **THEN** augy finds the skills in that repo on its default branch

#### Scenario: Path shorthand
- **WHEN** the user runs `augy install owner/repo/path/to/skill`
- **THEN** augy targets only the skill at `path/to/skill` on the default branch

#### Scenario: Default branch is not main
- **WHEN** the user installs from shorthand or a plain repo URL for a repo whose default branch is `master`
- **THEN** augy discovers and installs the skill content from `master`

### Requirement: Resolve a bare name through taps
augy SHALL match a bare name exactly and case-insensitively against the skill names in every registered tap. With exactly one match it SHALL install that skill. With more than one, an interactive install SHALL ask the user to pick a tap and show each candidate's version. Sources: US-6, US-7, PD: "the name is matched exactly, case-insensitively."

#### Scenario: Single match
- **WHEN** the user runs `augy install TDD` and exactly one tap has a skill named `tdd`
- **THEN** augy installs that skill from that tap

#### Scenario: Name in more than one tap
- **WHEN** an interactive install's bare name matches skills in two taps
- **THEN** augy asks the user which tap to use, showing each candidate's version, and installs only the chosen one

#### Scenario: Partial name does not match
- **WHEN** the user installs `td` and the taps contain only `tdd`
- **THEN** augy does not treat `tdd` as a match

### Requirement: Bare name not found
When no tap contains the bare name, install SHALL fail and SHALL suggest installing by full path (`augy install owner/repo/path`) or registering a tap (`augy tap add owner/repo`). Source: PD: "No match: install fails and suggests `augy install owner/repo/path` or `augy tap add owner/repo`."

#### Scenario: No tap has the skill
- **WHEN** the user installs a bare name that no registered tap contains
- **THEN** install fails, installs nothing, and suggests both the full-path install and `augy tap add`

### Requirement: Tap access errors are not reported as misses
When augy cannot query a tap because GitHub access fails (for example, the GitHub CLI is missing or not signed in), install SHALL report the access problem and SHALL NOT report it only as the name not being found. Sources: US-6, US-25; the PRD's Further Notes report swallowed tap errors that look like misses as a defect.

#### Scenario: GitHub CLI not signed in
- **WHEN** the user installs a bare name while the GitHub CLI is not authenticated
- **THEN** augy reports that it couldn't access the taps, not just that the skill wasn't found in any tap

### Requirement: Recognize SKILL.md in any case
augy SHALL treat a directory as a skill when it contains a file named `SKILL.md` in any letter case. Sources: US-9, PD: "A skill is a directory that contains a `SKILL.md` file, matched case-insensitively."

#### Scenario: Lowercase and mixed-case file names
- **WHEN** a repo has folders containing `skill.md` and `Skill.md`
- **THEN** augy finds both folders as skills

### Requirement: Discover skills at the target location
If the target path itself contains `SKILL.md`, augy SHALL treat it as one skill named after the last path segment, or after the repo when the target is the repo root. Otherwise augy SHALL find every directory under the target that contains `SKILL.md`, at any depth, name each after its own directory, and list them alphabetically. Sources: US-8, PD: "What counts as a skill and what it is called."

#### Scenario: Target is a skill
- **WHEN** the target path `skills/tdd` contains `SKILL.md`
- **THEN** augy finds exactly one skill, named `tdd`

#### Scenario: Repo root is a skill
- **WHEN** the root of `owner/my-skill` contains `SKILL.md`
- **THEN** augy finds one skill named `my-skill`

#### Scenario: Nested catalog
- **WHEN** a repo holds skills at `a/zeta/`, `b/c/alpha/`, and `beta/`, each with `SKILL.md`
- **THEN** augy finds all three, named `alpha`, `beta`, and `zeta`, listed in that order

### Requirement: Discovery is complete in large repos
augy SHALL find every skill at the target location even in very large repos, and SHALL NOT silently leave skills out of the list. Source: US-8; the PRD's Further Notes report that large-repo discovery warns of a fallback that never runs, so skills can be missing.

#### Scenario: Very large repo
- **WHEN** the user installs from a repo too large to list in one request
- **THEN** every directory containing `SKILL.md` still appears among the discovered skills

### Requirement: A skill's directory name is its identity
augy SHALL use a skill's directory name as its name in the registry, in augy's store, and in every agent's skills folder, with no namespacing by owner or repo. Installing a skill whose name matches an installed skill, from any source, SHALL replace it. Source: PD: "The skill's directory name is its identity."

#### Scenario: Folder name in every place
- **WHEN** the skill at `owner/repo/skills/tdd` is installed to agent `claude`
- **THEN** it is recorded as `tdd`, stored as `tdd`, and appears at `<claude skills dir>/tdd`

#### Scenario: Same name from a different repo
- **WHEN** skill `tdd` from `alice/skills` is installed and the user then installs skill `tdd` from `bob/skills`
- **THEN** the registry, store, and agent folders hold `bob/skills`'s `tdd` in place of the earlier one

### Requirement: Interactive skill picker
An interactive install SHALL always show a multi-select skill picker, even when only one skill was found. The user SHALL be able to filter it by typing and toggle all visible skills with one key. Each entry SHALL show the skill's short version SHA and repo path. At least one skill SHALL be selected to continue. Sources: US-10, US-12, US-13, PD: "the skill picker is always shown."

#### Scenario: Picker for a single skill
- **WHEN** an interactive install finds exactly one skill
- **THEN** augy still shows the picker

#### Scenario: Filter and toggle all
- **WHEN** the user types a filter and then presses the toggle-all key
- **THEN** only the skills matching the filter are listed, and all of them are toggled

#### Scenario: Version and path shown
- **WHEN** the picker lists a skill
- **THEN** the entry shows its 7-character short SHA and its path in the repo

#### Scenario: Nothing selected
- **WHEN** the user tries to continue with no skill selected
- **THEN** augy does not proceed with an empty selection

### Requirement: New skills pre-selected, installed skills not
In the interactive skill picker, skills not yet installed SHALL start selected, and skills already installed SHALL be labeled "already installed" and start unselected. Sources: US-11, PD: "Installed ones are labeled 'already installed' and start unselected."

#### Scenario: Re-running install on a repo
- **WHEN** the user runs an interactive install on a repo where `a` is installed and `b` is not
- **THEN** `b` starts selected, and `a` is labeled "already installed" and starts unselected

### Requirement: Choose target agents
With `--agent <ids...>`, install SHALL target exactly the named agents and SHALL NOT show the agent picker. Without `--agent`, an interactive install SHALL show an agent picker listing detected agents first and pre-selected, then undetected agents labeled "not detected". The user SHALL be able to target an undetected agent either way. Sources: US-15, US-16, US-17, PD: "Agents."

#### Scenario: Agents named on the command line
- **WHEN** the user runs `augy install owner/repo --agent claude opencode`
- **THEN** no agent picker is shown and the skills go to Claude and OpenCode only

#### Scenario: Agent picker defaults
- **WHEN** an interactive install without `--agent` reaches agent selection on a machine where only Claude is detected
- **THEN** Claude is listed first and pre-selected, and the other agents follow, unselected and labeled "not detected"

#### Scenario: Undetected agent
- **WHEN** the user picks an agent from the "not detected" part of the list, or names it with `--agent`
- **THEN** the skill is installed into that agent's skills folder

### Requirement: Summary and confirmation before writing
Before writing anything, install SHALL print a summary listing each skill, its version, and its target agents (`skill @sha → agents`) and ask for confirmation. Nothing SHALL be written to disk or the lockfile if the user declines. `--yes` SHALL skip the confirmation. Sources: US-14, PD: "Before writing anything, augy prints a `skill @sha → agents` summary and asks for confirmation."

#### Scenario: User confirms
- **WHEN** the user confirms the summary
- **THEN** the listed skills are installed to the listed agents

#### Scenario: User declines
- **WHEN** the user declines the summary
- **THEN** no store copy, agent folder, or registry entry is created or changed

### Requirement: Plain augy starts the install flow
Running `augy` with no subcommand SHALL start the interactive install flow and prompt for a source, accepting the same forms as the install argument, including bare names. Sources: US-18, PD: "With no subcommand, augy starts the interactive install flow."

#### Scenario: No subcommand
- **WHEN** the user runs `augy` with no arguments
- **THEN** augy prompts for a source and continues as an interactive install

#### Scenario: Bare name at the prompt
- **WHEN** the user enters a bare skill name at that prompt
- **THEN** augy resolves it through taps as `augy install <name>` would

### Requirement: --yes installs everything with no prompts
With `--yes`, install SHALL show no skill picker, agent picker, or confirmation, and SHALL install every skill discovered at the source, including skills already installed. Sources: US-19, PD: "It installs every discovered skill, including skills that are already installed."

#### Scenario: CI install of a catalog
- **WHEN** a CI job runs `augy install owner/repo --yes --agent claude` for a repo with five skills
- **THEN** all five are installed to Claude without any prompt

#### Scenario: Already-installed skills are re-installed
- **WHEN** `--yes` runs against a source where some skills are already installed
- **THEN** those skills are installed again along with the new ones

### Requirement: --yes agent targets
With `--yes`, install SHALL target the agents named with `--agent`, or every detected agent when none are named. It SHALL exit with a non-zero code when the resolved agent list is empty. Sources: US-20, US-23, PD: "Without `--agent`, `--yes` installs to all detected agents."

#### Scenario: No --agent on a machine with agents
- **WHEN** `--yes` runs without `--agent` and Claude and Codex are detected
- **THEN** the skills are installed to Claude and Codex

#### Scenario: Nothing detected and none named
- **WHEN** `--yes` runs without `--agent` on a machine where no agent is detected
- **THEN** install exits non-zero and installs nothing

#### Scenario: Only unknown agent IDs named
- **WHEN** `--yes` runs with `--agent` naming only IDs augy doesn't support
- **THEN** install exits non-zero and installs nothing

### Requirement: --yes requires a source
With `--yes` and no source argument, install SHALL exit with code 1 immediately and SHALL NOT wait for input. Sources: US-21, PD: "A source argument is required. Without one, install exits with code 1."

#### Scenario: Misconfigured CI job
- **WHEN** a CI job runs `augy install --yes` with no source
- **THEN** the command exits with code 1 without prompting

### Requirement: --yes fails on an ambiguous bare name
With `--yes`, when a bare name matches skills in more than one tap, install SHALL exit with code 1, install nothing, and print `augy install <tap>/<path> --yes` for each candidate. Sources: US-22, PD: "With `--yes`, install fails and lists `augy install <tap>/<path> --yes` for each candidate."

#### Scenario: Two taps have the name
- **WHEN** `augy install tdd --yes` runs and taps `a/skills` and `b/skills` both contain `tdd`
- **THEN** install exits with code 1 and prints a full-path `augy install ... --yes` command for each of the two candidates

### Requirement: --yes fails when there is nothing to install
With `--yes`, install SHALL exit with code 1 when a bare name isn't found in any tap, when the source can't be resolved, or when the source contains no skills. Source: PD: "It exits with code 1 when a bare name isn't found, when the source can't be resolved or contains no skills."

#### Scenario: Source has no skills
- **WHEN** `--yes` runs against a repo with no `SKILL.md` anywhere
- **THEN** install exits with code 1

#### Scenario: Source cannot be resolved
- **WHEN** `--yes` runs against a repo that doesn't exist
- **THEN** install exits with code 1

#### Scenario: Bare name not found
- **WHEN** `--yes` runs with a bare name that no tap contains
- **THEN** install exits with code 1

### Requirement: Install from private repos with the GitHub CLI login
augy SHALL install skills from private and internal GitHub repos that the user's GitHub CLI login can access, discovery and download included, with no separate account, token, or registry. Sources: US-25; the PRD's Further Notes report that downloads skip the GitHub CLI credentials as a likely defect. Access details: change `multi-agent-support`.

#### Scenario: Private repo end to end
- **WHEN** a user signed in to the GitHub CLI with access to a private repo installs a skill from it, with no other credentials set
- **THEN** the skill is discovered, downloaded, written to its agents, and recorded

### Requirement: Installed skills deploy through the store
Install SHALL write one copy of each skill to `~/.augy/store/<skill>/` and make each selected agent's `<agent skills dir>/<skill>` resolve to that copy, replacing whatever was at that agent path (a copied folder, an old link, or an unrelated directory of the same name) without a prompt. Source: PD: "What install writes." Store details: change `multi-agent-support`.

#### Scenario: Agent paths resolve to the stored copy
- **WHEN** a skill is installed to two agents
- **THEN** both agent paths resolve to `~/.augy/store/<skill>/`

#### Scenario: Existing folder at the agent path
- **WHEN** an agent's skills folder already holds a directory with the skill's name
- **THEN** install replaces it with the store-backed skill without asking

### Requirement: Lockfile record for each installed skill
After a successful install, the registry SHALL hold an entry for the skill recording: `source` exactly as typed for URLs and shorthand, or `owner/repo/<path-in-repo>` with `tap` set to the tap's `owner/repo` for tap installs; `sha` and `shortSha`; each agent ID with its skill path; `installedAt`; `updatedAt`; `pinned`; `history`; and the store location. Sources: US-26, PD: "Tracking: what the lockfile records per skill."

#### Scenario: Install from a URL
- **WHEN** the user installs from `https://github.com/owner/repo/tree/main/skills/tdd` to Claude
- **THEN** the registry entry for `tdd` has that exact `source`, a `sha` and 7-character `shortSha`, Claude with its skill path, `installedAt`, `updatedAt`, and the store location

#### Scenario: Install from a tap
- **WHEN** the user installs `tdd` by bare name from tap `owner/skills`, where it lives at `skills/tdd`
- **THEN** the entry's `source` is `owner/skills/skills/tdd` and its `tap` is `owner/skills`

#### Scenario: First install
- **WHEN** a skill is installed for the first time
- **THEN** its entry has `pinned` set to false and an empty `history`

### Requirement: Installed content matches the recorded version
The files augy installs for a skill SHALL be the content at the version recorded for it in the registry, and augy SHALL NOT silently install a cached copy from an earlier download when the download fails. Sources: US-26 ("so that I can later update, diff, and roll back"); the PRD's Further Notes report content fetched by branch name, and a silent cached-copy fallback, as defects.

#### Scenario: Upstream moves during install
- **WHEN** upstream gets a new commit between augy reading the version and downloading the files
- **THEN** the installed files still match the recorded `sha`, or the recorded `sha` matches the files

#### Scenario: Download fails with a cache present
- **WHEN** downloading a skill fails and an older cached download exists
- **THEN** augy reports that skill as failed instead of installing the cached copy as the new version

### Requirement: Re-install keeps the skill's history
Re-installing a tracked skill SHALL show "already installed — updating record", SHALL keep its original `installedAt`, `pinned`, and `history`, and SHALL replace the recorded agent list with this run's agents. Sources: US-27, PD: "Re-install."

#### Scenario: Re-install a pinned skill
- **WHEN** the user re-installs a skill that is pinned and has version history
- **THEN** its entry keeps the original `installedAt`, stays pinned, keeps its history, and lists the agents chosen this time

### Requirement: Re-install keeps the skill's tags and label
Re-installing a tracked skill SHALL NOT discard the context tags or label already recorded for it. Sources: US-27 ("so that re-installing doesn't erase what augy knows about it"); the PRD's Further Notes report losing tags and label on re-install as a defect.

#### Scenario: Re-install a tagged skill
- **WHEN** the user re-installs a skill that has context tags and a label
- **THEN** its registry entry still has those tags and that label

### Requirement: Re-install leaves no untracked deployments
After a re-install, every agent path that still holds the skill SHALL be recorded in the registry, so that a later uninstall removes it. Sources: US-27, US-30; the PRD's Further Notes report links left on disk but no longer recorded as a defect.

#### Scenario: Re-install to fewer agents
- **WHEN** a skill installed to Claude and Codex is re-installed with only Claude selected
- **THEN** either Codex's copy of the skill is removed or Codex is still recorded, and a later uninstall leaves nothing of the skill in either agent

### Requirement: One failed skill doesn't stop the others
When installing several skills, augy SHALL install each skill independently. A failure SHALL be printed for the skill that failed, and the other skills SHALL still be installed and recorded. Sources: US-28, PD: "Each skill is installed independently."

#### Scenario: One bad download
- **WHEN** three skills are selected and the download of the second fails
- **THEN** augy reports the second as failed, and the first and third are installed and present in the registry

### Requirement: A run where every skill failed is not a success
When every skill selected for an install fails, install SHALL NOT report success and SHALL exit with a non-zero code. Sources: US-23 ("so that a run that would install nothing never looks like a success"); the PRD's Further Notes report that install exits 0 and prints "Done! Registry saved" when every skill failed, undercutting `--yes` in CI.

#### Scenario: All downloads fail in CI
- **WHEN** `augy install owner/repo --yes` runs and every skill's download fails
- **THEN** install exits non-zero and does not report the run as successful

### Requirement: A damaged lockfile is not silently reset
When the registry file exists but isn't valid JSON, install SHALL NOT overwrite it with a registry holding only the new skills without telling the user. Sources: US-26; the PRD's Further Notes report that all previous tracking is lost without warning as a defect.

#### Scenario: Corrupt registry
- **WHEN** `registry.json` contains invalid JSON and the user installs a skill
- **THEN** augy does not silently discard the earlier tracking: it warns the user or stops, and the previous file contents are not lost without notice
