# Proposal

## Why

Developers collect skills for very different kinds of work (engineering, research, writing), and agents load every skill in their skills folder, so skills that don't apply to the task crowd the agent's context. Turning skills on and off by hand means deleting and recreating entries in each agent's skills folder, which is tedious and error-prone. Users want to load skills by working context, on demand, instead of all-or-nothing (PRD: docs/prd/skillsets.md, Problem Statement).

## What Changes

- Add **skillsets**: named lists of installed skill names (for example `engineering → tdd, github, commit`), stored in a readable file under the augy home, separate from the skills lockfile.
- Add `augy skillset create|add|remove|list|show|delete` to manage skillsets. Names are restricted to letters, digits and hyphens; duplicates are rejected on create and skipped on add; adding a not-yet-installed skill warns but proceeds; removing or deleting never uninstalls anything; delete confirms unless `--yes` is given; `augy skillset` alone shows help.
- A corrupted skillsets file stops every skillset command with an error instead of being reset.
- Add `augy use <name> [--agent <id>] [--dry-run]`, which makes one agent's active (symlinked) skills match a skillset: it removes the agent's symlinks that aren't in the set and links the set's installed skills that aren't linked yet, pointing at augy's canonical copy. Skills are never copied or deleted, and plain copies in the skills folder are left alone.
- `augy use` prints its plan (Remove / Add / Already active) before acting, stops after the plan with `--dry-run`, reports "already up to date" when nothing changes, and ends with a summary of counts and per-skill errors.
- Agent selection for `augy use`: `--agent`, then `AUGY_DEFAULT_AGENT`, then the first detected agent. Unknown agents and "no agent detected" are errors that list the known agent IDs.
- Guard rails: an empty skillset, or one with no installed skills, warns and changes nothing; skills that aren't installed are reported and skipped.

## Capabilities

### New Capabilities

- `skillsets`: Creating, editing, listing, showing and deleting named skillsets, the validation rules on names and membership, and the skillsets file the user can read, back up and edit.
- `skillset-activation`: `augy use`, which switches one agent's active skills to match a skillset by adding and removing symlinks, including agent selection, the printed plan, `--dry-run`, the guard rails, and the end-of-run summary.

### Modified Capabilities

None.

## Impact

- New commands: `augy skillset` (with `create`, `add`, `remove`, `list`, `show`, `delete`) and `augy use`.
- New environment variable read by `augy use`: `AUGY_DEFAULT_AGENT`.
- New user-visible file: `skillsets.json` under the augy home (`~/.augy/` or `AUGY_HOME`).
- User-visible effect on disk: symlinks in one agent's skills folder are created and removed. Skill files in the canonical store, plain-copy skills, and the skills lockfile are not modified.
- Related: multi-agent-support (canonical store, agent detection and order, `AUGY_HOME`), store-migration (turning copy-based skills into store-backed links so skillsets can manage them), skill-installation (the lockfile that defines which skills are installed).
- Out of scope: installing or uninstalling skills, switching several agents at once, remembering the active skillset, renaming or composing skillsets, sharing skillsets via team manifests or the home repo, managing copy-based skills, and atomic all-or-nothing switching.
