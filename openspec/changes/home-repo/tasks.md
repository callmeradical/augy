# Tasks

## 1. Tracer bullet — set a home repo and push one external skill to it

Covers: "Home repo saved to the lockfile", "Defaults applied", "External and authored skills recorded" (external half), "Message without authored skills", "Credential helper used".

- [x] 1.1 Write a failing test: `augy home set alice/skills` saves repo `alice/skills`, manifest path `augy.json`, and skills directory `skills` in the lockfile. Verified by reading the lockfile after the command. (validation: Conforms; home.test.ts:157-164)
- [ ] 1.2 Write a failing test: with one external skill installed, `augy home push` against a local bare git repo standing in for the home repo produces a commit containing `augy.json` with `"version": 1` and `"skills": { "<name>": "<source>" }`, with message `chore: update skills via augy — 1 skill(s)`. Verified by inspecting the bare repo. (validation: no test: push tests mock git)
- [x] 1.3 Implement the minimum to pass both tests. Verify that push goes through the user's git configuration and that augy prompts for and stores no credentials. (validation: Conforms)

## 2. Configuration surface — set options, validation, confirm, replace, show

Covers: "AUGY_HOME is honored", "Custom manifest path and skills directory", "Bare name rejected", "Empty owner or repo rejected", "Extra path segment rejected", "Full URL rejected", "Confirmation output", "Switch to a different repo", "Omitted options revert to defaults", "Configuration shown", "No configuration".

- [ ] 2.1 Write failing tests for `--path`, `--skills-path`, and `AUGY_HOME`. Verified by lockfile contents. (validation: no AUGY_HOME test)
- [ ] 2.2 Write failing tests that each invalid identifier fails and leaves the lockfile unchanged. (validation: only one bad input, no unchanged check)
- [ ] 2.3 Write failing tests that set prints repo, manifest path, and skills directory, and that re-running set replaces all three values (omitted options revert to defaults). (validation: no test)
- [ ] 2.4 Write failing tests that `augy home show` prints the configuration, or a hint pointing to `augy home set` when there is none. (validation: no test)
- [x] 2.5 Implement until 2.1–2.4 pass. (validation: Conforms)

## 3. Push guard and failure reporting

Covers: "Push without configuration", "Rejected push", "Missing repo not created", "Second identical push".

- [ ] 3.1 Write a failing test that push with no home repo configured exits with a failure and points to `augy home set`. (validation: test asserts exit only)
- [ ] 3.2 Write a failing test that a push rejected by the remote prints "Push failed" with git's error and exits with a failure, and that a non-existent repo is not created. (validation: no test)
- [ ] 3.3 Write a failing test against a real git repo: a second push with no changes prints "Nothing changed — home repo is already up to date" and exits with success. (validation: no test)
- [ ] 3.4 Implement until 3.1–3.3 pass. (validation: Deviates: no-change push fails; clone failure exits 0)

## 4. Push authored skills and full inventory

Covers: "External and authored skills recorded", "Manifest reflects only this machine", "Authored files committed", "External files not copied", "Authored skill missing on disk", "Authored skill reached through a symlink", "Source empty after push", "Message with authored count".

- [ ] 4.1 Write failing tests: authored skills appear as `""` in the manifest, and their files land in `skills/<name>/` taken from the first existing active location. External skills get no folder, and an authored skill with no on-disk copy is listed but adds no files. (validation: partial test only)
- [ ] 4.2 Write a failing test that an authored skill whose first location is a symlinked folder is copied and the push completes. (validation: no test)
- [ ] 4.3 Write failing tests that the manifest lists exactly this machine's skills, that authored skills keep an empty source in the lockfile after push, and that the commit message includes ` (<M> authored)`. (validation: source check is vacuous; no message test)
- [ ] 4.4 Implement until 4.1–4.3 pass. (validation: Deviates: symlinked authored skill breaks push)

## 5. Push tags, nested paths, and stale sources

Covers: "Tags saved", "No tags", "Machine context stays local", "Nested manifest path on first push", "Pre-v0.6.0 skill reclassified".

- [ ] 5.1 Write failing tests: the `contexts` map is written for tagged skills and omitted when none are tagged, and the machine context never appears in the pushed repo. (validation: no test)
- [ ] 5.2 Write a failing test that `--path config/augy.json` works on the first push into a repo without `config/`. (validation: no test)
- [ ] 5.3 Write a failing test that a skill whose source points at the home repo is saved in the lockfile with an empty source and unversioned version, and pushed as `""`. (validation: no test)
- [ ] 5.4 Implement until 5.1–5.3 pass. (validation: Deviates: nested --path fails with ENOENT)

## 6. Pull — discovery and authored restore (thin pull path)

Covers: "Pull without configuration", "Combined picker", "Authored copy wins", "Empty-source entry without files", "Authored skill restored with tags", "Only chosen agents", "Empty repo".

- [ ] 6.1 Write a failing test that pull with no home repo configured exits with a failure and points to `augy home set`. (validation: test asserts exit only)
- [ ] 6.2 Write failing tests for the discovery rule: directories become authored entries and non-empty manifest entries become external entries. Authored wins on a name clash, and empty-source entries without a directory are not offered. (validation: partial test only)
- [ ] 6.3 Write a failing test that selecting an authored skill and one agent copies the repo's files only into that agent's folder, and records the skill with an empty source and its manifest tags. (validation: partial test only)
- [ ] 6.4 Write a failing test that an empty home repo reports that no skills were found and installs nothing. (validation: no test)
- [x] 6.5 Implement until 6.1–6.4 pass. (validation: Conforms)

## 7. Pull — pre-selection and picker presentation

Covers: "No context", "Machine context filters defaults", "Flag overrides machine context", "Manifest tags before local tags", "Pre-selection is only a default", "Type to filter", "Entry hints", "Context in header".

- [ ] 7.1 Write failing tests for pre-selection with no context, with machine context only, and with `--context` overriding the machine context (machine setting unchanged afterwards). Also test that manifest tags take precedence over local tags. (validation: only --context with local tags tested)
- [ ] 7.2 Write failing tests that the picker supports type-to-filter and shows each entry's tags and authored/source hint, that the header shows the active context, and that any entry can be toggled. (validation: no test; picker mocked)
- [ ] 7.3 Implement until 7.1–7.2 pass. (validation: Deviates: filtering needs `/` first)

## 8. Pull — agents, externals via sync, stale exclusion, dry run, cancel

Covers: "Agent picker lists detected agents", "Flag skips the agent picker", "Unknown agent ID ignored", "No agents", "Only selected externals synced", "No externals selected", "Stale entry not installed", "Preview only", "Cancel skill picker", "Cancel agent picker".

- [ ] 8.1 Write failing tests for the agent picker (detected agents only, all pre-selected), for `--agent` skipping it and ignoring unknown IDs, and for zero agents being an error. (validation: --agent test is vacuous)
- [ ] 8.2 Write failing tests that only selected external entries reach the sync path, which shows its plan and asks for confirmation, and that sync does not run when no externals are selected. (validation: partial; manifest contents not asserted)
- [ ] 8.3 Write a failing test that a stale home-repo-sourced entry is not installed from GitHub. (validation: no test)
- [ ] 8.4 Write failing tests that `--dry-run` lists selections (source or "authored") and changes no agent folder or lockfile entry, and that cancelling either picker installs nothing. (validation: no test)
- [x] 8.5 Implement until 8.1–8.4 pass. (validation: Conforms)

## 9. End-to-end round trip

- [ ] 9.1 Against a local bare repo standing in for the home repo, push from one temporary augy home with one authored and one external tagged skill. Pull into a second temporary augy home and verify the authored files, the empty source, the tags, and the external entry offered to sync. (validation: Deviates: run by hand; external tags lost; no automated test)
