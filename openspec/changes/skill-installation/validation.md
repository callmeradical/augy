# Validation: skill-installation

Code checked: committed HEAD `c725774`, read through `git show HEAD:<path>`. Experiments ran in a sandbox built with `git archive HEAD` and `npm ci --ignore-scripts`, using the built `dist/index.js` on Node 24.21. `HOME`, `AUGY_HOME`, and `XDG_CACHE_HOME` were temp dirs, and `PATH` held only fake agent binaries plus a fake `gh`. The fake `gh` served fixture repos (branches, tags, a 40-char SHA ref, a `master`-default repo, a private repo, a truncated-tree repo) and logged each call and whether it was authenticated. giget downloads went to a local stand-in for `api.github.com/repos/<o>/<r>/tarball/<ref>` (via `GIGET_GITHUB_URL`). It logged each request and its `Authorization` header, returned 404 for private repos without auth, and could be told to fail. Interactive flows ran under a pty driver. In fixture output, git tree SHAs start with `t`, so they can't be mistaken for commit SHAs.

## Summary

Scenario verdicts (69): **Conforms 55**, **Deviates 14**, **Missing 0**, **Unverifiable 0**.

Requirement verdicts (39): **Conforms 27**, **Deviates 12**.
- skill-install: 32 requirements, 21 Conform and 11 Deviate (tree URL ref, shorthand default branch, tap access errors, large repos, skill picker, private repos, content matches version, tags and label, untracked deployments, all-failed run, damaged lockfile).
- skill-uninstall: 7 requirements, 6 Conform and 1 Deviates (broken links).

## Results

### skill-install

| Requirement / Scenario | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Classify the install source / Bare name | Conforms | src/commands/install.ts:47, 52-56 | ran: `install tdd --yes` searched taps ("not found in any tap" with no taps, 0 gh calls) | |
| Classify the install source / Shorthand is a GitHub reference | Conforms | src/github.ts:93-99 | ran: `install acme/catalog --yes` queried `repos/acme/catalog` | |
| Classify the install source / URL is a GitHub reference | Conforms | src/github.ts:64-90 | ran: `install https://github.com/alice/skills/tree/dev/...` | |
| Install from a repo URL / HTTPS repo URL | Conforms | src/github.ts:64-90 | ran: `https://github.com/old/master-repo` discovered `lint` and `tdd` | That download failed for a different reason (see "Default branch is not main"). |
| Install from a repo URL / HTTP and trailing slash | Conforms | src/github.ts:61, 65 | ran: `http://github.com/acme/my-skill/` installed `my-skill` from `acme/my-skill` | `source` is stored as typed (`http://…/`). |
| Install from a tree URL / Folder at a branch | Conforms | src/github.ts:71-75, 264-269 | ran: `tree/dev/skills/tdd` installed `# tdd alice@dev`, and the server log shows `tarball/dev` | |
| Install from a tree URL / Pinned to a tag or full commit SHA | Conforms | src/github.ts:243, 253-258, 264-269 | ran: `tree/v1.0/...` installed `alice@v1.0`, and `tree/1111…1111/...` installed that commit's content | For annotated tags the recorded `sha` is the tag-object SHA (read src/github.ts:254-258; GitHub returns `type:"tag"` for `nodejs/node` `v20.0.0`). Content is still correct. |
| Install from a tree URL / Branch name containing a slash | Deviates | src/github.ts:71-74 (`ref = parts[3]`) | ran: `tree/feature/x/skills/tdd` failed with `Cannot resolve ref "feature"` and exit 1 | The ref is cut at the first `/`. If a `feature` branch existed, augy would install `x/skills/tdd` from it. |
| Install from a blob URL / Link to a SKILL.md file | Conforms | src/github.ts:79-88 | ran: `blob/main/skills/tdd/SKILL.md` installed folder `tdd` at `main` | |
| Install from owner/repo shorthand / Whole-repo shorthand | Conforms | src/github.ts:240 | ran: `acme/catalog` (default `main`) installed all three skills | Only correct because the default branch is `main`. See below. |
| Install from owner/repo shorthand / Path shorthand | Conforms | src/github.ts:93-99, 178-184 | ran: `alice/skills/skills/tdd` installed only `tdd` | |
| Install from owner/repo shorthand / Default branch is not main | Deviates | src/github.ts:264-269 (no `#ref` when ref is undefined); giget 3.2.0 `parseGitURI` defaults to `"main"` | ran: `old/master-repo`, `old/master-repo/skills/tdd`, and `https://github.com/old/master-repo` were discovered from `master`, but every download requested `tarball/main` and got a 404. Each skill printed ✗, and the run still exited 0 | Discovery is right, but the download is wrong. |
| Resolve a bare name through taps / Single match | Conforms | src/taps.ts:111-129; src/commands/install.ts:89-96 | ran: `install REVIEW --yes` installed `review` from `tapa/skills` | |
| Resolve a bare name through taps / Name in more than one tap | Conforms | src/commands/install.ts:77-88 | ran (pty): `install tdd` showed "Which tap should this skill be installed from?" listing `tapa/skills` and `tapb/skills`. Choosing `tapb` installed only tapb's `tdd` | clack shows the `@sha` hint only for the focused option, so you see each version by moving the cursor. |
| Resolve a bare name through taps / Partial name does not match | Conforms | src/taps.ts:120 | ran: `install rev --yes` gave "No taps contain a skill named "rev"" and exit 1 | |
| Bare name not found / No tap has the skill | Conforms | src/commands/install.ts:58-65 | ran: `install nosuch --yes` exited 1, wrote nothing, and printed both `augy install owner/repo/path` and `augy tap add owner/repo` | |
| Tap access errors are not reported as misses / GitHub CLI not signed in | Deviates | src/taps.ts:94-103 (errors captured), 111-129 (ignored); src/commands/install.ts:58-65 | ran: with fake `gh` signed out, `install review --yes` printed only "No taps contain a skill named "review"" | |
| Recognize SKILL.md in any case / Lowercase and mixed-case file names | Conforms | src/github.ts:155-157, 203 | ran: `acme/cases` found `lower` (`skill.md`) and `mixed` (`Skill.md`) | |
| Discover skills / Target is a skill | Conforms | src/github.ts:178-184 | ran: `alice/skills/skills/tdd` gave exactly one skill, `tdd` | |
| Discover skills / Repo root is a skill | Conforms | src/github.ts:181 | ran: `acme/my-skill` (root `SKILL.md`) gave `my-skill` | |
| Discover skills / Nested catalog | Conforms | src/github.ts:200-226 | ran: `acme/catalog` (`a/zeta`, `b/c/alpha`, `beta`) listed alpha, beta, zeta in that order | |
| Discovery is complete in large repos / Very large repo | Deviates | src/github.ts:195-198 | ran: the fixture tree returned `truncated:true` after 4 entries, and `acme/big` (6 skills) reported "Found 1 skill(s)" (`s1` only) | Only a warning is printed. No fallback runs. |
| A skill's directory name is its identity / Folder name in every place | Conforms | src/commands/install.ts:172, 180, 206 | ran: registry key `tdd`, `store/tdd`, `~/.claude/skills/tdd` | |
| A skill's directory name is its identity / Same name from a different repo | Conforms | src/commands/install.ts:166-206 | ran: alice's `tdd` then bob's `tdd`. The registry `source`, store, and agent content all became `bob/skills` | No warning about the collision. |
| Interactive skill picker / Picker for a single skill | Conforms | src/commands/install.ts:122-124 | ran (pty): `install acme/my-skill` showed "Select skills to install (1 total)" | |
| Interactive skill picker / Filter and toggle all | Deviates | src/ui/filterable-multiselect.ts:205-218; @clack/core 0.4.1 MultiSelectPrompt (`'a'` → `toggleAll()`) | ran (pty): with all 5 skills pre-selected, pressing `a` left all 5 selected (no toggle). Filtering `o` (one, two, four), pressing `a`, then Enter submitted an empty selection, so install cancelled. The expected result was that three and five stay selected | clack's own `a` handler and augy's handler both fire, so they cancel each other or clear hidden selections. Filtering also needs `/` first. |
| Interactive skill picker / Version and path shown | Deviates | src/commands/install.ts:246-249 | ran (pty): installed entries show `@ta32bcc  already installed` with no repo path | New entries show both the short SHA and the path. |
| Interactive skill picker / Nothing selected | Conforms | src/commands/install.ts:126; src/ui/filterable-multiselect.ts:72 | ran (pty): an empty selection gave "Installation cancelled" and nothing was written | `required: true` isn't enforced, because the core prompt gets no `validate`. Install cancels (exit 0) instead of asking again. |
| New skills pre-selected, installed skills not / Re-running install on a repo | Conforms | src/commands/install.ts:237-251 | ran (pty): with `one` installed, `one` was ◻ "already installed" and the others ◼ | |
| Choose target agents / Agents named on the command line | Conforms | src/commands/install.ts:129-132 | ran (pty): `install acme/five/skills/two --agent claude opencode` with no `--yes` showed no agent picker and produced `two → OpenCode, Claude` | |
| Choose target agents / Agent picker defaults | Conforms | src/commands/install.ts:256-278 | ran (pty): with only Claude and Codex evidence, those two came first and pre-selected with their skills folder shown. The other 31 were unselected and marked "not detected" | |
| Choose target agents / Undetected agent | Conforms | src/commands/install.ts:131-132 | ran: `--agent kiro` (not detected) created `~/.kiro/skills/my-skill` | |
| Summary and confirmation / User confirms | Conforms | src/commands/install.ts:147-157 | ran (pty): `skill @sha → agents` lines, then the confirmation, then install | |
| Summary and confirmation / User declines | Conforms | src/commands/install.ts:154-157 | ran (pty): declining left no `~/.augy` and no agent folder | |
| Plain augy starts the install flow / No subcommand | Conforms | src/index.ts:454-457; src/commands/install.ts:43, 226-232 | ran (pty): plain `augy` prompted "GitHub URL or owner/repo[/path]" | |
| Plain augy starts the install flow / Bare name at the prompt | Conforms | src/commands/install.ts:47 | ran (pty): typing `review` gave "Found in tap tapa/skills" and installed it | |
| --yes installs everything / CI install of a catalog | Conforms | src/commands/install.ts:122-124, 154 | ran: `install acme/five --yes --agent claude codex cursor` installed all five with no prompt | |
| --yes installs everything / Already-installed skills are re-installed | Conforms | src/commands/install.ts:122-124 | ran: re-running `--yes` over an installed skill re-downloaded and re-linked it | |
| --yes agent targets / No --agent on a machine with agents | Conforms | src/commands/install.ts:133-134 | ran: with Claude and Codex evidence (gh hidden from detection), the install went to "Claude, Codex" | With `gh` visible, Copilot is added ("Claude, Codex, GitHub Copilot"). See Spec issues. |
| --yes agent targets / Nothing detected and none named | Conforms | src/commands/install.ts:139-142 | ran: no evidence gave "--yes: no agents detected; pass --agent <ids...> explicitly" and exit 1 | |
| --yes agent targets / Only unknown agent IDs named | Conforms | src/commands/install.ts:131-132, 139-142 | ran: `--agent foo bar --yes` exited 1 with no write | The message says "no agents detected", which is misleading when `--agent` was given. |
| --yes requires a source / Misconfigured CI job | Conforms | src/commands/install.ts:39-42 | ran: `install --yes` exited 1 with no prompt | |
| --yes fails on an ambiguous bare name / Two taps have the name | Conforms | src/commands/install.ts:69-76 | ran: exit 1, printing `augy install tapa/skills/skills/tdd --yes` and `augy install tapb/skills/skills/tdd --yes` | |
| --yes fails when nothing to install / Source has no skills | Conforms | src/commands/install.ts:112-116 | ran: `acme/empty --yes` exited 1 | |
| --yes fails when nothing to install / Source cannot be resolved | Conforms | src/commands/install.ts:102-110 | ran: `nobody/nothing --yes` exited 1 | |
| --yes fails when nothing to install / Bare name not found | Conforms | src/commands/install.ts:58-65 | ran: `nosuch --yes` exited 1 | |
| Install from private repos / Private repo end to end | Deviates | src/github.ts:347-354; giget `downloadTemplate` (`options.auth = process.env.GIGET_AUTH`) | ran: logged in to `gh`, `corp/private/skills/secret` was discovered (`@346f42f`), but the tarball GET carried no `Authorization` and got a 404, so the skill wasn't installed or recorded. The same happened with only `GH_TOKEN` set. It succeeded only with `GIGET_AUTH` set | |
| Installed skills deploy through the store / Agent paths resolve to the stored copy | Conforms | src/commands/install.ts:171-186 | ran: two agents gave two symlinks to `~/.augy/store/<skill>` | |
| Installed skills deploy through the store / Existing folder at the agent path | Conforms | src/commands/install.ts:183-185 | ran: a real `~/.claude/skills/tdd` folder and a broken link at Codex were both replaced by store links with no prompt | |
| Lockfile record / Install from a URL | Conforms | src/registry.ts:190-220; src/commands/install.ts:189-206 | ran: a `tree/...` URL install recorded that exact `source`, a 40-char `sha`, a 7-char `shortSha`, `agents.claude.path`, `installedAt`, `updatedAt`, and `storePath` | |
| Lockfile record / Install from a tap | Conforms | src/commands/install.ts:95-96 | ran: `source` was `tapa/skills/skills/review` and `tap` was `tapa/skills` | The recorded `sha` is a tree SHA (see the foundation validation). |
| Lockfile record / First install | Conforms | src/registry.ts:209, 218 | ran: `pinned:false`, `history:[]` | |
| Installed content matches the recorded version / Upstream moves during install | Deviates | src/github.ts:182, 264-269 (download by ref name, not SHA) | ran: the tarball server served a newer `main` than the one `gh` reported. Installed content was "PUSHED-AFTER-LOOKUP" while the recorded `sha` was the older commit | |
| Installed content matches the recorded version / Download fails with a cache present | Deviates | giget 3.2.0 `downloadTemplate` (cached-tarball fallback on download error) | ran: installed v1 (cache filled), changed upstream, made downloads fail, and re-installed. The run printed `✓ tdd @a52917f` (new SHA) and exited 0, but the installed file was the old v1 | |
| Re-install keeps the skill's history / Re-install a pinned skill | Conforms | src/commands/install.ts:166-169, 200-204 | ran: with a set `installedAt` of 2020, `pinned:true`, and 1 history entry, re-installing to Claude only kept all three and set agents to `[claude]` | "already installed — updating record" is only a spinner label (install.ts:168). It's overwritten by the ✓ line and didn't render in the pty run because the download finished within one spinner frame. |
| Re-install keeps the skill's tags and label / Re-install a tagged skill | Deviates | src/commands/install.ts:189-204 | ran: `contexts:["work"]` and `label:"My TDD"` were gone after re-install | |
| Re-install leaves no untracked deployments / Re-install to fewer agents | Deviates | src/commands/install.ts:178-206 | ran: installed to Claude and Codex, then re-installed to Claude only. The Codex link stayed on disk and was no longer recorded, and after `uninstall tdd` the Codex link was still there (now dangling) | |
| One failed skill doesn't stop the others / One bad download | Conforms | src/commands/install.ts:160-212 | ran: the server failed the first tarball GET. `alpha` printed ✗, and `beta` and `zeta` were installed and recorded | |
| A run where every skill failed is not a success / All downloads fail in CI | Deviates | src/commands/install.ts:209-219 | ran: with every download failing, all three printed ✗, then "Done! Registry saved", exit 0 | Empty `store/<skill>/` folders are left behind. |
| A damaged lockfile is not silently reset / Corrupt registry | Deviates | src/registry.ts:144-155 (parse error → empty registry); src/commands/install.ts:214 | ran: with `registry.json` truncated JSON holding skill `keep`, an install exited 0 with no warning, and the file then held only `my-skill` | |

### skill-uninstall

| Requirement / Scenario | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Only tracked skills can be uninstalled / Untracked name with a folder on disk | Conforms | src/commands/uninstall.ts:23-26 | ran: `uninstall notes` gave "not found in registry" and exit 1, and `~/.claude/skills/notes` was left | |
| Preview before uninstalling / One agent path already gone | Conforms | src/commands/uninstall.ts:29-50 | ran (pty): `tdd @8f0c695`, each agent path, Codex marked "(already missing)", "1 archived version(s)" | The archive count is shown only when greater than 0. The count is `history.length`, not the archives on disk. |
| Uninstall always asks for confirmation / User declines | Conforms | src/commands/uninstall.ts:55-59 | ran (pty): `n` left all three links, the store, `versions/tdd`, and the registry entry | No `--yes`, so this can't run in CI. |
| Remove the skill everywhere / Skill in three agents | Conforms | src/commands/uninstall.ts:81-99 | ran (pty): all three agent links and `store/tdd` were gone | Only agents with `active:true` are removed (uninstall.ts:29-31). Nothing ever sets `active:false` today. |
| Broken links are removed too / Dangling agent link | Deviates | src/commands/uninstall.ts:38, 82 (`existsSync` follows links) | ran (pty): with `store/tdd` deleted first, the Claude and Cursor links showed "(already missing)" and were still on disk after a confirmed uninstall | |
| Archived versions kept unless the user chooses otherwise / Accept the default | Conforms | src/commands/uninstall.ts:62-73 | ran (pty): Enter on the archive question (default No) kept `versions/tdd/<sha>/` | |
| Archived versions kept unless the user chooses otherwise / Clean slate | Conforms | src/commands/uninstall.ts:102-113 | ran (pty): `y` removed `versions/tdd/` | |
| Archived versions kept unless the user chooses otherwise / No history | Conforms | src/commands/uninstall.ts:63 | ran (pty): with no history, no archive question appeared | |
| Registry entry removed even when deletions fail / One path can't be deleted | Conforms | src/commands/uninstall.ts:79-124 | ran (pty): with `~/.codex/skills` at mode 555, the run printed "Uninstalled with warnings" and "! Failed to remove …: EACCES". The Codex link stayed, and `tdd` was gone from the registry | |

## Spec issues

- **Re-install keeps the skill's history** says augy "SHALL show 'already installed — updating record'" without saying where or for how long. The code sets it as a transient spinner label, which can fall within one frame and never render. That satisfies the wording but isn't observable.
- **Interactive skill picker / Nothing selected** doesn't say whether augy should ask again or may abort. The code aborts with exit 0 ("Installation cancelled").
- **Name in more than one tap** ("showing each candidate's version") doesn't say whether all versions must be visible at once. clack shows the hint only for the focused option.
- **Preview before uninstalling** ("how many archived versions exist") doesn't say whether a zero count must be printed. The code omits it.
- **--yes agent targets** and the **Nothing detected and none named** scenario are effectively unreachable on a real machine: the agent table counts `gh` on PATH as Copilot evidence, and augy can't run without `gh`. The scenario was exercised by hiding `gh` from `which`.
- **Lockfile record** asks for "`sha` and `shortSha`" without saying they must be commit SHAs, while `augy-cli-foundation` requires commit SHAs. The two specs should agree.
- **Pinned to a tag or full commit SHA** checks only content. It doesn't say what `sha` to record for an annotated tag (augy records the tag-object SHA).

## Behavior not covered by the spec

- **Failed re-install destroys the working copy.** The store folder is deleted and recreated before the download (src/commands/install.ts:172-175). Ran: with downloads failing and the cache cleared, re-installing `tdd` left `store/tdd/` empty, so both agent links resolved to an empty folder. The registry still showed the old `sha`, and the run exited 0.
- **Filter keystrokes have side effects.** In the filterable picker, typing `a` toggles all items (clack core), `h/j/k/l` move the cursor, and Esc cancels the whole install, even though the hint says "esc to clear" (@clack/core aliases `escape` to `cancel`). Ran: typing `/cla` in the agent picker changed the selection to "Claude, Gemini CLI, Cline, Kimi CLI, OpenClaw, OpenClaude IDE".
- **Unknown `--agent` IDs are dropped silently** (src/commands/install.ts:132). Interactive runs with only unknown IDs end in "Installation cancelled" with exit 0.
- **Collisions within a single catalog.** Two folders with the same leaf name overwrite each other's store copy and registry entry in one run (src/commands/install.ts:160-206).
- **`--yes` ignores pins.** It re-installs pinned skills, refreshes their content, and keeps `pinned:true`.
- **Tap installs record a tree SHA but store a single-path `source`.** The next `augy update` reports a spurious update. Ran: `review t76ffc3 → 7700825` right after install.
- **Install doesn't refuse to replace untracked hand-made skill folders** of the same name. It replaces them silently (install.ts:184).

## PRD factual errors

`docs/prd/skill-installation.md` (Further Notes):

- "(Inference: there's no `--yes` here even though install, sync, update, and skillset delete have one.)" is wrong for update: `augy update` has `--all`, not `--yes` (src/index.ts:70).

The PRD's other Further Notes claims checked out against HEAD, several of them confirmed by running here even though the PRD said they were untested: non-`main` default branch, private downloads, cache fallback, exit 0 on total failure, truncated trees, `feature/x`, swallowed tap errors, dangling links on uninstall, damaged lockfile reset, lost tags and label, and orphaned links on re-install to fewer agents.
