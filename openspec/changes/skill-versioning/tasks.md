# Tasks

Tracer-bullet vertical slices. Each slice is verified by tests against a temporary augy home (`AUGY_HOME`) and temporary agent directories, with GitHub responses mocked, asserting on resulting files, lockfile contents, printed output and exit status. Symlinked (canonical-copy) installs are the default fixture.

## 1. Thinnest path — detect drift, archive, upgrade one skill with --all

- [ ] 1.1 Write failing test for scenario "Fresh install", verified by the lockfile entry's source, SHA, short SHA, times, pinned=false and empty history (validation: no test at HEAD)
- [ ] 1.2 Write failing tests for "Upstream changed", "Upstream unchanged" and "CI nightly update", verified by `augy update --all` upgrading only the drifted skill with no prompt (validation: no test at HEAD)
- [ ] 1.3 Write failing tests for "Old files archived", "Linked agents see the upgrade" and "History grows", verified by `versions/<skill>/<old-sha>/` contents, every linked agent's files, and the lockfile SHA and history (validation: no test at HEAD)
- [x] 1.4 Implement the minimum to pass 1.1–1.3 and verify end to end that a drifted skill is archived, upgraded in every agent, and recorded (validation: Conforms; no automated tests at HEAD)

## 2. Interactive update flow and scope

- [ ] 2.1 Write failing tests for "Upgrade list", "Single candidate confirmation", "Choose a subset", "Cancel at confirmation" and "Cancel at the picker", verified by the `old → new` listing, the prompts shown, and unchanged lockfile and files on cancel (validation: no test at HEAD)
- [ ] 2.2 Write failing tests for "Single skill update", "Unknown skill named" and "Nothing installed", verified by which skills are offered, error exit status, and a friendly no-op message (validation: no test at HEAD)
- [ ] 2.3 Write failing test for "Multi-skill source matched by name", verified by only the changed skill being listed (validation: no test at HEAD)
- [x] 2.4 Implement and verify 2.1–2.3 pass (validation: Conforms; no automated tests at HEAD)

## 3. Eligibility and skip notice

- [ ] 3.1 Write failing tests for "Pinned skill skipped", "Self-authored skill skipped" and "Home-repo-sourced skill skipped", verified by no fetch for skipped skills and the notice naming each group (with the `augy home push` pointer) (validation: no test at HEAD)
- [ ] 3.2 Write failing test for "Similarly named repo is not skipped", verified by `alice/skills-extra/extra` being checked when the home repo is `alice/skills` (validation: no test at HEAD)
- [ ] 3.3 Implement and verify 3.1–3.2 pass (validation: Deviates: home-repo skip is a substring match, so alice/skills-extra is skipped)

## 4. Update robustness and failure reporting

- [ ] 4.1 Write failing test for "One source unreachable", verified by the per-skill error printed and the other skill upgraded (validation: no test at HEAD)
- [ ] 4.2 Write failing tests for "Every check fails" and "Partial failure", verified by non-zero exit status and no "all up to date" message (validation: no test at HEAD)
- [ ] 4.3 Write failing test for "Download fails mid-upgrade", verified by previous files in every agent and the old SHA still in the lockfile (validation: no test at HEAD)
- [ ] 4.4 Write failing tests for "Skill renamed upstream" and "Skills remain after update", verified by a not-found report, unchanged files, and every skill still installed (validation: no test at HEAD)
- [ ] 4.5 Write failing test for "Existing archive reused", verified by an unchanged pre-existing archive directory (validation: no test at HEAD)
- [ ] 4.6 Write failing test for "Legacy per-agent copies", verified by both agent copies containing the new files (validation: no test at HEAD)
- [ ] 4.7 Implement and verify 4.1–4.6 pass (validation: Deviates: exit 0 on failures; failed download empties the skill or deploys a stale cache; renamed upstream deploys the wrong skill; legacy copies refreshed only once)

## 5. Consistent version identifiers

- [ ] 5.1 Write failing tests for "First update after a bare-name install" and "Unrelated commit in the source repo", verified by `augy update` offering no upgrade with mocked upstream content unchanged for the skill (validation: no test at HEAD)
- [ ] 5.2 Implement and verify 5.1 passes, and that slice 1–4 tests still pass (validation: Deviates: tree vs commit SHA gives spurious drift)

## 6. Pinning

- [ ] 6.1 Write failing tests for "Pinned skill not updated", "Pin unknown skill", "Unpinned skill gets upgrades" and "Unpin unknown skill", verified by lockfile pinned flag, `augy update` behavior, and error exit status for unknown skills (validation: no test at HEAD)
- [ ] 6.2 Write failing tests for "Pinned shown in list and info" and "Reinstall pinned skill", verified by `augy list` / `augy info` output and the pinned flag after reinstall (validation: no test at HEAD)
- [x] 6.3 Implement and verify 6.1–6.2 pass (validation: Conforms; no automated tests at HEAD)

## 7. Diff — pure file-set comparison and summary

- [ ] 7.1 Write failing unit tests for "Mixed changes" and "Identical versions", verified by statuses, per-file and total `+/-` counts, modified/added/deleted ordering, and a no-differences result (validation: no test at HEAD)
- [ ] 7.2 Implement the comparison and summary and verify 7.1 passes (validation: Deviates: lines starting with ---/+++ are not counted)

## 8. Diff — three modes and the interactive browser

- [ ] 8.1 Write failing tests for "Upstream has changes", "Upstream equals installed" and "Skill installed from a repo of skills", verified by the file pairs compared and the label shown (validation: no test at HEAD)
- [ ] 8.2 Write failing tests for "Archived version used", "GitHub fallback" and "Prefix expanded", verified by no network when the archive exists, a mocked GitHub fetch otherwise, and the full SHA used (validation: no test at HEAD)
- [ ] 8.3 Write failing tests for "Two archives compared" and "One archive missing", verified by the diff output and an error listing history SHAs (validation: no test at HEAD)
- [ ] 8.4 Write failing tests for "Browse two files then finish" and "Skill in two agents", verified by each unified diff shown with three lines of context until "done", and the installed side read from the first active agent (validation: no test at HEAD)
- [ ] 8.5 Write failing tests for "Unsourced skill", "Renamed upstream" and "Private source without GITHUB_TOKEN", verified by clear error messages without stack traces and a successful fetch through the user's GitHub login (validation: no test at HEAD)
- [ ] 8.6 Implement and verify 8.1–8.5 pass (validation: Deviates: multi-skill upstream and fallback fail; errors swallowed; GITHUB_TOKEN only)

## 9. Rollback — thinnest path

- [ ] 9.1 Write failing tests for "Short SHA rollback", "Current version archived", "Two agents restored" and "Roll back and forward", verified by byte-for-byte file equality with the target archive in every agent, the displaced archive's contents, and the lockfile SHA and history after each step (validation: no test at HEAD)
- [ ] 9.2 Implement and verify 9.1 passes (validation: Deviates on symlinked installs: displaced archive is empty; passes on copy fixtures)

## 10. Rollback with symlinked installs

- [ ] 10.1 Write failing tests for "Symlinked install archived completely" and "Update after rollback", verified by a non-empty real-file archive on the first attempt and every agent seeing a later upgrade (validation: no test at HEAD)
- [ ] 10.2 Implement and verify 10.1 passes on supported Node versions (validation: Deviates: first attempt fails, empty archive, symlinks become copies)

## 11. Rollback picker and error paths

- [ ] 11.1 Write failing tests for "Picker ordering and dates", "Missing archive marked" and "Current version not offered", verified by picker entries, order, dates and markers (validation: no test at HEAD)
- [ ] 11.2 Write failing tests for "Typo in SHA", "No history" and "Target archive missing", verified by an error listing available SHAs, a friendly no-op, and unchanged files and lockfile (validation: no test at HEAD)
- [ ] 11.3 Write failing test for "Update offered after rollback", verified by `augy update` offering `B → C` and the pinned flag still false (validation: no test at HEAD)
- [ ] 11.4 Implement and verify 11.1–11.3 pass (validation: Deviates: current version offered in picker)

## 12. Version archive layout and retention

- [ ] 12.1 Write failing tests for "Inspect an archive by hand" and "AUGY_HOME set", verified by plain directories at `versions/<skill>/<full-sha>/` under the augy home and no lockfile path pointing at `~/.augy` (validation: no test at HEAD)
- [ ] 12.2 Write failing test for "Offline rollback", verified by rollback succeeding with all network access failing (validation: no test at HEAD)
- [ ] 12.3 Write failing tests for "Uninstall keeps archives by default" and "Uninstall with pruning", verified by `versions/<skill>/` presence after each answer (validation: no test at HEAD)
- [ ] 12.4 Implement and verify 12.1–12.3 pass (validation: Deviates: history archivePath ignores AUGY_HOME)
