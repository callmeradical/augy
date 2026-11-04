# Tasks

## 1. Tracer bullet — tag a skill, set the machine context, see pre-selection on pull

Covers: "Several tags in one command", "Mark a work laptop", "Work laptop pre-selection" (local tags only).

- [ ] 1.1 Write a failing test: with skills `a` (tagged `work` via `augy tag set a work`) and `b` (tagged `personal`) installed, after `augy context set work`, `augy home pull` against a home repo offering both pre-selects `a` and not `b`. Verified by the picker's initial selection. (validation: no test with machine context)
- [x] 1.2 Implement the minimum to pass: store tags and the machine context in the lockfile, and apply them to pull pre-selection. (validation: Conforms)

## 2. Matching rule

Covers: "No filter", "Untagged matches every context", "Universal matches every context", "Several tags", "Non-matching tag", "Case-sensitive match".

- [ ] 2.1 Write failing tests for each matching case, including an empty tag list and a `Work` vs `work` mismatch. (validation: registry.test.ts covers most cases but not Work vs work)
- [x] 2.2 Implement until all cases pass. (validation: Conforms)

## 3. Machine context commands

Covers: "Custom context name", "Single value replaced", "Case preserved", "Confirmation message", "Context set", "No context", "Clear then pull", "Fresh machine".

- [ ] 3.1 Write failing tests: `context set` stores any string as typed and replaces the old value, and confirms with the context and its effect on `home pull`. (validation: only stores work; no replace or confirmation test)
- [ ] 3.2 Write failing tests: `context show` reports the context, or a hint pointing to `augy context set`. `context clear` removes the context so that pull pre-selects everything. (validation: show test only checks it does not throw)
- [x] 3.3 Implement until 3.1–3.2 pass. (validation: Conforms)

## 4. Tag set and show

Covers: "Replace rather than append", "Custom tag kept as typed", "Clear tags", "Tagged skill", "Untagged skill", "Typo in tag set", "Typo in tag show".

- [ ] 4.1 Write failing tests: `tag set` replaces, keeps custom tags as typed, and clears to an empty list when no contexts are given. Unknown skills error and leave the lockfile unchanged. (validation: no custom-tag or unchanged-lockfile test)
- [ ] 4.2 Write failing tests: `tag show` lists the tags, or reports "treated as universal" for untagged skills. Unknown skills error. (validation: only unknown-skill error tested)
- [x] 4.3 Implement until 4.1–4.2 pass. (validation: Conforms)

## 5. Tag migrate

Covers: "One prompt per untagged skill", "Source shown", "Authored skill shown", "Three options with explanations", "Choose none", "Mixed collection", "Progress survives cancel", "All tagged", "Reminder at the end".

- [ ] 5.1 Write failing tests: only untagged skills are prompted, once each in lockfile order, and each prompt shows the source or "authored (no external source)". (validation: prompt count tested; order and source not)
- [ ] 5.2 Write failing tests: each prompt offers exactly `universal`, `personal`, and `work` with explanations, and choosing none records an empty list. The tagged and remaining counts are reported. (validation: no test)
- [ ] 5.3 Write failing tests: the lockfile is saved after each answer, cancelling midway prints "Migration paused — progress saved." and keeps earlier answers, and the all-tagged case says there is nothing to do. (validation: save-each and all-tagged tested; cancel not)
- [ ] 5.4 Write a failing test that a completed migration ends with a reminder to run `augy home push`. (validation: no test)
- [x] 5.5 Implement until 5.1–5.4 pass. (validation: Conforms)

## 6. Pull precedence, presentation, and defaults-only

Covers: "Override for one run", "Override without a machine context", "Header and hints", "Pick an off-context skill".

- [ ] 6.1 Write failing tests: `--context` overrides the machine context for one run and leaves the stored context unchanged, and works when no machine context is set. (validation: no test)
- [ ] 6.2 Write failing tests: the picker header shows the context in effect and entries show their tags. An off-context skill is listed and can be selected and installed. (validation: no test)
- [x] 6.3 Implement until 6.1–6.2 pass. (validation: Conforms)

## 7. Tags travel through the home repo

Covers: "Tag once, seen everywhere", "Local fallback", "External skill tags restored", "Authored skill tags restored", "Upgrade keeps tags", "Round trip keeps tags", "Not pushed", "Not overwritten by pull".

- [ ] 7.1 Write failing tests: push writes `contexts` for tagged skills and never the machine context. Pull uses manifest tags first and local tags second, for pre-selection and hints, and doesn't change the machine context. (validation: no test)
- [ ] 7.2 Write failing tests: after pull, both authored and external installed skills have their manifest tags in the lockfile, and an upgraded skill with no manifest tags keeps its local tags. (validation: no test)
- [ ] 7.3 Write a failing end-to-end test against a local bare repo: tag on machine A, push, pull on machine B, push from B. The manifest's `contexts` still has the pulled skills' tags. (validation: no test)
- [ ] 7.4 Implement until 7.1–7.3 pass. (validation: Deviates: external tags lost on pull and upgrade; local authored tags dropped)

## 8. Context isolation from other commands

Covers: "Sync not filtered", "Off-context skills untouched".

- [ ] 8.1 Write failing tests: with a machine context set, `augy sync`, `augy install`, `augy update`, `augy list`, `augy use`, and `augy bundle` give the same results as without one, and no off-context installed skill is removed or deactivated. (validation: no test)
- [x] 8.2 Fix any command that consults the machine context until 8.1 passes. (validation: Conforms; no command consults the context)
