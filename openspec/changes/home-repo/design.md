# Design

## Context

See proposal.md (Why). This change is written from `docs/prd/home-repo.md` (shipped feature, documented from v0.11.0) and describes the product behavior that PRD calls for. It doesn't describe the existing code. The home repo depends on behavior owned by other PRDs: machine context and the tag matching rule (Machine Contexts and Tags, change `machine-contexts-and-tags`), the authored-skill definition (Skill Authoring, change `skill-authoring`), the `augy sync` engine (Team Manifests), and `augy update`'s skip rules (Skill Versioning).

## Goals / Non-Goals

**Goals:**
- One personal GitHub repo per machine acts as the manifest store and as the source of truth for self-authored skills.
- Push snapshots the machine. Pull restores any chosen subset onto any machine, with context-aware defaults.
- No augy account, token, or hosted service.

**Non-Goals (from the PRD's Out of Scope):**
- Creating the GitHub repo or setting its visibility or permissions.
- Non-GitHub hosts or full clone URLs as the identifier.
- Merging state from several machines, conflict resolution, or per-machine manifests.
- Deleting skills or authored files from the home repo.
- Non-interactive pull (no `--yes` or "install everything").
- Bidirectional sync, or selectively pulling updates of already-installed authored skills.
- Versioning authored skills beyond the home repo's git history.
- Storing credentials or tokens.
- Syncing the machine context across machines.

## Decisions

- **One home repo per machine, stored in the local lockfile.** Repo, manifest path, and skills directory live in `~/.augy/registry.json` (or under `AUGY_HOME`). Re-running `home set` replaces all three values without warning. Rationale (PRD): one designated repo keeps backup and restore a single, simple target. Users can change their mind by re-running set (US-7).
- **`owner/repo` only, reached over HTTPS GitHub.** augy reaches `https://github.com/<owner>/<repo>.git` and relies entirely on the user's git configuration. Rationale (PRD): fits the "no marketplace, no accounts, no central service" positioning, and a strict format stops typos from leaving a broken configuration (US-2, US-15).
- **Authored means empty source.** A skill with an empty upstream source is authored. A skill with a source is external. This covers `augy author new`, skills restored from the home repo, and skills imported by `augy scan` without a source. Rationale (PRD): one rule shared by push, pull, and update.
- **Push is a full snapshot of this machine.** The manifest is rebuilt from the local lockfile on every push: external `name → source`, authored `name → ""`, and `contexts` for tagged skills (omitted when none). Authored entries with `""` keep the manifest a complete inventory, and sync-style installers skip empty sources. Rationale (PRD): the manifest is a complete record of the machine, and external skills stay by reference so the repo stays small and those skills keep updating upstream (US-10, US-12).
- **Authored files come from the first active on-disk location.** Push copies only authored skills' files, into `<skills-path>/<name>/`. It only adds or overwrites. It never deletes.
- **Authored skills never get a home-repo URL as their source.** Rationale (PRD): giving them one made pull try to install them from GitHub, which fails for private repos.
- **Stale home-repo sources (pre-v0.6.0) are handled in three places.** Push reclassifies them as authored (source cleared, version unversioned, lockfile saved). Pull excludes them from external installation. `augy update` skips them with a note to run `augy home push` (specified in the Skill Versioning and Skill Authoring changes). Rationale (PRD): stops `augy update` failing on these skills (US-17).
- **Commit message contract.** `chore: update skills via augy — <N> skill(s)`, plus ` (<M> authored)` when authored skills exist (US-14).
- **No-change push is success. Every other git failure is "Push failed".** (PD "No-change push", US-18.) The spec states the intended rule. The PRD records that v0.11.0 doesn't meet it.
- **Pull discovery and precedence.** Authored directories and non-empty manifest entries are offered together, and on a name clash the authored copy wins. Context precedence is `--context`, then machine context, then none. Tags come from the manifest first, then the local lockfile. Pre-selection is only a default.
- **Pull agents.** Without `--agent`, only detected agents are offered, all pre-selected. With `--agent`, the listed IDs are used and unknown ones are ignored. Zero agents is an error.
- **External installs reuse `augy sync`.** Selected externals are handed to the sync engine as a filtered manifest. Sync shows its own plan and confirmation. Rationale (PRD): pulled externals are versioned and updatable like any other install (US-29). The second confirmation is deliberate for safety (Further Notes 11).
- **Dry run** runs both pickers, lists the selection, and changes nothing (US-27).

## Risks / Trade-offs

All items come from the PRD's Further Notes for v0.11.0.

- [No-change push reported as failure (FN 1)] → The spec requires success with "Nothing changed — home repo is already up to date". The validator should check this against real git output, not only against mocked errors.
- [Push from a second machine erases manifest entries and tags (FN 2)] → Accepted by design: push is a full snapshot and merging is out of scope. Authored files survive because push never deletes. Users should push from a machine that has the full set.
- [External skills' tags not restored on pull, and dropped on upgrade (FN 3)] → The PRD presents this as a defect against the intent that tags survive across machines. The intended behavior is specified in the `skill-tags` capability of the `machine-contexts-and-tags` change ("Pulled skills receive their home-repo tags"), not duplicated here.
- [Stale-source detection by substring (FN 4)] → An external skill from `alice/skills-extra` could be misclassified when the home repo is `alice/skills`. The spec says "points at the configured home repo" and leaves the matching precision as an open question.
- [Nested manifest paths fail on first push (FN 5)] → The spec requires nested paths to work, because `--path config/augy.json` is the documented example (US-3).
- [Repo-root skills directory offers git metadata as a skill (FN 6)] → Edge case. Open question.
- [Source-less scanned skills are backed up as authored (FN 7)] → Follows from the classification rule. Not stated as intended or as a defect.
- [Symlinked authored skills may break push (FN 8)] → The spec requires authored files to be backed up when reached through a symlink, because US-11 requires the files to be committed.
- [Selected-but-ignored stale entries (FN 9)] → Open question.
- [SSH keys only work through a git URL rewrite (FN 10)] → Private repos need an HTTPS credential helper. SSH-style strings may pass validation. Open question.
- [Double confirmation on pull (FN 11)] → Accepted for safety. It makes pull require a person at the keyboard, which matches the Non-Goal of non-interactive pull.
- [Temporary clones never cleaned up (FN 12)] → Disk use in the system temp directory. Not specified as a requirement.
- [Pulled authored skills are per-agent copies, not store-backed, and pull overwrites an existing local record (FN 13)] → Install date and pin status reset. Not specified.
- [`augy home` undocumented (FN 14)] → Documentation gap only.

## Migration Plan

N/A — archived.

## Open Questions

- **Stale-source matching precision (FN 4).** The PD says "contains the home repo string". The PRD's example (`alice/skills-extra`) suggests that is too broad. Should only sources that point at exactly the configured repo be treated as stale?
- **Selected-but-ignored entries (FN 9).** Should a stale home-repo-sourced entry with no authored directory be hidden from the picker, or should selecting it be reported?
- **Repo-root skills directory (FN 6).** With an empty `--skills-path`, should pull exclude non-skill top-level directories such as git metadata?
- **SSH-style identifiers (FN 10).** Should `git@github.com:owner/repo.git` be rejected by `home set` like other URLs? The PRD only states that `https://` URLs are rejected.
- **Nightly update workflow (FN 15).** A commit mentions a home-repo nightly workflow. The PRD treats it as a personal pattern, not a product feature, and it is not specified.
- **Empty-repo detection (US-31).** The PRD says "no recognizable content". This spec reads that as no authored directories and no installable manifest entries. Confirm that this matches the intent.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | Register a home repo |
| US-2 | Repo identifier validation |
| US-3 | Default and custom repo layout; Push writes the manifest at nested paths |
| US-4 | Default and custom repo layout |
| US-5 | Default and custom repo layout |
| US-6 | Confirm saved configuration |
| US-7 | Re-running set replaces the configuration |
| US-8 | Show the home configuration |
| US-9 | Show the home configuration |
| US-10 | Push writes a full-inventory manifest |
| US-11 | Push backs up authored skill files; Authored skills keep an empty source |
| US-12 | Push writes a full-inventory manifest; Push backs up authored skill files |
| US-13 | Push writes context tags to the manifest |
| US-14 | Descriptive push commit |
| US-15 | Home repo reached with the user's git credentials |
| US-16 | Home commands require a configured home repo |
| US-17 | Push reclassifies stale home-repo sources; Pull excludes stale home-repo sources |
| US-18 | Failed push is reported |
| US-19 | Pull offers authored and external skills in one picker |
| US-20 | Pull picker is filterable and informative |
| US-21 | Pull picker is filterable and informative |
| US-22 | Pull pre-selects by context |
| US-23 | Pull pre-selects by context |
| US-24 | Pull picker is filterable and informative |
| US-25 | Pull chooses target agents |
| US-26 | Pull chooses target agents |
| US-27 | Pull dry run |
| US-28 | Pull restores authored skills from the home repo |
| US-29 | Pull installs external skills through sync |
| US-30 | Cancelling pull makes no changes |
| US-31 | Empty home repo reported |
| PD One home repo per machine | Register a home repo; Re-running set replaces the configuration |
| PD Repo identifier format | Repo identifier validation; Home repo reached with the user's git credentials |
| PD Classification rule | Push writes a full-inventory manifest; Decision "Authored means empty source" |
| PD Push is a full snapshot | Push writes a full-inventory manifest; Push writes context tags to the manifest |
| PD Authored files copied | Push backs up authored skill files |
| PD Authored never get home-repo URL | Authored skills keep an empty source |
| PD Stale home-repo source handling | Push reclassifies stale home-repo sources; Pull excludes stale home-repo sources; update skip in the `skill-authoring` change |
| PD No-change push | Push with nothing to change succeeds; Failed push is reported |
| PD Commit message contract | Descriptive push commit |
| PD Pull discovery rule | Pull offers authored and external skills in one picker |
| PD Pull pre-selection rule | Pull pre-selects by context |
| PD Pull agent rule | Pull chooses target agents |
| PD Pull install behavior | Pull restores authored skills from the home repo; Pull installs external skills through sync |
| PD Dry run | Pull dry run |
| PD Authentication | Home repo reached with the user's git credentials |
