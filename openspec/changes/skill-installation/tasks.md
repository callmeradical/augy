# Tasks

Every slice is verified from the outside: run `augy` with a temporary `AUGY_HOME`, fake agent homes, and faked GitHub responses, then check the files and links on disk, the registry contents, the printed output, and exit codes.

## 1. Tracer bullet — `owner/repo/path` shorthand, one skill, one agent, recorded

- [ ] 1.1 Write a failing end-to-end test: `augy install owner/repo/skills/tdd --yes --agent claude` leaves `~/.augy/store/tdd/`, makes `<claude skills dir>/tdd` resolve to it, and writes a registry entry with `source`, `sha`, `shortSha`, Claude's path, `installedAt`, `updatedAt`, `pinned: false`, empty `history`, and the store location (scenarios: Path shorthand; Agent paths resolve to the stored copy; Install from a URL; First install) (validation: Conforms; no automated test at HEAD)
- [x] 1.2 Make it pass and verify the skill is recorded as `tdd` in the registry, store, and agent folder (scenario: Folder name in every place) (validation: Conforms)

## 2. Uninstall the tracer skill

- [ ] 2.1 Write a failing test: confirming `augy uninstall tdd` removes every recorded agent path and the store copy; make it pass (scenario: Skill in three agents) (validation: Conforms; no automated test at HEAD)
- [x] 2.2 Verify that declining leaves everything unchanged and that an untracked name exits 1 even with a folder on disk (scenarios: User declines; Untracked name with a folder on disk) (validation: Conforms)
- [x] 2.3 Verify the preview lists each agent path, marks missing ones "already missing", and shows the short SHA and archive count (scenario: One agent path already gone) (validation: Conforms)
- [ ] 2.4 Verify a dangling agent link is removed (scenario: Dangling agent link) (validation: Deviates)
- [x] 2.5 Verify the archive question appears only with history, defaults to keeping `versions/<skill>/`, and deletes it on yes (scenarios: Accept the default; Clean slate; No history) (validation: Conforms)
- [x] 2.6 Verify an undeletable path produces a warning while the registry entry is still removed (scenario: One path can't be deleted) (validation: Conforms)

## 3. Source forms

- [ ] 3.1 Write failing tests for classification: `tdd` is a bare name; `owner/repo` and `https://...` are GitHub references; make them pass (scenarios: Bare name; Shorthand is a GitHub reference; URL is a GitHub reference) (validation: Conforms; no automated test at HEAD)
- [x] 3.2 Verify repo URLs, including `http://` and a trailing slash, resolve to the same repo (scenarios: HTTPS repo URL; HTTP and trailing slash) (validation: Conforms)
- [ ] 3.3 Verify `tree/` URLs install at the given branch, tag, or full SHA, including a branch named `feature/x` (scenarios: Folder at a branch; Pinned to a tag or full commit SHA; Branch name containing a slash) (validation: Deviates: feature/x fails)
- [x] 3.4 Verify a `blob/.../SKILL.md` URL installs the containing folder (scenario: Link to a SKILL.md file) (validation: Conforms)
- [ ] 3.5 Verify whole-repo shorthand and plain repo URLs install from the real default branch, including a `master`-default repo (scenarios: Whole-repo shorthand; Default branch is not main) (validation: Deviates: download uses main)

## 4. Discovery

- [ ] 4.1 Write failing tests: a target containing `SKILL.md` is one skill named after the segment or repo; otherwise all nested skills are found and sorted by name; make them pass (scenarios: Target is a skill; Repo root is a skill; Nested catalog) (validation: Conforms; no automated test at HEAD)
- [x] 4.2 Verify `skill.md` and `Skill.md` are recognized (scenario: Lowercase and mixed-case file names) (validation: Conforms)
- [ ] 4.3 Verify a repo too large to list at once still yields every skill (scenario: Very large repo) (validation: Deviates)

## 5. Bare names through taps

- [ ] 5.1 Write failing tests: a single case-insensitive exact match installs from that tap, and its record has `source` `owner/repo/<path>` and `tap` set; a partial name doesn't match; make them pass (scenarios: Single match; Install from a tap; Partial name does not match) (validation: Conforms; no automated test at HEAD)
- [x] 5.2 Verify a name found in two taps prompts with each candidate's version (scenario: Name in more than one tap) (validation: Conforms)
- [x] 5.3 Verify a name found in no tap fails with the full-path and `augy tap add` suggestions (scenario: No tap has the skill) (validation: Conforms)
- [ ] 5.4 Verify an unauthenticated GitHub CLI is reported as an access problem, not as not-found (scenario: GitHub CLI not signed in) (validation: Deviates)

## 6. Interactive flow

- [ ] 6.1 Write failing tests: the skill picker always appears, filters by typing, toggles all visible skills, shows short SHA and path, and refuses an empty selection; make them pass (scenarios: Picker for a single skill; Filter and toggle all; Version and path shown; Nothing selected) (validation: Deviates: toggle-all and path hint; no automated test at HEAD)
- [x] 6.2 Verify new skills start selected and installed ones are labeled "already installed" and unselected (scenario: Re-running install on a repo) (validation: Conforms)
- [x] 6.3 Verify the agent picker lists detected agents first and pre-selected, undetected agents labeled "not detected", that `--agent` skips it, and that undetected agents can be targeted (scenarios: Agents named on the command line; Agent picker defaults; Undetected agent) (validation: Conforms)
- [x] 6.4 Verify the `skill @sha → agents` summary gates every write, and that declining writes nothing (scenarios: User confirms; User declines) (validation: Conforms)
- [x] 6.5 Verify plain `augy` prompts for a source and accepts bare names (scenarios: No subcommand; Bare name at the prompt) (validation: Conforms)

## 7. `--yes` contract

- [ ] 7.1 Write failing tests: `--yes` installs every discovered skill, including installed ones, with no prompts; make them pass (scenarios: CI install of a catalog; Already-installed skills are re-installed) (validation: Conforms; no automated test at HEAD)
- [x] 7.2 Verify agent defaults and the empty-list exit, including only-unknown `--agent` IDs (scenarios: No --agent on a machine with agents; Nothing detected and none named; Only unknown agent IDs named) (validation: Conforms)
- [x] 7.3 Verify exit code 1 with no source, an ambiguous bare name (with one full-path command per candidate), an unknown bare name, an unresolvable source, and a source with no skills (scenarios: Misconfigured CI job; Two taps have the name; Bare name not found; Source cannot be resolved; Source has no skills) (validation: Conforms)

## 8. Private repos and faithful content

- [ ] 8.1 Write a failing test: with only a GitHub CLI login, a private repo skill is discovered, downloaded, deployed, and recorded; make it pass (scenario: Private repo end to end) (validation: Deviates; no automated test at HEAD)
- [ ] 8.2 Verify installed files match the recorded `sha` when upstream moves mid-install, and that a failed download is reported instead of using a cached copy (scenarios: Upstream moves during install; Download fails with a cache present) (validation: Deviates)

## 9. Re-install and replacement

- [ ] 9.1 Write failing tests: re-install prints "already installed — updating record" and keeps `installedAt`, `pinned`, `history`, tags, and label while recording this run's agents; make them pass (scenarios: Re-install a pinned skill; Re-install a tagged skill) (validation: Deviates: tags and label lost; no automated test at HEAD)
- [ ] 9.2 Verify re-installing to fewer agents leaves no untracked deployment (scenario: Re-install to fewer agents) (validation: Deviates)
- [x] 9.3 Verify an existing folder at an agent path is replaced, and that a same-named skill from another repo replaces the installed one (scenarios: Existing folder at the agent path; Same name from a different repo) (validation: Conforms)

## 10. Failure handling

- [ ] 10.1 Write failing tests: one failed download is reported while the others install and are recorded; when every skill fails, install exits non-zero and doesn't report success; make them pass (scenarios: One bad download; All downloads fail in CI) (validation: Deviates: exit 0 when all fail; no automated test at HEAD)
- [ ] 10.2 Verify an invalid `registry.json` is not silently replaced by one holding only the new skill (scenario: Corrupt registry) (validation: Deviates)
