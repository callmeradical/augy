# Spec Delta

## Purpose

Lets users tag installed skills with free-form contexts (conventionally `work`, `personal`, `universal`). Defines how a tag matches a context, and carries the tags across machines through the home repo manifest.

## ADDED Requirements

### Requirement: Set a skill's tags
`augy tag set <skill> [contexts...]` SHALL set the skill's tags to exactly the contexts given, replacing any previous tags. Tags SHALL be accepted as typed: free-form, case-sensitive, without validation or de-duplication. Source: US-8, US-10, PD: "Tags are free-form strings"; "`tag set` replaces the full tag list."

#### Scenario: Several tags in one command
- **WHEN** the user runs `augy tag set tdd work universal`
- **THEN** the lockfile records `tdd` with tags `work` and `universal`

#### Scenario: Replace rather than append
- **WHEN** `tdd` is tagged `work` and the user runs `augy tag set tdd personal`
- **THEN** `tdd` is tagged only `personal`

#### Scenario: Custom tag kept as typed
- **WHEN** the user runs `augy tag set tdd Client-Acme`
- **THEN** `tdd` is tagged `Client-Acme` exactly

### Requirement: Clear a skill's tags
`augy tag set <skill>` with no contexts SHALL set the skill's tags to an empty list, so that it is treated as untagged (universal). Source: US-9, PD: "Passing no contexts sets an empty list, which behaves as universal."

#### Scenario: Clear tags
- **WHEN** `tdd` is tagged `work` and the user runs `augy tag set tdd`
- **THEN** `tdd` has an empty tag list and `augy tag show tdd` reports it as treated as universal

### Requirement: Show a skill's tags
`augy tag show <skill>` SHALL display the skill's tags. When it has none, it SHALL say the skill is untagged and treated as universal. Source: US-11.

#### Scenario: Tagged skill
- **WHEN** `tdd` is tagged `work` and `universal` and the user runs `augy tag show tdd`
- **THEN** the output lists `work` and `universal`

#### Scenario: Untagged skill
- **WHEN** `lint` has no tags and the user runs `augy tag show lint`
- **THEN** the output says `lint` is untagged and treated as universal

### Requirement: Tags apply only to installed skills
`augy tag set` and `augy tag show` SHALL fail with a clear error naming the skill when it is not in the local lockfile, and SHALL change nothing. Source: US-12, PD: "A skill must be present in the local lockfile to be tagged."

#### Scenario: Typo in tag set
- **WHEN** no skill `tddd` is installed and the user runs `augy tag set tddd work`
- **THEN** the command fails with an error that `tddd` is not installed, and the lockfile is unchanged

#### Scenario: Typo in tag show
- **WHEN** no skill `tddd` is installed and the user runs `augy tag show tddd`
- **THEN** the command fails with an error that `tddd` is not installed

### Requirement: Context matching rule
Wherever a context filter applies, a skill SHALL match when no filter is in effect, or when it is untagged (no tags or an empty list), or when it is tagged `universal`, or when one of its tags equals the context exactly (case-sensitive). Otherwise it SHALL NOT match. Source: US-23, US-24, US-25, PD: "Matching rule."

#### Scenario: No filter
- **WHEN** no context is in effect
- **THEN** every skill matches, whatever its tags

#### Scenario: Untagged matches every context
- **WHEN** the context is `work` and a skill has no tags or an empty tag list
- **THEN** the skill matches

#### Scenario: Universal matches every context
- **WHEN** the context is `homelab` and a skill is tagged `universal`
- **THEN** the skill matches

#### Scenario: Several tags
- **WHEN** a skill is tagged `work` and `personal`
- **THEN** it matches context `work` and context `personal`

#### Scenario: Non-matching tag
- **WHEN** the context is `personal` and a skill is tagged only `work`
- **THEN** the skill does not match

#### Scenario: Case-sensitive match
- **WHEN** the context is `work` and a skill is tagged only `Work`
- **THEN** the skill does not match

### Requirement: Migrate untagged skills interactively
`augy tag migrate` SHALL prompt once for each untagged skill, in lockfile order. Each prompt SHALL show the skill name and its source, or "authored (no external source)" when it has none. Source: US-13, US-14, PD: "It considers only untagged skills and prompts once per skill, in lockfile order."

#### Scenario: One prompt per untagged skill
- **WHEN** the lockfile has untagged skills `a`, `b`, `c` in that order and the user runs `augy tag migrate`
- **THEN** the user is prompted for `a`, then `b`, then `c`, once each

#### Scenario: Source shown
- **WHEN** the prompt is for external `tdd` from `github:org/skills/tdd`
- **THEN** the prompt shows `tdd` and `github:org/skills/tdd`

#### Scenario: Authored skill shown
- **WHEN** the prompt is for a skill with no source
- **THEN** the prompt shows "authored (no external source)"

### Requirement: Migration offers the suggested contexts
Each `augy tag migrate` prompt SHALL offer exactly `universal`, `personal`, and `work`, each with a short explanation, and allow any combination including none. Choosing none SHALL record an empty tag list. Source: US-15, PD: "It offers only the three suggested contexts"; "Selecting none is allowed and is recorded as an empty list."

#### Scenario: Three options with explanations
- **WHEN** a migration prompt appears
- **THEN** it offers `universal`, `personal`, and `work`, each with an explanation, and no free-text entry

#### Scenario: Choose none
- **WHEN** the user selects no context for `a`
- **THEN** `a` is recorded with an empty tag list

### Requirement: Migration skips tagged skills and reports progress
`augy tag migrate` SHALL skip skills that already have tags and tell the user how many skills are already tagged and how many remain. Source: US-16.

#### Scenario: Mixed collection
- **WHEN** 3 skills are tagged and 2 are untagged and the user runs `augy tag migrate`
- **THEN** the output reports 3 tagged and 2 remaining, and only the 2 untagged skills are prompted

### Requirement: Migration saves after every answer
`augy tag migrate` SHALL save each skill's tags to the lockfile as soon as the user answers. When the user cancels, it SHALL stop with "Migration paused — progress saved." and keep the answers already given. Source: US-17, US-18, PD: "It saves after every answer."

#### Scenario: Progress survives cancel
- **WHEN** the user answers for `a`, then cancels at the prompt for `b`
- **THEN** the output shows "Migration paused — progress saved.", the lockfile has `a`'s tags, and `b` is unchanged

### Requirement: Migration with nothing to do
When every installed skill already has tags, `augy tag migrate` SHALL say every skill is already tagged and prompt for nothing. Source: US-19.

#### Scenario: All tagged
- **WHEN** every installed skill has at least one tag and the user runs `augy tag migrate`
- **THEN** the output says all skills are tagged and no prompt appears

### Requirement: Migration ends with a push reminder
After a completed `augy tag migrate`, augy SHALL remind the user to run `augy home push` so that the tags reach the home repo. Source: US-20.

#### Scenario: Reminder at the end
- **WHEN** the user answers every migration prompt
- **THEN** the final output mentions `augy home push`

### Requirement: Tags travel in the home repo manifest
`augy home push` SHALL save each tagged skill's tags in the home repo manifest's `contexts` map. `augy home pull` SHALL use the manifest's tags for each skill, falling back to local tags, both to decide pre-selection and to show tag hints. Source: US-21, PD: "Where tags travel."

#### Scenario: Tag once, seen everywhere
- **WHEN** machine A tags `tdd` as `work` and pushes, and machine B, which has no local tags for `tdd`, runs `augy home pull` with context `work`
- **THEN** machine B's picker shows `tdd` tagged `work` and pre-selects it

#### Scenario: Local fallback
- **WHEN** the manifest has no tags for `lint` and the local lockfile tags `lint` as `personal`
- **THEN** pull shows `lint` tagged `personal` and uses that for pre-selection

### Requirement: Pulled skills receive their home-repo tags
Every skill `augy home pull` installs or upgrades, authored or external, SHALL be recorded locally with its tags from the home repo manifest. When the manifest has no tags for it, its existing local tags SHALL be kept. Source: US-21, Solution: tags "survive across machines on home pull"; the PRD's Further Notes report losing external skills' tags as a bug.

#### Scenario: External skill tags restored
- **WHEN** the manifest tags external `tdd` as `universal`, and the user pulls `tdd` onto a machine where it isn't installed
- **THEN** the lockfile records `tdd` with tag `universal`

#### Scenario: Authored skill tags restored
- **WHEN** the manifest tags authored `my-skill` as `personal` and the user pulls it
- **THEN** the lockfile records `my-skill` with tag `personal`

#### Scenario: Upgrade keeps tags
- **WHEN** `lint` is installed locally tagged `work`, the manifest has no tags for `lint`, and pull upgrades `lint`
- **THEN** `lint` is still tagged `work` after the pull

#### Scenario: Round trip keeps tags
- **WHEN** a new machine pulls tagged skills from the home repo and then runs `augy home push`
- **THEN** the pushed manifest's `contexts` still has the tags for the skills that were pulled
