# Skillsets and `augy use`

> Status: Shipped (documented from v0.11.0, commit c725774). Skillsets were introduced in v0.10.0; `augy use` became broadly useful once v0.11.0 started installing skills as symlinks.

## Problem Statement

Developers collect skills for very different kinds of work: engineering (TDD, commits, refactoring), research (search, summarizing, citations), and writing (grammar, outlining). Agents usually load every skill in their skills folder. Having everything active all the time crowds the agent's context with skills that don't apply to the task at hand. Turning skills on and off by hand means deleting and recreating entries in each agent's skills folder, which is tedious and easy to get wrong. Users want to load skills by working context, on demand, instead of all-or-nothing (from the motivation in the original feature request).

## Solution

A **skillset** is a named list of installed skills, for example `engineering → tdd, github, commit`. Users manage skillsets with `augy skillset create|add|remove|list|show|delete`. `augy use <name>` makes one agent's active skills match the set. It removes the agent's skill symlinks that aren't in the set and creates symlinks for the set's skills that aren't linked yet. Skills are never copied or deleted. The single canonical copy of each skill stays on disk, so a skill shared by several skillsets exists only once. Skills installed as plain copies rather than symlinks are left alone. `--dry-run` previews the swap, `--agent` picks the agent, and `AUGY_DEFAULT_AGENT` sets a default agent.

## User Stories

1. As a developer who switches between kinds of work, I want to create a named skillset, so that I can group the skills I use for one kind of work.
2. As a developer, I want skillset names checked (letters, digits, and hyphens only), so that names stay simple to type and script.
3. As a developer, I want an error when I create a skillset whose name already exists, so that I don't wipe out an existing set by accident.
4. As a developer, I want to add several skills to a skillset in one command, so that building a set is quick.
5. As a developer, I want a warning, but no refusal, when I add a skill that isn't installed yet, so that I can plan a set first and install its skills later.
6. As a developer, I want adding a skill that's already in a set to be skipped with a note, so that my sets never contain duplicates.
7. As a developer, I want to remove skills from a skillset without uninstalling them, so that editing a set never deletes anything.
8. As a developer, I want a warning when I remove a skill that isn't in the set, so that I notice typos.
9. As a developer, I want to list all my skillsets with how many skills each has and when each was last updated, sorted by name, so that I can see my working modes at a glance.
10. As a developer, I want to see the skills in one skillset along with when it was created and last updated, so that I can check what a set will turn on.
11. As a developer, I want to delete a skillset, after confirming, without uninstalling or removing any skill files, so that cleaning up sets is always safe.
12. As a scripter or CI job, I want `augy skillset delete <name> --yes` to skip the confirmation, so that cleanup can be automated.
13. As a developer, I want `augy skillset` with no subcommand to show help, so that I can find the subcommands.
14. As a developer, I want `augy use <name>` to make my agent's active skills exactly match the set, so that I can switch from engineering mode to research mode with one command.
15. As a developer, I want `augy use` to remove only symlinks and never delete skill files, so that switching modes can't destroy a skill.
16. As a developer with hand-copied or legacy-copied skills, I want `augy use` to leave copies alone, so that skills it doesn't manage as links are never touched.
17. As a developer, I want one skill to belong to several skillsets while existing on disk only once, so that sets don't duplicate storage or drift apart.
18. As a developer, I want to preview a switch with `--dry-run` and see what would be removed, what would be added, and what is already active, so that I can check the change before applying it.
19. As a developer, I want to choose the agent with `--agent <id>`, so that I can switch modes for one agent without affecting the others.
20. As a developer who mostly uses one agent, I want `AUGY_DEFAULT_AGENT` to set that agent once, with `--agent` still taking precedence, so that I don't type the agent on every switch.
21. As a developer, I want `augy use` to pick a detected agent when I give neither `--agent` nor `AUGY_DEFAULT_AGENT`, so that the command works without extra flags.
22. As a developer, I want a clear error listing the known agent IDs when I name an agent augy doesn't recognize, or when it can't detect any agent, so that I can fix the command.
23. As a developer, I want skills in the set that aren't installed reported and skipped instead of failing the whole switch, so that one missing skill doesn't block me.
24. As a developer, I want `augy use` on an empty skillset to warn me and change nothing, so that I can't wipe out every active skill by accident.
25. As a developer, I want "already up to date" reported when the agent already matches the set, so that running `use` twice is harmless.
26. As a developer, I want a summary after the switch with counts of skills removed, added, and unchanged, plus any per-skill errors, so that I know the switch worked.
27. As a developer, I want new links to point at augy's canonical copy of each skill, so that later `augy update` runs reach the skills a skillset turned on.
28. As a developer, I want my skillsets kept in a readable file under my augy home, so that I can look at them, back them up, or edit them by hand.
29. As a developer, I want augy to stop with a clear error when the skillsets file is corrupted, instead of silently starting over, so that I don't lose my sets.

## Implementation Decisions

**Data and storage (user-visible contract)**
- Skillsets live in their own file, `~/.augy/skillsets.json` (under `AUGY_HOME` if set), separate from the skills lockfile. Format: `{ "version": 1, "skillsets": { "<name>": { "name", "skills": [...], "createdAt", "updatedAt" } } }`.
- A skillset holds skill names only. It doesn't record sources, versions, or agents. Membership is by name, and skills keep the order they were added in.
- If the file has invalid JSON, every skillset command stops with an error asking the user to fix or delete it. It's never reset silently.

**Skillset management rules**
- `create <name>`: the name must match letters, digits, and hyphens. Duplicate names are rejected. New sets start empty.
- `add <name> <skill...>`: the set must exist. Skills that aren't installed are added anyway, with a warning. Duplicates are skipped with a note.
- `remove <name> <skill...>`: the set must exist. Skills not in the set get a warning. Nothing is uninstalled.
- `list`: a table of name, skill count, and last-updated date, sorted by name.
- `show <name>`: created and updated timestamps, then the skills one per line.
- `delete <name> [--yes]`: asks for confirmation unless `--yes` is given. The confirmation states that no skills will be uninstalled. Skill files are never touched.
- Any command naming a skillset that doesn't exist is an error.

**`augy use <name> [--agent <id>] [--dry-run]` rules**
- Only one agent is affected per run. The agent is chosen by `--agent`, then `AUGY_DEFAULT_AGENT`, then the first detected agent in augy's fixed agent order. An unknown agent ID, or no detected agent, is an error.
- An empty skillset gives a warning, exits successfully, and changes nothing. This check runs before the agent is chosen.
- Skills in the set that aren't in the lockfile are warned about and skipped. If none of the set's skills are installed, augy warns and changes nothing.
- Only symlinks in the agent's skills folder are considered. A symlink whose name is in the set counts as already active. Every other symlink in the folder is removed. Entries that aren't symlinks (copies) are never removed.
- For each installed skill in the set that isn't already linked, a symlink is created pointing at the skill's canonical copy. If there isn't one, it points at this agent's recorded location for the skill, and failing that at any other agent's recorded location that still exists.
- The plan is always printed first: agent, skillset, Remove list, Add list, Already-active list. `--dry-run` stops after the plan.
- Problems with individual skills (unlink or link failures, or no location to link to) are collected and reported at the end. They don't abort the other changes.
- Removing a link never deletes the skill's files, and creating a link never copies anything.

## Testing Decisions

Observable behaviors that define correctness (acceptance criteria):

- Name validation accepts `engineering` and `my-set` and rejects spaces, underscores, and other punctuation.
- Create, add, remove, and delete produce the expected skillsets file. Duplicates are rejected or skipped as described. `updatedAt` changes on edits.
- Delete without `--yes` changes nothing unless the user confirms. Delete never changes skill files or the skills lockfile.
- A corrupted skillsets file makes commands stop with an error, and the file is left as it was.
- `augy use` on an agent folder holding a mix of in-set symlinks, out-of-set symlinks, and plain copies ends with exactly the in-set installed skills linked, the out-of-set symlinks gone, and the copies untouched.
- `--dry-run` prints the same plan a real run would carry out and leaves the folder unchanged.
- Agent resolution: `--agent` beats `AUGY_DEFAULT_AGENT`, which beats auto-detection. Unknown IDs and "no agent detected" are errors.
- Empty sets and sets with no installed skills change nothing. Skills that aren't installed are skipped with a warning.
- Running the same `use` twice reports "already up to date" the second time.
- A skill shared by two skillsets has one copy on disk no matter which set is active.

Current automated coverage: unit tests cover the skillset data helpers. Those tests check name validation (letters, digits, and hyphens accepted; spaces, underscores, and special characters rejected), creating a skillset (empty skill list, timestamps, and overwriting at the helper level), looking one up, listing, and deleting without disturbing the other sets. No automated tests cover the skillset commands as users run them (including the duplicate-name guard in `create`), reading and writing the skillsets file or handling a corrupt one, agent resolution, or any of the `augy use` behaviors. Those last ones are the riskiest part, because they change files on disk. They should be tested against temporary agent folders holding real symlinks and copies, with the results on disk asserted.

## Out of Scope

- Uninstalling, installing, or downloading skills. `augy use` only links skills that are already installed, and `skillset add` never installs.
- Switching several agents in one command. `--agent` takes one agent, and auto-detection picks one.
- Remembering which skillset is active, or reporting the current skillset.
- Renaming skillsets, nesting or composing them, or per-skillset versions or pins.
- Sharing skillsets through team manifests or the home repo. Skillsets aren't part of `augy bundle`, `augy sync`, or `augy home push/pull`. (I inferred this from the absence of any skillset handling in those features.)
- Managing skills installed as copies, including legacy per-agent copies and copies made by team-manifest sync.
- Atomic, all-or-nothing switching. Changes are applied one at a time, and per-skill failures are reported rather than rolled back.

## Further Notes

- **`augy use` removes every symlink not in the set, including ones augy didn't create (likely bug or undocumented hazard).** Any symlink in the agent's skills folder whose name isn't in the set is unlinked. That includes symlinks the user made by hand (for example to a local skill under development) and symlinks from other tools. The targets aren't deleted, but the user's own links vanish without warning.
- **The lockfile isn't updated by `augy use` (likely bug).** Links removed or added by `use` aren't reflected in which agents the lockfile says have each skill. As a result:
  - `augy list` and `augy info` still show skills as active for an agent after `use` removed them.
  - `augy uninstall` doesn't remove links that `use` created for agents not in the lockfile, which leaves dangling links once the canonical copy is deleted.
  - `augy diff` can fail with "Installed path does not exist" because it reads from a lockfile location that `use` removed.
  - `augy rollback` writes a plain copy back into an agent location that `use` deliberately switched off.
- **Copies in the set produce a misleading plan.** When a skill in the set already exists in the agent folder as a copy, `use` lists it under "Add", then fails with "Could not link" because the name is taken. Skills installed by team-manifest sync, by home-repo pull, and before v0.11.0 are copies, so for those users skillsets can neither turn such skills off nor link them cleanly. Self-authored skills are probably copies too (inferred).
- **Auto-detection silently picks one agent.** Without `--agent` or `AUGY_DEFAULT_AGENT`, `use` targets the first detected agent in augy's fixed order. OpenCode comes before Claude, then Codex, and so on. A user with several agents may switch the wrong one without noticing. The README's "auto-detect agent" doesn't say only one agent is affected.
- **README overstates `AUGY_DEFAULT_AGENT`.** The README says it's the default for "`augy use` and other commands that accept `--agent`". Only `augy use` reads it. Install and sync ignore it.
- **Not atomic.** The original feature request and in-code descriptions say "atomically swaps". Changes are actually applied one by one, and a failure partway through leaves a mixed state. The command still exits successfully when per-skill errors occur.
- **Messages that overstate success.** `skillset add` reports "Added a, b, c" even when some names were skipped as duplicates. `skillset remove` reports "Removed …" even for names that weren't in the set. The `use` header's skill count includes skills that aren't installed.
- **No referential cleanup.** Uninstalling a skill doesn't remove it from skillsets. Later `use` runs warn "not installed — skipping". Skill names given to `skillset add` aren't validated beyond the not-installed warning, so a typo stays in the set.
- **Hard-coded path in output.** `skillset create` always prints `~/.augy/skillsets.json`, even when `AUGY_HOME` points somewhere else.
- **Docs-site gap.** The docs site doesn't mention skillsets or `augy use`. Only the README documents them.
- **Unverified acceptance criteria from the original request.** The request asked that switching take under two seconds and listed a lint quality gate. No test measures switch time, and the project has no lint script.
- **Contrast with the skills lockfile.** A corrupt skillsets file stops augy with an error, which is good. That differs from the skills lockfile, which is silently treated as empty when corrupt, so the next write could wipe it. That behavior belongs to another PRD's area and is mentioned here only for consistency.
- Open question: should `use` be limited to symlinks that point into augy's canonical store, so that user-made links are safe? And should it record what it links and unlinks in the lockfile?
