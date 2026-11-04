# Proposal

## Why

People who use AI agents on several machines rarely want the same skills everywhere: work-only skills belong on the work laptop, personal ones on the personal laptop, and generic ones everywhere. A home repo puts all of a person's skills in one place, but without a way to say which skills belong where, every restore means choosing skill by skill. That is tedious and makes it easy to put a work-only skill on a personal machine or the reverse.

## What Changes

- Add **skill tags (contexts)**: each installed skill can carry zero or more free-form tags (conventionally `work`, `personal`, `universal`; any string accepted).
  - `augy tag set <skill> [contexts...]` replaces a skill's tags, and clears them when given none.
  - `augy tag show <skill>` displays a skill's tags, or says it is untagged and treated as universal.
  - `augy tag migrate` walks through every untagged skill interactively and saves after each answer.
- Define one matching rule: untagged and `universal` skills match every context, and other skills match a context only by exact tag.
- Tags travel with the skills: `augy home push` saves them in the home repo manifest, and `augy home pull` reads them from there (falling back to local tags) for pre-selection and display, and reapplies them to the skills it installs.
- Add a **machine context**: `augy context set <ctx>`, `augy context show`, and `augy context clear` manage one local context per machine. It is never pushed.
- On `augy home pull`, the context in effect (`--context`, then machine context) decides which skills are **pre-selected**. Other skills are never hidden, and no other command uses the context.

## Capabilities

### New Capabilities

- `machine-context`: a single, local, per-machine context and the way it, or a one-off `--context`, decides pre-selection on `augy home pull`.
- `skill-tags`: free-form context tags on installed skills, the `tag set` / `tag show` / `tag migrate` commands, the context matching rule, and how tags travel through the home repo manifest.

### Modified Capabilities

None.

## Impact

- New user-facing commands: `augy context set|show|clear` and `augy tag set|show|migrate`.
- `augy home pull` gains context-driven pre-selection, a `--context` flag, tag hints per entry, and the active context in its picker header.
- augy's local lockfile (`~/.augy/registry.json`, or under `AUGY_HOME`) stores per-skill tags and the machine context.
- The home repo manifest carries an optional `contexts` map (skill name to tag list).
- Related PRDs and changes: Home Repo (`home-repo`: push and pull), Team Manifests (the manifest format allows `contexts`), Skillsets (a separate mechanism, not affected).
- Out of scope: hiding or blocking skills by context, applying context outside `home pull`, multiple contexts per machine, syncing the machine context, tagging skills that aren't installed, custom tags in `tag migrate`, listing skills grouped by tag, and case-insensitive tags.
