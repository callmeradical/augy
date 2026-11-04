# Migrating Existing Skills to the Canonical Store

> Status: **Draft — not shipped.** Partial work-in-progress exists only in an uncommitted stash and an untracked `augy migrate` command in the working tree (as of 2026-11-03, on top of v0.11.0 / commit c725774). Open questions below must be settled before this is built.

## Problem Statement

Starting with v0.11.0, augy keeps one copy of each skill in a canonical store, `~/.augy/store/<skill>/`. Each agent's skills folder holds a symlink to that copy, so one update reaches every agent and the skill takes up space only once. See [multi-agent-support.md](multi-agent-support.md).

Every skill installed **before** v0.11.0 is still a set of separate copies, one in each agent's folder. Several commands still produce copies today: `augy sync`, `augy home pull`, `augy author new`, `augy rollback`, and skills adopted through `augy scan`. Users with those skills don't get the store's benefits, and things go wrong for them in quiet ways:

- **Updates stop reaching their agents.** On the first `augy update` of a copy-based skill, augy writes the new version to the store and also to each agent's copy, then records the skill as store-backed. Later updates refresh only the store. The agents' copies were never turned into symlinks, so they stay frozen at that version while augy reports the skill as current.
- **Skillsets don't work with them.** `augy use` only manages symlinks and leaves copies alone. A copy-based skill in a skillset shows up as something to add, then fails with "Could not link." See [skillsets.md](skillsets.md).
- **Copies drift apart.** When a user edits one agent's copy, the others no longer match. augy has no way to show or settle the difference.
- **Disk use grows with the number of agents.** It should be one copy per skill.

Users have no supported way to move these skills into the store short of uninstalling and reinstalling each one. That loses version history and pin state, and it isn't possible at all for skills with no source (adopted or authored ones).

## Solution

augy should give users one safe command that brings every copy-based skill under the canonical store. For each skill it should place one authoritative copy in the store and replace each agent's copy with a symlink to it. Version history, pin state, tags and every other registry detail should carry over. The command should be safe to run more than once, show what it will do before doing it, and never quietly throw away a user's edits.

Once migrated, a skill should behave the same as one installed fresh on v0.11.0: it updates in every agent at once, works with skillsets, and has a single copy on disk.

### What exists today (draft work)

The uncommitted work adds a top-level `augy migrate` command. For each registered skill not yet in the store, it:

- picks the first real (non-symlink) directory among the skill's agent installs and copies it into the store
- replaces every agent install of that skill with a symlink
- records the skill as store-backed
- skips skills with no real directory and reports them
- skips skills already migrated, so running it again is safe

It prints a summary of migrated and skipped skills.

The draft was written against an earlier store location, `~/.augy/skills/`, and an earlier registry field name. The committed v0.11.0 store uses `~/.augy/store/` and must be the target. The draft can't run against the committed code at all, because it depends on pieces that were never committed. If those pieces were restored as they are, it would build a second, parallel store.

## User Stories

1. As a developer who installed skills before v0.11.0, I want one command that moves all my skills into the canonical store, so that I get the store's benefits without reinstalling everything.
2. As a developer, I want migration to keep each skill's version history, so that I can still roll back afterwards.
3. As a developer, I want migration to keep pin state, tags, the source tap and the recorded SHA, so that nothing about how I manage a skill changes except where its files live.
4. As a developer, I want each agent's copy replaced with a symlink to the one stored copy, so that later updates reach every agent at once.
5. As a developer whose skills already stopped updating in some agents, I want migration to repair those skills, so that every agent shows the current version again.
6. As a developer, I want to preview what migration will do before it changes anything, so that I can confirm it won't touch files I care about.
7. As a developer who edited one agent's copy of a skill, I want to be told when that skill's copies differ, so that my edits aren't silently overwritten by another copy.
8. As a developer, I want to choose which copy becomes the stored one when copies differ, so that I keep the version I meant to keep.
9. As a developer, I want migration to be safe to run any number of times, so that running it again after a partial failure finishes the job without damage.
10. As a developer, I want a clear list of the skills that couldn't be migrated and why, so that I can fix them by hand.
11. As a developer, I want a failure on one skill to leave that skill exactly as it was, so that a migration error never leaves an agent without a working skill.
12. As a developer, I want skills with no source (adopted or authored) to be migrated too, so that every skill I manage benefits, not just the ones from GitHub.
13. As a developer who adopted skills with `augy scan`, I want those copies migrated, so that adopted skills work with skillsets.
14. As a skillset user, I want my copy-based skills migrated, so that `augy use` can switch them on and off.
15. As a developer, I want augy to tell me when I have copy-based skills that could be migrated, so that I learn about the command when it matters.
16. As a developer, I want the skills migration produces to work with every other command (update, diff, rollback, uninstall, use, list, info), so that migrated skills behave like ones installed fresh.
17. As a developer, I want uninstalling a migrated skill to remove its stored copy as well as its symlinks, so that nothing is left behind.
18. As a CI pipeline, I want migration to run without prompts, so that I can migrate provisioned machines automatically.
19. As a developer with a custom augy home (`AUGY_HOME`), I want migration to use that location's store, so that my setup is respected.
20. As a developer, I want migration to leave alone any skill augy doesn't track, so that it only affects skills I've put under augy's management.

## Implementation Decisions

Product-level decisions and behavioral rules. Items marked **(open)** are proposals to confirm in grilling.

- **Target location:** the store that shipped in v0.11.0, `~/.augy/store/<skill>/`, which follows `AUGY_HOME`. The draft's `~/.augy/skills/` location is dropped.
- **What a migrated skill is:** one stored copy, with every agent install of that skill a symlink to it, and the registry recording the skill as store-backed. That is the same end state as a fresh v0.11.0 install.
- **Carried over unchanged:** source, SHA, version history, pin state, tags, the source tap, and the list of agents.
- **Safe to repeat:** skills already fully store-backed are skipped. **(open)** Skills marked store-backed whose agent installs are still copies (the update gap above) count as *not* migrated and get repaired.
- **Only tracked skills:** migration touches only skills in the registry and only the agent paths recorded for them.
- **One failure stays contained:** a failure on one skill must not change that skill's files or affect any other skill.
- **(open) Diverged copies:** when a skill's agent copies differ, the draft silently keeps the first one. Proposed instead: detect the difference, then prompt the user to pick, or skip the skill with a report in non-interactive mode.
- **(open) Preview and confirmation:** a `--dry-run` preview, and a confirmation prompt that `--yes` skips, matching `augy sync`.
- **(open) Command name and placement:** the draft adds a top-level `augy migrate`. `augy tag migrate` already exists and means something unrelated (assigning context tags). Options are a top-level `migrate`, a more specific name such as `augy store migrate`, or making it automatic.
- **(open) Automatic vs. explicit:** whether migration should also happen on its own, for example when a legacy skill is updated or used, instead of relying only on a command the user has to know about.
- **(open) Closing the source of new copies:** sync, home pull, author new, rollback and scan-adoption still produce copies. Without changing them, migration has to be run over and over. That makes it a scope decision for this PRD.

## Testing Decisions

Correctness is judged by the files on disk, the registry, and what the command prints.

Acceptance criteria:

- After migration, each migrated skill has one copy in the store. Each of its recorded agent installs is a symlink to that copy, and the registry records the skill as store-backed.
- History, pin state, tags, source, SHA and tap are the same before and after.
- A second run changes nothing and says every skill is already migrated.
- A skill with no usable real directory is skipped, reported, and left untouched.
- A failure partway through one skill leaves that skill's agent installs as they were before the run.
- After migration, `augy update` refreshes the skill in every agent, and `augy use` can link and unlink it.
- After migration, `augy uninstall` removes the symlinks and the stored copy.
- With `AUGY_HOME` set, the store under that home is used.
- **(If adopted)** Diverged copies are detected, and nothing is overwritten unless the user chooses.
- **(If adopted)** A preview run changes nothing on disk.

Coverage today: none. The draft command has no automated tests, and no existing test runs a command against a real temporary augy home. The closest prior art is the command tests for authoring and the home repo, which replace the registry, filesystem and prompts with stand-ins. Migration's acceptance criteria are about the real state of files and symlinks on disk, so filesystem-level tests against a temporary home would serve them better. That would be new prior art for this codebase.

## Out of Scope

- Changing how fresh installs work. They already use the store.
- Migrating skills augy doesn't track. Users bring those under management first with `augy scan` (see [adopting-existing-skills.md](adopting-existing-skills.md)).
- Merging diverged copies line by line. At most the user picks one copy.
- Moving or rewriting the version archive under `~/.augy/versions/`.
- Reverting a store-backed skill to per-agent copies.

## Further Notes

- **State of the working tree (2026-11-03):** an unresolved `git stash pop` conflict affects install, uninstall, update, use and the registry. The stash came from v0.10.0. Its changes to those files are an earlier version of the canonical-store work that was later committed (commit f1fe10b), so the committed side should win those conflicts. The only stash work not already shipped in another form is the `augy migrate` command. That file is untracked, so it survives whatever happens to the stash. It still needs to be pointed at the committed store location and registry field before it can work.
- **Bug in shipped behavior that motivates this PRD:** see the first bullet of the Problem Statement. It affects every user upgrading from 0.10.x or earlier, and happens with no warning.
- **Risks in the draft:**
  - When copies have diverged, it silently keeps the first agent's copy.
  - It deletes each agent install before creating the symlink, so a failure in between leaves that agent without the skill.
  - It has no preview or confirmation.
  - It writes the registry once at the end, so a crash midway leaves files migrated but not recorded.
- Related PRDs: [multi-agent-support.md](multi-agent-support.md), [skill-versioning.md](skill-versioning.md), [skillsets.md](skillsets.md), [team-manifests.md](team-manifests.md), [home-repo.md](home-repo.md).
