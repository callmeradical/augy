# Design

## Context

See proposal.md (Why) for motivation. This change is documented from the "Team Manifests" PRD (`docs/prd/team-manifests.md`, status: shipped at v0.11.0). augy is being archived; the specs record the intended behavior so a validator can compare the shipped code against them. Everything below is derived from the PRD, not from the implementation.

Constraints from the PRD:

- The per-machine lockfile (`registry.json`) can't be shared: it holds absolute paths and personal settings, and no command reads another machine's lockfile. The manifest is the shareable artifact.
- The manifest format is also used by the home-repo feature (`augy home push` writes `contexts`; `augy home pull` reads it and runs sync internally). Behavior here therefore also affects `augy home pull`.
- GitHub is the only source host, accessed through each developer's GitHub CLI (`gh`) login.

## Goals / Non-Goals

**Goals:**

- One command for a team lead to publish the team's skill set as a small, reviewable file.
- One command for a teammate to get every skill in that file into the agents they use, safely re-runnable and automatable in CI.
- Never destroy local skills that aren't in the manifest.

**Non-Goals (from the PRD's Out of Scope):**

- Removing skills not in the manifest (no `--prune` / exact-match mode).
- Pinning exact versions in the manifest (no SHA or lock field).
- Bundling a subset of skills, or merging a new bundle into an existing manifest.
- Including self-authored skill files (the home-repo feature handles those).
- Applying or filtering by context tags during sync (that's `augy home pull`).
- Fetching a manifest from a URL or remote repo.
- Validating the manifest `version` field.

## Decisions

1. **Manifest format v1 is `{"version": 1, "skills": {name: source}, "contexts"?: {name: [tags]}}`.** Keys are the skill's install name in each agent's skills folder; an empty-string source means unknown. Rationale (PRD US-2): small and readable enough to review in pull requests.
2. **The manifest lists sources, not versions.** Sync always resolves to current upstream (default branch or the URL's ref). Rationale (PRD): the team follows upstream; version locking is out of scope. Consequence: two teammates syncing at different times may get different versions.
3. **Bundle copies registry sources verbatim.** Rationale: PRD decision; no normalization means the manifest reflects exactly what each skill was installed from.
4. **Bundle excludes sourceless skills unless `--include-untracked`; sourced-but-`unversioned` skills are always included.** Rationale (PRD US-3–5): the published manifest should contain only installable skills by default, with an opt-in for placeholders someone can fill in later.
5. **Bundle always overwrites, never merges or prompts; empty registry writes nothing; default output `./augy.json`.** Rationale: PRD decisions; keeps bundle a pure export of the registry.
6. **Bundle never writes `contexts`; sync ignores it.** Rationale: PRD decision; contexts belong to the home-repo flow.
7. **Sync defaults to `./augy.json`; missing file, invalid JSON, or no target agents end with a non-zero exit; an empty `skills` map is "nothing to sync".** Rationale (PRD US-17, US-18). The specs extend "fail clearly" to valid JSON without a `skills` object, which the PRD's Further Notes present as a probable crash.
8. **Target agents: exactly the `--agent` IDs (unknown ignored), otherwise every detected agent with no picker.** Rationale (PRD US-8, US-9).
9. **Per-entry classification: empty source → Skipped; not installed → Install; recorded SHA differs from upstream → Upgrade; otherwise Up to date; unresolvable upstream → Skipped.** Rationale (PRD US-11). The specs additionally require that an unchanged upstream compare as Up to date (US-15 and the PRD's Testing Decisions), which the PRD's Further Notes say the shipped SHA comparison probably fails.
10. **Nothing is ever removed.** Rationale (PRD US-14): adopting the team set must never delete personal skills.
11. **Pins are kept but not honored.** Sync upgrades a pinned skill and leaves it pinned. Rationale: PRD decision (the manifest wins over local pins); US-24 keeps the pin meaningful for later `augy update` runs.
12. **An upgrade keeps install date, pin flag, and existing version history; the deployment list is replaced with the agents targeted by this run.** Rationale (PRD US-25, PD). The deployment-list replacement is a PRD decision recorded here as a design constraint rather than a spec requirement, because the PRD's Further Notes flag its consequence (registry loses non-targeted agents) as a gap. See Open Questions.
13. **One confirmation for the whole plan, showing target agents; `--yes` skips it; `--dry-run` always stops after the plan.** Rationale (PRD US-10, US-12, US-13).
14. **Each skill installs independently, failures shown per line, registry saved after each success.** Rationale (PRD US-19, US-20): one broken source must not block the rest, and an interrupted sync resumes on re-run. The specs also require truthful summaries and a non-zero exit on failures, because the PRD's Further Notes present the success exit and "Everything is up to date." on total failure as defects that leave CI unable to tell a broken sync from a clean one.
15. **Sync downloads a separate copy into every target agent's skills folder, replacing what's there; it does not use the canonical store or symlinks.** Rationale: PRD decision. Recorded as a design constraint; the specs only require that the skill exist in each target agent's folder, because the PRD leaves open whether sync should move to the store model. See Open Questions.
16. **All GitHub access goes through each developer's `gh` login.** Rationale (PRD US-21): private team repos work without a central service or shared token.

## Risks / Trade-offs

All items below come from the PRD's Further Notes.

- [Sync probably reports "Upgrade" for every skill, every time] → Sync compares the registry SHA with the last commit touching the skill's path, but install/update/sync record a branch-head or tree SHA. "Up to date" is effectively unreachable and nightly `--yes` runs re-download everything. The specs require the intended behavior (re-run is a no-op).
- [Failures reported as "no source"; all-fail reports success; exit code ignores per-skill failures] → CI can't tell broken from clean. The specs require truthful reporting and non-zero exit.
- [Sync upgrades don't archive the previous version] → Unlike `augy update`, no snapshot or history entry is added, so you can't roll back to the pre-sync version. See Open Questions.
- [Sync works against the canonical-store model] → Replacing a store symlink with a plain copy orphans the store copy, duplicates the skill on disk, and makes `augy use` ignore it (inferred from the skillsets docs).
- [Upgrades drop other agents from the registry] → Consequence of Decision 12; the non-targeted agent's outdated files stay on disk.
- [Tap and context metadata are lost on upgrade] → The registry entry is rebuilt. See Open Questions.
- [Pins are not respected] → Deliberate per Decision 11 but undocumented to users.
- [Untracked same-name skills are overwritten silently] → A hand-installed folder with a manifest name is replaced without warning. See Open Questions.
- [Wrong skill installed on a name mismatch] → The specs require reporting a failure instead.
- [README overpromises "exact skill set"] → No SHAs, so teammates get the same sources at current upstream; sourceless skills, pins, and agent choices aren't carried over.
- [Bundle's closing message always says "Commit augy.json"] → The specs require the message to name the file actually written.
- [Docs gaps] → `--yes` on sync is missing from the README and docs site; a code comment mentions a nonexistent `--tracked-only` flag.
- [Bundle never writes `contexts`] → Team manifests made with bundle never carry context tags.

## Migration Plan

N/A — archived.

## Open Questions

- (PRD) Should sync install through the canonical store (one copy, symlinked into each agent) like `augy install` does?
- Should a sync upgrade archive the previous version and add a history entry, as `augy update` does, so the pre-sync version can be rolled back to?
- Should an upgrade keep deployments to agents not targeted by this run, rather than replacing the deployment list?
- Should an upgrade keep the skill's tap and context tags?
- Should sync warn before replacing an untracked, hand-installed folder that has the same name as a manifest entry?
- Should pin-overriding be surfaced to the user (for example in the plan), given that it contradicts the general meaning of a pin?
- How should Skipped distinguish "no source" placeholders from "upstream couldn't be resolved"? The specs require that they be distinguishable from Up to date and that failures affect the exit status, but don't fix the grouping or wording.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | Bundle writes a version 1 manifest from the registry |
| US-2 | Bundle writes a version 1 manifest from the registry |
| US-3 | Bundle leaves out sourceless skills by default |
| US-4 | Bundle leaves out sourceless skills by default |
| US-5 | Include-untracked adds placeholders |
| US-6 | Bundle output location |
| US-7 | Sync reads a manifest from a path or the current folder; Sync installs into every target agent and records the skill |
| US-8 | Sync targets every detected agent by default |
| US-9 | Agent flag selects exactly the target agents |
| US-10 | Dry run changes nothing |
| US-11 | Sync classifies each entry into a plan |
| US-12 | Sync confirms once before applying |
| US-13 | Sync confirms once before applying; Sync reports failures truthfully |
| US-14 | Sync never removes skills |
| US-15 | Re-running sync is a no-op when nothing changed upstream |
| US-16 | Placeholder entries are skipped with a warning |
| US-17 | Sync fails clearly on a missing or malformed manifest |
| US-18 | Sync stops when there are no target agents |
| US-19 | Per-skill failures are isolated and saved progress is kept; Sync reports failures truthfully |
| US-20 | Per-skill failures are isolated and saved progress is kept |
| US-21 | Sync uses each developer's GitHub CLI login |
| US-22 | Sync resolves each entry against current upstream |
| US-23 | Sync reads a manifest from a path or the current folder |
| US-24 | Upgrades preserve pin, install date, and history |
| US-25 | Upgrades preserve pin, install date, and history |
| PD: manifest format v1; key is install name | Bundle writes a version 1 manifest from the registry; Sync installs the skill the manifest names; Decision 1 |
| PD: `contexts` optional, never written by bundle, ignored by sync | Bundle does not write contexts; Sync ignores manifest contexts |
| PD: sources copied as-is | Bundle copies sources exactly as recorded |
| PD: manifest lists sources, not versions | Sync resolves each entry against current upstream; Decision 2 |
| PD: untracked left out by default; unversioned included | Bundle leaves out sourceless skills by default; Include-untracked adds placeholders |
| PD: bundle overwrites; empty registry writes nothing | Bundle overwrites without merging; Empty registry writes nothing |
| PD: bundle default output `./augy.json` | Bundle output location |
| PD: sync default manifest; non-zero exits; "nothing to sync" | Sync reads a manifest from a path or the current folder; Sync fails clearly on a missing or malformed manifest; Sync stops when there are no target agents; Empty skills map is nothing to sync |
| PD: target agents | Sync targets every detected agent by default; Agent flag selects exactly the target agents |
| PD: how sync decides per entry | Sync classifies each entry into a plan; Placeholder entries are skipped with a warning |
| PD: nothing is ever removed | Sync never removes skills |
| PD: pins kept but not honored | Upgrades preserve pin, install date, and history |
| PD: what an upgrade keeps; deployment list replaced | Upgrades preserve pin, install date, and history; Decision 12 (deployment list) |
| PD: confirmation; dry-run beats yes | Sync confirms once before applying; Dry run changes nothing |
| PD: error handling; save after each skill | Per-skill failures are isolated and saved progress is kept |
| PD: sync copies files into each agent | Sync installs into every target agent and records the skill; Decision 15 |
| PD: GitHub access via GitHub CLI | Sync uses each developer's GitHub CLI login |
