# Design

## Context

See proposal.md (Why) for motivation. This change is documented from the "Adopting Existing Skills" PRD (`docs/prd/adopting-existing-skills.md`, status: shipped at v0.11.0). augy is being archived; the specs here record the intended behavior so a validator can compare the shipped code against them. Everything below is derived from the PRD, not from the implementation.

Constraints from the PRD:

- A "skill" on disk is any directory containing `SKILL.md`; its name is the directory name.
- augy supports 33 agents, each with a skills folder. Scan covers all of them.
- The registry (`~/.augy/registry.json`) is the source of truth for what is tracked. A tracked skill is one whose name is in the registry.
- GitHub is the only supported source host, and all GitHub access goes through the user's GitHub CLI (`gh`) login. Git provenance also needs `git` on the PATH.

## Goals / Non-Goals

**Goals:**

- Bring every skill already sitting in an agent skills folder under management with one interactive command, without moving or reinstalling it.
- Recover each skill's source automatically where there is evidence (git remote, frontmatter, tap), and let the user confirm, correct, or skip it.
- Let a sourceless skill gain a source later, which turns on update, diff, and rollback.
- Make provenance travel with the skill by writing it into `SKILL.md`.

**Non-Goals (from the PRD's Out of Scope):**

- Moving adopted skills into the canonical store or replacing them with symlinks.
- Non-GitHub sources (GitLab, Bitbucket, self-hosted, GitHub Enterprise hosts other than github.com) and git remotes other than `origin`.
- Comparing on-disk files with the detected or given source.
- Removing, deduplicating, or reconciling skills on disk. Scan only adds registry entries.
- Non-interactive scanning (no `--yes`, `--json`, or `--dry-run`).
- Adopting skills outside agent skills folders.
- Clearing a source with set-source.

## Decisions

1. **Skill identity is the directory containing `SKILL.md`, named by its folder.** Scan stops descending once it finds one and recurses through directories that lack one. Rationale (PRD): users who clone whole skills repos group skills in category folders (US-3), and a skill's own subfolders are not separate skills.
2. **Scan every supported agent's folder, not just detected agents.** Rationale (PRD US-2): skills left in an old or rarely used agent's folder must still turn up.
3. **Identity across agents is by name.** Same-named folders become one registry entry with several agent locations. Rationale (PRD US-15): one entry per skill. Trade-off noted under Risks.
4. **Provenance order is git remote → frontmatter → tap; first match wins, and the match type is shown as a confidence label.** Rationale (PRD US-8): users need to know how much to trust each suggestion; the local checkout is the strongest evidence, an author-declared source next, a name match weakest.
5. **GitHub only; git provenance only from `origin` on github.com (HTTPS or SSH, equivalent).** Rationale (PRD): source resolution goes through `gh`; SSH and HTTPS clones must not differ (US-5).
6. **Git provenance takes its SHA from the local checkout (last commit touching the skill's path). Other sources get a SHA from GitHub at import time.** Rationale (PRD): the local checkout already records what is on disk; frontmatter and taps carry no SHA.
7. **Read-only until confirmed; two independent confirmations.** One prompt gates importing untracked skills, a separate single yes/no gates registering additional agent paths. Rationale (PRD US-10): running scan just to look must be safe. The specs make the second prompt independent of the first, because the PRD's Further Notes present its current coupling (never reached when everything is tracked or the import is declined) as a defect against US-18.
8. **Every detected source is confirmed per skill, defaulting to yes; "no" falls back to manual entry; blank imports without a source.** Rationale (PRD US-12–14): a wrong guess (for example a dotfiles remote) must not be recorded, and unknown-source skills still belong in the inventory.
9. **Sourceless and failed-lookup imports are recorded with SHA `unversioned`.** Rationale (PRD US-14, US-17): network or permission problems must not block adoption. Such skills are listed but skipped by update and left out of manifests by default.
10. **Save the registry after each imported skill.** Rationale (PRD US-16): a cancel or crash must not lose finished imports.
11. **Adopted skills stay in place.** Scan records current locations only. Rationale: PRD decision; moving into the store is out of scope.
12. **Write the confirmed source back into `SKILL.md` frontmatter, never overwriting an existing `source`.** Scan writes only to the first agent location and only when a SHA was resolved; set-source writes to every active agent location. Rationale (PRD US-19): later scans on any machine identify the skill without a git checkout or tap.
13. **Set-source works only on registered skills, verifies the source on GitHub first, stores the string exactly as typed, replaces any existing source without asking, and records the latest upstream commit touching the path (honoring a ref in the URL).** Rationale (PRD US-20–23): copy whatever link is in the browser, catch typos before they reach the lockfile, and allow following a release line.
14. **All GitHub access uses the GitHub CLI login.** Rationale (PRD US-24): private enterprise repos work without extra token setup.

## Risks / Trade-offs

All items below come from the PRD's Further Notes.

- [Same name, different skills are merged without warning] → Accepted by Decision 3. Users review the merged entry's paths in the scan output before import. See Open Questions.
- [Git provenance can attribute every skill to an unrelated repo, such as a dotfiles repo that tracks the agent's config folder] → The per-skill "Use detected source?" confirmation is the only safeguard (Decision 8).
- [Scan edits user files] → Writing `source:` into `SKILL.md` leaves a modified file in a git working tree, and scan doesn't mention it beforehand. See Open Questions.
- [SHA identity differs from what `augy update` uses] → Git provenance and set-source record "last commit touching the path"; the PRD says update compares a different SHA (branch head, or folder tree SHA in multi-skill repos). The first update after adoption will probably report drift and overwrite local files, archiving them under a possibly wrong SHA label. Owned jointly with the skill-versioning PRD; not specified here.
- [Adopted skills behave like hand-copied ones] → They are not in the canonical store, so symlink-only features (for example `augy use`) appear to ignore them. Accepted consequence of Decision 11.
- [Frontmatter sources ignore refs] → A branch or tag in a frontmatter source isn't kept. See Open Questions.
- [Sourced but `unversioned` skills look "untracked" in `augy list`] → When the SHA lookup fails at import, the user's source is kept but list shows "untracked". See Open Questions.
- ["Scanned N agent(s)" counts all 33 supported agents] → Cosmetic; not specified.
- [Set-source assumes local files match the latest upstream] → No content comparison is done (out of scope). See Open Questions.

## Migration Plan

N/A — archived.

## Open Questions

- (PRD) Should set-source compare the local files against the upstream files before recording the latest upstream SHA?
- When everything is tracked but a hand-copied copy of a tracked skill exists in another agent, the specs require scan to offer it (US-18) rather than only printing "all tracked" and exiting (US-26). Is that the intended reading of US-26?
- Should a branch or tag in a frontmatter source be preserved, the way set-source honors a ref?
- Should scan warn when two different skills with the same folder name are merged into one entry?
- Should scan tell the user before it writes `source:` into `SKILL.md` files?
- Set-source replaces the registry source, but the write-back never overwrites an existing frontmatter `source`. After set-source changes a source, `SKILL.md` can keep the old one, and a later scan on another machine would detect the old source. Is that intended?
- Should a skill that has a source but SHA `unversioned` (failed lookup) be shown differently from a truly sourceless skill in `augy list`?
- How should scan treat symlinks that point into augy's own canonical store (already tracked) versus symlinks created by another tool? The specs only require that symlinked skill folders be found.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | Scan searches every supported agent's skills folder; Only untracked skills are reported for import; Symlinked skill directories are found |
| US-2 | Scan searches every supported agent's skills folder |
| US-3 | A skill is a directory containing SKILL.md |
| US-4 | Provenance from the git origin remote |
| US-5 | Provenance from the git origin remote |
| US-6 | Provenance from SKILL.md frontmatter |
| US-7 | Provenance from a matching tap |
| US-8 | Results are grouped by provenance |
| US-9 | Results are grouped by provenance |
| US-10 | Nothing is imported without confirmation |
| US-11 | User selects skills from a pre-selected filterable list |
| US-12 | Detected sources are confirmed per skill |
| US-13 | Manual source entry during import |
| US-14 | Import without a source |
| US-15 | Same-named folders are one skill |
| US-16 | Each import is saved immediately |
| US-17 | SHA lookup for frontmatter and typed sources |
| US-18 | Scan offers to register additional agent locations of tracked skills; Symlinked skill directories are found |
| US-19 | Scan writes the confirmed source into SKILL.md; Set-source writes the source into SKILL.md |
| US-20 | Set-source only works on registered skills; Set-source records the source and latest upstream SHA |
| US-21 | Set-source accepts common GitHub URL forms |
| US-22 | Set-source verifies the source on GitHub before saving |
| US-23 | Set-source follows the ref in the URL |
| US-24 | GitHub access uses the user's GitHub CLI login; Set-source uses the user's GitHub CLI login |
| US-25 | List points sourceless skills at set-source |
| US-26 | Only untracked skills are reported for import ("Everything tracked") |
| PD: skill is a directory containing SKILL.md | A skill is a directory containing SKILL.md |
| PD: every agent's skills folder is scanned | Scan searches every supported agent's skills folder |
| PD: identity across agents is by name | Same-named folders are one skill; Decision 3 |
| PD: fixed provenance order, confidence label | Provenance is tried in a fixed order; Results are grouped by provenance |
| PD: only GitHub sources; origin only | Only GitHub origin remotes count as git provenance; Provenance from SKILL.md frontmatter |
| PD: git SHA from local checkout; frontmatter SHA fetched | Provenance from the git origin remote; SHA lookup for frontmatter and typed sources |
| PD: tap matching needs a tap; first entry wins | Provenance from a matching tap |
| PD: read-only until confirmed; asks twice | Nothing is imported without confirmation; Scan offers to register additional agent locations of tracked skills |
| PD: detected sources never applied without confirmation | Detected sources are confirmed per skill |
| PD: importing without a source allowed | Import without a source |
| PD: failed SHA lookup doesn't block import | SHA lookup for frontmatter and typed sources |
| PD: adopted skills stay where they are | Adopted skills stay where they are |
| PD: registry saved after each imported skill | Each import is saved immediately |
| PD: source written back into SKILL.md | Scan writes the confirmed source into SKILL.md; Set-source writes the source into SKILL.md |
| PD: set-source only on registered skills; overwrites; stored as typed; latest upstream SHA | Set-source only works on registered skills; Set-source records the source and latest upstream SHA |
| PD: URL forms accepted by set-source | Set-source accepts common GitHub URL forms |
| PD: GitHub access through the GitHub CLI; git on PATH | GitHub access uses the user's GitHub CLI login; Set-source uses the user's GitHub CLI login |
