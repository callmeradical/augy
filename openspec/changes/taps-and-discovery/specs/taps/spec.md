# Spec Delta

## Purpose

Lets a user register GitHub repos they trust as skill sources (taps), review and unregister them, and install skills from them by bare name, with GitHub as the only registry.

## ADDED Requirements

### Requirement: Register a tap from shorthand or URL
`augy tap add <repo>` SHALL register a GitHub repo as a tap from either `owner/repo` shorthand or a `https://github.com/owner/repo` URL, and both forms SHALL record the same tap. Only owner and repo SHALL be taken from the argument. An argument that does not contain an owner and a repo SHALL be rejected. Source: US-1, US-2; PD: "Only owner and repo are taken from the argument".

#### Scenario: Shorthand and URL record the same tap
- **WHEN** the user runs `augy tap add acme/skills` in one augy home and `augy tap add https://github.com/acme/skills` in another
- **THEN** both lockfiles contain one tap keyed `acme/skills` with owner `acme` and repo `skills`

#### Scenario: Trailing slash is ignored
- **WHEN** the user runs `augy tap add https://github.com/acme/skills/`
- **THEN** the tap is recorded as `acme/skills`

#### Scenario: Argument without owner and repo is rejected
- **WHEN** the user runs `augy tap add skills`
- **THEN** the command fails with an error and the lockfile has no new tap

### Requirement: Taps track the default branch
A tap SHALL always follow its repo's default branch. A branch, tag or extra path included in a tap URL SHALL NOT be stored on the tap; the subdirectory comes only from `--path` or the prompt. Source: PD: "Taps always track the repo's default branch."

#### Scenario: Ref and path in a URL are dropped
- **WHEN** the user runs `augy tap add https://github.com/acme/skills/tree/v2/extra --path skills`
- **THEN** the lockfile records tap `acme/skills` with subdirectory `skills` and no branch, tag or `extra` path

### Requirement: Tap entry recorded in the lockfile
Each tap SHALL be stored in the user's lockfile (`~/.augy/registry.json`, or under `AUGY_HOME` when set), keyed by `owner/repo`, recording the owner, the repo, the skills subdirectory (empty string meaning the repo root), the date it was added, and the optional description. Source: PD: "Taps are stored in the user's lockfile ... keyed by `owner/repo`".

#### Scenario: Tap fields persisted
- **WHEN** the user runs `augy tap add acme/skills --path skills --description "team skills"`
- **THEN** `registry.json` holds an `acme/skills` entry with owner, repo, subdirectory `skills`, an added date, and description `team skills`

#### Scenario: AUGY_HOME is honored
- **WHEN** `AUGY_HOME` is set to a directory and the user adds a tap
- **THEN** the tap is written to the lockfile under that directory and not under `~/.augy`

### Requirement: Tap subdirectory from --path
`--path <dir>` SHALL scope the tap to that subdirectory of the repo and SHALL be stored as given. An explicitly empty `--path` SHALL scope the tap to the repo root. Source: US-5, US-7; PD: "an empty string means the repo root".

#### Scenario: Path stored as given
- **WHEN** the user runs `augy tap add acme/skills --path collections/ai`
- **THEN** the tap's subdirectory is `collections/ai` and only skills under it are discovered

#### Scenario: Empty path means repo root
- **WHEN** the user runs `augy tap add acme/skills --path ""`
- **THEN** the tap's subdirectory is the empty string and skills anywhere in the repo are discovered

### Requirement: Prompt for subdirectory when --path is omitted
When `--path` is not given, `augy tap add` SHALL prompt the user for the skills subdirectory, suggesting `skills` as the default. Source: US-6; PD: "Without `--path`, the user is prompted, and the suggested default is `skills`."

#### Scenario: Default accepted at the prompt
- **WHEN** the user runs `augy tap add acme/skills` without `--path` and accepts the suggested default at the prompt
- **THEN** the tap is recorded with subdirectory `skills`

#### Scenario: Custom value entered at the prompt
- **WHEN** the user runs `augy tap add acme/skills` without `--path` and enters `agents/skills` at the prompt
- **THEN** the tap is recorded with subdirectory `agents/skills`

### Requirement: Free-text tap description
`augy tap add` SHALL accept an optional `--description <text>` that is stored with the tap and shown when taps are listed. Source: US-8.

#### Scenario: Description shown in list
- **WHEN** the user adds a tap with `--description "vetted by security"` and then runs `augy tap list`
- **THEN** the listing shows `vetted by security` for that tap

### Requirement: Check a new tap by counting its skills
When a tap is added, augy SHALL attempt to discover the tap's skills and SHALL tell the user how many it found. Finding zero skills SHALL be reported but SHALL NOT prevent the tap from being added. Source: US-3; PD: "A check that finds zero skills is reported but doesn't block the add."

#### Scenario: Skill count reported
- **WHEN** the user adds a tap whose subdirectory contains three skills
- **THEN** augy reports that it found 3 skills and the tap is registered

#### Scenario: Zero skills reported without blocking
- **WHEN** the user adds a tap whose subdirectory contains no `SKILL.md`
- **THEN** augy reports that no skills were found and the tap is still registered

### Requirement: Tap registered even when the check fails
If the skill-count check fails (for example offline, rate-limited, or the repo is unreachable), augy SHALL still register the tap and SHALL show a warning that the check failed. Source: US-4; PD: "If the check fails, the tap is still added and a warning is shown."

#### Scenario: Offline add
- **WHEN** the user adds a tap while GitHub cannot be reached
- **THEN** augy shows a warning, the tap is present in the lockfile, and the command does not fail

### Requirement: One tap per repo
A repo SHALL be tappable only once; a tap's identity SHALL be `owner/repo` regardless of subdirectory. Adding a tap that is already registered SHALL be reported to the user as already registered, SHALL leave the lockfile unchanged, and SHALL exit successfully. Source: US-11; PD: "A repo can be tapped only once."; PD: "Adding a tap that is already registered is reported as a no-op and exits successfully."

#### Scenario: Duplicate add is a no-op
- **WHEN** `acme/skills` is already a tap and the user runs `augy tap add acme/skills`
- **THEN** augy says the tap is already registered, the lockfile is unchanged, and the exit status is success

#### Scenario: Same repo with a different subdirectory
- **WHEN** `acme/skills` is a tap with subdirectory `skills` and the user runs `augy tap add acme/skills --path other`
- **THEN** augy reports the tap as already registered and the stored subdirectory remains `skills`

### Requirement: Discovery uses only GitHub and the user's GitHub CLI login
Tap checks, search and bare-name resolution SHALL contact only GitHub, authenticated by the user's existing GitHub CLI (`gh`) login, with no third-party registry or augy account. A private repo SHALL be tappable and discoverable exactly as a public one whenever the user's GitHub login can see it. Source: US-9, US-10; PD: "Private repos are visible to discovery exactly when the user's GitHub login can see them."

#### Scenario: Private repo tapped like a public one
- **WHEN** the user's `gh` login has access to private repo `acme/internal-skills` and the user runs `augy tap add acme/internal-skills --path skills`
- **THEN** the tap is registered and the reported skill count reflects the skills in that private repo

#### Scenario: No login access
- **WHEN** the user's `gh` login cannot see a private repo and the user taps it
- **THEN** the check fails with a warning and the tap is still registered

### Requirement: List registered taps
`augy tap list` SHALL show each registered tap with its subdirectory, description, date added, and the number of installed skills that came from it. Source: US-12.

#### Scenario: Listing with installed counts
- **WHEN** the user has tap `acme/skills` and has installed two skills from it by bare name, then runs `augy tap list`
- **THEN** the `acme/skills` entry shows its subdirectory, description, added date, and an installed count of 2

### Requirement: Hint when there are no taps
When no taps are registered, `augy tap list` SHALL show a hint pointing the user to `augy tap add`. Source: US-13.

#### Scenario: Empty tap list
- **WHEN** the lockfile has no taps and the user runs `augy tap list`
- **THEN** the output points the user to `augy tap add`

### Requirement: Unregister a tap
`augy tap remove <repo>` SHALL unregister the tap so its skills are no longer considered by bare-name resolution or search. Removing a tap that is not registered SHALL be an error. Source: US-14; PD: "Removing a tap that isn't registered is an error."

#### Scenario: Removed tap no longer resolves names
- **WHEN** the user confirms `augy tap remove acme/skills` and then runs `augy install tdd` where `tdd` existed only in that tap
- **THEN** the tap is absent from the lockfile and the install reports that `tdd` was not found in any tap

#### Scenario: Removing an unknown tap
- **WHEN** the user runs `augy tap remove nobody/nothing` and that tap is not registered
- **THEN** the command fails with an error and the lockfile is unchanged

### Requirement: Warn and confirm before removing a tap
Before removing a tap, augy SHALL list the installed skills that came from it and SHALL always ask for confirmation. Declining SHALL leave the tap registered. Source: US-15; PD: "`augy tap remove <repo>` always asks for confirmation, after listing the installed skills that came from the tap."

#### Scenario: Impact shown before confirming
- **WHEN** skills `tdd` and `grilling` came from tap `acme/skills` and the user runs `augy tap remove acme/skills`
- **THEN** augy names `tdd` and `grilling` and asks for confirmation before removing

#### Scenario: Declining keeps the tap
- **WHEN** the user declines the confirmation
- **THEN** the tap and all skill associations are unchanged

### Requirement: Removing a tap never uninstalls skills
Removing a tap SHALL clear the tap association from every installed skill that came from it and SHALL NOT uninstall any of those skills or change their files in agent folders. Source: US-16; PD: "Removing a tap clears the tap association on those skills but never uninstalls them."

#### Scenario: Skills survive tap removal
- **WHEN** the user confirms removal of tap `acme/skills` from which `tdd` was installed
- **THEN** `tdd` is still installed and usable by its agents, and its lockfile entry no longer names a tap

### Requirement: Bare-name detection
An `augy install` argument SHALL be treated as a bare name, and resolved against taps, when it contains no `/` and does not start with `http`. Any other argument SHALL be treated as a GitHub URL or shorthand and SHALL NOT consult taps. Source: PD: "An install argument counts as a bare name when it has no `/` and doesn't start with `http`."

#### Scenario: Bare name consults taps
- **WHEN** the user runs `augy install tdd`
- **THEN** augy resolves `tdd` against the registered taps

#### Scenario: Shorthand skips taps
- **WHEN** the user runs `augy install acme/skills/tdd`
- **THEN** augy installs from that path without consulting taps

### Requirement: Bare name resolves by exact case-insensitive match across taps
A bare name SHALL be resolved by searching every registered tap live and keeping only skills whose name equals the argument ignoring case; fuzzy matching SHALL NOT apply. Exactly one match SHALL be installed directly. Source: US-17; PD: "Resolution searches every tap live and keeps only skills whose name exactly matches the argument, ignoring case."

#### Scenario: Single exact match installs
- **WHEN** only tap `acme/skills` contains a skill named `TDD` and the user runs `augy install tdd`
- **THEN** that skill is installed without a picker

#### Scenario: Near matches are not used
- **WHEN** a tap contains `tdd-helper` but no skill named `tdd`, and the user runs `augy install tdd`
- **THEN** augy reports that `tdd` was not found in any tap and installs nothing

### Requirement: Choose among ambiguous bare-name matches
When a bare name exactly matches more than one skill, across taps or within one tap, augy SHALL let the user pick which one to install. Source: US-18; PD: "Several matches (across taps, or within one tap) bring up a picker".

#### Scenario: Same name in two taps
- **WHEN** taps `acme/skills` and `bob/skills` both contain `tdd` and the user runs `augy install tdd`
- **THEN** augy shows a picker of both candidates and installs only the one the user selects

### Requirement: Ambiguous bare name fails under --yes
With `--yes`, an ambiguous bare name SHALL fail with a clear error that lists each candidate's full `owner/repo/path` so the user can rerun with one of them; nothing SHALL be installed. Source: US-19; PD: "with `--yes`, an error listing the full-path alternatives".

#### Scenario: CI install with ambiguous name
- **WHEN** `tdd` exists in `acme/skills` at `skills/tdd` and in `bob/skills` at `skills/tdd`, and CI runs `augy install tdd --yes`
- **THEN** the command fails, lists `acme/skills/skills/tdd` and `bob/skills/skills/tdd`, and installs nothing

### Requirement: Bare name not found in any tap
When no tap contains a skill with the given name, augy SHALL fail with a message telling the user to use a full path or add a tap. Source: US-20; PD: "No match is an error."

#### Scenario: Unknown bare name
- **WHEN** the user runs `augy install nosuchskill` and no tap has it
- **THEN** the command fails with a message suggesting a full `owner/repo/path` or `augy tap add`

### Requirement: Bare-name installs record source and tap
A skill installed by bare name SHALL record `owner/repo/<path-to-skill>` as its source and SHALL record the tap it came from, so the tap is shown in `augy info` and counted in `augy tap list`. Source: US-21; PD: "A skill installed by bare name records `owner/repo/<path-to-skill>` as its source and remembers the tap it came from."

#### Scenario: Provenance recorded
- **WHEN** the user installs `tdd` by bare name from tap `acme/skills` where it lives at `skills/tdd`
- **THEN** the lockfile records source `acme/skills/skills/tdd` and tap `acme/skills`, and `augy info tdd` shows that tap
