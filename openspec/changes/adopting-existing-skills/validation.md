# Validation: adopting-existing-skills

Code checked: committed HEAD `c725774`, read with `git show HEAD:<path>`. Line numbers are for HEAD.

How the runs worked: `git archive HEAD` was extracted into a temp sandbox, then `npm ci --ignore-scripts` and `tsup` were run there. The built CLI ran with a temp `HOME` (always under `/private/tmp/...`, so no path component is a symlink, except in the one experiment that tests symlinks) and a temp `AUGY_HOME`. `PATH` held only `node`, `git`, and a logging `gh` shim that called the real `gh` with a token in `GH_TOKEN`. Interactive prompts were driven with `expect`. The fake agent folders included:

- plain, nested, and nested-inside-a-skill folders
- symlinked skill folders
- a folder with no `SKILL.md`
- git checkouts with an HTTPS origin, an SSH origin, a GitLab origin, and a GitHub remote that is not named `origin`
- frontmatter using `source`, `repo`, and `origin`, a tree URL, and non-GitHub hosts
- a registered tap (`anthropics/skills`)
- tracked skills with unregistered copies, including a symlinked copy

Only public GitHub was used (`anthropics/skills`, `obra/superpowers`). Nothing touched the real `~/.augy` or the real agent folders.

## Summary

30 requirements (skill-scan 22, skill-source-attachment 8).

| Verdict | Count |
|---|---|
| Conforms | 21 |
| Deviates | 7 |
| Missing | 0 |
| Unverifiable | 2 |

## Results

### skill-scan

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Scan searches every supported agent's skills folder | Conforms | src/commands/scan.ts:427-438; src/agents.ts:40-246 | ran: skills in `~/.claude/skills` (Claude not detected: no binary on PATH, no `settings.json`) and in Gemini, Cursor, Windsurf, Goose, Roo, and Amp folders were all reported; the spinner said "Scanned 33 agent(s)" | Walks `AGENTS`, not `detectInstalledAgents()`. |
| A skill is a directory containing SKILL.md | Conforms | src/commands/scan.ts:445-468 | ran: `category/nested-skill` reported as `nested-skill`; `outer` reported and `outer/inner` not; `nodir/sub/README.md` not reported | Name comes from the directory name (scan.ts:460). |
| Symlinked skill directories are found | Deviates | src/commands/scan.ts:456 | ran: `~/.claude/skills/linked -> elsewhere/linked` (has SKILL.md) was not reported; a symlinked `~/.gemini/skills/symtracked` copy of tracked `symtracked` was not offered, while the plain-directory copy of `tdd` was | `dirent.isDirectory()` is false for symlinks, so they are skipped silently. |
| Only untracked skills are reported for import | Conforms | src/commands/scan.ts:82-95 | ran: tracked `tdd` was never in the untracked list; with every skill tracked and registered, scan printed "All installed skills are already tracked by augy." and exited 0 with `registry.json` byte-identical | |
| Same-named folders are one skill | Conforms | src/commands/scan.ts:461-462, 296-306 | ran: `review` in Claude and Gemini was listed once with both paths; after import the registry had one `review` entry with `claude` and `gemini` paths | |
| Provenance from the git origin remote | Deviates | src/provenance.ts:71-117 (74-77, 90) | ran: HTTPS origin gave `acme/dotfiles/skills/gitskill @7dbaf9c [git]`, and 7dbaf9c was the earlier commit (HEAD 22c84ff touched only `other.txt`); SSH origin gave `acme/dotfiles/skills/gitskill2 [git]`. Under a HOME reached through a symlink (`/tmp` → `/private/tmp`) the source came out as `acme/dotfiles/../../../../../tmp/augy-val-w1/home/.cursor/skills/gitskill` | Correct only when no path component is a symlink. `git rev-parse --show-toplevel` returns the real path, but `relative()` is computed against the unresolved skill path. A dotfiles setup with `~/.claude` linked into a checkout gets a broken source. |
| Only GitHub origin remotes count as git provenance | Conforms | src/provenance.ts:80-87, 188-203 | ran: a `https://gitlab.com/...` origin and a repo with only an `upstream` GitHub remote both landed under "No provenance found" | |
| Provenance from SKILL.md frontmatter | Deviates | src/provenance.ts:131-159, 188-215; src/github.ts:93-99 | ran: `source: anthropics/skills/skills/pdf`, `repo: acme/repo-field`, and `origin: acme/origin-field` were all labelled `[frontmatter]`. `source: https://github.com/anthropics/skills/tree/main/skills/docx` showed as `anthropics/skills/tree/main/skills/docx`, and on import it printed "Skill not found at that source" and recorded `unversioned`. `https://gitlab.com/...` was ignored, but `https://notgithub.com/acme/x` became `acme/x`, `https://gist.github.com/someone/abc123` became `someone/abc123`, and `gitlab.com/acme/gl` (no scheme) was accepted as a GitHub shorthand | The tree URL fails both scenario clauses. Host check: `hostname.includes('github.com')` (provenance.ts:210) plus the bare `x/y` regex (provenance.ts:200) let non-GitHub hosts through. |
| Provenance from a matching tap | Conforms | src/commands/scan.ts:113-122, 236-239, 537-547; src/taps.ts:111-129 | ran: with tap `anthropics/skills` registered, untracked `xlsx` showed `anthropics/skills/skills/xlsx @fe6471c [tap]`; without taps the same kind of skill was under "No provenance found". read: on accept, `resolvedTap` is set to the tap key and passed to `createSkillRecord`; with duplicate names, `result[0]` (first tap in registry order) wins | Tap import was not run end to end. The tap SHA is a git tree SHA (see SHA lookup row). |
| Provenance is tried in a fixed order | Conforms | src/provenance.ts:52-65; src/commands/scan.ts:108-123 | ran: `gitskill` (GitHub origin plus frontmatter `source: other/frontmatter-src`) was labelled `[git]`; `pptx` (frontmatter `someone/else`, name also in tap) was labelled `[frontmatter]` | |
| Results are grouped by provenance | Deviates | src/commands/scan.ts:155-177, 372-402, 471-495 | ran: two groups were printed, each detected skill had source, short SHA (when known), and `[label]`, and each unknown skill had every agent path and a preview line. A prose line longer than 80 characters was shown as its first 80 characters plus `…` (81 characters) | Minor: the scenario asks for truncation to 80 characters, but the code appends an ellipsis (scan.ts:491). Frontmatter and heading skipping work. |
| Nothing is imported without confirmation | Conforms | src/commands/scan.ts:182-186 | ran: answering No to "Import untracked skills into augy?" left `registry.json` byte-identical and every SKILL.md md5-identical | |
| User selects skills from a pre-selected filterable list | Deviates | src/commands/scan.ts:191-194, 408-421; src/ui/filterable-multiselect.ts:59 | ran: with 10 untracked skills every item started `◼` and deselecting `experiment` left it out of the registry. With exactly one untracked skill no list appeared and the skill went straight to import | The `untracked.length === 1` shortcut skips the selection step. |
| Detected sources are confirmed per skill | Conforms | src/commands/scan.ts:216-264 | ran: "Use detected source?" defaulted to Yes. Rejecting `acme/dotfiles/skills/dotskill` led to the manual-entry prompt, and the blank answer recorded source `""` (dotfiles not recorded) | |
| Manual source entry during import | Conforms | src/commands/scan.ts:256-263 | ran: typing `anthropics/skills/skills/xlsx` for `nofm` recorded that source | Input is not validated: a stray `y` was recorded as source `y` with gigetSource `github:y`. |
| Import without a source | Conforms | src/commands/scan.ts:274-277, 296-306 | ran: blank answer for `blank` gave `source: ""`, `sha: unversioned`; `augy list` shows such skills (see skill-inventory validation) | |
| SHA lookup for frontmatter and typed sources | Deviates | src/commands/scan.ts:271-294; src/github.ts:172-227 | ran: frontmatter `anthropics/skills/skills/pdf` recorded `ca45fc4` (repo HEAD); `acme/does-not-exist-zz9/x` printed the 404, recorded `unversioned`, and the next skill imported. Tap-detected `xlsx` carried `fe6471c`, a git tree SHA taken at detection time (the latest commit for `skills/xlsx` is `fa0fa64`) | A tap source is not looked up during import, and its SHA is a tree SHA, not a commit. For multi-skill sources, `discoverSkills` also returns tree SHAs (github.ts:211-217). Direct skill paths record the branch-head commit, not the last commit for the path, which differs from what set-source and git provenance record. |
| Each import is saved immediately | Conforms | src/commands/scan.ts:306-310 | ran: Ctrl-C at the third skill's source prompt left `s1` and `s2` in `registry.json` | |
| Adopted skills stay where they are | Conforms | src/commands/scan.ts:296-306 | ran: after import `~/.claude/skills/nofm` was still a plain directory, no `store/` existed under `AUGY_HOME`, and the registry path was the agent path | |
| Scan writes the confirmed source into SKILL.md | Conforms | src/commands/scan.ts:312-314; src/provenance.ts:226-250 | ran: `nofm` (no frontmatter) gained a new `---\nsource: …\n---` block; `fmnosrc` got `source:` inserted into its existing block; `hassrc` kept `source: https://gitlab.com/keep/me` after importing with `anthropics/skills/skills/pdf`; `badsrc` (unversioned) and `blank` (empty) were untouched; `review` was written only at the Claude copy, which was its first registry location | Which location is "first" depends on `Promise.all` completion order (scan.ts:430-435). In another run `review`'s first path was Gemini. See Spec issues. |
| Scan offers to register additional agent locations of tracked skills | Deviates | src/commands/scan.ts:88, 92-95, 182-186, 334-365 | ran: with nothing untracked and `tdd` copied into `~/.gemini/skills`, scan printed "All installed skills are already tracked" and exited with no offer. Declining the import also exited with no offer. After importing, the copy was listed and a single Yes registered it | The early return and `process.exit(0)` both come before step 8. Declining additional paths (scan.ts:352) was read, not run. Symlinked copies are never found (see the symlink row). |
| GitHub access uses the user's GitHub CLI login | Unverifiable | src/github.ts:17-26; src/provenance.ts:74-95 | read: every GitHub call goes through `gh api`, and git provenance uses `git` from PATH | Needs a private repo the logged-in user can access. Scan import never downloads, so giget's lack of auth doesn't apply here. |

### skill-source-attachment

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Set-source only works on registered skills | Conforms | src/commands/set-source.ts:24-30 | ran: `augy set-source no-such-skill owner/repo` exited 1 with "not found", and `registry.json` stayed byte-identical | |
| Set-source accepts common GitHub URL forms | Conforms | src/github.ts:60-100 | ran: tree URL resolved to `obra/superpowers` `skills/brainstorming` at ref `v6.4.1`; blob `…/blob/main/skills/xlsx/SKILL.md` resolved to `skills/xlsx`; `https://github.com/anthropics/skills` resolved to the repo root (`@ca45fc4`); shorthand `anthropics/skills/skills/xlsx` resolved to `skills/xlsx` | A blob URL is detected by a `.` in the last segment (github.ts:84), so a blob link to a directory whose name contains a dot is mis-parsed. |
| Set-source verifies the source on GitHub before saving | Conforms | src/commands/set-source.ts:38-54; src/github.ts:135-147 | ran: `augy set-source x anthropics/skills/skils/pdf` exited 1 with `No commits found for path "skils/pdf"`; registry byte-identical; write-back runs only after a successful save (set-source.ts:56-70) | It only checks that commits exist for the path. Any existing file or non-skill folder is accepted. |
| Set-source records the source and latest upstream SHA | Conforms | src/commands/set-source.ts:44, 57-63 | ran: source stored exactly as typed (`https://github.com/obra/superpowers/tree/v6.4.1/skills/brainstorming`); `y` had `old/repo` replaced by `anthropics/skills/skills/pdf` with no prompt and SHA `1ed29a0` (matches `gh api commits?path=skills/pdf`); afterwards `augy list` showed `x @fa0fa64` and its source instead of "untracked" | |
| Set-source follows the ref in the URL | Conforms | src/github.ts:135-147; src/commands/set-source.ts:44 | ran: tree URL at tag `v6.4.1` recorded `5bf4e78`, which is the last commit for the path at `v6.4.1` (main gives `22f0b46`) | |
| Set-source writes the source into SKILL.md | Conforms | src/commands/set-source.ts:66-70; src/provenance.ts:226-250 | ran: active Claude (no frontmatter) and active Gemini (frontmatter without source) copies both gained `source:`; inactive Codex copy was unchanged; `y` kept `source: keep/this` | |
| Set-source uses the user's GitHub CLI login | Unverifiable | src/github.ts:17-26, 135-147 | read: resolution uses `gh api` only | Needs a private repo the logged-in user can access. |
| List points sourceless skills at set-source | Conforms | src/commands/list.ts:44-61 | ran: `mystery` (empty source) showed `untracked  ⚠ no source — run \`augy set-source mystery <url>\` to enable updates` and `source: unknown` | |

## Spec issues

- **"First agent location" is undefined** (Scan writes the confirmed source into SKILL.md, "Only the first agent location is written"). The code's first location is whichever agent folder's walk adds to the map first. The agents are walked concurrently (`Promise.all`, scan.ts:430-435), so the order is not deterministic. The spec should say which location wins (for example, agent order in `AGENTS`), or the scenario can't be tested reliably.
- **"Truncated to 80 characters"** (Results are grouped by provenance) doesn't say whether an ellipsis is allowed or counts toward the 80.
- **"A resolved commit SHA"** (SHA lookup) doesn't say which commit. Set-source and git provenance record the last commit that touched the path, while scan's import lookup records the branch head. The spec allows both, which hides the drift problem that `augy update` then reports.
- **Git provenance's in-repo path** is defined without saying how symlinks are handled. The scenarios don't cover an agent folder reached through a symlink, which is the common dotfiles case.
- **"Points at a host other than github.com"** doesn't cover sources without a scheme (`gitlab.com/o/r`) or subdomains (`gist.github.com`). The code treats both as GitHub.
- **Private repo scenarios** (both capabilities) can't be checked without a private repo and a specific login. They are environment checks rather than behavior that can be tested in isolation.
- **Tap SHA.** The SHA lookup requirement lists tap sources among those that need a lookup during import, but "Provenance from a matching tap" implies the tap entry already carries a SHA. The two requirements don't agree on whether a tap SHA should be fetched again.

## Behavior not covered by the spec

- **Invalid typed sources are stored.** Any text typed at the source prompt (for example `y`) is saved as the source, with a made-up gigetSource (`github:y`) and `unversioned` (scan.ts:288-293).
- **Scan edits files inside git checkouts without warning.** Write-back leaves a modified `SKILL.md` in the user's dotfiles working tree.
- **Git provenance with no commits.** A git skill whose path has no commits (new, untracked files) gets `sha: undefined` and falls back to a GitHub lookup on import (provenance.ts:93-96).
- **SHA inconsistency.** Set-source records the last commit for the path, while scan's import, `augy update`, and sync use the branch head or a tree SHA. The first `augy update` after adopting or setting a source will likely report drift.
- **Same-named, different skills are merged silently.** Two different skills with the same folder name, in different agents or at different depths, become one registry entry with no warning.
- **"Scanned 33 agent(s)"** counts every supported agent, not the folders that exist.
- **Copilot counts as installed whenever `gh` is on PATH.** `src/agents.ts:84` makes the `gh` binary itself the detection signal, so every machine with `gh` "has" Copilot. This doesn't affect scan, which walks every agent, but it affects install and sync targeting.

## PRD factual errors

Checked every "Further Notes" bullet in `docs/prd/adopting-existing-skills.md` against the code and the runs above. None is contradicted:

- The additional-install gap was confirmed, and commit `cbd969e` exists with that subject.
- Symlinks being invisible was confirmed.
- The tree-URL frontmatter failure was confirmed.
- Refs being dropped is true.
- The SHA identity mismatch is true (`update.ts:100-104` vs `set-source.ts:44`).
- "Scanned N" counting 33 agents was confirmed.
- The README saying set-source accepts only tree and blob URLs was confirmed (README "augy set-source").
- The list showing a sourced but unversioned skill as untracked was confirmed. It also prints the misleading "no source" warning.

The PRD leaves out two defects found here. Git provenance builds a broken `../` path when the agent folder is reached through a symlink. Frontmatter sources from non-GitHub hosts (`notgithub.com`, `gist.github.com`, scheme-less `gitlab.com/...`) are accepted as GitHub.
