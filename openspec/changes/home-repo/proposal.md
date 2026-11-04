# Proposal

## Why

A developer's set of AI agent skills lives only on the machine where it was built, so a new or rebuilt machine means reconstructing it by hand, and self-authored skills (which have no upstream) are lost if the machine is lost. The team manifest workflow (`augy bundle` / `augy sync`) makes the user manage the manifest by hand and skips source-less skills, which are the ones a person most needs to back up.

## What Changes

- Add a `home` command group that lets each user designate one personal GitHub repository, in `owner/repo` form, as their **home repo**.
- `augy home set <owner/repo>` saves the home repo, the manifest path inside it (`--path`, default `augy.json`), and the authored-skills directory (`--skills-path`, default `skills`). It validates the identifier and confirms what was saved. Re-running it replaces the configuration.
- `augy home show` prints the configuration, or tells the user how to set one.
- `augy home push` snapshots the machine into the home repo. It writes a manifest listing every installed skill (external skills by source, authored skills with an empty source) and their context tags, and copies the files of authored skills into the skills directory. It then commits with a descriptive message and pushes using the user's own git credentials. Skills from older versions whose source points back at the home repo are reclassified as authored.
- `augy home pull` restores skills from the home repo. It offers one filterable picker of authored and external skills, pre-selected by the machine's context (or `--context`). It then asks which detected agents to install to (or takes `--agent`), and installs authored skills from the repo's files and external skills through the `augy sync` path. `--dry-run` previews without changing anything.
- No augy account, token, or hosted service is involved.

## Capabilities

### New Capabilities

- `home-repo`: configuring a personal GitHub home repo, and backing up (push) and restoring (pull) a machine's skills through it, including the files of self-authored skills.

### Modified Capabilities

None.

## Impact

- New user-facing commands: `augy home set`, `augy home show`, `augy home push`, `augy home pull`.
- augy's local lockfile (`~/.augy/registry.json`, or under `AUGY_HOME`) gains the home repo configuration.
- The user's GitHub home repo receives an `augy.json`-shaped manifest (`version`, `skills`, optional `contexts`) and a skills directory of authored skill files.
- Related PRDs and changes: Machine Contexts and Tags (`machine-contexts-and-tags`: machine context and tag matching that drive pull pre-selection), Skill Authoring (`skill-authoring`: skills with an empty source), Team Manifests (the `augy sync` engine that installs external skills on pull), Skill Versioning (`augy update` skips authored and home-repo-sourced skills).
- Out of scope: creating the GitHub repo, non-GitHub hosts or URLs, merging state from several machines, deleting skills from the home repo, non-interactive pull, storing credentials, and syncing the machine context.
