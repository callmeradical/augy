# Tasks

Tracer-bullet vertical slices. Each slice is verified by tests against a temporary augy home (`AUGY_HOME`) with GitHub responses mocked, asserting on lockfile contents, printed output and exit status rather than internal calls.

## 1. Thinnest path — add a tap, discover its skills, install one by bare name

- [ ] 1.1 Write failing tests for scenarios "Shorthand and URL record the same tap", "Tap fields persisted" and "AUGY_HOME is honored", verified by `registry.json` contents after `augy tap add acme/skills --path skills` (validation: no test at HEAD)
- [ ] 1.2 Write failing tests for scenarios "Nested category folders" and "Directory without SKILL.md", verified by the skill list discovery returns for a mocked repo tree (validation: no test at HEAD)
- [ ] 1.3 Write failing tests for scenarios "Bare name consults taps", "Single exact match installs" and "Provenance recorded", verified by the installed skill's lockfile source `acme/skills/skills/tdd` and its tap (validation: no test at HEAD)
- [x] 1.4 Implement the minimum to pass 1.1–1.3 and verify the full path works: `augy tap add` then `augy install tdd` installs the skill and records its tap (validation: Conforms; no automated tests at HEAD)

## 2. Tap argument parsing and subdirectory selection

- [ ] 2.1 Write failing tests for "Trailing slash is ignored", "Argument without owner and repo is rejected" and "Ref and path in a URL are dropped", verified by lockfile contents and exit status (validation: no test at HEAD)
- [ ] 2.2 Write failing tests for "Path stored as given", "Empty path means repo root", "Default accepted at the prompt" and "Custom value entered at the prompt", verified by the stored subdirectory (validation: no test at HEAD)
- [ ] 2.3 Write failing test for "Description shown in list", verified by `augy tap list` output (validation: no test at HEAD)
- [ ] 2.4 Implement and verify 2.1–2.3 pass (validation: Deviates: URL forms without a repo are accepted; downloads ignore the default branch)

## 3. Forgiving add and duplicate handling

- [ ] 3.1 Write failing tests for "Skill count reported" and "Zero skills reported without blocking", verified by output and the tap present in the lockfile (validation: no test at HEAD)
- [ ] 3.2 Write failing tests for "Offline add" and "No login access", verified by a warning in output, the tap in the lockfile, and success exit status (validation: no test at HEAD)
- [ ] 3.3 Write failing tests for "Duplicate add is a no-op" and "Same repo with a different subdirectory", verified by an unchanged lockfile and success exit status (validation: no test at HEAD)
- [ ] 3.4 Write failing test for "Private repo tapped like a public one", verified by the skill count reported for a mocked private repo visible to the `gh` login (validation: no test at HEAD)
- [x] 3.5 Implement and verify 3.1–3.4 pass (validation: Conforms; no automated tests at HEAD)

## 4. Listing and removing taps

- [ ] 4.1 Write failing tests for "Listing with installed counts" and "Empty tap list", verified by `augy tap list` output (validation: no test at HEAD)
- [ ] 4.2 Write failing tests for "Impact shown before confirming" and "Declining keeps the tap", verified by the prompt naming affected skills and an unchanged lockfile on decline (validation: no test at HEAD)
- [ ] 4.3 Write failing tests for "Skills survive tap removal", "Removed tap no longer resolves names" and "Removing an unknown tap", verified by skill files still present in agent folders, the cleared tap association, and error exit status for the unknown tap (validation: no test at HEAD)
- [ ] 4.4 Implement and verify 4.1–4.3 pass (validation: Deviates: tap list omits the installed count when it is 0)

## 5. Bare-name edge cases

- [ ] 5.1 Write failing tests for "Shorthand skips taps" and "Near matches are not used", verified by no tap lookups for shorthand and a not-found error for near matches (validation: no test at HEAD)
- [ ] 5.2 Write failing test for "Same name in two taps", verified by a picker offering both and only the selected skill installed (validation: no test at HEAD)
- [ ] 5.3 Write failing test for "CI install with ambiguous name", verified by failure exit status, both full paths in the error, and nothing installed (validation: no test at HEAD)
- [ ] 5.4 Write failing test for "Unknown bare name", verified by failure exit status and a message suggesting a full path or `augy tap add` (validation: no test at HEAD)
- [x] 5.5 Implement and verify 5.1–5.4 pass (validation: Conforms; no automated tests at HEAD)

## 6. Discovery robustness

- [ ] 6.1 Write failing tests for "Lowercase marker" and "Single-skill tap", verified by discovery results (validation: no test at HEAD)
- [ ] 6.2 Write failing test for "Large tap request count", verified by counting mocked GitHub requests for 2-skill and 200-skill taps (validation: no test at HEAD)
- [ ] 6.3 Write failing test for "Truncated repo listing", verified by either all skills returned or an incompleteness notice in output (validation: no test at HEAD)
- [ ] 6.4 Implement and verify 6.1–6.3 pass (validation: Deviates: truncated trees silently lose skills behind a false "falling back" warning)

## 7. Search browse and fuzzy ranking

- [ ] 7.1 Write failing tests for "Browse two taps" and "Short SHA shown", verified by grouped `augy search` output with short SHAs (validation: no test at HEAD)
- [ ] 7.2 Write failing tests for "Ranking within a tap", "Per-tap grouping preserved" and "Non-matching tap hidden", verified by result order and the taps present in output (validation: no test at HEAD)
- [ ] 7.3 Write failing test for "No matches", verified by a not-found message suggesting a broader term (validation: no test at HEAD)
- [x] 7.4 Implement and verify 7.1–7.3 pass (validation: Conforms; no automated tests at HEAD)

## 8. Search install status and consistent version identifiers

- [ ] 8.1 Write failing tests for "Not installed", "Up to date" and "Update available", verified by the status shown for each fixture lockfile (validation: no test at HEAD)
- [ ] 8.2 Write failing tests for "Bare-name install then search", "After an update with no upstream change" and "Full-path install then search", verified end to end with unchanged mocked upstream content: search shows "up to date" and `augy update` offers no upgrade (validation: no test at HEAD)
- [ ] 8.3 Implement and verify 8.1–8.2 pass (validation: Deviates: tree vs commit SHA, so full-path and post-update installs show "update available")

## 9. Parallel search with per-tap errors

- [ ] 9.1 Write failing tests for "One tap unreachable" and "All taps fail", verified by each failing tap's error printed under its own heading and the other taps' results still listed (validation: no test at HEAD)
- [ ] 9.2 Implement and verify 9.1 passes (validation: Deviates: tap errors hidden when nothing matches)
