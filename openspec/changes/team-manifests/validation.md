# Validation: team-manifests

Code checked: committed HEAD `c725774`, read with `git show HEAD:<path>`. Line numbers are for HEAD.

How the runs worked: `git archive HEAD` was extracted into a temp sandbox, then `npm ci --ignore-scripts` and `tsup` were run there. The built CLI ran with a temp `HOME` and a temp `AUGY_HOME`. Claude and Gemini were "detected" through `~/.claude/settings.json` and `~/.gemini/settings.json`. `PATH` held `node`, `git`, and a logging `gh` shim that called the real `gh` with `GH_TOKEN`, or had no `gh` at all for the no-gh runs. The `gh` binary on PATH also makes augy detect GitHub Copilot.

Sync ran against public repos only (`anthropics/skills`, `obra/superpowers`). The main manifest held:

- `pdf` (shorthand)
- `docx` (tree URL)
- `mystery` (`""`)
- `missing-skill` (points at the multi-skill `anthropics/skills/skills` folder)
- `broken` (a repo that doesn't exist)
- a `contexts` block

A `personal` skill was installed locally but not listed in the manifest. Sync was run twice in a row with `--yes`, with dry runs before and after.

Failure paths tested:

- no `gh` on PATH
- an unknown skill name (`missing-skill`)
- malformed manifests: invalid JSON, no `skills` object, `skills: null`, `skills` given as a string
- an empty map and a missing file
- `--agent` naming an unknown agent
- no detected agents
- a declined prompt
- an install that fails partway (`anthropics/skills/README.md`)

## Summary

28 requirements (manifest-bundle 8, manifest-sync 20).

| Verdict | Count |
|---|---|
| Conforms | 21 |
| Deviates | 7 |
| Missing | 0 |
| Unverifiable | 0 |

## Results

### manifest-bundle

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Bundle writes a version 1 manifest from the registry | Conforms | src/commands/bundle.ts:52-71 | ran: `augy bundle` wrote `{"version":1,"skills":{"tdd":"owner/repo/tdd","lint":"https://github.com/o/r/tree/main/lint",…}}` | |
| Bundle copies sources exactly as recorded | Conforms | src/commands/bundle.ts:57-59 | ran: shorthand and full tree URL values were character-identical to the registry | |
| Bundle leaves out sourceless skills by default | Conforms | src/commands/bundle.ts:48-49, 76-78 | ran: `mystery` (empty source) was omitted with "1 untracked skill(s) omitted — use --include-untracked to add them"; `unv` (source, SHA `unversioned`) was included | |
| Include-untracked adds placeholders | Conforms | src/commands/bundle.ts:61-65 | ran: `--include-untracked` added `"mystery": ""` | |
| Bundle output location | Deviates | src/commands/bundle.ts:67, 80-84 | ran: from an empty folder, `--output …/out/skills.json` wrote only that file and created no `augy.json`, but the closing message still said "Commit augy.json to share this skill set with your team." Default runs wrote `<cwd>/augy.json` | The closing message is hard-coded (bundle.ts:82). |
| Bundle overwrites without merging | Conforms | src/commands/bundle.ts:71 | ran: an existing `augy.json` listing `old` was replaced without a prompt, and `old` was gone | |
| Empty registry writes nothing | Conforms | src/commands/bundle.ts:43-46 | ran: an empty `AUGY_HOME` printed "No skills installed. Nothing to bundle." and the folder stayed empty | A registry that holds only sourceless skills still writes `{"version":1,"skills":{}}`. |
| Bundle does not write contexts | Conforms | src/commands/bundle.ts:52-55 | ran: every registry skill had `contexts: ["work"]`, and the manifest had no `contexts` key | |

### manifest-sync

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Sync reads a manifest from a path or the current folder | Conforms | src/commands/sync.ts:58 | ran: `augy sync --dry-run` in `proj/` read `proj/augy.json`; `augy sync one.json` read that file | |
| Sync fails clearly on a missing or malformed manifest | Deviates | src/commands/sync.ts:60-76 | ran: a missing file exited 1 with "Run \`augy bundle\` to create one."; invalid JSON exited 1 with "Could not parse bad.json". But `{"version":1}` and `{"version":1,"skills":null}` crashed with an unhandled `TypeError: Cannot convert undefined or null to object` and a stack trace (exit 1). `{"skills":"pdf"}` was accepted as three skills named `0`, `1`, `2` and exited 0 | There is no shape check on `skills`. |
| Empty skills map is nothing to sync | Conforms | src/commands/sync.ts:76-80 | ran: `{"version":1,"skills":{}}` printed "Manifest is empty — nothing to sync.", exited 0, and left the registry unchanged | |
| Sync targets every detected agent by default | Conforms | src/commands/sync.ts:90-92; src/agents.ts:294-296 | ran: `sync --yes` with no `--agent` installed into Claude, Gemini, and GitHub Copilot (`~/.github/skills`) with no picker | Copilot was detected only because `gh` is on PATH (agents.ts:84). Every sync user has `gh`, so sync always writes to `~/.github/skills` as well. |
| Agent flag selects exactly the target agents | Conforms | src/commands/sync.ts:90-92 | ran: `--agent claude --agent not-an-agent --yes` installed `xlsx` into Claude only, leaving Gemini and Copilot without it | |
| Sync stops when there are no target agents | Conforms | src/commands/sync.ts:94-97 | ran: with no detected agents, and separately with `--agent not-an-agent` alone, sync printed "No agents detected. Install an agent or use --agent to specify one." and exited 1 | |
| Sync resolves each entry against current upstream | Conforms | src/commands/sync.ts:126-130, 219-231; src/github.ts:60-100, 172-262 | ran: `https://github.com/obra/superpowers/tree/v6.4.1/skills/brainstorming` installed a SKILL.md whose blob SHA (`e3f1788…`) matches `v6.4.1`, not main (`9eb0edc…`); gigetSource was `…#v6.4.1`. Shorthand `anthropics/skills/skills/pdf` installed current main | The recorded SHA was `b92c4fa`, the annotated tag object, not a commit SHA. The plan had shown `@5bf4e78`. |
| Sync classifies each entry into a plan | Deviates | src/commands/sync.ts:117-188 | ran: Install, Upgrade (`old → new`), and Skipped groups printed. An installed skill whose upstream had not changed was classified Upgrade, not Up to date, so the "one in each group" scenario can't be produced. Unresolvable `broken` was listed as "Skipped — no source" | Up to date is unreachable in practice (next row). Resolution failures are labelled as missing sources. |
| Placeholder entries are skipped with a warning | Conforms | src/commands/sync.ts:119-122, 184-188 | ran: `mystery: ""` showed in the yellow "Skipped — no source" line, and `pdf`/`docx` still installed | |
| Re-running sync is a no-op when nothing changed upstream | Deviates | src/commands/sync.ts:128-135 vs 220-238; src/github.ts:178-183, 211-217 | ran: right after `sync --yes`, `sync --dry-run` showed `Upgrade (3): pdf ca45fc4 → 1ed29a0, docx ca45fc4 → fa0fa64, missing-skill baddb91 → ca45fc4`. A second `sync --yes` deleted and re-downloaded all three and recorded the same old SHAs again | The plan compares against the last commit for the path, while apply records the branch head (or a tree SHA). They never match unless the head commit touched the path. |
| Dry run changes nothing | Conforms | src/commands/sync.ts:190-198 | ran: `sync --dry-run --yes` with three installs pending left `registry.json` md5-identical and created no agent skill folders | `gh` created `~/.local` state in the temp HOME. |
| Sync confirms once before applying | Conforms | src/commands/sync.ts:203-212 | ran (expect): "Apply 1 change(s) to Claude, GitHub Copilot, Gemini CLI?"; answering No left the registry and agent folder unchanged; `--yes` with stdin `/dev/null` applied with no prompt | Declining exits 0. |
| Sync installs into every target agent and records the skill | Conforms | src/commands/sync.ts:224-249 | ran: `pdf` and `docx` folders with `SKILL.md` appeared in all three target agents, and the registry had the manifest source and a 40-character SHA | The recorded SHA is the branch head (`ca45fc4`), not the plan's `@1ed29a0`. |
| Sync installs the skill the manifest names | Deviates | src/commands/sync.ts:221-222 | ran: `missing-skill → anthropics/skills/skills` created `missing-skill/` in every agent containing the `academy-guide` skill (`name: academy-guide`), reported `✓ missing-skill` | Falls back to `remote[0]`. |
| Sync never removes skills | Conforms | src/commands/sync.ts:214-257 | ran: `personal` (not in the manifest) kept its registry entry and SKILL.md unchanged | A same-named untracked folder in a target agent would be deleted with `rm -rf` (sync.ts:228). The spec only covers skills absent from the manifest. |
| Per-skill failures are isolated and saved progress is kept | Conforms | src/commands/sync.ts:218-256 | ran: with `canvas-design`, `readme → anthropics/skills/README.md`, and `theme-factory`, the middle one printed `✗ readme — Error: Skill not found at source`, the other two installed and were in the registry, and no `readme/` folder was created. read: `writeRegistry` runs after each skill (sync.ts:249) | After an interruption, finished skills re-plan as Upgrade rather than Up to date (re-run row). |
| Sync reports failures truthfully | Deviates | src/commands/sync.ts:139-141, 190-193, 254-259 | ran: with no `gh` on PATH every entry went under "Skipped — no source (5)" and sync printed "Everything is up to date." (exit 0). With one of three installs failing it printed "Sync complete (3 change(s) applied)" (exit 0). `broken` (404) also exited 0 | |
| Upgrades preserve pin, install date, and history | Conforms | src/commands/sync.ts:242-246 | ran: a pinned `pdf` with `installedAt 2025-05-05` and two history entries was upgraded and kept `pinned: true`, the install date, and both entries | The same upgrade dropped `contexts`, `tap`, `label`, the inactive `codex` agent entry, and `storePath`. It neither archived the old version nor added a history entry. |
| Sync ignores manifest contexts | Conforms | src/commands/sync.ts:76-143 | ran: a manifest with `contexts: {pdf: ["nomatch"]}` planned `pdf` as Install like any other entry. read: `bundle.contexts` is never read | |
| Sync uses each developer's GitHub CLI login | Deviates | src/github.ts:17-26 (resolve via gh) vs src/github.ts:347-354; node_modules/giget/dist/_chunks/giget.mjs:424 | read: resolution uses `gh api`, but the download goes through giget with no `auth` option. giget only gets a token from `GIGET_AUTH`, so a private repo resolves and then fails to download | Not run against a private repo. Download from a public repo was confirmed. |

## Spec issues

- **"One entry in each group"** depends on an installed skill whose upstream hasn't changed. Without saying how "upstream has changed" is measured (last commit for the path, branch head, or tree SHA), the scenario can't be set up independently of the implementation's SHA choice.
- **"Interrupted sync … re-running plans only the remaining skills as Install"** is true even when the finished skills re-plan as Upgrade. The scenario should also require that they are not upgraded.
- **"Tree URL with a tag … recorded SHA correspond to v2"** doesn't say whether that SHA must be a commit. The code records an annotated tag object SHA.
- **"No detected agents"** depends on agent detection, which counts `gh` on PATH as GitHub Copilot. Because sync requires `gh`, a real machine that can sync always has at least one "detected" agent, so this scenario can only happen when sync couldn't work anyway.
- **"Placeholder entries are skipped with a warning"** doesn't define the warning. The code prints one combined yellow "Skipped — no source" line.
- **"Sync uses each developer's GitHub CLI login"** needs a private repo and a specific login, so it is an environment check.

## Behavior not covered by the spec

- **Untracked same-named folders are deleted.** Sync runs `rm -rf <agent>/<name>` before downloading (sync.ts:228). A hand-made folder with a manifest name is destroyed without warning.
- **Upgrades drop registry metadata.** `contexts`, `tap`, `label`, `storePath`, and agents outside the current targets are lost (sync.ts:233-246).
- **No archive and no history entry on upgrade.** `augy rollback` can't reach the version that sync replaced.
- **Store-model skills are replaced by plain copies.** The registry loses `storePath`, so the store copy is left orphaned.
- **`skills` given as a string or array** is iterated as entries (indices become skill names).
- **The apply step reports a different SHA from the plan.** The plan shows `@1ed29a0`, then apply reports `@ca45fc4`.
- **Bundle errors exit 0.** `augy bundle --output /nonexistent/dir/x.json` printed "Something went wrong" and exited 0.
- **Every sync writes to `~/.github/skills` by default** on any machine with `gh`, because Copilot detection treats `gh` as Copilot.

## PRD factual errors

Checked every "Further Notes" bullet in `docs/prd/team-manifests.md`. None is contradicted:

- "Upgrade every time" is reproduced, with the SHA explanation confirmed in code.
- Failures shown as "no source" plus "Everything is up to date." with exit 0 is reproduced.
- The exit code ignoring per-skill failures is reproduced.
- No archive on upgrade is confirmed.
- The store model being bypassed and `storePath` being dropped is confirmed.
- Other agents, tap, and contexts being dropped is reproduced.
- Pins kept but not honored is reproduced.
- Silent overwrite of same-named folders is confirmed in code.
- The wrong skill installing on a name mismatch is reproduced.
- Bundle's closing message is reproduced.
- The `--tracked-only` comment exists (bundle.ts:9).
- Bundle never writing `contexts` is confirmed.
- On the docs gap, commit `30812a5` adds `--yes`, and docs/index.html:636 lists `[path] [--dry-run]`.
- The malformed manifest crashing is reproduced.

The PRD leaves out three things: private-repo downloads ignore the gh login (giget has no auth), `label` is also dropped on upgrade, and Copilot is always targeted when `gh` is installed.
