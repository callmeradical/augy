# Spec Delta

## Purpose

Lets a team lead publish the team's standard skill set as a small, reviewable `augy.json` manifest generated from their local registry, mapping skill names to GitHub sources.

## ADDED Requirements

### Requirement: Bundle writes a version 1 manifest from the registry
`augy bundle` SHALL write a JSON manifest of the form `{"version": 1, "skills": {"<skill-name>": "<source>"}}` containing the skills in the local registry, keyed by each skill's install name. (US-1, US-2, PD: "Manifest format (`augy.json`), version 1")

#### Scenario: Two sourced skills
- **WHEN** the registry contains `tdd` with source `owner/repo/tdd` and `lint` with source `https://github.com/o/r/tree/main/lint`
- **AND** the user runs `augy bundle`
- **THEN** `augy.json` parses as JSON with `version` equal to `1`
- **AND** its `skills` maps `tdd` to `owner/repo/tdd` and `lint` to `https://github.com/o/r/tree/main/lint`

### Requirement: Bundle copies sources exactly as recorded
Bundle SHALL write each skill's source exactly as it appears in the registry, whether a full URL or shorthand, without normalizing it. (PD: "Sources are copied as-is.")

#### Scenario: Shorthand and URL preserved
- **WHEN** one skill's registry source is shorthand and another's is a full tree URL
- **AND** the user runs `augy bundle`
- **THEN** each manifest value is character-for-character the registry source

### Requirement: Bundle leaves out sourceless skills by default
By default, bundle SHALL exclude skills with no source and SHALL tell the user how many were left out and how to include them. A skill that has a source but SHA `unversioned` SHALL always be included. (US-3, US-4, PD: "Untracked skills are left out by default.")

#### Scenario: Sourceless skill excluded
- **WHEN** the registry has two sourced skills and one skill with an empty source
- **AND** the user runs `augy bundle`
- **THEN** the manifest contains only the two sourced skills
- **AND** the output says one skill was left out and mentions `--include-untracked`

#### Scenario: Unversioned but sourced skill included
- **WHEN** a skill has a source but SHA `unversioned`
- **AND** the user runs `augy bundle`
- **THEN** the manifest contains that skill with its source

### Requirement: Include-untracked adds placeholders
With `--include-untracked`, bundle SHALL include sourceless skills with an empty-string source. (US-5)

#### Scenario: Placeholder entry
- **WHEN** the registry has a skill `mystery` with an empty source
- **AND** the user runs `augy bundle --include-untracked`
- **THEN** the manifest's `skills` maps `mystery` to `""`

### Requirement: Bundle output location
Bundle SHALL write to `./augy.json` in the current folder by default, and to the given path when `--output <path>` is passed. Any closing guidance it prints SHALL refer to the file it actually wrote. (US-6, PD: "Bundle's default output is `./augy.json`"; Further Notes present the fixed "Commit augy.json" message as a gap)

#### Scenario: Default path
- **WHEN** the user runs `augy bundle` in folder `/work/team`
- **THEN** the manifest is written to `/work/team/augy.json`

#### Scenario: Custom output
- **WHEN** the user runs `augy bundle --output /work/team-skills/skills.json`
- **THEN** the manifest is written to `/work/team-skills/skills.json`
- **AND** no `augy.json` is written to the current folder
- **AND** any closing message names `skills.json` rather than `augy.json`

### Requirement: Bundle overwrites without merging
Bundle SHALL replace any existing file at the output path with a fresh manifest, without prompting and without merging in the existing file's entries. (PD: "Bundle always overwrites the output file.")

#### Scenario: Existing manifest replaced
- **WHEN** `augy.json` already lists a skill `old` that is not in the registry
- **AND** the user runs `augy bundle`
- **THEN** the command does not prompt
- **AND** the new `augy.json` does not contain `old`

### Requirement: Empty registry writes nothing
When the registry contains no skills, bundle SHALL NOT write a manifest file. (PD: "If the registry is empty, it writes nothing.")

#### Scenario: Nothing installed
- **WHEN** the registry has no skills and there is no `augy.json` in the current folder
- **AND** the user runs `augy bundle`
- **THEN** no `augy.json` is created

### Requirement: Bundle does not write contexts
Bundle SHALL NOT write the optional `contexts` field; that field is written only by the home-repo feature. (PD: "`augy bundle` never writes it")

#### Scenario: Skills with context tags
- **WHEN** registry skills carry context tags
- **AND** the user runs `augy bundle`
- **THEN** the manifest has no `contexts` field
