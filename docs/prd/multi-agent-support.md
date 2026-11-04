# Multi-Agent Support and the Canonical Skill Store

> Status: Shipped (documented from v0.11.0, commit c725774)

## Problem Statement

Many developers use more than one AI coding agent, for example Claude for some work, OpenCode or Codex for other work, and Cursor in the editor. Each agent reads skills from its own folder, in its own location, with its own conventions. Without a tool, keeping the same skill in several agents means:

- knowing where every agent keeps its skills
- copying the same folder into each one
- remembering to update every copy, and noticing when they drift apart

Earlier versions of augy guessed which agents were installed by checking whether their skills folders existed. augy creates those folders itself, so every agent it had ever installed to looked "installed" from then on, and the guess became wrong over time.

## Solution

augy knows the skills folders of 33 agents. It detects which of them are actually installed by looking for real evidence the agent leaves behind: a command on `PATH`, an app bundle, editor-extension storage, an agent-written config file, or an environment variable. It never treats a skills folder as evidence. Detected agents are listed first and pre-selected when the user picks agents, and they're the default targets for non-interactive operations.

When `augy install` deploys a skill, it downloads the skill once into a canonical store at `~/.augy/store/<skill>/` and links every selected agent's skill folder to that one copy. All agents therefore see identical content, and `augy update` refreshes every agent at once by replacing the stored copy.

Environment variables let users relocate augy's state (`AUGY_HOME`), point at a non-default Codex home (`CODEX_HOME`), and set a default agent for skillset switching (`AUGY_DEFAULT_AGENT`). augy reaches GitHub through the user's existing GitHub CLI login.

## User Stories

1. As a developer who uses several agents, I want to install a skill once and have it appear in all of them, so that I don't copy the same folder around.
2. As a developer who uses several agents, I want one copy of each skill on disk that every agent reads, so that agents can't drift onto different versions and no disk space is wasted on duplicates.
3. As a developer who uses several agents, I want one `augy update` to refresh a skill for every agent it's deployed to, so that keeping agents in sync takes no extra work.
4. As a new user, I want augy to detect which of the 33 supported agents are on my machine, so that I don't have to know or type agent IDs.
5. As a developer, I want detection to rely on real evidence (an installed command, an app bundle, editor-extension data, an agent-written config file) and not on skills folders augy itself may have created, so that an agent I uninstalled, or never had, isn't reported as present.
6. As a developer, I want detected agents listed first and pre-selected in the install agent picker, with each one's skills folder shown, so that pressing Enter does the right thing.
7. As a developer, I want undetected agents still listed, labeled "not detected", so that I can install for an agent I'm about to set up or one augy fails to detect.
8. As a developer, I want to filter the agent list by typing, so that I can find one agent among 33 quickly.
9. As a developer, I want to name target agents directly with `--agent <ids...>` on install, sync, and home pull, so that I can skip prompts or override detection.
10. As a CI pipeline, I want non-interactive installs and syncs to default to every detected agent, so that provisioning scripts don't hard-code agent lists.
11. As a CI pipeline on a headless runner where no agent is detected, I want a clear non-zero failure telling me to pass `--agent`, so that the job doesn't silently install nothing.
12. As a Codex user with a non-default Codex home, I want augy to honor `CODEX_HOME` both for where Codex skills go and as evidence that Codex is installed, so that skills land where my Codex actually reads them.
13. As a developer who wants an isolated sandbox or a separate profile, I want `AUGY_HOME` to move augy's whole state (lockfile, store, version archives, skillsets) to another directory, so that I can experiment without touching my real setup.
14. As a developer who switches skillsets often, I want `AUGY_DEFAULT_AGENT` to set which agent `augy use` targets when I don't pass `--agent`, so that I don't type the same flag every time.
15. As a developer, I want an unknown agent ID given to `augy use` (by flag or by `AUGY_DEFAULT_AGENT`) to fail with the list of valid IDs, so that I can fix typos immediately.
16. As a developer using editor-extension agents (Roo Code, Cline, Kilo Code, Augment), I want augy to detect them from the extension's storage folder in VS Code (and in Cursor for Roo and Cline), so that agents without a command-line binary are still found.
17. As a developer using desktop-app agents (Cursor, Windsurf, Kiro, Trae, Trae CN), I want augy to detect them from their app bundle in `/Applications` or `~/Applications`, so that GUI-only installs are found.
18. As a developer, I want augy to know each agent's unusual skills location (for example Windsurf under `~/.codeium/windsurf/skills`, Crush under `~/.config/crush/skills`, Amp under `~/.agents/skills`, Augment under `~/.augment/rules`), so that I don't have to look them up.
19. As a developer, I want `augy list` and `augy info` to show which agents each skill is deployed to, so that I can see coverage at a glance.
20. As a developer, I want `augy uninstall` to remove a skill from every agent it was deployed to and delete the stored copy, so that one command cleans up everywhere.
21. As a developer who copied a tracked skill into another agent by hand, I want `augy scan` to notice the extra copy and offer to record it, so that the registry reflects every agent that has the skill.
22. As a developer with skills installed before the canonical store existed, I want those skills to stay tracked and removable, and to switch them to the linked layout by re-installing, so that upgrading augy doesn't strand my existing setup.
23. As an enterprise developer, I want augy to use my existing GitHub CLI login for every GitHub lookup, so that private and internal repos work without a separate token or account.
24. As a CI pipeline, I want to give GitHub credentials through the environment variables the GitHub CLI already reads (`GH_TOKEN` or `GITHUB_TOKEN`), so that headless runners can authenticate the way they already do for other GitHub tooling.
25. As a developer, I want install to replace any stale copy or broken link at an agent's skill path with a fresh link to the store, so that re-installing repairs a broken deployment.

## Implementation Decisions

**Supported agents (user-facing contract: agent IDs and skills directories)**

| ID | Name | Skills directory | Detected when any of these is true |
|---|---|---|---|
| `opencode` | OpenCode | `~/.opencode/skills` | `opencode` on PATH; `~/.opencode/config.json` exists |
| `claude` | Claude | `~/.claude/skills` | `claude` on PATH; `~/.claude/settings.json` exists |
| `codex` | Codex | `$CODEX_HOME/skills`, else `~/.codex/skills` | `codex` on PATH; `CODEX_HOME` set |
| `cursor` | Cursor | `~/.cursor/skills` | `cursor` on PATH; Cursor.app in `/Applications` or `~/Applications`; Cursor user global-storage folder exists |
| `windsurf` | Windsurf | `~/.codeium/windsurf/skills` | `windsurf` on PATH; Windsurf.app; Windsurf user global-storage folder exists |
| `copilot` | GitHub Copilot | `~/.github/skills` | `gh` on PATH; `~/.config/github-copilot` exists |
| `gemini` | Gemini CLI | `~/.gemini/skills` | `gemini` on PATH; `~/.gemini/settings.json` exists |
| `goose` | Goose | `~/.goose/skills` | `goose` on PATH |
| `amp` | Amp | `~/.agents/skills` | `amp` on PATH |
| `roo` | Roo Code | `~/.roo/skills` | Roo extension storage in VS Code or Cursor |
| `cline` | Cline | `~/.cline/skills` | Cline extension storage in VS Code or Cursor |
| `kiro` | Kiro | `~/.kiro/skills` | `kiro` on PATH; Kiro.app |
| `kimi` | Kimi CLI | `~/.kimi/skills` | `kimi` on PATH |
| `kilocode` | Kilo Code | `~/.kilocode/skills` | Kilo Code extension storage in VS Code |
| `trae` | Trae | `~/.trae/skills` | `trae` on PATH; Trae.app |
| `trae-cn` | Trae CN | `~/.trae-cn/skills` | Trae CN.app |
| `augment` | Augment | `~/.augment/rules` | Augment extension storage in VS Code |
| `openhands` | OpenHands | `~/.openhands/skills` | `openhands` or `oh` on PATH |
| `replit` | Replit | `~/.replit/skills` | `replit` on PATH |
| `crush` | Crush | `~/.config/crush/skills` | `crush` on PATH |
| `antigravity` | Antigravity | `~/.gemini/antigravity/skills` | `~/.gemini/antigravity/bin` exists |
| `droid` | Droid | `~/.factory/skills` | `droid` on PATH |
| `openclaw` | OpenClaw | `~/.openclaw/skills` | `openclaw` on PATH |
| `codebuddy` | CodeBuddy | `~/.codebuddy/skills` | `codebuddy` on PATH |
| `commandcode` | Command Code | `~/.commandcode/skills` | `commandcode` on PATH |
| `kode` | Kode | `~/.kode/skills` | `kode` on PATH |
| `mistralvibe` | Mistral Vibe | `~/.vibe/skills` | `vibe` on PATH |
| `mux` | Mux | `~/.mux/skills` | `mux` on PATH |
| `openclaude` | OpenClaude IDE | `~/.openclaude/skills` | `openclaude` on PATH |
| `qoder` | Qoder | `~/.qoder/skills` | `qoder` on PATH |
| `qwen` | Qwen Code | `~/.qwen/skills` | `qwen` on PATH |
| `neovate` | Neovate | `~/.neovate/skills` | `neovate` on PATH |
| `adal` | AdaL | `~/.adal/skills` | `adal` on PATH |

All 33 agents use a folder containing `SKILL.md` as their skill format. A deployed skill lives at `<skills directory>/<skill name>`.

**Detection rules**

- An agent counts as installed if **any** of its signals is true. The signals are:
  - a command available on `PATH`
  - a file or directory existing (app bundles, editor-extension storage, agent-written config files)
  - a non-empty environment variable
- The agent's skills folder existing is deliberately **not** a signal. According to the commit that introduced the current detection, this "eliminates false positives from dirs augy itself creates".
- In the install agent picker:
  - detected agents are listed first and pre-selected, with their skills folder shown
  - undetected agents follow, unselected and labeled "not detected"
- Detection only sets defaults. It never stops a user from targeting an undetected agent by picking it or naming it with `--agent`.
- Default targets when no agent is given:
  - `augy install --yes` and `augy sync`: all detected agents. Each fails with a non-zero exit if none are detected.
  - `augy home pull`: a picker that lists **only** detected agents, all pre-selected. Undetected agents can be reached only with `--agent`.
  - `augy author new`: also offers only detected agents.
  - `augy use`: a single agent, chosen in this order:
    1. `--agent`
    2. `AUGY_DEFAULT_AGENT`
    3. the first detected agent in the table order above

**Canonical store (one copy on disk)**

- On-disk layout a user sees:
  ```
  ~/.augy/
    registry.json        ← lockfile; each skill records its store location and per-agent paths
    store/<skill>/       ← the single canonical copy of each installed skill
    versions/<skill>/<sha>/  ← archived snapshots (see Skill Versioning PRD)
    skillsets.json       ← skillset definitions (see Skillsets PRD)
  ```
- `augy install` downloads each skill into `store/<skill>/`, replacing any previous store copy. Then each selected agent's `<skills directory>/<skill>` becomes a symbolic link to that store folder, replacing whatever was there before.
- `augy update` archives the current store copy, downloads the new version into the store, and doesn't touch agent paths, because the links already point at the store.
- `augy uninstall` removes every recorded agent path and the store folder.
- `augy use` (skillsets) only creates and removes links. It links to the store copy when one exists, and otherwise to a surviving deployment of the skill in another agent. Real folders are never touched.
- **Only `augy install` and `augy update` use the store at this commit.** The following commands still write independent **copies** into each agent folder and don't record a store location: `augy sync`, `augy home pull`, `augy author new`, and `augy scan` imports.

**Skills installed before the store existed (migration status)**

- There's **no dedicated migration command** at this commit.
- Registries from before the store simply lack a store location for those skills. Those skills stay tracked and keep working as copies.
- Uninstall still removes their per-agent copies.
- The first `augy update` that finds an upstream change for such a skill:
  - archives it from its first agent folder
  - downloads the new version into the store and records the store location
  - still re-downloads fresh **copies** into each agent folder, without converting them to links
- Re-running `augy install` on such a skill replaces each selected agent's copy with a link to the store. This is the only practical way to convert a skill to the linked layout today. It has the re-install side effects described in the Skill Installation PRD.

**Environment variables**

| Variable | Effect |
|---|---|
| `AUGY_HOME` | Moves augy's state root (default `~/.augy`): lockfile, store, version archives, skillsets. |
| `CODEX_HOME` | Codex skills go to `$CODEX_HOME/skills`. Setting it also counts as evidence that Codex is installed. |
| `AUGY_DEFAULT_AGENT` | Default single agent for `augy use`. `--agent` overrides it. Unknown values fail with the list of valid IDs. |
| `GITHUB_TOKEN` / `GH_TOKEN` | Not read by augy itself. They matter because the GitHub CLI, which augy uses for every GitHub lookup, accepts them as credentials. |

**GitHub access**

- Every GitHub metadata lookup goes through the user's installed and authenticated GitHub CLI (`gh`): listing repo contents, resolving branches and tags, and reading version SHAs. Its credentials, rate limits, and host settings apply. This change was made so that "gh handles auth, User-Agent, and token refresh automatically" and requests use the authenticated rate limit.
- Downloading skill files is a separate step that doesn't use the GitHub CLI's credentials. See Further Notes.

## Testing Decisions

Observable behaviors that define correctness:

- Each agent counts as detected exactly when one of its listed signals is true. A skills folder alone never counts.
- The install agent picker lists detected agents first and pre-selected, and undetected agents after them.
- `--agent` overrides detection. A default target of "detected agents" fails with a non-zero exit when nothing is detected.
- After installing a skill to N agents, there's exactly one copy under the store, and all N agent paths resolve to it. Changing the store copy is visible through every agent path.
- After `augy update`, every linked agent sees the new version, and the registry's SHA matches.
- After `augy uninstall`, no agent path or store folder for the skill remains.
- `CODEX_HOME` changes where Codex skills go and makes Codex count as detected. `AUGY_HOME` moves the lockfile, store, archives, and skillsets.
- `augy use` honors `--agent` first, then `AUGY_DEFAULT_AGENT`, then the first detected agent, and rejects unknown IDs with the valid list.

Existing coverage:

- The only multi-agent behavior with automated tests is scan's detection of an already-tracked skill that has turned up in more agents. Its test fixtures were updated when detection signals became required on every agent.
- There are **no automated tests** for:
  - agent detection signals
  - picker ordering and pre-selection
  - the store and linking model
  - `CODEX_HOME` and `AUGY_HOME` path resolution
  - default-agent resolution (`AUGY_DEFAULT_AGENT`)
  - the pre-store upgrade path
- CI runs a typecheck and a build, not the tests.
- Good future tests would control the environment for detection: point `PATH`, the home directory, and environment variables at test fixtures, then check which agents are reported. For the store, they would install into a temporary `AUGY_HOME` and fake agent homes, then check where each link points and what content each agent sees.

## Out of Scope

- Project-level or workspace-level skills folders (for example a repository's own agent config folder). Only each agent's user-level skills folder is managed.
- Converting skills between agent formats. Every agent is assumed to read a folder with a `SKILL.md`.
- Adding custom agents, or changing an agent's skills folder from config. The agent list is fixed in the product, and only Codex's location can be changed (`CODEX_HOME`).
- A dedicated command to migrate pre-store copies into the store.
- Copying instead of linking as a fallback when links can't be created. Install has no copy mode.
- Per-agent versions: every agent that links to a skill sees the same version.
- GitHub Enterprise Server hosts and non-GitHub hosts.

## Further Notes

Known gaps, inconsistencies, and probable bugs observed at this commit:

- **Pre-store skills go stale after their second update (likely bug).**
  - The first `augy update` that finds a change for a skill without a store location records a store location and refreshes the agents' copies.
  - Every later update sees the store location, refreshes only the store, and assumes the agents are links.
  - The agents' real copies therefore stay on the older version while the registry reports the newer SHA.
- **Rollback probably fails for linked skills.** This comes from reading the code, with one Node check; the full flow wasn't run.
  - Rollback archives the current version from the first agent path, which is now a link to the store.
  - A quick check on Node 24 showed this copy step failing ("Cannot overwrite directory with non-directory"). It also leaves an empty archive folder for the current SHA. Later archiving of that SHA would skip it because the folder already exists, so that snapshot stays empty.
  - Even if the copy succeeded, rollback writes real copies over the agent links and leaves the store on the newer version. The agents would then stop following the store.
  - The skill versioning PRD should cover this too.
- **Mixed layouts.** `augy sync`, `augy home pull`, `augy author new`, and `augy scan` imports still create per-agent copies.
  - Running `augy sync` on a skill that was installed with links replaces the links with copies and clears the recorded store location.
  - That leaves an orphaned store folder until uninstall, and the skill loses the one-copy guarantee.
  - The README says skills "stay in sync on every update", but that's only fully true for skills placed by `augy install`.
- **`augy use` can deactivate installed skills without updating the registry.** Every install now creates links, and `augy use` removes every link in the agent's folder that isn't in the target skillset. That includes links the user made themselves for other reasons. The registry still lists the agent for those skills. The Skillsets PRD should cover this too.
- **Scan doesn't see linked skills.** Its folder walk skips symbolic links, so scan can't find skills that were installed as links, whether by augy or by other tools that link skills.
  - Scan also exits early with "All installed skills are already tracked" when nothing is untracked. In that case it never records extra agent installs of tracked skills, even though it found them.
- **Copilot is detected on almost every augy machine.** Copilot counts as detected when `gh` is on `PATH`. augy needs `gh` for all GitHub access, so Copilot will nearly always be detected and pre-selected, and `--yes` will install into `~/.github/skills`. Whether Copilot actually reads skills from `~/.github/skills` hasn't been verified.
- **Augment's target may be wrong.** Augment's target is `~/.augment/rules`, but augy writes skill folders with `SKILL.md`, like every other agent. Whether Augment loads them hasn't been verified.
- **Platform assumptions.**
  - Editor-extension and app-bundle signals use macOS-only locations (`~/Library/Application Support/...`, `/Applications/...app`). On Linux, Roo Code, Cline, Kilo Code, Augment, and Trae CN can't be detected. Cursor, Windsurf, Kiro, and Trae can be detected only by their command.
  - Command detection uses `which`, which doesn't exist on stock Windows.
  - Creating links on Windows usually needs extra privileges, and there's no copy fallback.
  - The README only says "Requires Node.js ≥ 18" and doesn't state which platforms are supported.
- **`AUGY_DEFAULT_AGENT` works only for `augy use`.** The README says it's "used by `augy use` and other commands that accept `--agent`", but install, sync, and home pull ignore it.
- **`AUGY_HOME` isn't honored everywhere.**
  - Several user-facing messages hard-code `~/.augy/...`.
  - Update and rollback write version-history entries whose recorded archive path always starts with `$HOME/.augy/versions`, whatever `AUGY_HOME` is set to.
  - Store links are absolute, so changing `AUGY_HOME` after installing breaks every agent link.
- **GitHub access docs are out of date.**
  - The README and docs site still describe `GITHUB_TOKEN` as raising the GitHub rate limit "from 60 → 5,000 req/hr". augy no longer calls GitHub directly; it uses the GitHub CLI, which reads `GH_TOKEN`/`GITHUB_TOKEN` as credentials.
  - Neither document says the GitHub CLI must be installed and authenticated. If it's missing, users see a raw error from the failed `gh` command, or a misleading "not found in any tap".
- **Downloads may not use the GitHub login.** Skill downloads don't use the GitHub CLI's credentials, and authenticate only if the undocumented `GIGET_AUTH` variable is set. Two consequences seem likely, though neither has been tested live:
  - Private and internal repos are found but then fail to download.
  - Downloads count against the unauthenticated GitHub API rate limit.

  The README says augy "works in enterprise environments, behind proxies, with internal repos". That's only partly true until this is fixed.
- **Leftovers from the old "active" model.** Each registry entry stores an `active` flag per agent, and `list` and `info` can show "(inactive)", but nothing ever sets the flag to false. Skillset switching removes links without changing it either.
- **Messages and help text are stale.**
  - `--agent` help on `install` lists only "opencode, claude, codex".
  - The README's "Version storage" layout doesn't show `store/`.
  - Neither the README nor the docs site explains that agents now link to a single stored copy.
- **WIP, not shipped.** A migration command for pre-store skills exists only as uncommitted work-in-progress. It is captured as a draft in [store-migration.md](store-migration.md).
- Open questions:
  - Should every command that deploys skills (sync, home pull, author, scan import, rollback) use the store and links?
  - Should install fall back to copying where links can't be created?
  - Should `augy use` only remove links that point into augy's store?
