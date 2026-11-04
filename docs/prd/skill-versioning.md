# Skill Versioning: Update, Pin, Diff, Rollback

> Status: Shipped (documented from v0.11.0, commit c725774)

## Problem Statement

Skills are instructions an AI agent loads as context, so a change upstream changes how the agent behaves. Developers who copy skills into agent folders by hand can't tell when a skill they depend on has changed upstream, can't see what changed before taking it, and can't get back to the version that worked when an upgrade makes things worse. Teams and CI jobs that keep skills current need a non-interactive way to upgrade. Some skills, such as ones a person wrote or a version known to be good, should never move without someone deciding to move them.

## Solution

augy treats installed skills like packages with a lockfile. Every installed skill records its upstream source and an exact version identifier (a SHA). On top of that, augy offers:

- **`augy update [skill]`** checks every eligible skill for SHA drift against its GitHub source, lists the available upgrades, and, after selection and confirmation (or immediately with `--all`), archives the current files and then deploys the new version. Pinned skills, self-authored skills, and skills whose source points at the user's own home repo are skipped, and augy says so.
- **`augy pin <skill>` / `augy unpin <skill>`** freeze a skill so `augy update` leaves it alone, and release it again.
- **`augy diff <skill> [sha1] [sha2]`** is an interactive, file-level diff browser with three modes: installed vs. upstream HEAD, installed vs. a specific SHA (local archive first, GitHub as fallback), and archive vs. archive.
- **`augy rollback <skill> [sha]`** restores any archived version, chosen from an interactive picker or by short SHA. The version it replaces is archived first.
- A **local version archive** under `~/.augy/versions/<skill>/<sha>/` holds plain directory snapshots. It needs no external service and lives on the user's machine.

## User Stories

1. As an individual developer, I want one command that checks all my installed skills for upstream changes, so that I don't have to watch every source repo myself.
2. As an individual developer, I want to update a single skill by name, so that I can take one upgrade without touching the rest.
3. As an individual developer, I want to see each available upgrade as `old-sha → new-sha` before anything changes, so that I know what will move.
4. As an individual developer, I want to choose which of several available upgrades to apply, so that I can postpone the risky ones.
5. As an individual developer, I want a confirmation step before upgrades are applied, so that I don't change my agents' behavior by accident.
6. As a CI pipeline (for example a nightly job that keeps a home repo current), I want `augy update --all` to apply every available upgrade with no prompts, so that skills stay current without anyone at the keyboard.
7. As an individual developer, I want the current version of a skill archived automatically before it's overwritten, so that I can always go back.
8. As a multi-agent developer, I want one upgrade to show up in every agent that uses the skill, so that my agents stay in sync.
9. As an individual developer, I want a skill that can't be checked (network, auth, or a missing source) reported with its error while the other skills are still checked, so that one broken source doesn't block my other updates.
10. As an individual developer, I want to pin a skill, so that `augy update` never changes a version I've decided to keep.
11. As an individual developer, I want to unpin a skill, so that it gets upgrades again when I'm ready.
12. As an individual developer, I want `augy update` to tell me which pinned skills it skipped, so that I don't forget about them.
13. As a skill author, I want my self-authored skills, which have no upstream source, skipped by `augy update` with an explanation, so that augy doesn't try to fetch a source that doesn't exist and fail.
14. As a user with a personal home repo, I want skills whose source points at my home repo skipped by `augy update`, with a pointer to `augy home push`, so that stale entries from older augy versions don't cause permission errors.
15. As an individual developer, I want pinned status shown in `augy list` and `augy info`, so that I can see which skills are frozen.
16. As a cautious developer, I want to diff my installed copy of a skill against upstream HEAD before upgrading, so that I can review the change first.
17. As a cautious developer, I want to diff my installed copy against a specific SHA, using my local archive when I have one and GitHub otherwise, so that I can compare with any known version.
18. As an individual developer, I want to diff two archived versions against each other, so that I can see what changed between two earlier upgrades.
19. As an individual developer, I want to refer to versions by short SHA prefix in diff and rollback, so that I don't have to paste 40-character hashes.
20. As a reviewer, I want a summary of changed files with added, modified, and deleted markers and per-file `+/-` line counts, so that I can judge the size of a change at a glance.
21. As a reviewer, I want to pick a changed file and read its colorized unified diff, then pick another, until I'm done, so that I can go through a multi-file change one file at a time.
22. As an individual developer, I want a clear "no differences" message when two versions are identical, so that I don't have to look through an empty browser.
23. As an individual developer whose agent started misbehaving after an upgrade, I want to roll a skill back to an earlier archived version, so that I can recover quickly.
24. As an individual developer, I want an interactive rollback picker that lists my archived versions newest first with install dates and marks any version whose archive is missing, so that I pick a version that can actually be restored.
25. As an individual developer, I want the version I'm rolling away from archived first, so that rolling back can be undone.
26. As an individual developer, I want rollback to tell me which versions are available when the SHA I gave doesn't match any, so that I can fix my input.
27. As an individual developer, I want archived versions stored as plain directories I can read, so that I can inspect or copy old versions without augy.
28. As an individual developer, I want archives kept when I uninstall a skill unless I choose to delete them, so that history isn't lost by accident.
29. As an enterprise or firewalled user, I want the version archive kept entirely on my machine, so that rollback doesn't depend on any external service being reachable.

## Implementation Decisions

**Version identity**
- Each installed skill records its source (a GitHub URL or `owner/repo[/path]`), its current SHA and short SHA, the time it was installed and last updated, a pinned flag, and an ordered history of earlier versions (oldest first), each with its SHA and when it was installed.
- Drift means the SHA discovered upstream for the skill's source is different from the recorded SHA. augy doesn't compare file contents to decide whether an update exists.
- When a source covers several skills, the upstream skill is matched by name.

**Update rules**
- Eligible skills are those that aren't pinned and have a non-empty source that doesn't point at the configured home repo. Skipped groups are listed by name in a dim notice: pinned skills, and "authored" skills (no source, or a home-repo source).
- Naming a skill that isn't in the lockfile is an error. Updating with nothing installed is a friendly no-op.
- Checks run concurrently. Failures are printed per skill and don't stop the others.
- Interactive flow: with one candidate, augy asks for confirmation. With several, it shows a required multi-select and then asks for confirmation. Cancelling at either step exits without changes.
- `--all` applies every candidate with no picker and no confirmation.
- For each upgraded skill, the current files are archived first to `~/.augy/versions/<skill>/<old-sha>/`. If that archive already exists it is reused rather than overwritten. Then the new version replaces the skill's single canonical copy, and every agent that links to it sees the new version immediately. Skills installed by older augy versions as separate per-agent copies have each active agent's copy replaced.
- After an upgrade, the old SHA is added to the skill's history and the recorded SHA becomes the new one.
- Nothing is uninstalled or removed by update.

**Pin rules**
- `augy pin <skill>` / `augy unpin <skill>` just flip the pinned flag. Unknown skills are an error.
- Pinning affects only `augy update`. Reinstalling a skill keeps its pinned flag.

**Diff rules**
- `augy diff <skill>`: installed files compared with the files at the upstream HEAD SHA. The label says when upstream equals the installed version.
- `augy diff <skill> <sha>`: installed files compared with that version. A short SHA is expanded from the skill's history. A local archive is used if one exists, and GitHub is used otherwise.
- `augy diff <skill> <sha1> <sha2>`: archive compared with archive. Both must exist locally, and if one doesn't, the error lists the available history SHAs.
- "Installed files" are read from the skill's first active agent location.
- Output: a header with the file count and total `+/-`, a file list ordered modified, then added, then deleted, and an interactive file picker that shows each file's unified diff with three lines of context until the user picks "done".

**Rollback rules**
- `augy rollback <skill>` with no SHA shows a picker of history entries, newest first. `augy rollback <skill> <sha>` takes a SHA prefix, and the first matching history entry wins.
- A skill with no history can't be rolled back (friendly no-op). A target whose archive is missing is an error.
- The current version is archived before it's overwritten. The target archive is then restored into every active agent location recorded for the skill.
- The history is updated: the restored entry is removed and the displaced current version is added. The recorded SHA becomes the restored one.
- Rollback doesn't pin the skill. A later `augy update` will offer to upgrade it again.

**Version archive (user-visible layout)**
```
~/.augy/                 (or $AUGY_HOME)
  versions/
    <skill>/
      <full-sha>/        ← plain directory snapshot of the skill's files
```
- Archives are never pruned automatically. `augy uninstall` asks, defaulting to no, whether to delete a skill's archives.

## Testing Decisions

Observable behaviors that define correctness (acceptance criteria):

- `augy update` lists exactly the eligible skills whose upstream SHA differs from the recorded SHA, and skips pinned, unsourced, and home-repo-sourced skills with a notice naming them.
- After an upgrade: the old files exist under `versions/<skill>/<old-sha>/`, every linked agent sees the new files, the recorded SHA is the new one, and the old SHA is at the end of the history.
- `--all` never prompts. Without `--all`, cancelling the picker or the confirmation leaves the lockfile and the files on disk unchanged.
- One unreachable source doesn't stop the other skills from being checked and upgraded.
- `pin` followed by `update` leaves the skill untouched. `unpin` makes it eligible again.
- `diff` in each of the three modes compares the right pair of file sets, reports added, modified, and deleted files correctly with accurate line counts, and says "no differences" for identical sets.
- Short SHA prefixes are resolved from history in diff and rollback. An unknown SHA produces an error listing the available versions.
- Rollback restores the target archive's files byte for byte to every active agent location, archives the displaced version, swaps the history entries, and can be undone by rolling forward again.
- Archives survive `augy uninstall` unless the user agrees to prune them.

Current automated coverage: none of the update, pin, diff, rollback, or version-archive behaviors have automated tests. The suite covers lockfile helpers for other features (home repo, machine context), reading and writing single files on GitHub, and unrelated commands. The file-level diff computation (statuses, line counts, ordering) is pure logic and a natural first target for unit tests. Update and rollback need tests against a temporary augy home and temporary agent directories, with GitHub responses mocked, that assert on resulting files and lockfile contents. Rollback in particular should be tested with symlinked installs, since that is the default install mode now (see Further Notes).

## Out of Scope

- Semantic versioning, version ranges, or release tags as versions. A version is a SHA.
- Upgrading to anything other than the latest upstream version. There is no "update to SHA X". `augy rollback` only goes to archived versions.
- Automatic or scheduled updates. Scheduling is left to the user's CI. `--all` is the hook.
- Retention policies or automatic pruning of the version archive.
- Non-interactive diff output, such as patches written to stdout or a `--stat` mode. The diff browser is interactive only.
- Three-way merges or keeping local edits to an installed skill. Local modifications are overwritten on upgrade, though the pre-upgrade files are archived.
- Rolling back to a version that was never archived locally.
- Pin reasons, pin expiry, or pinning to a version other than the current one.

## Further Notes

- **Spurious "update available" from inconsistent SHAs (likely bug).** Upstream discovery reports different kinds of identifier depending on how a source is written. A source that points straight at one skill directory gets the latest commit SHA of the whole default branch. A source that points at a folder of skills gets a fingerprint of each skill's own directory. Two consequences follow. (a) Skills installed by bare name through a tap are recorded with the directory fingerprint, but their source is the skill's own path, so the very first `augy update` reports an upgrade even though nothing changed. (b) After that, and for any skill installed by its direct path, every commit to the repo, even one touching unrelated files, counts as drift. Team-manifest sync uses a third identifier (the latest commit touching the path), so it disagrees with both. I worked this out by reading the code and haven't run it against live GitHub.
- **Rollback is broken for symlinked installs (likely bug, data-loss risk).** Since the canonical-store change in v0.11.0, agent folders hold symlinks to a single canonical copy. Rollback archives the current version by copying from an agent location, which is now a symlink. In a standalone check of the same file-copy behavior on Node 24, copying a symlinked directory into a freshly created archive folder failed with "cannot overwrite directory with non-directory". So the first rollback attempt likely fails, and it leaves an empty archive folder behind. A retry sees that folder, treats the version as already archived, and goes ahead, recording an empty snapshot of the displaced version. Rolling forward to that version later would restore an empty skill. This needs confirming on a real install and on Node 18 and 20.
- **Rollback turns symlinks into copies, which then stop receiving updates (likely bug).** Even when the restore succeeds, it replaces each agent's symlink with a plain copy, and the canonical copy stays at the newer version. A later `augy update` refreshes only the canonical copy, because the skill is recorded as store-backed, so those agent copies never see the upgrade. `augy use` also ignores copies, so the skill falls out of skillset management.
- **A failed download leaves the skill broken.** Update clears the canonical copy before downloading the new version. If the download fails, the skill is left empty for every linked agent, while the lockfile still records the old SHA. The pre-upgrade archive exists, but nothing restores it automatically.
- **Exit status hides failures from CI.** `augy update` (including `--all`) exits 0 even when checks or upgrades fail. If every check fails, it still ends with "All skills are up to date!". The nightly-CI use case can't detect failures.
- **Pin is honored only by `augy update`.** Team-manifest sync and home-repo pull upgrade pinned skills, and sync doesn't archive before overwriting. Re-running `augy install` on a pinned skill replaces its content with the latest version while keeping the pinned flag. The README's "freeze it at the current version" overstates the guarantee.
- **Name fallback can deploy the wrong skill.** If a skill's source no longer has a skill with that name, for example because it was renamed upstream, update and diff fall back to the first skill found at the source instead of reporting it missing.
- **Home-repo detection is a substring match.** A skill is skipped as "home-repo sourced" if its source merely contains the home repo's `owner/repo` text. For example, home repo `alice/skills` also matches `alice/skills-extra/...`.
- **Inconsistent guidance for unsourced skills.** `augy update` tells users with unsourced skills to run `augy home push`. That's right for self-authored skills, but skills imported by `augy scan` without a detectable source need `augy set-source`, which is what `augy list` suggests.
- **The diff browser's GitHub fetch bypasses the user's GitHub login.** Discovery uses the GitHub CLI login, but fetching file contents for diff goes to GitHub directly and is authenticated only if `GITHUB_TOKEN` is set. Without it, private-repo diffs fail and the unauthenticated rate limit (60 requests per hour) applies. Each fetch costs two requests plus one per file.
- **Upstream diff likely fails for skills from multi-skill sources (inferred).** For a skill whose source is a whole repo or folder (for example installed via `augy install owner/repo`), the upstream identifier is a directory fingerprint, but the diff fetch treats it as a commit. The fetch would probably fail. I haven't verified this against live GitHub.
- **Diff errors are uncaught.** Running diff on a skill with no source, with no active agent, or whose agent location is missing prints a raw error instead of a friendly message. Because `augy use` can remove an agent's symlink without updating the lockfile, `augy diff` can fail with "Installed path does not exist" while the canonical copy is intact.
- **Agents linked by `augy use` are invisible to update and rollback.** Those commands act only on the agent locations recorded in the lockfile, and `augy use` doesn't record the links it creates or removes.
- **History can contain the current version.** For example: upgrade A→B, roll back to A, then upgrade again. History becomes [B, A] while the current version is B, so the rollback picker offers the version that's already installed.
- **The history entries' archive locations ignore `AUGY_HOME`.** The lockfile records each history entry's archive as `$HOME/.augy/versions/...` even when `AUGY_HOME` points somewhere else. The archives themselves are written to the right place, so this is cosmetic, but the lockfile is meant to be read by people.
- **Archives can be orphaned.** After uninstalling without pruning, archives stay on disk, but the skill's history is gone from the lockfile. A reinstall starts with empty history, so rollback can't reach those archives.
- **README gaps.** The README documents neither `--all` nor the skipping of authored and home-repo skills. Its "`augy update` — upgrade everything" wording hides the fact that the interactive picker starts with nothing selected. The docs site's "diffs between any two versions" overstates mode 3, which works only for two locally archived versions.
- Open question: should the mode-2 GitHub fallback accept short SHAs that aren't in local history? It passes the prefix to GitHub unchanged, and GitHub may require a full SHA. Untested.
