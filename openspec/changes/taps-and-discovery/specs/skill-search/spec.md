# Spec Delta

## Purpose

Discovers the skills each registered tap contains and lets the user browse or fuzzy-search them by name, showing each skill's upstream version and whether the user's installed copy is current.

## ADDED Requirements

### Requirement: Skills discovered at any depth
Discovery SHALL treat any directory, at any depth under a tap's subdirectory, that contains a `SKILL.md` file as a skill, and the skill's name SHALL be that directory's name. Discovered skills SHALL be sorted by name. Source: US-26; PD: "every `SKILL.md` at any depth under the path is discovered. Results are sorted by name."

#### Scenario: Nested category folders
- **WHEN** a tap's subdirectory contains `writing/prd/SKILL.md`, `testing/tdd/SKILL.md` and `grilling/SKILL.md`
- **THEN** discovery returns skills `grilling`, `prd` and `tdd`, in that order

#### Scenario: Directory without SKILL.md
- **WHEN** a tap contains a directory `notes/` with no `SKILL.md` anywhere beneath it
- **THEN** `notes` is not listed as a skill

### Requirement: SKILL.md matched case-insensitively
Discovery SHALL recognize the skill marker file regardless of letter case (for example `skill.md` or `Skill.MD`). Source: US-27; PD: "A skill is any directory containing a file named `SKILL.md`, matched case-insensitively."

#### Scenario: Lowercase marker
- **WHEN** a tap contains `review/skill.md`
- **THEN** `review` is discovered as a skill

### Requirement: Tap path that is itself a skill
When a tap's subdirectory is itself a skill directory, the tap SHALL hold exactly that one skill. Source: PD: "If the tap's path is itself a skill directory, the tap holds exactly that one skill."

#### Scenario: Single-skill tap
- **WHEN** a tap's subdirectory `skills/tdd` contains `SKILL.md`
- **THEN** discovery for that tap returns exactly one skill, `tdd`

### Requirement: Fixed request budget per tap
Discovering a tap's skills SHALL use a small, fixed number of GitHub requests per tap that does not grow with the number of skills in it. Source: US-28.

#### Scenario: Large tap request count
- **WHEN** discovery runs against a tap containing 200 skills, with GitHub requests counted
- **THEN** the number of requests is the same as for a tap containing 2 skills

### Requirement: No silent loss of skills in large repos
When GitHub returns an incomplete listing for a very large repo, discovery SHALL either still find every skill under the tap's path or tell the user that the results may be incomplete; it SHALL NOT silently omit skills or claim a fallback it does not perform. Source: US-26; PD: Further Notes "Large repos are silently truncated" (defect against US-26).

#### Scenario: Truncated repo listing
- **WHEN** GitHub marks a tap's repo listing as truncated
- **THEN** either all skills under the tap's path are returned, or the user is told that some skills may be missing

### Requirement: Each discovered skill has a version identifier
Discovery SHALL report a version identifier (SHA) for every skill it finds, and search SHALL show that identifier as a short SHA. Source: US-24; PD: "Each discovered skill gets a version identifier (SHA) so search can compare it with the installed version."

#### Scenario: Short SHA shown
- **WHEN** the user runs `augy search` and a tap contains skill `tdd`
- **THEN** the `tdd` result shows a short SHA for its current upstream version

### Requirement: Browse all skills with no query
`augy search` with no query SHALL list every discovered skill in every registered tap, grouped under a heading per tap. Source: US-22.

#### Scenario: Browse two taps
- **WHEN** taps `acme/skills` (skills `a`, `b`) and `bob/skills` (skill `c`) are registered and the user runs `augy search`
- **THEN** the output shows an `acme/skills` group with `a` and `b` and a `bob/skills` group with `c`

### Requirement: Fuzzy name matching with ranked results
`augy search <query>` SHALL match the query against skill names only, keeping skills whose name equals the query, starts with it, contains it, or contains every query character in order, and SHALL rank results in that order (exact, prefix, substring, subsequence) best-first within each tap. Non-matching skills SHALL be omitted. Taps SHALL NOT be merged into one ranking. Source: US-23; PD: "Fuzzy scoring for search: exact match, then starts-with, then contains, then subsequence".

#### Scenario: Ranking within a tap
- **WHEN** one tap has skills `tdd`, `tdd-loop`, `use-tdd`, `test-driven-dev` and `docs`, and the user runs `augy search tdd`
- **THEN** that tap lists `tdd`, then `tdd-loop`, then `use-tdd`, then `test-driven-dev`, and `docs` is not shown

#### Scenario: Per-tap grouping preserved
- **WHEN** two taps each contain matching skills
- **THEN** results appear under each tap's own heading, ranked within that tap

### Requirement: Taps with no matches are omitted
When a query is given, taps with no matching skill SHALL be left out of the output. Source: PD: "Taps with no matching skills are left out of the output."

#### Scenario: Non-matching tap hidden
- **WHEN** only `acme/skills` has a skill matching `tdd` and the user runs `augy search tdd`
- **THEN** `bob/skills` does not appear in the output

### Requirement: Install status per result
Each search result SHALL show one of: "not installed", "up to date", or "update available" with the installed and upstream short SHAs. A skill SHALL count as installed when any installed skill has the same name, and "up to date" SHALL mean the installed SHA equals the SHA discovery reports for that skill in the tap. Source: US-24; PD: "Install status in search is decided by skill name only"; PD: "'Up to date' means the installed SHA equals the SHA discovery reports for the tap."

#### Scenario: Not installed
- **WHEN** the user has no installed skill named `tdd` and searches for it
- **THEN** the `tdd` result shows "not installed"

#### Scenario: Up to date
- **WHEN** the installed `tdd` has the same SHA that discovery reports for `tdd` in the tap
- **THEN** the result shows "up to date"

#### Scenario: Update available
- **WHEN** the installed `tdd` has a different SHA from the one discovery reports
- **THEN** the result shows "update available" with the installed short SHA and the upstream short SHA

### Requirement: Unchanged skills installed from a tap show as up to date
The version identifier discovery reports for a skill in a tap SHALL be comparable with the one recorded when that skill is installed or updated from that tap, so a skill whose upstream files have not changed is shown as "up to date", whether it was installed by bare name or by its full path. Source: US-24; PD: Further Notes "Version identifiers are inconsistent, so 'update available' in search is often wrong" (defect against US-24).

#### Scenario: Bare-name install then search
- **WHEN** the user installs `tdd` by bare name from a tap and runs `augy search tdd` with no upstream change in between
- **THEN** the result shows "up to date"

#### Scenario: After an update with no upstream change
- **WHEN** the user installs `tdd` by bare name, runs `augy update`, and then runs `augy search tdd`, with no upstream change to `tdd`
- **THEN** `augy update` offers no upgrade for `tdd` and search shows "up to date"

#### Scenario: Full-path install then search
- **WHEN** the user installs `acme/skills/skills/tdd` by full path and `acme/skills` is a tap containing it, with no upstream change
- **THEN** `augy search tdd` shows "up to date"

### Requirement: Taps searched in parallel with per-tap errors
Search SHALL query all taps concurrently. A tap that cannot be reached SHALL be shown with its error under its own heading, and SHALL NOT stop results from the other taps being shown. Tap errors SHALL be shown even when no skill matched in any tap. Source: US-25; PD: "Taps are searched concurrently. A failing tap is shown with its error."; PD: Further Notes "Tap errors are hidden when nothing matches" (defect against US-25).

#### Scenario: One tap unreachable
- **WHEN** `acme/skills` is reachable and `bob/private` returns an auth error, and the user runs `augy search`
- **THEN** skills from `acme/skills` are listed and `bob/private` appears under its own heading with its error

#### Scenario: All taps fail
- **WHEN** every registered tap fails during `augy search tdd`
- **THEN** each tap's error is shown rather than only a "no skills found" message

### Requirement: Hint when nothing matches
When a query matches no skill in any tap, search SHALL tell the user nothing was found and suggest trying a broader term. Source: US-29.

#### Scenario: No matches
- **WHEN** the user runs `augy search zzzz` and no skill name matches
- **THEN** the output says no skills were found and suggests a broader search term
