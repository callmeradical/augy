# Tasks

Each slice is verified from the outside: run `augy` against a temporary `AUGY_HOME`, fake agent homes, and a controlled GitHub source, then check files on disk, the lockfile, output, and exit codes. Per-feature behavior is verified in the sibling changes; these slices check only the cross-cutting rules.

## 1. Tracer bullet — install one skill from GitHub and record it in a plain JSON lockfile

- [ ] 1.1 Write a failing end-to-end test: installing a plain `SKILL.md` folder from a GitHub repo with only GitHub access succeeds and needs no augy account (scenarios: Install with only GitHub access; Plain folder with SKILL.md) (validation: no automated test at HEAD)
- [ ] 1.2 Make it pass and verify `registry.json` parses as standard JSON and holds the skill's source and upstream commit SHA (scenarios: Lockfile readable without augy; Lockfile records the commit) (validation: Deviates: catalog and tap installs record tree SHAs)
- [ ] 1.3 Verify any version augy prints for the skill is that commit SHA or its short form (scenario: Version shown as a SHA) (validation: Deviates)

## 2. Distribution

- [ ] 2.1 Install `@callmeradical/augy` from npm on Node.js 18 and verify an `augy` command is on PATH (scenario: Installed from npm) (validation: Unverifiable: no Node 18 available)
- [x] 2.2 Verify the published package's license is MIT (scenario: License) (validation: Conforms)

## 3. Relocatable home

- [ ] 3.1 Write a failing test: with `AUGY_HOME` set, an install writes the lockfile under that directory and leaves `~/.augy/registry.json` untouched; make it pass (scenario: Lockfile under AUGY_HOME) (validation: Conforms; no automated test at HEAD)

## 4. Trusted sources only

- [ ] 4.1 Write a failing test: a bare-name install resolves only against registered taps, and a name none of them contain installs nothing and fails; make it pass (scenarios: Bare name resolves only through the user's taps; No registered source matches) (validation: Conforms; no automated test at HEAD)
- [ ] 4.2 Verify a skill from a private repo the user can access is installed and tracked like a public one (scenario: Private repo treated like a public one) (validation: Deviates: private downloads 404)

## 5. One copy, many agents, detected by default

- [ ] 5.1 Write a failing test: installing to three agents leaves one stored copy that all three agent folders show; make it pass (scenario: Same content in every agent) (validation: Conforms; no automated test at HEAD)
- [x] 5.2 Verify that on a machine with two supported agents installed, the interactive install pre-selects exactly those two (scenario: Only installed agents pre-selected) (validation: Conforms)

## 6. Lifecycle verbs and local history

- [x] 6.1 Verify update moves changed skills to their new upstream versions (scenario: Update all skills) (validation: Conforms)
- [ ] 6.2 Verify diff shows upstream changes without installing them (scenario: Review before upgrading) (validation: Deviates: diff fails for catalog and tap installs)
- [x] 6.3 Verify a pinned skill stays on its version through an update (scenario: Pinned skill stays fixed) (validation: Conforms)
- [ ] 6.4 Verify an update archives the outgoing version under `versions/<skill>/<sha>/`, and that rollback restores from it with no hosted service involved (scenarios: Upgrade keeps the old version; Rollback uses the local archive) (validation: Deviates: rollback of linked skills fails)

## 7. Interactive by default, scriptable on demand

- [x] 7.1 Verify an interactive command facing more than one candidate shows a picker and waits (scenario: Ambiguous choice prompts) (validation: Conforms)
- [x] 7.2 Verify `install --yes <source>` completes with no prompt, and a non-interactive run that hits an unresolvable choice exits non-zero without waiting for input (scenarios: CI install without prompts; Missing choice fails instead of hanging) (validation: Conforms)

## 8. Conservative removal

- [x] 8.1 Verify syncing from a manifest that omits an installed skill leaves it installed and tracked (scenario: Sync leaves extra skills installed) (validation: Conforms)
- [x] 8.2 Verify switching to a skillset that excludes a skill leaves it in the lockfile with its stored files on disk, and that deleting a skillset deletes no skill files (scenarios: Switching skillsets does not uninstall; Deleting a skillset keeps skill files) (validation: Conforms)

## 9. Feature areas reachable from `augy`

- [ ] 9.1 Verify `augy` offers subcommands for taps, adoption (scan), team manifest sync, home repo, contexts and tags, skillsets, and authoring, each behaving as its sibling change specifies (scenarios: Taps and short names; Adopt hand-installed skills; Team manifest; Home repo backup and restore; Machine contexts and tags; Skillsets; Authoring) (validation: Deferred to sibling changes)
