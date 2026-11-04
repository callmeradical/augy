# Spec Delta

## Purpose

Defines which AI coding agents augy can deploy skills to, where each one keeps its skills, how augy tells which of them are installed on the machine, and how that detection sets the default targets for each command without ever preventing the user from choosing another agent.

## ADDED Requirements

### Requirement: Supported agents and their skills directories
augy SHALL support exactly 33 agents, each with a fixed agent ID and user-level skills directory, and SHALL deploy a skill named `<skill>` to `<skills directory>/<skill>` as a folder containing `SKILL.md`. Sources: US-18, PD: "Supported agents (user-facing contract: agent IDs and skills directories)." The full mapping is in the scenario below.

#### Scenario: Each agent ID deploys to its skills directory
- **WHEN** a skill named `s` is deployed to an agent ID in the table below
- **THEN** the skill appears at that agent's skills directory followed by `/s`

| ID | Name | Skills directory |
|---|---|---|
| `opencode` | OpenCode | `~/.opencode/skills` |
| `claude` | Claude | `~/.claude/skills` |
| `codex` | Codex | `$CODEX_HOME/skills`, else `~/.codex/skills` |
| `cursor` | Cursor | `~/.cursor/skills` |
| `windsurf` | Windsurf | `~/.codeium/windsurf/skills` |
| `copilot` | GitHub Copilot | `~/.github/skills` |
| `gemini` | Gemini CLI | `~/.gemini/skills` |
| `goose` | Goose | `~/.goose/skills` |
| `amp` | Amp | `~/.agents/skills` |
| `roo` | Roo Code | `~/.roo/skills` |
| `cline` | Cline | `~/.cline/skills` |
| `kiro` | Kiro | `~/.kiro/skills` |
| `kimi` | Kimi CLI | `~/.kimi/skills` |
| `kilocode` | Kilo Code | `~/.kilocode/skills` |
| `trae` | Trae | `~/.trae/skills` |
| `trae-cn` | Trae CN | `~/.trae-cn/skills` |
| `augment` | Augment | `~/.augment/rules` |
| `openhands` | OpenHands | `~/.openhands/skills` |
| `replit` | Replit | `~/.replit/skills` |
| `crush` | Crush | `~/.config/crush/skills` |
| `antigravity` | Antigravity | `~/.gemini/antigravity/skills` |
| `droid` | Droid | `~/.factory/skills` |
| `openclaw` | OpenClaw | `~/.openclaw/skills` |
| `codebuddy` | CodeBuddy | `~/.codebuddy/skills` |
| `commandcode` | Command Code | `~/.commandcode/skills` |
| `kode` | Kode | `~/.kode/skills` |
| `mistralvibe` | Mistral Vibe | `~/.vibe/skills` |
| `mux` | Mux | `~/.mux/skills` |
| `openclaude` | OpenClaude IDE | `~/.openclaude/skills` |
| `qoder` | Qoder | `~/.qoder/skills` |
| `qwen` | Qwen Code | `~/.qwen/skills` |
| `neovate` | Neovate | `~/.neovate/skills` |
| `adal` | AdaL | `~/.adal/skills` |

#### Scenario: Unusual locations
- **WHEN** a skill named `s` is deployed to Windsurf, Crush, Amp, and Augment
- **THEN** it appears at `~/.codeium/windsurf/skills/s`, `~/.config/crush/skills/s`, `~/.agents/skills/s`, and `~/.augment/rules/s`

### Requirement: CODEX_HOME sets the Codex skills directory
When `CODEX_HOME` is set, augy SHALL deploy Codex skills to `$CODEX_HOME/skills`; otherwise to `~/.codex/skills`. Sources: US-12, PD: "Codex skills go to `$CODEX_HOME/skills`."

#### Scenario: Non-default Codex home
- **WHEN** `CODEX_HOME` is `/opt/codex` and a skill `s` is installed to Codex
- **THEN** the skill appears at `/opt/codex/skills/s` and not at `~/.codex/skills/s`

#### Scenario: Default Codex home
- **WHEN** `CODEX_HOME` is unset and a skill `s` is installed to Codex
- **THEN** the skill appears at `~/.codex/skills/s`

### Requirement: Agents are detected from real evidence
augy SHALL report an agent as installed when any one of its signals is true: a listed command is on `PATH`, a listed file or directory exists (app bundle, editor-extension storage, agent-written config file), or a listed environment variable is non-empty. The signals per agent are in the scenario below. Sources: US-4, US-5, US-12, US-16, US-17, PD: "Detection rules."

#### Scenario: Any one signal is enough
- **WHEN** exactly one of an agent's signals in the table below is true
- **THEN** augy reports that agent as detected

| ID | Detected when any of these is true |
|---|---|
| `opencode` | `opencode` on PATH; `~/.opencode/config.json` exists |
| `claude` | `claude` on PATH; `~/.claude/settings.json` exists |
| `codex` | `codex` on PATH; `CODEX_HOME` set |
| `cursor` | `cursor` on PATH; Cursor.app in `/Applications` or `~/Applications`; Cursor user global-storage folder exists |
| `windsurf` | `windsurf` on PATH; Windsurf.app; Windsurf user global-storage folder exists |
| `copilot` | `gh` on PATH; `~/.config/github-copilot` exists |
| `gemini` | `gemini` on PATH; `~/.gemini/settings.json` exists |
| `goose` | `goose` on PATH |
| `amp` | `amp` on PATH |
| `roo` | Roo extension storage in VS Code or Cursor |
| `cline` | Cline extension storage in VS Code or Cursor |
| `kiro` | `kiro` on PATH; Kiro.app |
| `kimi` | `kimi` on PATH |
| `kilocode` | Kilo Code extension storage in VS Code |
| `trae` | `trae` on PATH; Trae.app |
| `trae-cn` | Trae CN.app |
| `augment` | Augment extension storage in VS Code |
| `openhands` | `openhands` or `oh` on PATH |
| `replit` | `replit` on PATH |
| `crush` | `crush` on PATH |
| `antigravity` | `~/.gemini/antigravity/bin` exists |
| `droid` | `droid` on PATH |
| `openclaw` | `openclaw` on PATH |
| `codebuddy` | `codebuddy` on PATH |
| `commandcode` | `commandcode` on PATH |
| `kode` | `kode` on PATH |
| `mistralvibe` | `vibe` on PATH |
| `mux` | `mux` on PATH |
| `openclaude` | `openclaude` on PATH |
| `qoder` | `qoder` on PATH |
| `qwen` | `qwen` on PATH |
| `neovate` | `neovate` on PATH |
| `adal` | `adal` on PATH |

#### Scenario: No signal
- **WHEN** none of an agent's signals is true
- **THEN** augy reports that agent as not detected

#### Scenario: Editor-extension agent
- **WHEN** Cline's extension storage exists in Cursor and no `cline` command exists
- **THEN** augy reports Cline as detected

#### Scenario: Desktop-app agent
- **WHEN** `Kiro.app` is in `~/Applications` and no `kiro` command is on `PATH`
- **THEN** augy reports Kiro as detected

#### Scenario: CODEX_HOME is evidence
- **WHEN** `CODEX_HOME` is set to a non-empty value and no `codex` command is on `PATH`
- **THEN** augy reports Codex as detected

### Requirement: A skills folder is never evidence
augy SHALL NOT treat an agent's skills folder existing, with or without skills in it, as a sign that the agent is installed. Sources: US-5, PD: "The agent's skills folder existing is deliberately **not** a signal."

#### Scenario: Folder left from an earlier install
- **WHEN** `~/.goose/skills` exists with skills in it, but no `goose` command is on `PATH`
- **THEN** augy reports Goose as not detected

### Requirement: Install agent picker order and labels
The install agent picker SHALL list detected agents first, pre-selected, each with its skills folder shown, followed by undetected agents, unselected and labeled "not detected". The user SHALL be able to filter the list by typing. Sources: US-6, US-7, US-8, PD: "In the install agent picker."

#### Scenario: Picker on a machine with two agents
- **WHEN** Claude and Codex are detected and the user reaches the install agent picker
- **THEN** Claude and Codex are listed first, pre-selected, with their skills folders shown, and the other 31 agents follow, unselected and labeled "not detected"

#### Scenario: Filter by typing
- **WHEN** the user types `wind` in the agent picker
- **THEN** the list narrows to agents matching `wind`, such as Windsurf

### Requirement: Detection only sets defaults
Detection SHALL only choose default targets. The user SHALL always be able to target an undetected agent by picking it or by naming it with `--agent <ids...>`, which augy SHALL accept on `augy install`, `augy sync`, and `augy home pull` and which overrides detection. Sources: US-7, US-9, PD: "Detection only sets defaults."

#### Scenario: Name an undetected agent
- **WHEN** Kiro is not detected and the user runs `augy install owner/repo --agent kiro`
- **THEN** the skills are installed to `~/.kiro/skills`

#### Scenario: --agent on sync and home pull
- **WHEN** the user passes `--agent claude` to `augy sync` or `augy home pull`
- **THEN** that command targets Claude regardless of which agents are detected

### Requirement: Non-interactive defaults to every detected agent
When no agent is given, `augy install --yes` and `augy sync` SHALL target every detected agent. When no agent is detected, each SHALL fail with a non-zero exit and a message telling the user to pass `--agent`. Sources: US-10, US-11, PD: "`augy install --yes` and `augy sync`: all detected agents. Each fails with a non-zero exit if none are detected."

#### Scenario: CI with agents present
- **WHEN** `augy install owner/repo --yes` runs with no `--agent` on a machine where Claude and Gemini CLI are detected
- **THEN** the skills are installed to Claude and Gemini CLI only

#### Scenario: Headless runner with nothing detected
- **WHEN** `augy install owner/repo --yes` or `augy sync` runs with no `--agent` and no agent is detected
- **THEN** the command exits non-zero, installs nothing, and tells the user to pass `--agent`

### Requirement: Home pull and author new offer only detected agents
Without `--agent`, `augy home pull` SHALL show a picker that lists only detected agents, all pre-selected; undetected agents SHALL be reachable only through `--agent`. `augy author new` SHALL likewise offer only detected agents. Source: PD: "`augy home pull`: a picker that lists **only** detected agents, all pre-selected." and "`augy author new`: also offers only detected agents."

#### Scenario: Home pull picker
- **WHEN** the user runs `augy home pull` without `--agent` and only Claude and OpenCode are detected
- **THEN** the picker lists Claude and OpenCode, both pre-selected, and no other agents

#### Scenario: Author new choices
- **WHEN** the user runs `augy author new` and only Claude is detected
- **THEN** Claude is the only agent offered

### Requirement: augy use picks one agent in a fixed order
`augy use` SHALL target a single agent chosen in this order: `--agent`; then `AUGY_DEFAULT_AGENT`; then the first detected agent in the supported-agents table order. Sources: US-14, PD: "`augy use`: a single agent, chosen in this order."

#### Scenario: Default agent from the environment
- **WHEN** `AUGY_DEFAULT_AGENT=codex` is set and the user runs `augy use <skillset>` without `--agent`
- **THEN** the skillset is applied to Codex

#### Scenario: Flag overrides the environment
- **WHEN** `AUGY_DEFAULT_AGENT=codex` is set and the user runs `augy use <skillset> --agent claude`
- **THEN** the skillset is applied to Claude

#### Scenario: First detected agent
- **WHEN** neither `--agent` nor `AUGY_DEFAULT_AGENT` is given and Claude and Cursor are detected
- **THEN** the skillset is applied to Claude, because it comes before Cursor in the table order

### Requirement: Unknown agent IDs for augy use fail with the valid list
When `augy use` is given an agent ID that isn't supported, whether by `--agent` or by `AUGY_DEFAULT_AGENT`, it SHALL fail and print the list of valid agent IDs. Sources: US-15, PD: "Unknown values fail with the list of valid IDs."

#### Scenario: Typo in the flag
- **WHEN** the user runs `augy use <skillset> --agent claud`
- **THEN** the command fails, changes nothing, and lists the valid agent IDs

#### Scenario: Typo in the environment
- **WHEN** `AUGY_DEFAULT_AGENT=claud` is set and the user runs `augy use <skillset>`
- **THEN** the command fails, changes nothing, and lists the valid agent IDs
