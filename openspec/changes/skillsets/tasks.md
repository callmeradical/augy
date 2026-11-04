# Tasks

Tracer-bullet vertical slices. Slice 1 is the thinnest end-to-end path: create a set, put a skill in it, and switch one agent to it. Each later slice widens one behavior. Tests run against a temporary `AUGY_HOME` and temporary agent skills folders holding real symlinks and copies, and assert the resulting files on disk.

## 1. Tracer bullet — create a set, add a skill, switch an agent to it

- [ ] 1.1 Write a failing test: in a temporary `AUGY_HOME`, `augy skillset create engineering` then `augy skillset add engineering tdd` writes `skillsets.json` under that home in the documented format (scenarios: "Creating a new skillset", "Custom augy home", "Stored skillset contents")
- [ ] 1.2 Write a failing test: with `tdd` installed in the store, `augy use engineering --agent <id>` leaves a `tdd` symlink in that agent's skills folder that resolves to the canonical copy (scenario: "Linking a store-backed skill")
- [ ] 1.3 Implement the minimal skillsets file, `create`, `add` and `augy use` path to make 1.1 and 1.2 pass; verify both tests pass and the skills lockfile is unchanged (scenario: "Default location") (validation: Deviates — create refuses prototype-key names such as `constructor`; no tests exist)

## 2. Skillset names and duplicate sets

- [ ] 2.1 Write failing tests: `engineering` and `my-set` are accepted; `my set`, `my_set` and `my.set!` fail and write nothing (scenarios: "Valid names are accepted", "Names with spaces, underscores or punctuation are rejected") (validation: no command-level test; src/skillsets.test.ts covers the name regex only, not "write nothing")
- [ ] 2.2 Write a failing test: `create` of an existing name fails and leaves its skills unchanged (scenario: "Creating a skillset that already exists")
- [x] 2.3 Implement name validation and the duplicate guard; verify 2.1 and 2.2 pass (validation: Conforms)

## 3. Editing set membership

- [ ] 3.1 Write failing tests: adding several skills keeps their order and moves `updatedAt` forward; a not-installed skill is added with a warning and nothing is installed; a duplicate is skipped with a note and not reported as added (scenarios: "Adding multiple skills", "Planning a set before installing its skills", "Adding a duplicate skill")
- [ ] 3.2 Write failing tests: `remove` drops the skill from the set and leaves its files and lockfile entry unchanged; a name not in the set warns and is not reported as removed (scenarios: "Removing a skill from a set", "Removing a misspelled skill name")
- [ ] 3.3 Implement `add` and `remove` rules; verify 3.1 and 3.2 pass (validation: Deviates — add/remove outros report skipped names as added/removed)

## 4. Inspecting skillsets

- [ ] 4.1 Write failing tests: `list` prints name, skill count and last-updated date sorted by name; `show` prints created and updated timestamps then one skill per line; bare `augy skillset` shows help listing all subcommands; a hand-edited file is honored (scenarios: "Listing several skillsets", "Showing a skillset", "Running skillset with no subcommand", "Hand edits are honored")
- [x] 4.2 Implement `list`, `show` and the help fallback; verify 4.1 passes (validation: Conforms)

## 5. Deleting skillsets safely

- [ ] 5.1 Write failing tests: delete with confirmation removes only that set and its prompt says no skills will be uninstalled; declining leaves the file unchanged; `--yes` deletes without a prompt; skill files and the lockfile are byte-for-byte unchanged in every case (scenarios: "Confirming a delete", "Declining a delete", "Scripted delete")
- [x] 5.2 Implement `delete` with confirmation and `--yes`; verify 5.1 passes (validation: Conforms)

## 6. Missing sets and corrupted file

- [ ] 6.1 Write failing tests: `add`, `remove`, `show`, `delete` and `augy use` on a nonexistent set fail and change nothing (scenarios: "Adding to a missing skillset", "Showing a missing skillset", "Unknown skillset")
- [ ] 6.2 Write failing tests: with invalid JSON in `skillsets.json`, `list`, `create` and `augy use` fail with an error telling the user to fix or delete the file, and the file's bytes are unchanged (scenarios: "Corrupted file on list", "Corrupted file on create", "Corrupted file on use")
- [ ] 6.3 Implement the missing-set errors and the corruption stop; verify 6.1 and 6.2 pass (validation: Deviates — prototype-key names bypass the missing-set error; corruption stop Conforms)

## 7. Full reconciliation of one agent's folder

- [ ] 7.1 Write failing tests against a folder holding an in-set symlink, an out-of-set symlink and a plain copy: afterwards exactly the in-set installed skills are linked, the out-of-set link is gone, its target is intact, and the copy is unchanged (scenarios: "Switching from one working mode to another", "Mixed folder of in-set links, out-of-set links and copies", "Removed link leaves the skill intact", "Copy not in the set survives a switch")
- [ ] 7.2 Write a failing test: switching between two sets that share `github` leaves exactly one copy of `github` on disk after each run (scenario: "Skill shared by two skillsets")
- [ ] 7.3 Implement symlink-only removal and linking; verify 7.1 and 7.2 pass (validation: Deviates — in-set link for an uninstalled skill is removed)

## 8. Plan, dry run, idempotence and summary

- [ ] 8.1 Write failing tests: the plan naming agent, skillset, Remove, Add and Already active is printed before changes; `--dry-run` prints the same plan and leaves the folder unchanged, and a following real run carries out that plan; a second identical run reports "already up to date" and changes nothing; the summary reports removed, added and unchanged counts (scenarios: "Plan shown on a real run", "Previewing a switch", "Running the same switch twice", "Summary counts")
- [x] 8.2 Implement plan printing, `--dry-run`, the up-to-date message and the summary; verify 8.1 passes (validation: Conforms)

## 9. Agent resolution

- [ ] 9.1 Write failing tests with controlled detection: `--agent` switches only that agent; `AUGY_DEFAULT_AGENT` is used without `--agent`; `--agent` beats it; with neither, the first detected agent in augy's order is switched and named in the plan; unknown IDs (flag or environment) and no detected agent fail with the known agent IDs listed and change nothing (scenarios: "Other agents are untouched", "Default agent from the environment", "--agent beats the environment", "Auto-detected agent", "Unknown agent ID", "Unknown agent ID from the environment", "No agent detected")
- [x] 9.2 Implement agent resolution; verify 9.1 passes (validation: Conforms)

## 10. Guard rails

- [ ] 10.1 Write failing tests: an empty set warns, exits 0 and changes nothing, even with no agent detected; an uninstalled skill is warned about and skipped while the rest are linked; a set with no installed skills warns and leaves existing symlinks in place (scenarios: "Using an empty skillset", "Empty skillset with no agent detected", "One skill not installed", "No skill in the set is installed")
- [x] 10.2 Implement the empty-set check before agent resolution and the not-installed handling; verify 10.1 passes (validation: Conforms)

## 11. Link fallbacks and per-skill errors

- [ ] 11.1 Write failing tests: a skill with no canonical copy links to another agent's existing recorded location; a skill with no existing location produces a per-skill error while other changes still apply; a failed link is named in the end-of-run report and doesn't stop other links (scenarios: "Falling back to another agent's location", "No location to link to", "One link fails")
- [x] 11.2 Implement the link-target fallback order and per-skill error collection; verify 11.1 passes (validation: Conforms)

## 12. Integration check

- [ ] 12.1 Run the full scenario: create `engineering` and `research` sharing one skill, switch an agent between them with `--dry-run` and real runs, delete one set with `--yes`; verify the agent folder, store, lockfile and `skillsets.json` match the specs at every step
