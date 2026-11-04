# Tasks

Tracer-bullet vertical slices. Each slice is one red-green-refactor cycle and lands its own tests. Tests run against an isolated `AUGY_HOME`, temporary agent skills folders, and fixture GitHub repos or a stubbed GitHub CLI.

## 1. Thinnest path — bundle one skill, sync it onto a fresh machine

Covers: "Two sourced skills", "Default path", "Default manifest", "New skill installed".

- [ ] 1.1 Write failing test: on machine A, `augy bundle` writes `./augy.json` with `version: 1` and the registry's skills mapped to their sources; on a fresh `AUGY_HOME` with two detected agents, `augy sync --yes` in that folder installs the skill into both agents' skills folders and records it in the registry with the manifest source and a SHA (validation: no automated test at HEAD)
- [x] 1.2 Implement minimal bundle and sync (install path only) and verify the test passes (validation: Conforms)
- [ ] 1.3 Refactor and verify the slice's tests still pass (validation: no tests at HEAD for this slice)

## 2. Bundle content rules

Covers: "Shorthand and URL preserved", "Sourceless skill excluded", "Unversioned but sourced skill included", "Placeholder entry", "Skills with context tags".

- [ ] 2.1 Write failing tests for each covered scenario, inspecting the written JSON and bundle's output (validation: no automated test at HEAD)
- [x] 2.2 Implement and verify the tests pass (validation: Conforms)

## 3. Bundle output handling

Covers: "Custom output", "Existing manifest replaced", "Nothing installed".

- [ ] 3.1 Write failing tests: `--output` writes to the given path and the closing message names that file; an existing manifest is replaced without a prompt; an empty registry creates no file (validation: no automated test at HEAD)
- [ ] 3.2 Implement and verify the tests pass (validation: Deviates: closing message always says augy.json)

## 4. Sync manifest loading and errors

Covers: "Explicit path", "Missing manifest", "Invalid JSON", "No skills object", "Empty map".

- [ ] 4.1 Write failing tests: explicit path is read; missing file exits non-zero and suggests `augy bundle`; invalid JSON and a manifest without `skills` exit non-zero with a clear message; an empty map reports nothing to sync; none of these change files or the registry (validation: no automated test at HEAD)
- [ ] 4.2 Implement and verify the tests pass (validation: Deviates: missing skills object crashes with TypeError)

## 5. Target agent selection

Covers: "Two detected agents", "One named agent", "Unknown agent ID", "No detected agents".

- [ ] 5.1 Write failing tests for default targeting without a picker, `--agent` exact targeting with unknown IDs ignored, and the non-zero exit with install-an-agent / `--agent` guidance when there are no targets (validation: no automated test at HEAD)
- [x] 5.2 Implement and verify the tests pass (validation: Conforms)

## 6. Plan classification and dry run

Covers: "One entry in each group", "Dry run with yes", "Placeholder in the manifest", "Manifest with contexts".

- [ ] 6.1 Write failing test: a four-entry manifest under `--dry-run` shows one entry in each of Install, Upgrade (old → new SHA), Up to date, and Skipped, and `--dry-run --yes` leaves agent folders and `registry.json` byte-identical (validation: no automated test at HEAD)
- [ ] 6.2 Write failing tests: an empty-source entry is skipped with a warning while others install; a `contexts` field doesn't change the plan (validation: no automated test at HEAD)
- [ ] 6.3 Implement and verify the slice's tests pass (validation: Deviates: Up to date unreachable; unresolvable entries labelled no source)

## 7. Up-to-date detection

Covers: "Immediate re-run", "Only changed skills upgrade".

- [ ] 7.1 Write failing test: immediately after a successful `augy sync --yes`, `augy sync --dry-run` lists every sourced entry under Up to date; when only one upstream changes, only that skill's files are rewritten (validation: no automated test at HEAD)
- [ ] 7.2 Implement an upstream comparison consistent with the SHA recorded at install, and verify the test passes (validation: Deviates: immediate re-run upgrades every skill)

## 8. Upstream resolution and refs

Covers: "Tree URL with a tag", "Shorthand follows the default branch".

- [ ] 8.1 Write failing tests with a fixture repo whose `v2` tag differs from the default branch, checking installed files and recorded SHA (validation: no automated test at HEAD)
- [x] 8.2 Implement and verify the tests pass (validation: Conforms; recorded SHA is the tag object for annotated tags)

## 9. Confirmation

Covers: "Prompt shows agents", "Declined", "Unattended run".

- [ ] 9.1 Write failing tests: without `--yes` sync names the target agents and prompts once; declining changes nothing; with `--yes` and no TTY it applies without prompting (validation: no automated test at HEAD)
- [x] 9.2 Implement and verify the tests pass (validation: Conforms)

## 10. Upgrades keep pin, install date, and history

Covers: "Pinned skill upgraded", "History and install date kept".

- [ ] 10.1 Write failing tests: a pinned skill with a changed upstream is upgraded and still pinned; an upgraded skill keeps its install date and existing history entries (validation: no automated test at HEAD)
- [x] 10.2 Implement and verify the tests pass (validation: Conforms)

## 11. Safety: never remove, install the named skill

Covers: "Personal skill left alone", "Name not found at the source".

- [ ] 11.1 Write failing tests: a locally installed skill absent from the manifest is byte-identical after sync; a manifest name not present in a multi-skill source creates no folder and is reported as failed (validation: no automated test at HEAD)
- [ ] 11.2 Implement and verify the tests pass (validation: Deviates: name mismatch installs remote[0])

## 12. Failure isolation, incremental saves, and truthful exit status

Covers: "One broken source", "Interrupted sync", "Every entry unresolvable", "Partial failure".

- [ ] 12.1 Write failing tests: a failing middle install is reported on its line while the others install and are saved; an interrupted sync keeps finished skills and a re-run plans only the rest (validation: no automated test at HEAD)
- [ ] 12.2 Write failing tests: when every entry is unresolvable sync does not say everything is up to date and exits non-zero; with one of three installs failing the summary counts two and the exit is non-zero (validation: no automated test at HEAD)
- [ ] 12.3 Implement and verify the slice's tests pass (validation: Deviates: failures exit 0 and are miscounted)

## 13. Private sources through the GitHub CLI

Covers: "Private team repo".

- [ ] 13.1 Verify against a private repo the logged-in GitHub CLI user can access that `augy sync --yes` installs the manifest skill with no extra token configuration (validation: Deviates by reading: giget download has no gh auth)
