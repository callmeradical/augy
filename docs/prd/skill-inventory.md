# Skill Inventory

> Status: Shipped (documented from v0.11.0, commit c725774). Covers `augy list`, `augy list --json`, `augy info <skill>`, and the registry lockfile as a user-facing artifact.

## Problem Statement

Once skills are spread across several AI agents, a developer can't easily answer basic questions:

- What do I have installed?
- Where did each skill come from?
- Which version is on disk?
- Which agents have it?
- Is it pinned?
- What earlier versions can I go back to?

Agents don't keep a record of this, and digging through a dozen dot-folders doesn't scale. Hosted skill marketplaces keep this state on their servers, where the user can't easily inspect it, script against it, or put it in version control.

## Solution

augy keeps all of this in one plain-JSON lockfile, `~/.augy/registry.json`, and offers two read-only views of it:

- **`augy list`** prints a compact summary of every skill in the registry. For each skill it shows the name, a pinned badge, the short SHA (or "untracked" if the skill has no source), a count of previous versions, the source, the agents it's deployed to (inactive ones marked), the last-updated date, and the three most recent previous versions. Skills with no source get a warning that includes the exact `augy set-source` command to fix it.
- **`augy list --json`** prints the whole registry as formatted JSON, for scripts and tooling.
- **`augy info <skill>`** shows everything about one skill:
  - source, and the tap it came from (with the tap's description)
  - short and full SHA
  - install date, and the last-updated date if different
  - pin status
  - each agent with its deployment path, flagged when the path is missing on disk or inactive
  - the full version history, newest first, each entry marked as archived or "archive missing"
  - a preview of the skill's `SKILL.md`

The lockfile is meant to be read and owned by the user. It's human-readable JSON, rewritten atomically so it's never left half-written, and its location can be moved with `AUGY_HOME`.

## User Stories

1. As an individual developer, I want to list every skill augy manages, so that I know what context my agents are loading.
2. As a developer, I want each skill's short SHA in the list, so that I can tell at a glance which version is installed.
3. As a developer, I want to see which agents each skill is deployed to, so that I can spot skills missing from an agent I use.
4. As a developer who sometimes deactivates skills, I want inactive deployments marked as inactive, so that I don't mistake them for active ones.
5. As a developer, I want pinned skills to carry a `[pinned]` badge, so that I remember which skills `augy update` will skip.
6. As a developer, I want to see how many previous versions of each skill are saved, along with the most recent few, so that I know whether a rollback is possible.
7. As a developer who adopted skills without a known source, I want those skills shown as "untracked" with the exact `augy set-source` command to run, so that I can enable updates for them.
8. As a developer with nothing installed, I want `augy list` to point me to `augy install`, so that an empty list doesn't leave me stuck.
9. As a CI pipeline or script author, I want `augy list --json` to print the raw registry, so that I can query installed skills, sources, and SHAs with standard JSON tools.
10. As a developer debugging one skill, I want `augy info <skill>` to show its source, the tap it came from, and its full SHA, so that I can match it to an exact upstream commit.
11. As a developer, I want `augy info` to show the exact filesystem path for each agent the skill is deployed to, so that I can open or inspect the files the agent actually reads.
12. As a developer, I want `augy info` to flag deployment paths that no longer exist, so that I notice when something outside augy deleted a skill.
13. As a developer considering a rollback, I want the full version history, newest first, with each entry marked "archived" or "archive missing", so that I know which versions can actually be restored.
14. As a developer, I want `augy info` to show a short preview of the skill's `SKILL.md`, so that I can remember what a skill does without opening the file.
15. As a developer, I want `augy info` to tell me whether a skill is pinned and that pinned skills are skipped during update, so that I understand why it isn't upgrading.
16. As a developer who mistypes a skill name, I want `augy info` to say the skill wasn't found and point me to `augy list`, so that I can find the right name.
17. As a developer who values control, I want the whole inventory stored in one plain-JSON lockfile I can read in any editor, so that no hidden database or remote service holds my state.
18. As a developer, I want the lockfile pretty-printed with stable formatting, so that I can diff it between points in time or commit it to my dotfiles.
19. As a developer, I want lockfile writes to be atomic, so that an interrupted command never leaves a half-written registry.
20. As a developer with an older registry file, I want augy to fill in sections that are missing from older formats (for example, taps), so that upgrading augy doesn't break my existing lockfile.
21. As a developer who keeps tool state in a custom location, or a test harness that needs an isolated environment, I want `AUGY_HOME` to move the lockfile and all augy state, so that I control where it lives.
22. As an enterprise or firewalled user, I want listing and inspecting skills to work entirely offline from the local lockfile, so that inventory doesn't depend on network access.
23. As a team lead auditing a teammate's setup, I want them to send me their `augy list` output or `augy list --json` dump, so that I can see their exact sources and SHAs.

## Implementation Decisions

- **Both commands are read-only.** `list` and `info` never change the registry or skill files, and they make no network calls. All information comes from the lockfile plus local checks (whether each path exists, whether each archive exists, and the `SKILL.md` contents).
- **What counts as "untracked" in list.** A skill is shown as "untracked" when it has no source or its SHA is `unversioned`. Otherwise list shows `@<short SHA>`.
- **History shown by list.** List shows the three most recent previous versions, newest first, plus a total count. Info shows all of them.
- **Info checks the disk.** Info checks every agent deployment path and every version archive, and reports missing ones in red.
- **Description preview.** Info reads `SKILL.md` from the first active agent deployment. It skips the first top-level heading and shows up to five non-empty lines, stopping at the next heading.
- **`--json` prints the entire registry, not only the skills.** That includes:
  - the `version` field
  - all registered `taps`
  - all `skills`
  - the `home` repo configuration, if set
  - the local `machineContext`, if set
- **Skill order.** Skills appear in the order they were first added to the registry. They aren't sorted.
- **Not-found handling.** `info` with an unknown skill name prints an error and exits with a non-zero status.
- **On-disk layout under `~/.augy/` (or `$AUGY_HOME`):**
  - `registry.json`: the lockfile
  - `store/<skill>/`: the canonical copy of each skill installed with the store model; agent folders link here
  - `versions/<skill>/<sha>/`: archived snapshots
  - `skillsets.json`: named skill groups

  (The skillsets file is covered by the skillsets PRD.)
- **Lockfile content per skill (user-visible contract):**
  - name
  - source (may be empty)
  - full and short SHA (`unversioned` when the source is unknown)
  - install and update timestamps
  - pinned flag
  - optional context tags
  - optional tap
  - optional store path
  - a map of agent ID to deployment path and active flag
  - an ordered version history (oldest first), where each entry has a SHA, a timestamp, and an archive path

  An optional free-text `label` is displayed by `info` when present.
- **Writes are atomic.** The file is written to a temporary file and then renamed into place.
- **A missing lockfile is treated as an empty registry.**

## Testing Decisions

Observable behaviors that define correctness:

- With an empty registry, `augy list` prints the "No skills installed" hint and `augy list --json` prints a valid empty registry document.
- For a skill with a source and SHA, list shows `@<7-char SHA>`, the source, its agents, and the updated date. For a sourceless skill, list shows "untracked", "source: unknown", and the `augy set-source` hint.
- Pinned skills show `[pinned]`. Inactive agent deployments show "(inactive)".
- `augy list --json` output can be parsed and matches the lockfile on disk exactly.
- `augy info` on an unknown skill exits non-zero with a "not found" message.
- `augy info` marks a deployment path "(missing!)" when it doesn't exist on disk, and marks a history entry "[archive missing]" when its snapshot folder is gone.
- `augy info` lists version history newest first.
- After any augy command that writes, the lockfile is valid, pretty-printed JSON, and an interrupted write never leaves a partial file in place.
- Setting `AUGY_HOME` makes augy read and write the lockfile under that folder.

Current automated test coverage: the registry's home-repo configuration and machine-context helpers, and the context-matching rules, have unit tests. Nothing automated covers `augy list`, `augy list --json`, `augy info`, the lockfile read/write cycle, migration of older lockfiles, or `AUGY_HOME`.

## Out of Scope

- Filtering, sorting, or searching the inventory. List has no options other than `--json`, and info takes exactly one skill.
- Showing whether a skill is up to date with upstream. That's done by `augy update` and `augy search`. List and info never contact GitHub.
- Machine-readable output for `augy info`. There's no `--json` for info.
- Editing metadata through these commands. There's no command to set a skill's `label`.
- Showing context tags or the canonical store path in list or info. Both are in the lockfile and in `--json` output only.
- Importing or applying a registry from another machine. The shareable, consumable artifact is the `augy.json` manifest (see the team-manifests PRD), not the lockfile.
- Lockfile schema validation or repair.

## Further Notes

Known gaps, inconsistencies, and likely bugs. These come from reading the code and haven't been reproduced unless noted.

- **A corrupted lockfile is silently treated as empty.** If `registry.json` can't be parsed (for example, after a hand edit with a syntax error), augy acts as if it's empty and gives no warning. `augy list` then reports "No skills installed", and the next command that writes will overwrite the file, dropping every skill, tap, and home setting. This undercuts the "readable, editable lockfile" promise.
- **The info description preview doesn't skip YAML frontmatter.** Most `SKILL.md` files start with a `---` frontmatter block, so the "Description" section of `augy info` will usually show the raw frontmatter lines (`---`, `name: ...`, `description: ...`) instead of prose. The scan command's preview does skip frontmatter, so the two previews behave differently.
- **Sourceless skills display oddly in info.** For a skill with no source, `info` shows an empty source line (list shows "unknown") and a SHA of `unversi  (full: unversioned)`, because the short SHA is the word `unversioned` cut to seven characters.
- **The description preview reads from an agent folder, not the canonical store.** It uses the first active agent deployment and shows nothing if no deployment is active or that path is missing.
- **The README overstates how shareable the lockfile is.** It says the lockfile can be "commit[ted], and share[d]". It contains absolute, machine-specific paths (agent deployments, store, archives), the local machine context, and home-repo settings, so it isn't portable between users or machines, and no augy command reads another machine's registry. Teams should share `augy.json` instead. Inferred: the README probably means sharing for inspection or audit.
- **The README's layout diagram is incomplete.** It shows `registry.json` and `versions/` but leaves out `store/` and `skillsets.json`.
- **`--json` exposes local-only settings.** The README calls it "raw registry JSON", which is accurate. Anyone sharing that output for audit should know it includes the home-repo configuration and machine context, which the registry itself describes as "local only, never pushed".
- The README says list shows "version history". It shows a count and the last three entries; the full history is only in `info`.
- Dates use the system locale's format, so the output is consistent on one machine but differs between machines.
- Open question: should `augy list` warn when deployment paths are missing, as `augy info` does? Today it doesn't check the disk.
