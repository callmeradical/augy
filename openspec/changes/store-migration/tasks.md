# Tasks

The PRD is a draft with open decisions. Slice 1 resolves them and blocks every later slice that depends on them. Open questions are numbered as in design.md (OQ-1 to OQ-11). Slices 2 to 10 implement the decided requirements. Every one of them runs the migration command, so each is blocked on OQ-4 (its name) and on nothing else unless stated. Slices 11 to 15 implement the open items and have no spec scenarios until slice 1 adds them.

Tests run the migration command against a temporary `AUGY_HOME` and temporary agent skills folders holding real directories and symlinks, and assert the files, links and registry on disk.

## 1. Resolve open questions (blocking)

- [ ] 1.1 Decide OQ-4 (command name and placement) and OQ-5 (automatic vs. explicit); verify the decision is recorded in design.md Decisions and every "the migration command" reference in specs/store-migration/spec.md names the chosen command
- [ ] 1.2 Decide OQ-1 (repair of store-backed skills whose agents hold copies) and OQ-10 (existing store folder for a not-store-backed skill); verify design.md records the decisions and the spec has a requirement with scenarios for each adopted rule
- [ ] 1.3 Decide OQ-2 (diverged copies) and OQ-3 (preview and confirmation, `--dry-run`/`--yes`); verify design.md records them, the spec has requirements and scenarios for US-6, US-7 and US-8, and the "Migration can run without prompts" requirement names its non-interactive form
- [ ] 1.4 Decide OQ-6 (closing the sources of new copies); verify design.md records whether sync, home pull, author new, rollback and scan adoption are in scope, and the proposal and spec are updated to match
- [ ] 1.5 Decide OQ-7 (telling users migration is available), OQ-8 (half-migrated skills), OQ-9 (mixed or partial installs) and OQ-11 (reporting already-migrated skills in a mixed run); verify each decision is recorded in design.md and, where adopted, has a spec requirement with scenarios
- [ ] 1.6 Run `openspec validate store-migration --type change --strict` after the updates; verify it passes and the Coverage table in design.md has no uncovered user stories

## 2. Tracer bullet — migrate one skill copied into two agents

Blocked on: OQ-4.

- [ ] 2.1 Write a failing test: a tracked copy-based skill held as identical real directories in two agents ends with one copy in `store/<skill>/`, both agent paths as symlinks resolving to it, and the registry recording it as store-backed (scenario: "Migrating a skill copied into two agents")
- [ ] 2.2 Implement the minimal migration command to make 2.1 pass; verify the test passes (validation: HEAD Missing; draft Deviates)
- [ ] 2.3 Extend to several skills in one run; verify a test with three copy-based skills ends with all three in the store layout (scenario: "Migrating every copy-based skill in one run") (validation: HEAD Missing; draft Deviates)

## 3. Registry details carry over

Blocked on: OQ-4.

- [ ] 3.1 Write a failing test: a pinned, tagged skill with tap, SHA, two agents and version history has identical registry details after migration, and `augy rollback` can still select its earlier versions (scenarios: "Pinned, tagged skill with history", "Rolling back after migration")
- [ ] 3.2 Implement whatever 3.1 needs; verify it passes (validation: HEAD Missing; draft Conforms)

## 4. Store under AUGY_HOME

Blocked on: OQ-4.

- [ ] 4.1 Write a failing test: with `AUGY_HOME` set to a temporary directory, migrated skills land under that home's `store/` and nothing is written under `~/.augy/` (scenario: "Custom augy home")
- [ ] 4.2 Implement; verify 4.1 passes (validation: HEAD Missing; draft Deviates)

## 5. Repeat-safety

Blocked on: OQ-4. The "store-backed but agents still hold copies" case is excluded here and handled in slice 11 (OQ-1).

- [ ] 5.1 Write failing tests: a second run changes nothing and reports every skill already migrated; a freshly installed store-backed skill is skipped untouched; after a fixed partial failure, a rerun migrates the remaining skill and leaves the migrated one unchanged (scenarios: "Second run", "Freshly installed skills are left as they are", "Re-running after a partial failure")
- [ ] 5.2 Implement skipping of fully store-backed skills and the already-migrated report; verify 5.1 passes (validation: HEAD Missing; draft Deviates)

## 6. Scope limited to tracked skills and recorded paths

Blocked on: OQ-4.

- [ ] 6.1 Write failing tests: an untracked skill directory is unchanged and gets no store copy; an unrecorded hand-made copy of a tracked skill in another agent is unchanged while the recorded path becomes a link (scenarios: "Untracked skill in an agent folder", "Unrecorded copy of a tracked skill")
- [ ] 6.2 Implement; verify 6.1 passes (validation: HEAD Missing; draft Conforms)

## 7. Failure containment

Blocked on: OQ-4.

- [ ] 7.1 Write a failing test: when linking the second of three agents fails, all three agents still hold their original real directories with the same content, the registry doesn't record the skill as store-backed, and the other skills in the run migrate (scenario: "Linking fails partway through one skill")
- [ ] 7.2 Implement per-skill containment so no agent is left without the skill and the registry never records a skill as store-backed before its links exist; verify 7.1 passes (validation: HEAD Missing; draft Deviates)

## 8. Skip and report

Blocked on: OQ-4. Reporting format for mixed runs may change after OQ-11.

- [ ] 8.1 Write failing tests: a skill whose recorded paths are all missing is skipped untouched and listed with its reason; a mixed run reports the migrated skills and the skipped one with its reason (scenarios: "No usable real directory", "Summary of a mixed run")
- [ ] 8.2 Implement the end-of-run report; verify 8.1 passes (validation: HEAD Missing; draft Deviates)

## 9. Sourceless skills

Blocked on: OQ-4.

- [ ] 9.1 Write failing tests: an authored skill with no source and an adopted skill tracked in two agents both end in the store layout, and the authored skill still records no source (scenarios: "Authored skill", "Adopted skill")
- [ ] 9.2 Implement; verify 9.1 passes (validation: HEAD Missing; draft Conforms)

## 10. Migrated skills work with other commands

Blocked on: OQ-4.

- [ ] 10.1 Write failing tests: two successive `augy update` runs on a migrated skill reach both agents; `augy use` unlinks and relinks a formerly copy-based skill without "Could not link"; `augy list`, `augy info` and `augy diff` succeed on it; `augy uninstall` removes both agent links and the store folder (scenarios: "Update after migration", "Skillsets after migration", "Inventory and diff after migration", "Uninstall after migration")
- [ ] 10.2 Fix whatever 10.1 shows the migrated end state is missing; verify 10.1 passes (validation: HEAD Unverifiable; draft Deviates)

## 11. Repair store-backed skills whose agents hold copies (US-5)

Blocked on: OQ-1, OQ-4, OQ-10.

- [ ] 11.1 Write failing tests for the scenarios slice 1.2 added; verify they fail for the expected reason
- [ ] 11.2 Implement the repair; verify a skill that stopped updating in some agents shows the current version in every agent after migration

## 12. Diverged copies (US-7, US-8)

Blocked on: OQ-2, OQ-4.

- [ ] 12.1 Write failing tests for the scenarios slice 1.3 added for diverged copies; verify that nothing is overwritten unless the user chooses
- [ ] 12.2 Implement detection and the chosen handling; verify 12.1 passes in both interactive and non-interactive runs

## 13. Preview, confirmation and non-interactive runs (US-6, US-18)

Blocked on: OQ-2, OQ-3, OQ-4.

- [ ] 13.1 Write failing tests: the preview changes nothing on disk or in the registry, and a non-interactive run finishes without waiting for input (scenario: "Migration in CI", plus the scenarios slice 1.3 added)
- [ ] 13.2 Implement the preview and confirmation behavior; verify 13.1 passes

## 14. Telling users about migration and automatic migration (US-15)

Blocked on: OQ-4, OQ-5, OQ-7.

- [ ] 14.1 Write failing tests for the scenarios slice 1.5 added; verify a user with copy-based skills is told about migration where the decision says
- [ ] 14.2 Implement; verify 14.1 passes

## 15. Closing the sources of new copies

Blocked on: OQ-6. Skip this slice if OQ-6 puts it out of scope.

- [ ] 15.1 Write failing tests for each command OQ-6 brings into scope (sync, home pull, author new, rollback, scan adoption): afterwards the skill is in the canonical-store layout
- [ ] 15.2 Implement; verify 15.1 passes

## 16. Integration check

Blocked on: slices 2 to 10, and on 11 to 15 as far as slice 1 adopts them.

- [ ] 16.1 In a temporary `AUGY_HOME` with pre-v0.11.0 copy-based skills, an authored skill, an adopted skill and an untracked skill, run the migration command twice, then `augy update`, `augy use` and `augy uninstall`; verify the store, agent folders and registry match the spec at every step
