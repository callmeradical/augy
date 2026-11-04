# Proposal

## Why

Most developers arrive at augy with skills already on disk: hand-copied into agent folders, cloned from a skills repo, installed by another tool, or self-authored. augy can't see those skills, so it can't list, update, diff, roll back, or share them. Reinstalling everything through augy is slow and error-prone, and people often don't remember where a skill came from. Skills that reach the registry with no known source are stuck in the same state until augy learns where they live on GitHub.

## What Changes

- New `augy scan` command that searches the skills folder of every supported agent, finds skill directories (a directory containing `SKILL.md`) that augy doesn't track, and works out where each came from: git remote, then `SKILL.md` frontmatter, then a matching tap entry.
- Scan shows results in two groups, "provenance detected" (with source, SHA when known, and a `git` / `frontmatter` / `tap` label) and "no provenance found" (with each agent path and the first line of `SKILL.md`).
- Scan is read-only until the user confirms. The user picks skills from a filterable, pre-selected list, then accepts each detected source, types a GitHub URL or `owner/repo[/path]`, or leaves it blank to import without a source. Each import is saved to the registry as soon as it finishes.
- After importing, scan finds tracked skills that also exist under the same name in other agents' folders and offers to register those agent paths.
- New `augy set-source <skill> <url>` command that attaches a GitHub source to a skill already in the registry. It accepts repo, tree, and blob URLs and `owner/repo[/path]` shorthand, checks the source exists on GitHub, and records the latest commit for that path.
- Both commands write the confirmed source into the skill's `SKILL.md` frontmatter so future scans can identify it without a git checkout or a tap.
- `augy list` flags sourceless skills and shows the exact `augy set-source` command to run.

## Capabilities

### New Capabilities

- `skill-scan`: Discovering untracked skills in agent skills folders, detecting their provenance, interactively importing them into the registry, and registering extra agent locations of tracked skills.
- `skill-source-attachment`: Attaching or replacing the GitHub source of a skill already in the registry via `augy set-source`, including URL forms, validation against GitHub, and frontmatter write-back.

### Modified Capabilities

None.

## Impact

- New commands: `augy scan`, `augy set-source <skill> <url>`.
- Files the user sees: `~/.augy/registry.json` (new entries, new agent locations, sources and SHAs) and each adopted skill's `SKILL.md` (a `source:` frontmatter line is added).
- `augy list` output: sourceless-skill hint (also covered by the `skill-inventory` change).
- Requires the GitHub CLI (`gh`) installed and logged in for source resolution, and `git` on the PATH for git provenance.
- Related PRDs/changes: `skill-inventory` (how sourceless skills appear in `augy list`), `team-manifests` (sourceless skills left out of `augy bundle` by default), `skill-versioning` (update, diff, rollback of adopted skills), `taps-and-discovery` (tap matching), `skillsets` (adopted skills are not in the canonical store).
- Out of scope: moving adopted skills into the canonical store, non-GitHub sources, non-`origin` remotes, content comparison, removing or deduplicating skills on disk, non-interactive scanning, adopting skills outside agent skills folders, and clearing a source.
