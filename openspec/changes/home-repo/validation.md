# Validation: home-repo

Code checked: committed HEAD `c725774`. Files were read with `git show HEAD:<path>`. Line numbers refer to HEAD.

Experiments ran in a throwaway sandbox (`git archive HEAD`, `npm ci --ignore-scripts`, `tsup` build). Each simulated "machine" had its own `HOME` and `AUGY_HOME`. `PATH` was limited to `node`, `/usr/bin`, `/bin`, plus empty shims for the agents meant to be detected (`claude`, `codex`). The home repos were local bare repos. A per-machine `~/.gitconfig` with `url."file://<sandbox>/remotes/".insteadOf https://github.com/` pointed them at those bare repos. A read-only `gh` shim forwarded only `gh api <GET endpoint>` calls to the public api.github.com. Interactive pickers were driven through a Python pty driver that sent keystrokes and captured the rendered frames. Nothing was pushed to GitHub.

## Summary

| Verdict | Count |
|---|---|
| Conforms | 21 |
| Deviates | 6 |
| Missing | 0 |
| Unverifiable | 0 |
| **Total requirements** | **27** |

## Results

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Register a home repo | Conforms | src/commands/home.ts:59-73; src/registry.ts:113-120,285-287 | ran: `home set alice/skills` with `AUGY_HOME` set. `$AUGY_HOME/registry.json` got `home {repo,path,skillsPath}`, and `$HOME/.augy` was not created. | |
| Default and custom repo layout | Conforms | src/commands/home.ts:68-69 | ran: no options gave `augy.json`/`skills`. `--path config/augy.json --skills-path agent-skills` was stored as given. | Storing a nested path works. Pushing to one does not (see "nested paths"). `--skills-path ''` is accepted and means the repo root. |
| Repo identifier validation | Conforms | src/commands/home.ts:63-66 | ran: `skills`, `/skills`, `alice/`, `alice/skills/extra`, `https://github.com/alice/skills`, and `""` all exited 1 with "Invalid repo …", and the previous `home` config was unchanged. | The error appears as an uncaught exception with a stack trace. `git@github.com:alice/skills.git` and `a/b c` are accepted (one `/`, both parts non-empty), so they satisfy the literal rule. See Spec issues. |
| Confirm saved configuration | Conforms | src/commands/home.ts:75-79 | ran: `home set alice/skills --skills-path mine` printed `alice/skills`, `manifest : augy.json`, and `skills : mine/`. | |
| Re-running set replaces the configuration | Conforms | src/commands/home.ts:71-73 | ran: switching to `alice/dotfiles` replaced the repo. Re-running without `--skills-path` reverted `mine` to `skills`. No prompt appeared. | |
| Show the home configuration | Conforms | src/commands/home.ts:86-98 | ran: with a config, it printed the repo, manifest, and skills directory. With none, it printed "No home repo configured. Run `augy home set <owner/repo>`…" (exit 0). | |
| Home commands require a configured home repo | Conforms | src/commands/home.ts:110-116,244-247 | ran: `home push` and `home pull` with no config printed "Run `augy home set <owner/repo>` first." and exited 1. Both return before `cloneRepo`. | |
| Push writes a full-inventory manifest | Conforms | src/commands/home.ts:170-178 | ran: the pushed `augy.json` had `version:1`, `tdd → org/skills/tdd`, and `""` for each authored skill. A later push from another machine replaced the manifest with exactly that machine's lockfile (the remote-only `stale` and `gone` entries were dropped). | The value written is the lockfile's source string verbatim. Nothing converts it to the `github:` form used in the spec's example. |
| Push writes context tags to the manifest | Conforms | src/commands/home.ts:181-186 | ran: `contexts` was `{my-skill:[personal], tdd:[universal]}`. A push with no tagged skills produced no `contexts` key. With machine context `work`, `grep -r work` over the pushed tree found nothing. | |
| Push writes the manifest at nested paths | Deviates | src/commands/home.ts:187-191 | ran: `home set alice/dotfiles --path config/augy.json`, then push. Result: `ENOENT … /config/augy.json`, exit 1, nothing pushed. | `writeFile` runs without creating the parent folder (no `mkdir`). |
| Push backs up authored skill files | Deviates | src/commands/home.ts:151-165 | ran: a real directory was copied to `skills/my-skill/`. The external `tdd` got no folder. `gone` (not on disk) was listed as `""` and the push completed. A symlinked location failed: `ERR_FS_CP_NON_DIR_TO_DIR: cannot overwrite directory … with non-directory`, exit 1. | The symlink scenario fails: `mkdir(dest)` followed by `cp(symlink, dest)`. |
| Authored skills keep an empty source | Conforms | src/commands/home.ts:162-164,368 | ran: after push, `my-skill.source` was still `""` in the lockfile and `""` in the manifest. After pull on a second machine, the source was `""`. | |
| Push reclassifies stale home-repo sources | Conforms | src/commands/home.ts:123-134 | ran: `old` with source `alice/skills/skills/old` became `source ""`, `sha unversioned`, saved to the lockfile, and was pushed as `"old": ""`. Its files were committed. | The match is a substring test. `alice/skills-extra/x` was also reclassified and its source permanently cleared (reproduced). See Spec issues. |
| Descriptive push commit | Conforms | src/commands/home.ts:200-204 | ran (`git log` on the bare repo): `chore: update skills via augy — 5 skill(s) (4 authored)` and, with no authored skills, `chore: update skills via augy — 1 skill(s)`. | The authored count includes skills that were reclassified in the same push. |
| Push with nothing to change succeeds | Deviates | src/commands/home.ts:208-215; src/git.ts:10-17 | ran: a second identical push printed `✗ Push failed` and `Error: Command failed: git -C … commit -m …`, exit 1. | git prints "nothing to commit" on stdout. The rejected error text holds only the command line and stderr, so the check at :210 never matches. |
| Failed push is reported | Deviates | src/commands/home.ts:143-146,198,203-216 | ran: (a) a bare repo whose pre-receive hook rejects printed `✗ Push failed` and `remote: Permission … denied`, exit 1. That part conforms. (b) A missing repo made the clone fail, which printed only `▲ Something went wrong`, with no git error and **exit 0**. | `cloneRepo` (:145) and `gitAddAll` (:198) are outside the try block. Clack's spinner installs an `unhandledRejection` handler that swallows the error, so the process exits 0. |
| Home repo reached with the user's git credentials | Deviates | src/git.ts:27-56; src/commands/home.ts:145,205 | ran: every clone and push used `https://github.com/<o>/<r>.git` and was rewritten by the user's `insteadOf` config, so git's own configuration is honored. A search of `src` for token/credential handling in the home path found none (read). Missing repo: no repo was created, but the command exited 0 (see the previous row). | Credential-helper scenario: conforms by reading the code (plain `git` via `execFile`, no prompting or storage). An HTTPS credential helper was not exercised. "Missing repo not created" fails its "the command fails" clause. |
| Pull offers authored and external skills in one picker | Conforms | src/commands/home.ts:259-280 | ran: the picker listed authored `a b c d foo` and externals `tdd lint old`. `foo` (directory plus manifest source) appeared once, as authored. `bar: ""` with no directory was not offered. | |
| Pull picker is filterable and informative | Deviates | src/ui/filterable-multiselect.ts:164-203,189-191; src/commands/home.ts:296-310 | ran: typing `tdd` and then space toggled the first row (`a`), so the list had not narrowed. Typing `/tdd` and then space toggled `tdd`. Hints showed `universal  octo/skills/tdd` and `personal  authored`. The header showed `[context: personal]`. | Minor. Filtering only starts after `/`, which the on-screen hint mentions. It matches labels only. |
| Pull pre-selects by context | Conforms | src/commands/home.ts:292-310; src/registry.ts:267-275 | ran: with no context, all rows were ◼. With machine context `personal`: `a`(work) was ◻, and `b`, `c`, `d` were ◼. `--context work` flipped those, and `context show` still said `personal` afterwards. `a` tagged `work` in the manifest and `personal` locally, with context `personal`, was ◻. Space toggles any row. | |
| Pull chooses target agents | Conforms | src/commands/home.ts:327-344 | ran: with `claude` and `codex` detected, the picker showed `◼ Claude ◼ Codex` and nothing else. `--agent claude` showed no picker. `--agent claude not-an-agent` installed to Claude only. `--agent not-an-agent` printed "No agents selected.", exit 1, and installed nothing. | Deselecting every agent can't be submitted: clack shows "Please select at least one option" and re-prompts, so nothing is installed. The spec's `claude-code` ID doesn't exist (the real ID is `claude`). See Spec issues. |
| Pull restores authored skills from the home repo | Conforms | src/commands/home.ts:357-375 | ran: selected `a`, `b`, with Claude only. Files landed in `~/.claude/skills/{a,b}`, and `~/.codex` was not created. The lockfile got `source ""` with contexts `work` and `personal` from the manifest. | It overwrites any existing local record, so pin, install date, and local tags are reset. Version label is `home`. |
| Pull installs external skills through sync | Conforms | src/commands/home.ts:382-394; src/commands/sync.ts:154-212 | ran: selecting external `author` and the stale `stale` handed a 1-entry filtered manifest to sync, which printed `Install (1) author` and `Apply 1 change(s) to Claude?`. An authored-only selection started no sync (no `augy — sync` intro). | When sync can't resolve a source (for example, no `gh` on PATH), it reports "Skipped — no source" and "Everything is up to date", which is misleading. |
| Pull excludes stale home-repo sources | Conforms | src/commands/home.ts:382-384 | ran: `stale: alice/ext/skills/stale` was selected and was missing from the filtered manifest (1 skill). It was not installed. | It is still listed and pre-selected in the picker, and the dry run lists it as if it would install. Substring matching, as for push. |
| Pull dry run | Conforms | src/commands/home.ts:346-352 | ran: `--dry-run --agent claude` listed `+ tdd octo/skills/tdd` and `+ b authored`, then "Dry run — no changes made". `$HOME` had no agent folders and the lockfile was unchanged. | |
| Cancelling pull makes no changes | Conforms | src/commands/home.ts:314-317,337 | ran: Ctrl-C in the skill picker and in the agent picker each printed "Cancelled.", exit 0, with no agent folders and an unchanged lockfile. | The temporary clone is left in `$TMPDIR`. |
| Empty home repo reported | Conforms | src/commands/home.ts:282-285 | ran: a repo with only a README printed "No skills found in home repo." with no picker, exit 0. | |

## Spec issues

- **Agent ID in the scenarios.** "Flag skips the agent picker", "Unknown agent ID ignored", and "No agents" use `--agent claude-code`. augy's Claude agent ID is `claude` (src/agents.ts:49). Read literally, `--agent claude-code` is an unknown ID and pull fails with "No agents selected". These scenarios were judged with `claude`.
- **"Deselects every agent" can't happen.** The agent picker requires at least one selection, so the "No agents" scenario's second trigger can't occur. The spec doesn't say whether blocking the submit counts as "fails with an error".
- **Stale-source matching precision.** "Points at the configured home repo" is undefined. The code uses a substring test, which also catches `alice/skills-extra`. The spec can't judge this either way (it is listed as an Open Question in design.md).
- **SSH-style identifiers.** The validation rule ("exactly one `/`, non-empty parts") accepts `git@github.com:alice/skills.git`, which is a URL, while the rule's intent is to reject URLs. The requirement contradicts its own intent for that form.
- **Manifest example format.** The scenarios use `github:org/skills/tdd` as a lockfile source. The code writes whatever string the lockfile holds (for example `owner/repo/path`), so the example only holds if the lockfile already used that form.
- **"Credential helper used" isn't testable offline.** Checking it needs a real authenticated HTTPS remote. Here it was checked by reading the code and by honoring a git `insteadOf` rewrite.
- **Overlap.** "Missing repo not created" (credentials requirement) and "Failed push is reported" both depend on clone-failure handling, so a single defect fails both.

## Behavior not covered by the spec

- **Clone failures exit 0.** On push or pull, any clone failure (wrong repo, no network, auth failure) prints only "▲ Something went wrong" and exits 0. A script or CI job would treat a failed backup as a success.
- **Temporary data is never cleaned up.** Every push and pull, including cancelled ones, leaves `augy-home-push-*` / `augy-home-pull-*` clones, and pull leaves `augy-home-pull-manifest-*.json` files, in `$TMPDIR` (observed: about 20 directories from this session).
- **Repo-root skills directory.** With `--skills-path ''`, pull offers `.git` (and every other top-level directory, for example `skills`) as authored skills, all pre-selected (reproduced).
- **Pull overwrites local records.** Pulling an authored skill replaces its lockfile record: `pinned` true became false, a local `contexts` became the manifest's or none, and the install date was reset.
- **The picker's `a` (toggle all) key is handled twice.** The custom handler and clack core both react, so pressing `a` with everything selected didn't deselect all.
- **The `gh` binary on PATH makes "GitHub Copilot" a detected agent** (src/agents.ts:81-85), so anyone with the GitHub CLI sees Copilot in the pull agent picker.
- **Dry run doesn't consult sync.** It lists stale entries (which a real pull drops) and gives no install/upgrade/up-to-date status.
- **No success summary for authored-only pulls.** After copying authored skills, pull prints nothing more.
- **Reclassified skills.** Their `shortSha` becomes `unversio`, while `author new` records `unversi` (src/registry.ts:169-171 vs home.ts:129). This is cosmetic but inconsistent.

## PRD factual errors

- **Testing Decisions → "home pull … `--agent` skipping the picker" is listed as covered. It isn't, in practice.** src/commands/home.test.ts:413-428 mocks a repo with no skills, so `homePullCommand` returns at "No skills found" (home.ts:282-285) before the agent step. The assertion `multiselect not called` passes whatever `--agent` does.
- **Testing Decisions → the authored-push test's "source left empty" coverage is weaker than described.** `writeRegistry` isn't called during that push (nothing is reclassified), so `saved` is `undefined` and `?? ''` makes the assertion pass trivially (home.test.ts:236-237).
- **Testing Decisions → "filtered hand-off to sync" is listed as covered.** The test (home.test.ts:318-344) only asserts that `syncCommand` was called and that `writeFile` was called at all. It never checks that the manifest holds only `tdd`.
- Further Notes 5 (nested path) and 8 (symlink) say "inferred / not reproduced". Both were reproduced end to end here, and they are correct. Further Notes 1, 4, 6, 10, 12, and 13 were also confirmed by running them.

> **Post-validation note (2026-11-03):** Following the PRD agent table (multi-agent-support), the spec scenarios were corrected from `--agent claude-code` to `--agent claude`. No verdict changes, because the code already uses `claude`.
