# Proposal

## Why

Many augy users write their own skills. Without tooling, that means finding each agent's skill folder, creating the directory and `SKILL.md` by hand, and copying it into every agent, and augy then sees the result only as an unknown, untracked folder with no upstream, no record, and no backup. AI agents are well placed to help draft skills, but they don't know augy's conventions or workflow.

## What Changes

- Add an `author` command group:
  - `augy author new <name>` scaffolds a skill from a starter template into each chosen detected agent. It registers the skill in augy's lockfile as **authored** (empty source) and opens it in the user's editor. `--no-edit` skips the editor.
  - `augy author edit <name>` opens an installed skill's folder in the user's editor.
- Make authored skills first-class in augy's lifecycle: `augy update` always skips them with a note, `augy home push` backs up their files, `augy home pull` restores them, and they can be tagged like any other skill.
- Ship a bundled `author` skill in the augy package and repository. Once installed into an agent, it teaches the agent what an augy skill is, the authoring workflow (scaffold, write, test, back up), and how to write a good `SKILL.md`, and it includes a template and writing tips.

## Capabilities

### New Capabilities

- `skill-authoring`: scaffolding and editing self-authored skills, treating them as authored (source-less) throughout augy's lifecycle, and the bundled `author` meta-skill.

### Modified Capabilities

None.

## Impact

- New user-facing commands: `augy author new <name> [--no-edit]` and `augy author edit <name>`.
- New skill folders `<agent skills folder>/<name>/SKILL.md` in the chosen agents. Lockfile entries with an empty source and version `unversioned`.
- `augy update` output gains a note naming the authored skills it skipped.
- The augy package and repository ship `skills/author/`, installable with `augy tap add callmeradical/augy --path skills` followed by a normal install.
- Related PRDs and changes: Home Repo (`home-repo`: push and pull of authored files), Machine Contexts and Tags (`machine-contexts-and-tags`: tagging), Skill Versioning (update's skip rules), Taps and Discovery (tap install route for the bundled skill).
- Out of scope: publishing authored skills, versioning them inside augy, linting or testing skill content, a non-interactive `--agent` for `author new`, keeping multi-agent copies in sync, rename, delete, or fork through `author`, and auto-installing the bundled skill.
