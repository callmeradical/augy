# Design

## Context

See proposal.md (Why). This change specifies update, pin, diff and rollback as described in docs/prd/skill-versioning.md (status: shipped, documented from v0.11.0). It is written from the PRD alone and does not describe the existing code. Requirements are in `specs/skill-update`, `specs/skill-pinning`, `specs/skill-diff` and `specs/skill-rollback`.

Constraints the PRD fixes:
- A version is a SHA. Each installed skill's version state lives in the lockfile (`~/.augy/registry.json`, or under `AUGY_HOME`).
- Since v0.11.0 a skill has a single canonical copy that agents link to. Skills installed by older versions may still be separate per-agent copies.
- The version archive is local: `versions/<skill>/<full-sha>/` under the augy home.
- Upstream checks and upstream diffs go to GitHub. Rollback and archive-to-archive diffs don't.

## Goals / Non-Goals

**Goals:**
- Detect and apply upstream changes safely, interactively or unattended (`--all`), always archiving first.
- Let users freeze a skill against `augy update`.
- Let users review changes file by file before upgrading or rolling back.
- Let users restore any archived version and undo that restore, entirely offline.

**Non-Goals (from the PRD's Out of Scope):**
- Semantic versioning, version ranges, or release tags as versions.
- Upgrading to anything other than latest upstream (no "update to SHA X"). Rollback reaches only archived versions.
- Automatic or scheduled updates. `--all` is the hook for the user's CI.
- Archive retention policies or automatic pruning.
- Non-interactive diff output (patches to stdout, `--stat`).
- Three-way merges or preserving local edits. Local modifications are overwritten on upgrade (after archiving).
- Rolling back to a version never archived locally.
- Pin reasons, pin expiry, or pinning to a version other than the current one.

## Decisions

- **Drift is SHA inequality, not content comparison.** Rationale (PRD): one cheap identifier per skill, with no content download needed to decide whether an update exists. Constraint added from Further Notes: the identifier must be consistent between install, update, discovery and search, so unchanged skills never show as drifted. The PRD leaves the kind of identifier (repo commit, path commit, directory fingerprint) open. See Open Questions.
- **Archive-then-replace.** The current files are archived to `versions/<skill>/<old-sha>/` (reusing an existing archive) before every upgrade and every rollback. Rationale (PRD, US-7/US-25): users can always go back, and rollback can be undone.
- **One canonical copy per skill.** An upgrade replaces the canonical copy, so every linked agent sees it at once. Legacy per-agent copies are each replaced. Rationale (PRD, US-8): agents stay in sync. Constraint added from Further Notes: rollback has to keep this property and must not turn links into stale copies.
- **Eligibility filter before checking.** Pinned skills, unsourced skills and home-repo-sourced skills are never fetched and are named in a notice. Rationale (PRD, US-12–US-14): avoid surprise changes and fetch failures on sources that don't exist or that the user owns.
- **Interactive by default, `--all` for automation.** A single candidate gets a confirmation. Several get a required multi-select plus confirmation. `--all` skips both. Rationale (PRD, US-4–US-6). Constraint added from Further Notes: failures must reach the exit status so CI can detect them.
- **Failures are per skill.** Checks run concurrently, and one bad source doesn't block the others. Rationale (PRD, US-9).
- **Pin is a flag that only `augy update` honors.** Reinstall keeps the flag. Rationale (PRD): pinning freezes a version against update. Other PRDs' flows (team-manifest sync, home pull) are outside this change.
- **Diff is interactive only, with three modes.** Installed vs HEAD, installed vs SHA (archive first, GitHub fallback), archive vs archive (local only). Rationale (PRD, US-16–US-22). Machine-readable output is Out of Scope.
- **Rollback uses history, not upstream.** Targets are history entries resolved by prefix (first match wins). The history entries are swapped and the skill is not pinned. Rationale (PRD, US-23–US-26, US-29): fast offline recovery that a later update can supersede.
- **Archive is plain directories, never auto-pruned.** `augy uninstall` asks, defaulting to no. Rationale (PRD, US-27/US-28): inspectable without augy, and history isn't lost by accident.

## Risks / Trade-offs

All items are from the PRD's Further Notes.
- [Inconsistent SHAs cause spurious "update available", and every unrelated repo commit counts as drift] → Specified as intended behavior (skill-update: "No spurious drift from inconsistent identifiers"). Team-manifest sync uses a third identifier, which belongs to that PRD. The PRD hasn't verified this against live GitHub.
- [Rollback fails, or records an empty snapshot, for symlinked installs (data-loss risk)] → Specified (skill-rollback: "Displaced version archived first", symlinked scenario). The PRD asks for confirmation on Node 18, 20 and 24.
- [Rollback replaces links with copies that stop receiving updates and fall out of skillset management] → Specified (skill-rollback: "Rolled-back skills keep receiving updates").
- [A failed download leaves the skill empty while the lockfile records the old SHA] → Specified (skill-update: "Failed upgrade leaves the previous version usable").
- [Exit status 0 on failures, plus "All skills are up to date!" when every check failed] → Specified (skill-update: "Failures visible to automation").
- [Pin is honored only by `augy update`: sync and home pull upgrade pinned skills, and reinstall replaces content while keeping the flag] → Accepted per the PRD decision "Pinning affects only `augy update`". The README overstates the guarantee. Sync and pull behavior belongs to their own PRDs.
- [Name fallback deploys or diffs the wrong skill] → Specified: a missing upstream name is reported (skill-update, skill-diff).
- [Home-repo detection by substring] → Specified (skill-update: "Home-repo skip matches only the home repo").
- [Guidance for unsourced skills points to `augy home push` even for `augy scan` imports, which need `augy set-source`] → See Open Questions.
- [Diff fetch bypasses the `gh` login, needing `GITHUB_TOKEN` for private repos, with a 60/hour unauthenticated limit and 2 + 1-per-file requests per fetch] → Specified: upstream fetch uses the user's GitHub access. The request cost is accepted.
- [Upstream diff likely fails for skills from multi-skill sources (inferred)] → Specified (skill-diff: "Upstream diff works for skills from multi-skill sources").
- [Diff errors are uncaught, and `augy use` can remove a link without updating the lockfile] → Specified: clear messages (skill-diff: "Diff reports problems clearly"). The underlying `augy use` bookkeeping is an Open Question.
- [Agents linked by `augy use` are invisible to update and rollback] → See Open Questions. The fix likely belongs to the skillsets PRD.
- [History can contain the current version] → Specified: the picker doesn't offer the installed version.
- [History archive locations ignore `AUGY_HOME`] → Specified (skill-rollback: "Archive is plain local directories", AUGY_HOME scenario).
- [Archives orphaned after uninstall without pruning: a reinstall starts with empty history] → See Open Questions.
- [README gaps: `--all` and skipping undocumented, the picker starts with nothing selected, and the docs site overstates mode 3] → Documentation issue; no spec change.

## Migration Plan

N/A — archived.

## Open Questions

- From the PRD: should the mode-2 GitHub fallback (`augy diff <skill> <sha>`) accept short SHAs that aren't in local history? It currently passes the prefix to GitHub unchanged.
- Which identifier should define a skill's version (repo HEAD commit, latest commit touching the skill's path, or a directory fingerprint), so that install, update, search and team-manifest sync agree? The specs state only the outcome.
- Should `augy update` give different guidance for unsourced skills imported by `augy scan` (point to `augy set-source`) than for self-authored skills (point to `augy home push`)? The specs require `augy home push` only for home-repo-sourced and self-authored skills.
- Should update and rollback act on agent links created by `augy use` that the lockfile doesn't record, or should `augy use` record its links? This depends on the skillsets PRD.
- After an uninstall that keeps archives, should a reinstall reconnect the kept archives to the skill's history so rollback can reach them (US-28: "history isn't lost by accident")?
- Should the interactive update multi-select start with every upgrade selected? The PRD notes it starts empty, and the README's "upgrade everything" suggests otherwise. The specs require only that at least one selection is made.
- Is the "dim" styling of the skip notice part of the contract? The specs require only that skipped skills are named and grouped.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | skill-update: Drift detection by SHA; Update all or one skill; No spurious drift from inconsistent identifiers |
| US-2 | skill-update: Update all or one skill |
| US-3 | skill-update: Upgrades listed as old to new SHA |
| US-4 | skill-update: Interactive selection and confirmation |
| US-5 | skill-update: Interactive selection and confirmation; Cancelling an interactive update changes nothing |
| US-6 | skill-update: Unattended updates with --all; Failures visible to automation |
| US-7 | skill-update: Archive before overwrite; Lockfile updated after upgrade; Failed upgrade leaves the previous version usable |
| US-8 | skill-update: Upgrade reaches every agent using the skill; skill-rollback: Rolled-back skills keep receiving updates |
| US-9 | skill-update: Per-skill failures don't block others; Missing upstream skill is reported, not substituted; Failures visible to automation |
| US-10 | skill-pinning: Pin a skill |
| US-11 | skill-pinning: Unpin a skill |
| US-12 | skill-update: Ineligible skills skipped with a notice |
| US-13 | skill-update: Ineligible skills skipped with a notice |
| US-14 | skill-update: Ineligible skills skipped with a notice; Home-repo skip matches only the home repo |
| US-15 | skill-pinning: Pinned status visible |
| US-16 | skill-diff: Diff installed against upstream HEAD; Upstream diff works for skills from multi-skill sources; Upstream fetch uses the user's GitHub access |
| US-17 | skill-diff: Diff installed against a specific SHA; Upstream fetch uses the user's GitHub access |
| US-18 | skill-diff: Diff two archived versions |
| US-19 | skill-diff: Short SHA prefixes in diff; skill-rollback: Rollback by SHA prefix |
| US-20 | skill-diff: Change summary |
| US-21 | skill-diff: Interactive per-file diff |
| US-22 | skill-diff: No differences message |
| US-23 | skill-rollback: Interactive rollback picker; Rollback by SHA prefix; Target restored to every agent |
| US-24 | skill-rollback: Interactive rollback picker; Rollback preconditions |
| US-25 | skill-rollback: Displaced version archived first; History swapped on rollback |
| US-26 | skill-rollback: Unknown SHA lists available versions |
| US-27 | skill-rollback: Archive is plain local directories |
| US-28 | skill-rollback: Archives kept unless the user chooses to delete them |
| US-29 | skill-rollback: Rollback works offline |
| PD: version identity fields | skill-update: Version identity recorded per installed skill |
| PD: drift = SHA differs; matched by name | skill-update: Drift detection by SHA |
| PD: eligibility and skip notice | skill-update: Ineligible skills skipped with a notice |
| PD: unknown skill error; empty is no-op | skill-update: Update all or one skill |
| PD: concurrent checks, per-skill failures | skill-update: Per-skill failures don't block others |
| PD: interactive flow, cancel = no change | skill-update: Interactive selection and confirmation; Cancelling an interactive update changes nothing |
| PD: `--all` no prompts | skill-update: Unattended updates with --all |
| PD: archive first, reuse existing | skill-update: Archive before overwrite |
| PD: canonical copy replaced; legacy copies replaced | skill-update: Upgrade reaches every agent using the skill |
| PD: history appended, SHA updated | skill-update: Lockfile updated after upgrade |
| PD: nothing uninstalled by update | skill-update: Update never uninstalls |
| PD: pin/unpin flip flag; unknown is error | skill-pinning: Pin a skill; Unpin a skill |
| PD: pin affects only update; reinstall keeps flag | skill-pinning: Pinned flag survives reinstall; Design: Pin is a flag that only `augy update` honors |
| PD: diff mode 1 and label | skill-diff: Diff installed against upstream HEAD |
| PD: diff mode 2, short SHA, archive then GitHub | skill-diff: Diff installed against a specific SHA; Short SHA prefixes in diff |
| PD: diff mode 3, error lists history | skill-diff: Diff two archived versions |
| PD: installed files from first active agent | skill-diff: Installed files read from the first active agent location |
| PD: diff output header, ordering, picker, 3 lines context | skill-diff: Change summary; Interactive per-file diff |
| PD: rollback picker newest first; prefix first match | skill-rollback: Interactive rollback picker; Rollback by SHA prefix |
| PD: no history no-op; missing archive error | skill-rollback: Rollback preconditions |
| PD: archive current, restore to every active agent | skill-rollback: Displaced version archived first; Target restored to every agent |
| PD: history swap, SHA = restored | skill-rollback: History swapped on rollback |
| PD: rollback doesn't pin | skill-rollback: Rollback does not pin |
| PD: archive layout under augy home | skill-rollback: Archive is plain local directories |
| PD: never pruned; uninstall asks, default no | skill-rollback: Archives kept unless the user chooses to delete them |
