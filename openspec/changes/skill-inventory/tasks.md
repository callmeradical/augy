# Tasks

Tracer-bullet vertical slices. Each slice is one red-green-refactor cycle and lands its own tests. Tests run against an isolated `AUGY_HOME` with fixture lockfiles and skill folders.

## 1. Thinnest path — lockfile round trip through `augy list`

Covers: "Isolated environment", "Fresh machine", "Empty registry", "Entry contents", "Short SHA".

- [ ] 1.1 Write failing test: with `AUGY_HOME` set to an empty temp folder, `augy list` reports no skills installed and mentions `augy install`; after writing a fixture `registry.json` there with one sourced skill, `augy list` shows its name, `@<7-char SHA>`, source, agents, and updated date, and `~/.augy/` is untouched (validation: no automated test at HEAD)
- [x] 1.2 Implement minimal lockfile read under `AUGY_HOME` and list rendering, and verify the test passes (validation: Conforms)
- [ ] 1.3 Refactor and verify the slice's tests still pass (validation: no tests at HEAD for this slice)

## 2. Lockfile writes are safe and diffable

Covers: "Lockfile after an install", "Diffable output", "Stable across rewrites", "Interrupted write".

- [ ] 2.1 Write failing tests: after a write the file is valid, indented JSON; rewriting unchanged content is byte-identical; a write killed midway leaves either the old or the new complete file (validation: no automated test at HEAD)
- [x] 2.2 Implement atomic, pretty-printed writes and verify the tests pass (validation: Conforms)

## 3. Older and unreadable lockfiles

Covers: "Lockfile without taps", "Next write fills the section", "Syntax error after a hand edit", "No overwrite of an unreadable lockfile".

- [ ] 3.1 Write failing tests: a lockfile missing `taps` lists all skills and gains a `taps` section on the next write; a lockfile with a syntax error produces a "could not be read" outcome (not "No skills installed") and is still on disk unchanged after a writing command (validation: no automated test at HEAD)
- [ ] 3.2 Implement and verify the tests pass (validation: Deviates: corrupt lockfile treated as empty and overwritten)

## 4. List detail: untracked, inactive, pinned, history, order

Covers: "Sourceless skill", "Sourced but unversioned skill", "One inactive agent", "Pinned and unpinned", "More than three previous versions", "Skills in insertion order".

- [ ] 4.1 Write failing tests with fixture lockfiles for each covered scenario and verify they fail (validation: no automated test at HEAD)
- [x] 4.2 Implement the list markers, set-source hint, history summary, and insertion order, and verify the tests pass (validation: Conforms)

## 5. `augy list --json`

Covers: "Output matches the lockfile", "Empty registry as JSON".

- [ ] 5.1 Write failing test: `augy list --json` output parses and deep-equals the parsed `registry.json` (with skills, taps, home, machine context); with no skills it is a valid empty registry document (validation: no automated test at HEAD)
- [x] 5.2 Implement and verify the test passes (validation: Conforms)

## 6. `augy info` thinnest path

Covers: "Skill from a tap", "Mistyped name", "Paths shown".

- [ ] 6.1 Write failing tests: `augy info lint` shows source, tap with description, short and full SHA, and each agent path; `augy info no-such-skill` says not found, mentions `augy list`, and exits non-zero (validation: no automated test at HEAD)
- [x] 6.2 Implement and verify the tests pass (validation: Conforms)

## 7. Info dates, pin, label

Covers: "Pinned skill", "Updated after install", "Never updated", "Label present".

- [ ] 7.1 Write failing tests for each covered scenario (validation: no automated test at HEAD)
- [x] 7.2 Implement and verify the tests pass (validation: Conforms)

## 8. Info disk checks and history

Covers: "Deleted outside augy", "Inactive deployment", "Newest first", "Missing archive".

- [ ] 8.1 Write failing tests: a deleted deployment path shows "(missing!)", an inactive deployment is marked, all history entries appear newest first, and a deleted snapshot folder shows "[archive missing]" (validation: no automated test at HEAD)
- [x] 8.2 Implement and verify the tests pass (validation: Conforms)

## 9. Info SKILL.md preview

Covers: "Prose preview", "Stops at the next heading", "Frontmatter is not previewed".

- [ ] 9.1 Write failing tests with fixture `SKILL.md` files for each covered scenario, read from the first active deployment (validation: no automated test at HEAD)
- [ ] 9.2 Implement the preview and verify the tests pass (validation: Deviates: frontmatter shown in preview)

## 10. Read-only, offline guarantee

Covers: "No network", "Nothing changes".

- [x] 10.1 Verify with networking disabled (or all outbound calls failing) that `augy list`, `augy list --json`, and `augy info` succeed, and that `registry.json` and skill files are byte-identical before and after (validation: Conforms, run with no gh on PATH)

## 11. Lockfile contract and home layout

Covers: "Fields of an installed skill", "History order", "Sourceless skill entry", "Store-model install", "Archived version".

- [ ] 11.1 Verify after a store-model install into two agents, two updates, and a sourceless adoption that each lockfile entry has the required fields, history is oldest first with SHA/timestamp/archive path, the sourceless entry has an empty source and `unversioned`, the canonical copy is at `store/<skill>/`, and snapshots are at `versions/<skill>/<sha>/` under the augy home folder (validation: Deviates: archivePath ignores AUGY_HOME; sync drops optional fields)
