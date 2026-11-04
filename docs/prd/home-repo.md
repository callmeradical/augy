# Home Repo (Personal Skill Backup and Sync)

> Status: Shipped (documented from v0.11.0, commit c725774). First released in v0.3.0 (June 2026); interactive pull and context-aware pre-selection added through v0.8.0.

## Problem Statement

A developer who uses AI coding agents builds up a personal set of skills over time. Some come from public GitHub repos and some they wrote themselves. That set lives only on the machine where it was built: in agent skill folders and in augy's local lockfile (`~/.augy/registry.json`). Setting up a new laptop, rebuilding a machine, or working across a work laptop and a personal laptop means reconstructing the set by hand. The developer has to remember which skills they had, where each came from, and has to copy any self-written skills between machines manually. Self-authored skills have no upstream, so if the machine is lost they are gone.

The team manifest workflow (`augy bundle` / `augy sync`) solves part of this, but it expects the user to manage the manifest file and its location by hand, and it skips skills that have no upstream source. Those are exactly the skills a person most needs to back up.

## Solution

augy lets each user designate one personal GitHub repository as their **home repo**. The home repo plays two roles:

1. **Manifest store**: an `augy.json` manifest that records every installed skill by name, its upstream source, and its context tags (work / personal / universal / custom).
2. **Source of truth for self-authored skills**: the full files of every skill with no external upstream are committed into a skills directory in the repo (`skills/<name>/` by default).

The user configures the home repo once (`augy home set`). After that, `augy home push` snapshots the current machine's skills into it, and `augy home pull` restores them on any machine. Pull is interactive: the user picks which skills and which agents to install. Skills are pre-selected based on the machine's context (see the Machine Contexts and Tags PRD). `augy home show` displays the current configuration.

augy uses the user's existing git setup and credentials to talk to the home repo. No augy account, token, or hosted service is involved. This fits the product's "no marketplace, no accounts, no central service" positioning.

## User Stories

1. As an individual developer with multiple machines, I want to register a personal GitHub repo as my home repo with one command, so that augy knows where to back up and restore my skills.
2. As a developer, I want `augy home set` to reject anything that isn't in `owner/repo` form, so that a typo doesn't leave me with a broken home configuration.
3. As a developer with an existing dotfiles-style repo, I want to choose where the manifest lives inside the repo (`--path`), so that augy fits my repo's existing layout.
4. As a developer, I want to choose which directory holds my authored skills inside the repo (`--skills-path`), so that skill files don't collide with other content in the repo.
5. As a developer, I want sensible defaults (`augy.json` at the repo root, authored skills under `skills/`), so that I don't have to think about layout for a dedicated skills repo.
6. As a developer, I want `augy home set` to confirm the repo, manifest path, and skills directory it saved, so that I can verify the configuration immediately.
7. As a developer, I want to re-run `augy home set` to point at a different repo or layout, so that I can change my mind later.
8. As a developer, I want `augy home show` to print the configured repo, manifest path, and skills directory, so that I can check where my skills are backed up.
9. As a developer who hasn't configured a home repo, I want `augy home show` to tell me how to set one, so that I know the next step.
10. As a developer, I want `augy home push` to record every installed skill and its upstream source in the home repo's manifest, so that I can reinstall the same set elsewhere.
11. As a skill author, I want `augy home push` to commit the actual files of my self-authored skills to the home repo, so that skills with no upstream are backed up and portable.
12. As a developer, I want externally sourced skills stored only by reference (name to source) and not as copied files, so that my home repo stays small and those skills keep updating from their real upstream.
13. As a developer who has tagged skills as work, personal, or universal, I want those tags saved in the manifest on push, so that I don't have to re-tag skills on every machine.
14. As a developer, I want push to commit with a descriptive message that includes the skill count and authored count, so that my home repo history is readable.
15. As a developer, I want push to use my existing git credentials (credential helper, or whatever git already uses for GitHub), so that I don't need a separate token for augy.
16. As a developer, I want push to fail clearly when no home repo is configured, so that I'm told to run `augy home set` first instead of getting an obscure error.
17. As a developer who upgraded from an early augy version, I want push to detect skills whose recorded source points back at my own home repo and reclassify them as authored, so that `augy update` stops failing on them.
18. As a developer whose push is rejected (for example, missing permissions or credentials), I want push to stop with "Push failed" and show git's error, so that I know the backup did not happen and can fix access.
19. As a developer setting up a new machine, I want `augy home pull` to clone my home repo and list every skill it knows about, both authored and external, in one picker, so that I can restore my setup in one step.
20. As a developer, I want to filter the pull picker by typing, so that I can find skills quickly in a long list.
21. As a developer, I want each picker entry to show its context tags and whether it is authored or which upstream it comes from, so that I can make informed choices.
22. As a consultant with work and personal laptops, I want pull to pre-select only skills that match this machine's context (plus universal and untagged skills), so that work-only skills don't land on my personal machine by default and vice versa.
23. As a developer, I want `--context <ctx>` on pull to override the machine's context for one run, so that I can pull a different subset without changing machine settings.
24. As a developer, I want the picker header to show which context is in effect, so that I understand why some skills are pre-selected and others aren't.
25. As a developer, I want to choose which detected agents receive the pulled skills, so that I can install to Claude Code but not, say, Codex.
26. As a developer who always targets the same agents, I want `--agent <ids...>` to skip the agent picker, so that I don't have to answer that question every time.
27. As a cautious developer, I want `augy home pull --dry-run` to list what I selected without changing anything, so that I can preview before committing.
28. As a skill author, I want my authored skills restored on pull directly from the home repo's files, with their context tags reapplied, so that they work on the new machine exactly as I wrote them.
29. As a developer, I want external skills from the manifest installed through the same path as `augy sync`, with resolution, install/upgrade/up-to-date reporting, and confirmation, so that they are versioned and updatable like any other install.
30. As a developer, I want cancelling the skill or agent picker to exit cleanly without changes, so that I can back out safely.
31. As a developer whose home repo is empty or has no recognizable content, I want pull to tell me no skills were found, so that I know the repo isn't set up yet.

## Implementation Decisions

Product decisions and behavioral rules as they exist today:

- **One home repo per machine.** Configuration lives in augy's local lockfile (`~/.augy/registry.json`, or under `AUGY_HOME` if set) and contains three values: repo (`owner/repo`), manifest path (default `augy.json`), and authored-skills directory (default `skills`). Re-running `home set` replaces the whole configuration without warning.
- **Repo identifier format.** `home set` accepts only an identifier with exactly one `/` and non-empty owner and repo parts. Full `https://github.com/...` URLs are rejected. augy reaches the repo over HTTPS GitHub (`https://github.com/<owner>/<repo>.git`) using the user's normal git authentication. augy never creates the repo. The user must create it on GitHub first.
- **Classification rule: authored vs external.** A skill with an empty upstream source is treated as *authored*. A skill with a source is *external*. This rule covers skills created with `augy author new`, skills restored from the home repo, and any skill imported by `augy scan` without a source.
- **Push is a full snapshot of the local machine.** Each push rewrites the whole manifest from the local lockfile:
  - External skills: `name → source`.
  - Authored skills: `name → ""` (an empty source), so the manifest is a complete inventory. Sync-style installers skip empty sources.
  - `contexts`: `name → [tags]` for every tagged skill. The field is omitted when no skills are tagged.
  - The machine's own context is never written to the home repo.
- **Authored skill files are copied into `<skills-path>/<name>/`** from the first active agent location that exists on disk. Authored skills with no surviving on-disk copy are listed in the manifest but contribute no files.
- **Authored skills never get a home-repo URL as their source.** Their source stays empty both in the lockfile and in the manifest. Giving them a URL caused pull to try installing them from GitHub, which fails for private repos.
- **Stale home-repo source handling.** Builds before v0.6.0 recorded authored skills with a source pointing at the home repo. Three behaviors handle this:
  - On push, any skill whose source *contains* the configured home repo string is reclassified as authored. Its source is cleared and its version is marked unversioned, and the lockfile is saved.
  - On pull, external entries whose source contains the home repo string are excluded from installation.
  - `augy update` skips these skills (and all authored skills) with a note to run `augy home push`.
- **No-change push.** Intended rule: if the commit has nothing to commit, report "Nothing changed — home repo is already up to date" and exit successfully. Any other git failure stops with "Push failed" and surfaces the error. (See Further Notes: this detection does not work as shipped.)
- **Commit message contract:** `chore: update skills via augy — <N> skill(s)` with ` (<M> authored)` appended when authored skills exist.
- **Pull discovery rule.** Every directory in the repo's skills directory is offered as an authored skill. Every manifest entry with a non-empty source is offered as an external skill, unless an authored directory with the same name exists, in which case the authored copy wins.
- **Pull pre-selection rule.** Context precedence is explicit `--context` first, then the machine context, then none. With no context in effect, everything is pre-selected. With a context, a skill is pre-selected if it is untagged, tagged `universal`, or tagged with that context. Tags come from the home repo manifest first, then from the local lockfile. Pre-selection is only a default: the user can still select or deselect anything.
- **Pull agent rule.** Without `--agent`, the agent picker lists only agents detected on this machine, all pre-selected. With `--agent`, the listed IDs are used directly and unknown IDs are ignored. Zero resulting agents is an error.
- **Pull install behavior.**
  - Authored skills are copied from the cloned repo into each chosen agent's skill folder and recorded as authored, with tags restored from the manifest.
  - External skills are handed, as a filtered manifest, to the same engine as `augy sync`. That engine shows its own plan and asks its own confirmation before applying.
- **Dry run** (`--dry-run`) runs both pickers, then lists the selected skills with their source or the word "authored". It changes nothing.
- **Authentication:** relies entirely on the user's git configuration. augy stores no credentials.

User-facing manifest shape written to the home repo:

```json
{
  "version": 1,
  "skills": { "tdd": "github:org/skills/tdd", "my-skill": "" },
  "contexts": { "tdd": ["universal"], "my-skill": ["personal"] }
}
```

## Testing Decisions

Observable behaviors that define correctness:

- `home set` stores repo, manifest path, and skills directory, applying the defaults when the options are omitted. It rejects non-`owner/repo` input.
- `home show` prints the stored configuration, or a hint when there is none.
- `home push` exits with guidance when no home repo is configured.
- `home push` writes a manifest in which external skills map to their sources and authored skills map to `""`. It includes `contexts` for tagged skills, then commits and pushes.
- Authored skill files are copied into the repo. External skills' files are not.
- After push, authored skills still have an empty source in the lockfile.
- Skills with a home-repo-pointing source are reclassified as authored on push.
- Pushing with nothing changed reports "up to date" and succeeds.
- `home pull` exits with guidance when no home repo is configured.
- The pull picker shows authored skills (from directories) and external skills (from the manifest) together.
- Context pre-selection follows the rule above for explicit `--context` and for machine context.
- `--agent` skips the agent picker.
- Authored skills install only to the selected agents.
- Only selected external skills are passed to sync, and sync is not invoked when no external skills are selected.
- `--dry-run` makes no changes.

Coverage by existing automated tests (unit-level, with git, filesystem, and prompts mocked):

- **home set:** defaults, custom paths, and format validation are covered.
- **home push:** covered are the "no home configured" exit, the clone/manifest/commit/push sequence, authored files being copied with source left empty, and external skills not being copied. The authored-file test's name says it "registers a source", but its assertions check the opposite (source stays empty). The name is a leftover from earlier behavior.
- **home pull:** covered are the "no home configured" exit, the combined picker, agent-picker selection for authored installs, filtered hand-off to sync, skipping sync when no external skills are selected, `--context` pre-selection, and `--agent` skipping the picker.
- **Not covered:**
  - no-change push handling (and the real git output it depends on)
  - stale home-repo reclassification on push and the matching exclusion on pull
  - `contexts` being written to the manifest on push
  - tag restoration for authored skills on pull
  - pre-selection driven by the *machine* context (only explicit `--context` is tested)
  - `--dry-run`
  - `home show`
  - nested `--path` values
  - any real git round trip against a live repository

## Out of Scope

- Creating the GitHub repository, or setting its visibility or permissions. The repo must already exist.
- Using non-GitHub hosts or full clone URLs as the home repo identifier (`home set` rejects URLs).
- Merging state from several machines. Push replaces the manifest with the pushing machine's view. There is no merge, conflict resolution, or per-machine manifest.
- Deleting skills from the home repo. Push only adds or overwrites authored files and never removes directories for skills that were uninstalled locally.
- Non-interactive pull. There is no `--yes` or "install everything" flag. The skill picker always appears, and external installs prompt again for confirmation.
- Bidirectional sync or pulling updates of already-installed authored skills selectively. Pull simply re-copies what the user selects.
- Versioning or history of authored skills inside augy, beyond what the home repo's git history provides.
- Storing credentials or tokens.
- Syncing the machine context itself across machines (it is deliberately local).

## Further Notes

Known gaps, inconsistencies, and bugs observed in v0.11.0:

1. **"Nothing to commit" handling does not work (bug).** Push decides whether a failed commit meant "nothing changed" by looking for "nothing to commit" in the error text. git prints that message to standard output, and the error text augy inspects contains only the command line and git's standard error. Checked against real git: the error text is just `Command failed: git -C … commit -m …`. As a result, a push with no changes reports "✗ Push failed" and exits with an error, which is the crash the June 2026 fix was meant to remove.
2. **Push from a second machine can erase entries from the manifest (data-loss risk).** The manifest is rebuilt from the *pushing machine's* lockfile alone. Consider a work laptop that pulled only work skills and then pushes: every external skill it didn't install disappears from the manifest, and so does every context tag for skills it doesn't have. Authored files survive because push never deletes directories. Their tags do not survive.
3. **Context tags of external skills are not restored on pull.** Pull reapplies manifest tags only to authored skills. External skills are installed through the sync engine, which receives no tag data and records none. When an already-installed skill is upgraded through sync, its existing local tags are dropped too. Combined with item 2, a pull followed by a push from the same machine strips tags from the home repo. This contradicts the stated intent of the June 2026 commit ("context tags survive across machines on home pull").
4. **Stale-source matching is a substring test.** Any skill whose source merely *contains* the home repo string is treated as authored. With home repo `alice/skills`, an external skill from `alice/skills-extra` would have its source permanently cleared on push, and it would be skipped by update and excluded on pull.
5. **Nested manifest paths fail on first push.** The `home set` help shows `--path config/augy.json` as an example. Push writes the manifest without creating missing parent folders, so a path inside a folder that doesn't yet exist in the repo makes push fail. (Inferred from behavior; not reproduced end to end.)
6. **Repo-root skills directory.** If the skills directory is set to the repo root (an empty `--skills-path`), pull offers *every* top-level directory as an authored skill, including git's own metadata directory. (Inferred; edge case.)
7. **Skills imported without a source are treated as authored.** A third-party skill imported by `augy scan` with no known source is committed into the user's home repo as if they wrote it. That may be desirable as a backup, but it isn't stated anywhere.
8. **Symlinked source-less skills may break push.** If the first registered location of a source-less skill is a symlink (common when other tools manage skill folders), the copy step fails with "cannot overwrite directory with non-directory". The copy primitive was verified to behave this way in isolation; the full push was not reproduced.
9. **Selected-but-ignored entries.** Suppose a manifest entry's source contains the home repo string and there is no matching authored directory. Pull lists it in the picker, but selecting it silently does nothing.
10. **Authentication claim vs behavior.** Code comments say SSH keys work. The repo is always reached over an HTTPS URL, so SSH keys apply only if the user's git config rewrites GitHub HTTPS URLs to SSH. Private repos otherwise need an HTTPS credential helper (for example, the GitHub CLI's helper). Observed rather than fully verified: an SSH-style `git@github.com:owner/repo.git` string happens to pass `home set` validation and would be used as is.
11. **Double confirmation on pull.** After the skill and agent pickers, external installs show the sync plan and ask "Apply N change(s)?" again. This is reasonable for safety but makes pull impossible to run without a person at the keyboard.
12. **Temporary clones are never cleaned up.** Each push and pull leaves a shallow clone, and pull also leaves a filtered manifest, in the system temp directory.
13. **Pulled authored skills are real copies, not store-backed.** Since v0.11.0 (canonical store), regular installs keep one copy under `~/.augy/store/` and symlink agents to it. Authored skills restored by pull are plain per-agent copies, recorded as authored with version label `home`. Pull also overwrites any existing local record of the same name, resetting its install date and pin status.
14. **Undocumented.** The README and the docs site don't mention `augy home` at all. The CLI help and the program's top-of-file command summary are the only references.
15. **Open question:** a commit message refers to "the nightly update workflow in the home repo" (using `update --all` and `sync --yes`). augy doesn't create or manage such a workflow. It appears to be a pattern the author uses personally rather than a product feature.
