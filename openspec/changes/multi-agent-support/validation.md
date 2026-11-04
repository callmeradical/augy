# Validation: multi-agent-support

Code checked: committed HEAD `c725774`, read through `git show HEAD:<path>`. Experiments ran in a sandbox built with `git archive HEAD` and `npm ci --ignore-scripts`, using the built `dist/index.js` on Node 24.21. `HOME`, `AUGY_HOME`, and `XDG_CACHE_HOME` pointed at temp dirs. `PATH` held only stub agent binaries, a fake `gh` that served fixture repos and logged each call, and `/usr/bin:/bin`, which contain no agent binaries. To make "only these agents are detected" possible while `gh` was still runnable, a wrapper `which` hid `gh` from detection only. giget downloads went to a local tarball stand-in (via `GIGET_GITHUB_URL`) that logged the `Authorization` header and returned 404 for private repos without auth. The per-agent detection matrix ran `src/agents.ts` under `tsx`, with `HOME` and `PATH` re-pointed per case. Interactive flows ran under a pty driver. No app bundles for Cursor, Windsurf, Kiro, Trae, or Trae CN exist on this machine, so the absolute `/Applications/*.app` signals were checked by reading only.

## Summary

Scenario verdicts (47): **Conforms 36**, **Deviates 11**, **Missing 0**, **Unverifiable 0**.

Requirement verdicts (23): **Conforms 16**, **Deviates 7**.
- agent-detection: 10 requirements, all Conform (23 scenarios).
- github-access: 4 requirements, all Deviate (7 scenarios: 1 Conforms, 6 Deviate).
- skill-store: 9 requirements, 6 Conform and 3 Deviate: scan extra copies, pre-store updates, and AUGY_HOME relocation (17 scenarios: 12 Conform, 5 Deviate).

## Results

### agent-detection

| Requirement / Scenario | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Supported agents and their skills directories / Each agent ID deploys to its skills directory | Conforms | src/agents.ts:40-246, 285-287 | ran: `install acme/my-skill --yes --agent` with all 33 IDs created 33 links. Every path matches the table row for row (e.g. `~/.factory/skills`, `~/.vibe/skills`, `~/.gemini/antigravity/skills`, `~/.trae-cn/skills`) | Exactly 33 agents. The IDs and names match the table. |
| Supported agents and their skills directories / Unusual locations | Conforms | src/agents.ts:72, 98, 159, 176 | ran: same run, links at `~/.codeium/windsurf/skills/my-skill`, `~/.config/crush/skills/my-skill`, `~/.agents/skills/my-skill`, `~/.augment/rules/my-skill` | |
| CODEX_HOME sets the Codex skills directory / Non-default Codex home | Conforms | src/agents.ts:35-38, 56 | ran: with `CODEX_HOME=$C/opt-codex`, the install created `$C/opt-codex/skills/my-skill` and nothing under `~/.codex/skills` | Read once at module load. |
| CODEX_HOME sets the Codex skills directory / Default Codex home | Conforms | src/agents.ts:37 | ran: without `CODEX_HOME`, the install created `~/.codex/skills/my-skill` | |
| Agents are detected from real evidence / Any one signal is enough | Conforms | src/agents.ts:40-246 (signals), 258-279 | ran (tsx matrix): for each of the 33 agents, each `bin`, `~`-path, and `env` signal alone made it detected, 0 failures. Every row's signals match the spec table. read: the absolute `/Applications/{Cursor,Windsurf,Kiro,Trae,Trae CN}.app` signals | The editor-extension and app-support signals are macOS paths (`~/Library/Application Support/...`). Cursor's "global-storage folder" is `~/Library/Application Support/Cursor/User/globalStorage`. |
| Agents are detected from real evidence / No signal | Conforms | src/agents.ts:277-279 | ran (tsx matrix): with an empty `HOME` and `PATH`, all 33 were not detected | |
| Agents are detected from real evidence / Editor-extension agent | Conforms | src/agents.ts:113-116 | ran (tsx matrix): `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev` alone made Cline detected | |
| Agents are detected from real evidence / Desktop-app agent | Conforms | src/agents.ts:122-126 | ran (tsx matrix): `~/Applications/Kiro.app` alone made Kiro detected | |
| Agents are detected from real evidence / CODEX_HOME is evidence | Conforms | src/agents.ts:57, 270-272 | ran (tsx matrix): `CODEX_HOME=/opt/x` with no `codex` binary made Codex detected | |
| A skills folder is never evidence / Folder left from an earlier install | Conforms | src/agents.ts:258-274, 294-296 | ran (tsx matrix): for every agent, its skills folder holding `x/SKILL.md` alone left it not detected (Goose included) | |
| Install agent picker order and labels / Picker on a machine with two agents | Conforms | src/commands/install.ts:256-278 | ran (pty): with Claude and Codex evidence, the picker (33 total) listed Claude and Codex first, pre-selected, with their skills paths. The other 31 were unselected and marked "not detected" | With `gh` visible, Copilot is a third detected agent (see Spec issues). |
| Install agent picker order and labels / Filter by typing | Conforms | src/ui/filterable-multiselect.ts:164-196 | ran (pty): `/wind` narrowed the list to 1 match, Windsurf | Typing starts only after `/`. Filtering matches the label only. Letters `a`, `h`, `j`, `k`, `l` and Esc have side effects (Behavior not covered). |
| Detection only sets defaults / Name an undetected agent | Conforms | src/commands/install.ts:131-132 | ran: `install acme/my-skill --yes --agent kiro` with Kiro not detected created the `~/.kiro/skills/my-skill` link | |
| Detection only sets defaults / --agent on sync and home pull | Conforms | src/commands/sync.ts:90-92; src/commands/home.ts:327-339 | ran: with nothing detected, `sync augy.json --yes --agent claude` installed to Claude. `home pull --agent kiro` (local bare repo through a git `insteadOf`) applied to Kiro only, with no agent picker | |
| Non-interactive defaults to every detected agent / CI with agents present | Conforms | src/commands/install.ts:133-134 | ran: with Claude and Gemini CLI evidence (gh hidden from detection), `install acme/my-skill --yes` targeted "Claude, Gemini CLI" | On a real machine Copilot is always added because `gh` is on PATH (seen: "Claude, Codex, GitHub Copilot"). |
| Non-interactive defaults to every detected agent / Headless runner with nothing detected | Conforms | src/commands/install.ts:139-142; src/commands/sync.ts:94-97 | ran: `install --yes` gave "no agents detected; pass --agent <ids...> explicitly" and exit 1. `sync --yes` gave "No agents detected. … use --agent" and exit 1. Neither wrote anything | Only reachable here with `gh` hidden from `which`. |
| Home pull and author new offer only detected agents / Home pull picker | Conforms | src/commands/home.ts:327-339 | ran (pty): with Claude and OpenCode evidence, the "Install to which agents?" picker listed only OpenCode and Claude, both ◼ | |
| Home pull and author new offer only detected agents / Author new choices | Conforms | src/commands/author.ts:71-82 | ran: with only Claude detected, `author new mine --no-edit` created only `~/.claude/skills/mine` (no picker). With Claude and Cursor detected, the picker offered just those two | |
| augy use picks one agent / Default agent from the environment | Conforms | src/agentResolver.ts:24-38; src/commands/use.ts:53 | ran: `AUGY_DEFAULT_AGENT=codex use focus --dry-run` targeted `Codex (codex)` | |
| augy use picks one agent / Flag overrides the environment | Conforms | src/agentResolver.ts:26 | ran: `AUGY_DEFAULT_AGENT=codex use focus --agent claude --dry-run` targeted `Claude (claude)` | |
| augy use picks one agent / First detected agent | Conforms | src/agentResolver.ts:44-60; src/agents.ts:294-296 | ran: with Claude and Cursor detected, `use focus --dry-run` targeted `Claude (claude)` | |
| Unknown agent IDs for augy use / Typo in the flag | Conforms | src/agentResolver.ts:29-36 | ran: `use focus --agent claud` gave `Unknown agent: "claud"` plus all 33 known IDs and exit 1, before any change | |
| Unknown agent IDs for augy use / Typo in the environment | Conforms | src/agentResolver.ts:26-36 | ran: `AUGY_DEFAULT_AGENT=claud use focus` gave the same message and exit 1 | |

### github-access

| Requirement / Scenario | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| GitHub lookups use the GitHub CLI login / Private repo lookup | Conforms | src/github.ts:17-26, 115-147, 172-262 | ran: with only a fake `gh` login, `install corp/private/skills/secret` discovered `secret @346f42f`. Every metadata call appears in the gh log as authenticated | The download then fails (below). |
| GitHub lookups use the GitHub CLI login / Authenticated rate limit | Deviates | src/fileDiff.ts:70-86, 107-129; src/commands/diff.ts:133, 173 | ran: `augy diff pdf` made its commit, tree, and blob lookups with direct `fetch` to `api.github.com`, not through `gh` (no gh log entries for them, and the run hit the real API). read: the only credential used is `GITHUB_TOKEN` | Install, update, search, sync, and tap lookups do go through `gh`. `diff` doesn't. |
| Skill downloads use the same GitHub login / Private repo download | Deviates | src/github.ts:347-354; giget 3.2.0 `downloadTemplate` (`options.auth = process.env.GIGET_AUTH`) | ran: `gh` signed in and `GIGET_AUTH` unset. The tarball GET carried `auth:null`, got a 404, and the skill printed ✗. Control: with `GIGET_AUTH` set, the same install succeeded | |
| Skill downloads use the same GitHub login / Downloads are authenticated | Deviates | src/github.ts:347-354 | ran: every tarball HEAD and GET in the server log had `auth:null`, even with `gh` signed in | Downloads use the unauthenticated rate limit. |
| CI credentials through GH_TOKEN or GITHUB_TOKEN / Token-only CI runner | Deviates | src/github.ts:347-354 | ran: with `FAKE_GH_AUTH=0` and `GH_TOKEN=ghp_ci`, `install corp/private/skills/secret --yes --agent claude` discovered the skill but the download 404'd. The run printed "Done!" and exited 0 with nothing installed | |
| GitHub access failures reported as access failures / GitHub CLI not installed | Deviates | src/github.ts:17-26; src/commands/install.ts:106-110 | ran: with no `gh` on PATH, install printed `Error: gh api repos/acme/five failed: spawn gh ENOENT` and exit 1 | A raw spawn error. Nothing says the GitHub CLI is needed. |
| GitHub access failures reported as access failures / GitHub CLI signed out | Deviates | src/taps.ts:94-129; src/commands/install.ts:58-65 | ran: with `gh` signed out, `install review --yes` printed only `No taps contain a skill named "review"` | For `owner/repo` sources the signed-out case shows gh's raw stderr ("To get started with GitHub CLI, please run: gh auth login"), prefixed `gh api … failed:`. |

### skill-store

| Requirement / Scenario | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| One stored copy linked into every target agent / Install to three agents | Conforms | src/commands/install.ts:171-186 | ran: install to Claude, Codex, and Cursor gave one `store/tdd/` and three symlinks to it | |
| One stored copy linked into every target agent / Change visible through every agent | Conforms | src/commands/install.ts:185 (symlink) | ran: after `update` rewrote `store/tdd/`, `~/.claude/skills/tdd` and `~/.codex/skills/tdd` both read `# tdd alice@main v2` | |
| Install repairs whatever is at the agent path / Stale copy | Conforms | src/commands/install.ts:183-185 | ran: a real `~/.claude/skills/tdd` folder became a store link. A pre-store copy re-installed also became a link | |
| Install repairs whatever is at the agent path / Broken link | Conforms | src/commands/install.ts:184-185 | ran: `~/.codex/skills/tdd -> /nonexistent/x` became a working link to `store/tdd` | |
| Update refreshes every agent at once / Update a skill deployed to two agents | Conforms | src/commands/update.ts:177-216 | ran: Claude and Codex both showed v2, the registry `sha` became the new SHA, and `versions/tdd/<old sha>/` exists | The success line prints the new SHA twice (`bd6fd8d → bd6fd8d`, update.ts:218-222). |
| Uninstall removes every deployment and the store copy / Nothing left behind | Conforms | src/commands/uninstall.ts:81-99 | ran (pty): uninstalling a skill linked into three agents left no agent path and no `store/tdd/` | A dangling link (store already gone) is left behind. See `skill-installation`, Broken links. |
| The registry records each skill's store location and agents / Registry after install | Conforms | src/registry.ts:190-220 | ran: an install to Claude and OpenCode recorded `storePath` plus `agents.claude.path` and `agents.opencode.path` | |
| The registry records each skill's store location and agents / Coverage at a glance | Conforms | src/commands/list.ts:63-73; src/commands/info.ts:60-77 | ran: `list` showed `agents: Claude, Gemini CLI`, and `info tdd` listed both with paths | |
| Scan records extra copies of tracked skills / Hand-copied into another agent | Deviates | src/commands/scan.ts:88, 92-95, 334-365 | ran: `tdd` tracked for Claude, a copy at `~/.gemini/skills/tdd`, and nothing else untracked. `scan` printed "All installed skills are already tracked by augy." and the registry still listed only `claude` | Recording happens only after an untracked import is accepted. Ran: with an untracked skill present and the import accepted, scan offered and recorded Gemini. Declining the import exits before the offer. |
| Scan records extra copies of tracked skills / Nothing untracked | Deviates | src/commands/scan.ts:92-95 | ran: same run as above, early exit | Scan also skips symlinked skill folders (`dirent.isDirectory()` is false for links, scan.ts:456). |
| Skills installed before the store / Old registry after upgrading augy | Conforms | src/registry.ts:30-68 (`storePath?`); src/commands/list.ts | ran: with a hand-written registry entry with no `storePath` and real copies in Claude and Codex, `list` showed the skill tracked for "Claude, Codex", and the copies were untouched | |
| Skills installed before the store / Uninstall a pre-store skill | Conforms | src/commands/uninstall.ts:81-99, 116-117 | ran (pty): both copies were removed and the registry entry was gone | |
| Skills installed before the store / Re-install converts to links | Conforms | src/commands/install.ts:171-206 | ran: `install alice/skills/skills/tdd --yes --agent claude codex` on the pre-store entry turned both paths into links to `store/tdd` and recorded `storePath` | |
| Updates keep reaching pre-store skills' agents / Two updates of a pre-store skill | Deviates | src/commands/update.ts:190-202 | ran: after the first update, Claude, Codex, and the store all showed v2. After the second, Claude and Codex still showed `# v2`, while the store and registry were at v3 | `storePath` is set at update.ts:202, so later updates skip the per-agent copies, which were never turned into links. |
| AUGY_HOME relocates all of augy's state / Sandbox home | Conforms | src/registry.ts:113-136; src/skillsets.ts:34-36 | ran: with `AUGY_HOME=$C/sandbox-home`, install, update, and `skillset create` put `registry.json`, `store/tdd/`, `versions/tdd/<sha>/`, and `skillsets.json` under it, and `$HOME/.augy` did not exist afterward | |
| AUGY_HOME relocates all of augy's state / Recorded archive path | Deviates | src/commands/update.ts:208; src/commands/rollback.ts:104 | ran: the history entry recorded `archivePath: "$HOME/.augy/versions/tdd/41f31b1…"` while the archive is actually under `$AUGY_HOME/versions` | |
| AUGY_HOME relocates all of augy's state / Messages name the relocated home | Deviates | src/commands/install.ts:218; src/commands/uninstall.ts:129; src/commands/skillset/create.ts:42 | ran: with `AUGY_HOME` set, install printed "Registry saved → ~/.augy/registry.json", `skillset create` printed "(~/.augy/skillsets.json)", and uninstall printed "Version archives retained in ~/.augy/versions/" | |

## Spec issues

- **Copilot detection conflicts with the GitHub access requirement.** The detection table makes `gh` on PATH evidence of GitHub Copilot, and `github-access` requires `gh` for every lookup. So on any machine where augy works, Copilot is detected: it's pre-selected in pickers and is a default `--yes`/`sync` target that writes into `~/.github/skills`. Scenarios that assume "only Claude and Codex", "only Claude and Gemini CLI", or "no agent detected" describe states a working augy machine can't be in. They were verified only by hiding `gh` from `which`.
- **Platform is unspecified.** "Cursor user global-storage folder", "Roo/Cline/Kilo Code/Augment extension storage", and "`.app`" don't name a platform. The code uses macOS-only paths, so on Linux those agents can be detected only by command, or not at all. The spec can't say whether that's right.
- **Augment's directory is `~/.augment/rules`** but the requirement says skills deploy as "a folder containing `SKILL.md`". Whether Augment actually loads such folders is outside augy and untestable here.
- **Authenticated rate limit / Downloads are authenticated** can't be observed directly against GitHub without real credentials. They were checked by observing whether requests go through `gh` and whether downloads carry an `Authorization` header.
- **Install agent picker / Filter by typing** gives a single example (`wind`) that happens to avoid every key with a side effect. As written, the requirement passes even though typing names like `claude` changes the selection.

## Behavior not covered by the spec

- **Rollback breaks the one-copy model.** Rollback of a linked skill first fails (`ERR_FS_CP_NON_DIR_TO_DIR`) and leaves an empty archive folder. A retry then writes real copies over the agent links, and the store stays on the newer version (src/commands/rollback.ts:91-97; src/versions.ts:42-61). Ran.
- **Mixed layouts.** `augy sync` turns store links into per-agent copies and drops `storePath`, which orphans the store folder (src/commands/sync.ts:224-246). Ran. `home pull`, `author new`, and scan imports also write copies.
- **`augy use` touches links augy didn't make.** It removes every symlink in the target agent's folder that isn't in the skillset, including user-made links. It never updates the registry, which still lists the agent (src/commands/use.ts:100-114, 164-173). Ran: after `use focus`, the registry still lists Claude for the three unlinked skills.
- **Filterable picker keys.** Typing `a` toggles all items (clack core and augy both handle it), `h/j/k/l` move the cursor, and Esc cancels the whole command despite the "esc to clear" hint (@clack/core aliases; src/ui/filterable-multiselect.ts:164-221). Ran: typing `/cla` in the agent picker changed the selection.
- **Relative `AUGY_HOME` creates broken links.** Ran: `my-skill -> relhome/store/my-skill`. Store links are absolute, so moving `AUGY_HOME` later breaks every link.
- **Stale `active` flag.** No command sets `active:false`, but uninstall, rollback, diff, and info all filter on it (src/commands/uninstall.ts:29-31; src/commands/rollback.ts:78-80).
- **Detection uses `which` through a shell** (src/agents.ts:261). It can't work on stock Windows, and shell-interpolates the binary name (the names are constants).

## PRD factual errors

`docs/prd/multi-agent-support.md`:

- Environment variables table: "`GITHUB_TOKEN` / `GH_TOKEN` — Not read by augy itself." Wrong: `src/fileDiff.ts:71` reads `GITHUB_TOKEN` and sends it as a Bearer token for `augy diff`.
- GitHub access: "Every GitHub metadata lookup goes through the user's installed and authenticated GitHub CLI (`gh`)." Wrong: `augy diff` fetches commits, trees, and blobs straight from `https://api.github.com` with `fetch` (src/fileDiff.ts:79-129).
- Further Notes: "augy no longer calls GitHub directly; it uses the GitHub CLI." Wrong. `augy diff` calls the REST API directly, and every skill download calls `api.github.com/repos/<o>/<r>/tarball/<ref>` directly through giget (src/github.ts:347-354). The README's `GITHUB_TOKEN` rate-limit row therefore still applies to `augy diff`.
- Canonical store: "Only `augy install` and `augy update` use the store at this commit." Incomplete: `augy use` also links to the store copy (src/commands/use.ts:183-184). And the list of commands that write copies leaves out rollback (src/versions.ts:54-60).

The PRD's predictions that hadn't been run were confirmed by running here: private downloads fail, downloads are unauthenticated, pre-store skills go stale on the second update, rollback fails for linked skills, and scan exits early.
