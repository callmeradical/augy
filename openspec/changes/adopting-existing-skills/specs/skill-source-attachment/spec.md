# Spec Delta

## Purpose

Lets a developer attach or replace the GitHub source of a skill that is already in the registry, so that a sourceless or mis-sourced skill becomes fully tracked and can be updated, diffed, and rolled back.

## ADDED Requirements

### Requirement: Set-source only works on registered skills
`augy set-source <skill> <url>` SHALL operate only on a skill that is already in the registry. For an unknown skill name it SHALL exit with an error and change nothing. (US-20, PD: "Set-source only works on skills already in the registry.")

#### Scenario: Unknown skill
- **WHEN** the user runs `augy set-source no-such-skill owner/repo`
- **THEN** the command exits with a non-zero status and an error
- **AND** the registry is unchanged

### Requirement: Set-source accepts common GitHub URL forms
Set-source SHALL accept a plain repo URL (`https://github.com/owner/repo`), a tree URL (`.../tree/<ref>/<path>`), a blob URL (`.../blob/<ref>/<path/to/file.ext>`, whose file's parent directory becomes the skill root), and the shorthands `owner/repo` and `owner/repo/<path>`. (US-21, PD: "URL forms accepted by set-source")

#### Scenario: Tree URL
- **WHEN** the user runs `augy set-source x https://github.com/o/r/tree/main/skills/x`
- **THEN** augy resolves the source to repo `o/r`, ref `main`, path `skills/x`

#### Scenario: Blob URL to SKILL.md
- **WHEN** the user runs `augy set-source x https://github.com/o/r/blob/main/skills/x/SKILL.md`
- **THEN** augy resolves the skill root to path `skills/x` in repo `o/r` at ref `main`

#### Scenario: Plain repo URL
- **WHEN** the user runs `augy set-source x https://github.com/o/r`
- **THEN** augy resolves the source to the root of repo `o/r`

#### Scenario: Shorthand with path
- **WHEN** the user runs `augy set-source x o/r/skills/x`
- **THEN** augy resolves the source to path `skills/x` in repo `o/r`

### Requirement: Set-source verifies the source on GitHub before saving
Set-source SHALL check that the source exists on GitHub before saving it. If the source cannot be resolved, it SHALL exit with an error and change neither the registry nor any `SKILL.md`. (US-22)

#### Scenario: Typo in the source
- **WHEN** the user runs `augy set-source x o/r/skils/x` and that path does not exist upstream
- **THEN** the command exits with a non-zero status and an error
- **AND** the registry entry for `x` is unchanged
- **AND** no `SKILL.md` is modified

### Requirement: Set-source records the source and latest upstream SHA
On success, set-source SHALL store the source string exactly as the user typed it and SHALL record as the skill's SHA the latest upstream commit that touched the resolved path. It SHALL replace any existing source without asking. (US-20, PD: "The source string is stored exactly as typed.")

#### Scenario: Sourceless skill gets a source
- **WHEN** a registered skill has an empty source and SHA `unversioned`, and the user runs `augy set-source x https://github.com/o/r/tree/main/skills/x` for a path that exists
- **THEN** the registry entry for `x` has source `https://github.com/o/r/tree/main/skills/x` exactly as typed
- **AND** its SHA is the latest commit on `main` that touched `skills/x`

#### Scenario: Existing source is replaced without a prompt
- **WHEN** a registered skill already has source `old/repo` and the user runs `augy set-source x new/repo/x` for a valid path
- **THEN** the command completes without prompting
- **AND** the registry entry for `x` has source `new/repo/x`

#### Scenario: Skill becomes tracked in the inventory
- **WHEN** set-source succeeds for a skill previously shown as "untracked" in `augy list`
- **THEN** `augy list` shows that skill with its source and short SHA instead of "untracked"

### Requirement: Set-source follows the ref in the URL
When the URL names a branch or tag (for example `/tree/v2/...`), set-source SHALL resolve the SHA against that ref rather than the default branch. (US-23)

#### Scenario: Tag ref
- **WHEN** the user runs `augy set-source x https://github.com/o/r/tree/v2/skills/x` and `v2` differs from the default branch
- **THEN** the recorded SHA is the latest commit on `v2` that touched `skills/x`

### Requirement: Set-source writes the source into SKILL.md
On success, set-source SHALL add `source: <source>` to the `SKILL.md` frontmatter at every active agent location of the skill, creating a frontmatter block if there is none, and SHALL NOT overwrite an existing `source` field. (US-19, PD: "Set-source writes to every active agent location.")

#### Scenario: All active locations written
- **WHEN** a skill is active in two agents and inactive in a third, none of whose `SKILL.md` files has a `source` field, and set-source succeeds
- **THEN** the `SKILL.md` in both active agent locations contains the `source:` line
- **AND** the `SKILL.md` in the inactive location is not modified

#### Scenario: Existing frontmatter source left as is
- **WHEN** a skill's `SKILL.md` already has a `source` field and set-source succeeds with a different source
- **THEN** the existing `source` field in that `SKILL.md` is unchanged

### Requirement: Set-source uses the user's GitHub CLI login
Set-source SHALL resolve sources through the user's existing GitHub CLI login, so that private repos the user can access resolve without separate token setup. (US-24, PD: "GitHub access goes through the GitHub CLI.")

#### Scenario: Private repo
- **WHEN** the user is logged in to the GitHub CLI with access to private repo `org/private` and runs `augy set-source x org/private/skills/x` for a path that exists
- **THEN** the command succeeds and records a SHA

### Requirement: List points sourceless skills at set-source
`augy list` SHALL flag each skill with no source and show the exact `augy set-source` command to run for it. (US-25)

#### Scenario: Sourceless skill in list
- **WHEN** the registry contains a skill `mystery` with an empty source
- **AND** the user runs `augy list`
- **THEN** the output flags `mystery` as having no source and shows the `augy set-source` command to run for `mystery`, naming that skill
