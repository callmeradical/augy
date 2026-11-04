# Spec Delta

## Purpose

Defines how augy reaches GitHub: through the user's own installed and authenticated GitHub CLI, so that private and internal repos and CI credentials work without any augy-specific token or account, and so that access problems are reported as such.

## ADDED Requirements

### Requirement: GitHub lookups use the GitHub CLI login
augy SHALL perform every GitHub metadata lookup (listing repo contents, resolving branches and tags, reading version SHAs) through the user's installed, authenticated GitHub CLI (`gh`), so that its credentials, rate limits, and host settings apply. Sources: US-23, PD: "Every GitHub metadata lookup goes through the user's installed and authenticated GitHub CLI (`gh`)."

#### Scenario: Private repo lookup
- **WHEN** the user is signed in to `gh` with access to a private repo and installs from it, with no other GitHub credentials configured
- **THEN** augy lists the repo's skills and their versions

#### Scenario: Authenticated rate limit
- **WHEN** augy makes GitHub lookups while `gh` is signed in
- **THEN** those lookups count against the signed-in user's rate limit, not the unauthenticated one

### Requirement: Skill downloads use the same GitHub login
Downloading skill files SHALL use the same GitHub credentials as the lookups, so that a repo the user's `gh` login can see can also be downloaded. Sources: US-23 ("so that private and internal repos work without a separate token or account"); the PRD's Further Notes report as a likely defect that downloads authenticate only through the undocumented `GIGET_AUTH` variable.

#### Scenario: Private repo download
- **WHEN** a user signed in to `gh`, with `GIGET_AUTH` unset, installs a skill from a private repo they can access
- **THEN** the skill's files are downloaded and installed

#### Scenario: Downloads are authenticated
- **WHEN** augy downloads skill files while `gh` is signed in
- **THEN** the downloads count against the signed-in user's rate limit, not the unauthenticated one

### Requirement: CI credentials through GH_TOKEN or GITHUB_TOKEN
augy SHALL work on a headless runner where the only GitHub credential is `GH_TOKEN` or `GITHUB_TOKEN` in the environment, because the GitHub CLI accepts those as credentials. augy SHALL NOT require any augy-specific token. Sources: US-24, PD: "`GITHUB_TOKEN` / `GH_TOKEN` | Not read by augy itself. They matter because the GitHub CLI ... accepts them as credentials."

#### Scenario: Token-only CI runner
- **WHEN** a CI job with `gh` installed and only `GH_TOKEN` set runs `augy install owner/private-repo --yes --agent claude`
- **THEN** the install succeeds using that token

### Requirement: GitHub access failures are reported as access failures
When the GitHub CLI is missing or not authenticated, augy SHALL report that GitHub access is the problem. It SHALL NOT present the failure only as a raw error from the failed `gh` command or as a skill not being found. Sources: US-23; the PRD's Further Notes report these confusing errors as a gap.

#### Scenario: GitHub CLI not installed
- **WHEN** `gh` is not on `PATH` and the user installs from `owner/repo`
- **THEN** augy fails with a message saying the GitHub CLI is needed

#### Scenario: GitHub CLI signed out
- **WHEN** `gh` is installed but not authenticated and the user installs a skill by bare name
- **THEN** augy reports the access problem rather than "not found in any tap"
