# Tasks

Tracer-bullet vertical slices. Each slice is one red-green-refactor cycle and lands its own tests. Tests run against an isolated `AUGY_HOME` and temporary agent skills folders; GitHub access is exercised against fixture repos or a stubbed GitHub CLI.

## 1. Thinnest path — scan finds one untracked skill and imports it without a source

Covers: "Skill in an undetected agent's folder is found", "Everything tracked", "Declining the import prompt", "Blank source", "Files untouched in place".

- [ ] 1.1 Write failing test: with one `SKILL.md` directory in a supported but undetected agent's skills folder, `augy scan` reports it; declining the prompt leaves `registry.json` byte-identical; when all skills are tracked, scan reports that and exits without prompting (validation: no automated test at HEAD)
- [x] 1.2 Implement minimal scan and import so that confirming and leaving the source blank adds the skill to the registry with an empty source, SHA `unversioned`, and its current path, and verify the test passes and the skill directory is still a plain directory at the same path with nothing created under `store/` (validation: Conforms)
- [ ] 1.3 Refactor and verify the slice's tests still pass (validation: no tests at HEAD for this slice)

## 2. Directory search across every agent

Covers: "Skills across several agents are all found", "Nested skill in a category folder is found", "Directories inside a skill are not reported as skills", "Directory without SKILL.md is not a skill", "Tracked skill is not offered for import", "Untracked symlinked skill is reported".

- [ ] 2.1 Write failing tests for each covered scenario using fixture skills folders for several agents, and verify they fail (validation: no automated test at HEAD)
- [x] 2.2 Implement recursive search that stops at `SKILL.md` directories and skips names already in the registry, and verify the tests pass (validation: Conforms)
- [ ] 2.3 Write failing test for "Untracked symlinked skill is reported", implement, and verify it passes (validation: Deviates: symlinks skipped)

## 3. One skill, many agent locations

Covers: "Skill in two agents is reported once", "Import records every location".

- [ ] 3.1 Write failing test: a same-named untracked skill in two agents is listed once with both paths, and importing it yields one registry entry with both agents and paths (validation: no automated test at HEAD)
- [x] 3.2 Implement name-based grouping and verify the test passes (validation: Conforms)

## 4. Result groups and no-provenance preview

Covers: "Mixed results", "First line skips frontmatter and headings".

- [ ] 4.1 Write failing test: output has "provenance detected" and "no provenance found" groups; a no-provenance skill shows each agent path and its first prose line, skipping frontmatter and headings, truncated to 80 characters (validation: no automated test at HEAD)
- [ ] 4.2 Implement the grouped report and verify the test passes (validation: Deviates: ellipsis appended after 80 chars)

## 5. Git provenance

Covers: "HTTPS remote", "SSH remote gives the same source", "SHA is the last commit touching the skill's path", "Non-GitHub origin", "GitHub remote that is not origin".

- [ ] 5.1 Write failing tests with fixture git checkouts (HTTPS origin, SSH origin, non-GitHub origin, GitHub remote not named origin) and verify the reported source, SHA, and `git` label (validation: no automated test at HEAD)
- [ ] 5.2 Implement git provenance and verify the tests pass (validation: Deviates: wrong path when agent folder is reached through a symlink)

## 6. Frontmatter provenance and SHA lookup

Covers: "Shorthand source field", "repo or origin field", "Tree URL in frontmatter resolves to its repo and path", "Non-GitHub frontmatter source is ignored", "SHA resolved from GitHub", "SHA lookup fails".

- [ ] 6.1 Write failing tests for `source`, `repo`, and `origin` frontmatter fields, a tree-URL source, and a non-GitHub source, checking label and resolved repo/path (validation: no automated test at HEAD)
- [ ] 6.2 Implement frontmatter provenance and verify the tests pass (validation: Deviates: tree URL misresolved; non-GitHub hosts accepted)
- [ ] 6.3 Write failing tests: import with a resolvable source records a commit SHA; a failing lookup records the source with SHA `unversioned` and the next skill still imports; implement and verify (validation: no tests; tap SHA is a tree SHA)

## 7. Tap provenance and provenance order

Covers: "Name matches a tap entry", "Tap recorded on import", "No taps registered", "Git wins over frontmatter", "Frontmatter wins over tap".

- [ ] 7.1 Write failing tests with a registered fixture tap (including duplicate names, where the first entry wins) and verify label `tap` and the recorded tap after import (validation: no automated test at HEAD)
- [ ] 7.2 Write failing tests for the git → frontmatter → tap order (validation: no automated test at HEAD)
- [x] 7.3 Implement tap matching and ordering and verify all slice tests pass (validation: Conforms)

## 8. Interactive selection and per-skill source confirmation

Covers: "All pre-selected", "Deselected skill is not imported", "Accepting the detected source", "Rejecting a wrong guess", "Typed shorthand".

- [ ] 8.1 Write failing tests driving the prompts: all skills start selected, a deselected skill isn't imported, "Use detected source?" defaults to yes, answering no leads to manual entry, and a typed `owner/repo/path` is recorded (validation: no automated test at HEAD)
- [ ] 8.2 Implement the selection list and per-skill prompts and verify the tests pass (validation: Deviates: no list when exactly one skill)

## 9. Incremental saves

Covers: "Cancelled partway".

- [ ] 9.1 Write failing test: interrupting the import after two skills leaves both in `registry.json` (validation: no automated test at HEAD)
- [x] 9.2 Implement per-skill registry saves and verify the test passes (validation: Conforms)

## 10. Scan frontmatter write-back

Covers: "Frontmatter block exists without source", "No frontmatter block", "Existing source field is kept", "No write-back without a resolved SHA", "Only the first agent location is written".

- [ ] 10.1 Write failing tests inspecting `SKILL.md` contents after import for each covered scenario (validation: no automated test at HEAD)
- [x] 10.2 Implement write-back and verify the tests pass (validation: Conforms)

## 11. Additional agent locations of tracked skills

Covers: "Copy found after an import", "Copy found when nothing is untracked", "Copy found after declining import", "Declining additional paths", "Symlinked copy of a tracked skill is offered as an additional install".

- [ ] 11.1 Write failing tests: a tracked skill present in an unregistered agent's folder is offered with one yes/no, whether or not anything was imported; yes adds the path under that agent; no changes nothing (validation: scan.test.ts covers findAdditionalAgentInstalls only, not the prompt or flow)
- [ ] 11.2 Implement the additional-install step independently of the import step and verify the tests pass (validation: Deviates: skipped when nothing untracked or import declined)

## 12. Set-source thinnest path

Covers: "Unknown skill", "Sourceless skill gets a source", "Existing source is replaced without a prompt", "Typo in the source".

- [ ] 12.1 Write failing tests: `augy set-source` on an unknown skill exits non-zero with the registry unchanged; on a registered skill with a valid source it stores the source as typed and the latest upstream commit for the path without prompting; an unresolvable source exits non-zero and changes nothing (validation: no automated test at HEAD)
- [x] 12.2 Implement and verify the tests pass (validation: Conforms)

## 13. Set-source URL forms and refs

Covers: "Tree URL", "Blob URL to SKILL.md", "Plain repo URL", "Shorthand with path", "Tag ref".

- [ ] 13.1 Write failing tests for each URL form and for a `/tree/v2/...` ref, checking the resolved repo, path, ref, and recorded SHA (validation: no automated test at HEAD)
- [x] 13.2 Implement URL parsing and ref resolution and verify the tests pass (validation: Conforms)

## 14. Set-source write-back and inventory effect

Covers: "All active locations written", "Existing frontmatter source left as is", "Skill becomes tracked in the inventory", "Sourceless skill in list".

- [ ] 14.1 Write failing tests: after set-source, `SKILL.md` in every active location (not inactive ones) has `source:`, an existing `source` is kept, and `augy list` shows the short SHA instead of "untracked" (validation: no automated test at HEAD)
- [ ] 14.2 Write failing test: `augy list` with a sourceless skill shows the `augy set-source` command naming that skill (validation: no automated test at HEAD)
- [x] 14.3 Implement and verify the slice's tests pass (validation: Conforms)

## 15. GitHub CLI access for private sources

Covers: "Private repo source", "Private repo".

- [ ] 15.1 Verify against a private repo the logged-in GitHub CLI user can access that scan import and set-source both record a resolved SHA with no extra token configuration (validation: Unverifiable: no private repo available)
