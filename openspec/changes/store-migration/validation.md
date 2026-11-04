# Validation: store-migration

The spec was checked against two targets:

- **HEAD** is committed code at c725774, read with `git show HEAD:<path>` and run from a `git archive HEAD` sandbox.
- **Draft** is the untracked `src/commands/migrate.ts` plus `stash@{0}`. The stash is based on 45b9ce7 (v0.10.0). It was run from a sandbox built as `git archive 45b9ce7` + `patch -p1 < (git stash show -p stash@{0})` + the copied `migrate.ts`. That combination typechecks cleanly (`tsc --noEmit`).

The draft can't be loaded on top of HEAD. HEAD's `registry.ts` doesn't export `canonicalSkillPath` or `canonicalSkillsDir`, and `RegistrySkill` has no `canonicalPath`. `tsc` gives 4 errors. Importing the module under tsx fails with `The requested module '../registry.js' does not provide an export named 'canonicalSkillPath'`. The Draft column therefore describes the draft in its own v0.10.0+stash world. Used as a drop-in on HEAD, it would be Missing everywhere.

All experiments ran with `HOME` and `AUGY_HOME` set to temp directories, a fake `gh` on `PATH`, and real `giget` downloads of the public `callmeradical/augy/skills/author`. Line references to the draft's `update.ts` and `rollback.ts` mean the 45b9ce7+stash files. `rollback.ts`, `versions.ts`, `diff.ts`, `list.ts` and `info.ts` are byte-identical between 45b9ce7 and HEAD.

## Does the problem exist at HEAD?

Yes. All three symptoms were confirmed by running them:

1. **Update gap.** The setup was a copy-based `author` skill in claude and opencode with no `storePath`. `augy update author --all` downloaded to `store/author` and also rewrote both agent folders as real directories, then set `storePath` (`update.ts:183-202`). After a marker file was dropped in both agent copies, a second update refreshed only the store. Both agent copies still held the marker and the old content, and a third run said "All skills are up to date!"
2. **Skillsets fail on copies.** The agent folder held a real directory `tdd`, and `augy use with --agent claude` was run with a set containing `tdd`. It printed `Add (1) + tdd`, then `✗ Could not link "tdd": EEXIST`, and still ended `✓ with applied` (`use.ts:108`, `use.ts:204-207`).
3. **No supported conversion.** HEAD has no migration command. `src/index.ts` registers only `tag migrate` (`index.ts:302`). A bare `augy migrate` is swallowed by the default action (`index.ts:454`) and starts the interactive installer ("augy — skill installer"). Every other path that creates skills produces copies with no `storePath`: `sync.ts:225-241`, `home.ts:363-367`, `author.ts:99-106`, `scan.ts:296` and `versions.ts:54-58` (rollback).

## Summary

| Verdict | HEAD | Draft |
|---|---|---|
| Conforms | 0 | 5 |
| Deviates | 0 | 6 |
| Missing | 9 | 0 |
| Unverifiable | 2 | 0 |

Total: 11 requirements.

Tasks: 0 of 36 checked. No HEAD behavior conforms, and no HEAD test covers migration. Slice 1 (Resolve open questions) stays unchecked as instructed.

## Results

| Requirement | Verdict (HEAD) | Verdict (Draft) | Evidence | How checked | Notes |
|---|---|---|---|---|---|
| Migration produces the canonical-store layout | Missing | Deviates | HEAD: no command (`index.ts:44-459`). Draft: `migrate.ts:43-45,55,76-90`; stash `registry.ts` `canonicalSkillsDir() = join(augyHome(),'skills')` | ran: draft on `tdd` held as identical copies in claude and opencode, `AUGY_HOME` unset | Draft makes one copy and two symlinks, but at `~/.augy/skills/tdd`, not `store/tdd` (`~/.augy/store` is never created). It records `canonicalPath`, not HEAD's `storePath`, so HEAD wouldn't treat the skill as store-backed. Several skills in one run worked (d2: 2 of 3, the third had no directory). |
| Registry details are carried over unchanged | Missing | Conforms | Draft: `migrate.ts:90-91` changes only `canonicalPath`; `writeRegistry` at `:104` | ran: pinned, `contexts:["work"]`, tap, SHA, two agents, one history entry; JSON diff before and after shows only the added `canonicalPath` line | "Rolling back": `augy rollback tdd 1111111` finds the version in history, then fails with `ERR_FS_CP_NON_DIR_TO_DIR`, because `rollback.ts:91-94` archives through the agent symlink (`versions.ts:31-32`). The scenario's literal "can still select" passes, but rollback doesn't work. See Spec issues. |
| Migration uses the store under AUGY_HOME | Missing | Deviates | Draft: `migrate.ts:43-45` via `augyHome()` | ran: `AUGY_HOME=$T/sandbox`. Result: `$T/sandbox/skills/{mine,adopted}`, no `$HOME/.augy` created | Follows `AUGY_HOME` and writes nothing under `~/.augy`, but uses `<home>/skills/`, not `<home>/store/<skill>/`. |
| Repeat runs are safe | Missing | Deviates | Draft: skip test `migrate.ts:31` (`!s.canonicalPath`); `:57-72` picks the first real dir; `:76` `rm(canonical)` | ran: (a) second run printed "All skills are already using the canonical store." and `diff -r --no-dereference` showed no change. (b) Fixed partial failure: rerun migrated `b`, `a`'s link and store mtime unchanged. (c) HEAD-shaped v0.11.0 fresh skill (`storePath`, link into `store/`): reported `! fresh: no real directory found … skipped`, `0 migrated 1 skipped` | (a) passes. (b) passes the scenario as written, but the rerun stored opencode's copy (`b-opencode`) because claude's had already become a link, and the first run's store copy of claude's content was deleted. (c) fails: a real v0.11.0 install isn't recognised as migrated, so a run over v0.11.0 skills never reports "already migrated". Files are left untouched. |
| Only tracked skills and recorded paths are touched | Missing | Conforms | Draft: iterates `listSkills(registry)` (`migrate.ts:29`) and recorded `skill.agents` only (`:59,80`) | ran: untracked `~/.claude/skills/untracked` unchanged with no store copy; hand-made `~/.opencode/skills/mine` (unrecorded) unchanged with content `handmade`, while claude's recorded `mine` became a link | Also creates new symlinks (and parent dirs) at recorded paths that didn't exist (d7: `~/.opencode/skills/s` created). That's a recorded path, so not a violation, but see Behavior not covered. |
| A failure on one skill is contained | Missing | Deviates | Draft: `migrate.ts:80-88` (per-agent `rm`, then `symlink`, with no rollback of earlier agents); single `writeRegistry` at `:104` | ran: `b` recorded for claude, opencode and codex; `~/.opencode/skills` made read-only (`chmod 555`) | Result: `! b: EACCES … rmdir`. Claude's `b` was already a symlink to `skills/b`, while opencode and codex kept their real dirs. Registry: `b` not marked, `a` migrated. The scenario requires all three to be unchanged real directories, but claude's wasn't. Ordering is rm-before-link (`:85-87`), so if `symlink` fails the agent has no skill at all. |
| Skills that can't be migrated are skipped and reported | Missing | Deviates | Draft: `migrate.ts:68-72` (no real dir: `continue` before any write); `:93-95` (errors); outro `:106-111` (counts only) | ran: `ghost` with every recorded path missing | Skipped untouched, `canonicalPath` stays undefined, reported as `! ghost: no real directory found among agent paths — skipped.`, which conforms. The mixed-run summary is `✓ 2 skill(s) migrated 1 skipped` and doesn't name the two migrated skills, which deviates. Caught errors (d3's `b`) are listed but counted as neither migrated nor skipped. |
| Skills without a source are migrated | Missing | Conforms | Draft: no source filter (`migrate.ts:31`) | ran: authored-style `mine` (`source:""`, claude only) and adopted-style `adopted` (claude and opencode) | Both ended as symlinks to one stored copy, and `mine` still records `source:""`. |
| Migrated skills work with other commands | Unverifiable | Deviates | HEAD: `update.ts:183-202`, `use.ts:183-207`, `diff.ts:105-116`, `info.ts:63-75`. Draft: stash `update.ts:176-183` archives from the first agent path; `versions.ts:31-32` | HEAD ran on a hand-built store layout (store copy, two symlinks, `storePath`): two updates both reached both agents; `use` unlinked and relinked; `list`, `info` and `diff author 1111111` succeeded. Draft ran after `migrate`: first `update` gave `✗ author — ERR_FS_CP_NON_DIR_TO_DIR` (agents kept old content) and left an empty `versions/author/1111…/`; the second update succeeded and reached both agents. `use` exclude/include, `list` and `info` worked | HEAD depends on a migration command producing the end state. HEAD's commands handle that state correctly, except rollback (see Behavior not covered). In the draft, the first update after every migration fails, and the history entry it later records points at an empty archive. |
| Uninstalling a migrated skill removes everything | Unverifiable | Conforms | HEAD: `uninstall.ts:81-99`. Draft: stash `uninstall.ts` hunk @@-88 (removes `canonicalPath`) | ran under a pty (`script`, answered `y`): HEAD on a hand-built `storePath` skill removed both links, `store/tdd` and the registry entry; the draft after `migrate` removed both links, `skills/author` and the entry | HEAD depends on a migration command. HEAD uninstall wouldn't remove a draft-migrated `<home>/skills/<name>`, because it removes `storePath ?? store/<name>`. |
| Migration can run without prompts | Missing | Conforms | Draft: no `confirm`/`select` imports (`migrate.ts:10`) | ran: every draft run used `</dev/null` with no TTY and finished | The means depends on OQ-2 and OQ-3. Any future prompt would need a skip flag. |

## Spec issues

- **The command has no name (OQ-4).** Every scenario says "the migration command", so none can be run as an acceptance test until slice 1 settles it. A bare `augy migrate` at HEAD silently opens the interactive installer, which makes the naming decision more urgent.
- **"Store-backed" is undefined.** At HEAD, "store-backed" can only mean `storePath` is set, and the update gap is exactly a skill with `storePath` set and copies in its agents. "Fully store-backed" in "Repeat runs are safe" and "store-backed" in "Migration produces the canonical-store layout" therefore can't be told apart from the registry. The spec should define store-backed as the `storePath` field plus every recorded path being a link to it. This ties into OQ-1.
- **The rollback scenario is too weak.** "`augy rollback` can still select those earlier versions" passes even though rollback then fails with ENOTDIR on every symlinked skill, at HEAD and in the draft. It should require that rollback succeeds and leaves the store layout intact. US-16 and the design's Goals name rollback, but "Migrated skills work with other commands" doesn't list it.
- **"Usable real directory" is undefined.** It's unclear whether an empty directory, one without `SKILL.md`, or one at an unknown agent ID counts. "Every one of them that can be migrated" depends on that definition.
- **Tags vs `contexts`.** The registry field is `contexts`, but the spec and PRD say "tags". Testers need the mapping. The carried-over list also omits `label`, `gigetSource`, `installedAt` and `updatedAt`, which leaves it open whether migration may touch them.
- **Partial-failure scenario gap.** "Re-running after a partial failure" checks only that `b` ends in the store layout. It doesn't check which agent's content ended up stored, which is how the draft loses data (see Behavior not covered).
- **Containment under a crash is untestable as written.** The requirement says "No agent SHALL be left without a working copy", but the only scenario is a link failure. A process kill midway (the draft's single registry write) has no scenario. That's OQ-8.

## Behavior not covered by the spec

- **HEAD rollback is broken for any symlinked skill and corrupts the archive.** `rollback.ts:91-94` calls `archiveVersion(agentSymlink)`. `versions.ts:31` runs `mkdir(dest)`, then `cp` fails with ENOTDIR and leaves an empty `versions/<name>/<currentSha>/`. On retry, `archiveVersion` sees the folder exists and skips it (`versions.ts:27-29`). `restoreVersion` then replaces each agent symlink with a real copy (`versions.ts:56-58`) while `storePath` still points at the newer store copy. This was run at HEAD: the agents became real `v1` copies and the store stayed at the newer version. It recreates the update gap and leaves an empty archive for the version that was current.
- **HEAD sync turns store-backed skills back into copies.** Its upgrade path (`sync.ts:225-248`) runs `rm` on the agent symlinks, downloads per-agent copies, and rebuilds the record without `storePath`, `contexts` or `tap`. The store directory is orphaned. This was read, not run.
- **The history archive path ignores `AUGY_HOME`.** `update.ts:208` and `rollback.ts:104` build it from `$HOME/.augy/versions/…`, while the real archives follow `augyHome()`.
- **A corrupt registry is silently treated as empty** (`registry.ts:152-154`). Any write after that, including by a future migration, would replace it with an empty registry.
- **Draft: a rerun after a partial failure can lose content.** `migrate.ts:57-66` picks the first real directory and `:76` runs `rm` on the existing store copy. After run 1 had linked claude's agent, run 2 stored opencode's copy instead, and claude's original content was gone everywhere (ran in d3).
- **Draft: creates symlinks at recorded paths that didn't exist**, including parent directories (`migrate.ts:85-87`, ran in d7).
- **Draft: entries with an unknown agent ID stay as copies** (`migrate.ts:82-83`) while `canonicalPath` is still recorded. The registry then claims the skill is migrated while a recorded path is a copy (ran in d7: `retired-agent` path stayed a real directory).
- **Draft: `rm(canonical)` before copying** (`migrate.ts:76`) wipes anything already at `<home>/skills/<name>`. That's OQ-10.
- **Draft: the stash's `index.ts` description** still says the store is `~/.augy/skills/`.

## PRD factual errors

The PRD's main claims hold: the update gap, `use` failing with "Could not link", the commands that produce copies, the draft's risks, the draft not loading against HEAD, the stash coming from v0.10.0, and no test running against a real temporary home. Its Problem Statement is correct. The imprecisions are:

- **"skips skills already migrated, so running it again is safe".** The draft skips only skills with its own `canonicalPath`. A v0.11.0 store-backed skill (`storePath`) is reported as "no real directory found … skipped" on every run (ran).
- **"It prints a summary of migrated and skipped skills".** It prints only counts. Skipped and failed skills are named with reasons, but migrated skills are never named, and failed skills aren't counted (`migrate.ts:100-111`).
- **"replaces every agent install of that skill with a symlink".** Installs under an agent ID that `agentById` doesn't know are left as copies (`migrate.ts:82-83`).
- **"The only stash work not already shipped in another form is the `augy migrate` command. That file is untracked".** `migrate.ts` is not in the stash (the stash has no untracked part). The stash itself carries other unshipped pieces the draft needs: the `migrate` registration in `index.ts`, and `canonicalSkillsDir`, `canonicalSkillPath` and `canonicalPath` in `registry.ts`. The `index.ts` registration is currently staged in the working tree.
- **Update-gap refinement (not a contradiction).** The first update's per-agent writes go to `agentSkillPath(agent, name)`, not the recorded path, and only for active installs with known agent IDs (`update.ts:191-198`). Skills with no source, or with a home-repo source, are never updated (`update.ts:67-87`), so they stay copies without entering the gap.
