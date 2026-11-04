# Design

## Context

Derived from `docs/prd/multi-agent-support.md` (documented from v0.11.0, commit c725774). See proposal.md for motivation. The specs cover three capabilities: `agent-detection` (supported agents, evidence-based detection, default targets), `skill-store` (one stored copy linked into each agent, `AUGY_HOME`), and `github-access` (the GitHub CLI login). Install and uninstall flows are in `skill-installation`; update, rollback, and archives in `skill-versioning`; `augy use` linking in `skillsets`; the dedicated migration of pre-store copies in `store-migration` (draft, not shipped).

## Goals / Non-Goals

**Goals:**
- Detection that reflects what is actually installed, and defaults that make pressing Enter, or running unattended, do the right thing.
- One copy per skill on disk, visible through every agent it is deployed to.
- GitHub access that works for private repos and CI with the credentials the user already has.

**Non-Goals (from the PRD's Out of Scope):**
- Project-level or workspace-level skills folders; only each agent's user-level folder is managed.
- Converting skills between agent formats; every agent is assumed to read a folder with `SKILL.md`.
- Adding custom agents or changing an agent's skills folder from config; only Codex's location moves (`CODEX_HOME`).
- A dedicated command to migrate pre-store copies into the store (see `store-migration`).
- Copying instead of linking when links can't be created; install has no copy mode.
- Per-agent versions; every linked agent sees the same version.
- GitHub Enterprise Server hosts and non-GitHub hosts.

## Decisions

- **A fixed table of 33 agents is the user-facing contract** (IDs and skills directories). Rationale (PRD): users shouldn't have to look up each agent's location (US-18). Custom agents are out of scope.
- **Detection is any-of real-evidence signals** (command on `PATH`, file or directory, non-empty environment variable), **and a skills folder is never a signal.** Rationale (PRD): augy creates skills folders itself, so treating them as evidence made every agent ever installed to look installed. The commit that introduced the current detection says it "eliminates false positives from dirs augy itself creates".
- **Detection only sets defaults.** Undetected agents stay listed ("not detected") and reachable with `--agent`. Rationale (PRD): users may be setting up an agent or augy may fail to detect one (US-7).
- **Per-command defaults.** `install --yes` and `sync` use all detected agents and fail when there are none; `home pull` and `author new` offer only detected agents; `augy use` resolves `--agent`, then `AUGY_DEFAULT_AGENT`, then the first detected agent in table order. Rationale (PRD): CI shouldn't hard-code agent lists (US-10) or silently install nothing (US-11), and frequent skillset switchers shouldn't retype the flag (US-14).
- **Canonical store with links.** Install writes `store/<skill>/` and links each agent path to it; update replaces only the store copy; uninstall removes agent paths and the store folder. Rationale (PRD): agents can't drift, no duplicate disk use, and one update reaches every agent (US-1 to US-3).
- **The store guarantee covers `augy install` and `augy update` only.** The PRD records that `augy sync`, `augy home pull`, `augy author new`, and `augy scan` imports still write independent copies and don't record a store location. The specs don't require those commands to use the store; whether they should is an Open Question.
- **`augy use` only creates and removes links.** It links to the store copy when one exists, otherwise to a surviving deployment of the skill in another agent, and never touches real folders (PRD decision). Specified in `skillsets`; recorded here as a constraint on the store.
- **Pre-store skills keep working as copies, and re-install is the conversion path** until `store-migration` ships. Rationale (PRD): upgrading augy must not strand an existing setup (US-22).
- **All GitHub access goes through `gh`.** Rationale (PRD): "gh handles auth, User-Agent, and token refresh automatically", and requests use the authenticated rate limit. augy doesn't read `GH_TOKEN`/`GITHUB_TOKEN` itself; `gh` does.
- **`AUGY_HOME` moves all augy state; `CODEX_HOME` moves Codex's skills folder and counts as Codex evidence; `AUGY_DEFAULT_AGENT` applies to `augy use` only.** Rationale (PRD): sandboxes and separate profiles (US-13), non-default Codex homes (US-12), and frequent skillset switching (US-14).

## Risks / Trade-offs

All items below come from the PRD's Further Notes.

- [Pre-store skills go stale] After the second update, pre-store skills' agent copies stay old while the registry reports the newer SHA. → Spec: "Updates keep reaching pre-store skills' agents".
- [Rollback with links] Rollback probably fails for linked skills: archiving from a link path failed on Node 24 and left an empty archive folder, and a successful rollback would write copies over the links while the store stays on the newer version. → Belongs to `skill-versioning`.
- [Mixed layouts] `sync`, `home pull`, `author new`, and `scan` imports create copies. Syncing a linked skill replaces its links with copies and clears its store location, orphaning the store folder and losing the one-copy guarantee. The README's "stay in sync on every update" is fully true only for skills placed by install. → Open Question.
- [`augy use` removes foreign links] `augy use` removes every link in the agent's folder that isn't in the target skillset, including links the user made, and leaves the registry listing that agent. → Belongs to `skillsets`; Open Question.
- [Scan and links] Scan's folder walk skips links, so it can't find skills installed as links by augy or other tools; and it exits early when nothing is untracked. → Early exit is specified against; link-blind discovery belongs to `adopting-existing-skills`.
- [Copilot nearly always detected] Copilot's signal includes `gh` on `PATH`, which augy requires, so Copilot is nearly always detected and `--yes` installs into `~/.github/skills`. Whether Copilot reads skills there is unverified. → Specified as the PRD's table states; Open Question.
- [Augment target] Augment's target is `~/.augment/rules`, but augy writes `SKILL.md` folders there; whether Augment loads them is unverified. → Open Question.
- [Platforms] App-bundle and extension signals use macOS-only locations, so several agents can't be detected on Linux; command detection uses `which`, which stock Windows lacks; links on Windows usually need extra privileges and there's no copy fallback; the README doesn't state supported platforms. → Open Question.
- [`AUGY_DEFAULT_AGENT` scope] The README says it applies to other commands that accept `--agent`, but install, sync, and home pull ignore it. → Spec follows the PRD decision (use only).
- [`AUGY_HOME` gaps] Several messages hard-code `~/.augy/...`; recorded archive paths always start with `$HOME/.augy/versions`; store links are absolute, so changing `AUGY_HOME` after installing breaks every agent link. → Messages and recorded paths are specified against; the absolute-link breakage is an Open Question.
- [GitHub docs] The README and docs site still describe `GITHUB_TOKEN` as raising the direct API rate limit, and neither says `gh` must be installed and authenticated; without it users see a raw `gh` error or "not found in any tap". → Error reporting is specified; the docs are not.
- [Downloads skip the login] Downloads authenticate only through `GIGET_AUTH`, so private repos probably fail to download and downloads use the unauthenticated rate limit. The README's enterprise claim is only partly true until fixed. → Spec: "Skill downloads use the same GitHub login".
- [Leftover `active` flag] Registry entries hold a per-agent `active` flag that nothing sets to false, so "(inactive)" never appears. → Not specified.
- [Stale help] `--agent` help on install lists three agents; the README's storage layout omits `store/`; no doc explains linking. → Documentation, not specified.

## Migration Plan

N/A — archived. Converting pre-store copies is the subject of the sibling draft change `store-migration`.

## Open Questions

- From the PRD: should every command that deploys skills (sync, home pull, author, scan import, rollback) use the store and links?
- From the PRD: should install fall back to copying where links can't be created?
- From the PRD: should `augy use` only remove links that point into augy's store?
- Should Copilot's detection rely on `gh` on `PATH`, given augy itself requires `gh`? And does Copilot read `~/.github/skills`?
- Does Augment load `SKILL.md` folders from `~/.augment/rules`?
- Which platforms are supported? Linux detection of extension and app-bundle agents, and Windows command detection and links, are unresolved.
- Should store links survive a change of `AUGY_HOME` after install (for example, by being relative or repaired), or is changing `AUGY_HOME` afterward unsupported?
- Should `AUGY_DEFAULT_AGENT` extend to install, sync, and home pull, as the README claims? The specs follow the PRD decision (use only).
- The PRD doesn't say what the extra-copy offer from `augy scan` looks like when run non-interactively; the spec requires only that it be offered and recorded on acceptance.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | skill-store: One stored copy linked into every target agent |
| US-2 | skill-store: One stored copy linked into every target agent |
| US-3 | skill-store: Update refreshes every agent at once; Updates keep reaching pre-store skills' agents |
| US-4 | agent-detection: Agents are detected from real evidence |
| US-5 | agent-detection: Agents are detected from real evidence; A skills folder is never evidence |
| US-6 | agent-detection: Install agent picker order and labels |
| US-7 | agent-detection: Install agent picker order and labels; Detection only sets defaults |
| US-8 | agent-detection: Install agent picker order and labels (Filter by typing) |
| US-9 | agent-detection: Detection only sets defaults |
| US-10 | agent-detection: Non-interactive defaults to every detected agent |
| US-11 | agent-detection: Non-interactive defaults to every detected agent (Headless runner) |
| US-12 | agent-detection: CODEX_HOME sets the Codex skills directory; Agents are detected from real evidence (CODEX_HOME is evidence) |
| US-13 | skill-store: AUGY_HOME relocates all of augy's state |
| US-14 | agent-detection: augy use picks one agent in a fixed order |
| US-15 | agent-detection: Unknown agent IDs for augy use fail with the valid list |
| US-16 | agent-detection: Agents are detected from real evidence (Editor-extension agent) |
| US-17 | agent-detection: Agents are detected from real evidence (Desktop-app agent) |
| US-18 | agent-detection: Supported agents and their skills directories |
| US-19 | skill-store: The registry records each skill's store location and agents |
| US-20 | skill-store: Uninstall removes every deployment and the store copy |
| US-21 | skill-store: Scan records extra copies of tracked skills |
| US-22 | skill-store: Skills installed before the store stay tracked and removable; Updates keep reaching pre-store skills' agents |
| US-23 | github-access: GitHub lookups use the GitHub CLI login; Skill downloads use the same GitHub login; GitHub access failures are reported as access failures |
| US-24 | github-access: CI credentials through GH_TOKEN or GITHUB_TOKEN |
| US-25 | skill-store: Install repairs whatever is at the agent path |
| PD Supported agents table | agent-detection: Supported agents and their skills directories; Agents are detected from real evidence |
| PD Detection rules (any signal; skills folder not a signal) | agent-detection: Agents are detected from real evidence; A skills folder is never evidence |
| PD Install agent picker | agent-detection: Install agent picker order and labels |
| PD Detection only sets defaults | agent-detection: Detection only sets defaults |
| PD Default targets (install --yes, sync) | agent-detection: Non-interactive defaults to every detected agent |
| PD Default targets (home pull, author new) | agent-detection: Home pull and author new offer only detected agents |
| PD Default targets (augy use) | agent-detection: augy use picks one agent in a fixed order |
| PD Canonical store layout; install | skill-store: One stored copy linked into every target agent; Install repairs whatever is at the agent path; The registry records each skill's store location and agents |
| PD Update via store | skill-store: Update refreshes every agent at once |
| PD Uninstall via store | skill-store: Uninstall removes every deployment and the store copy |
| PD `augy use` only links | Design constraint (Decisions); specified in `skillsets` |
| PD Only install and update use the store | Design constraint (Decisions); Open Questions |
| PD Pre-store migration status | skill-store: Skills installed before the store stay tracked and removable |
| PD `AUGY_HOME` | skill-store: AUGY_HOME relocates all of augy's state |
| PD `CODEX_HOME` | agent-detection: CODEX_HOME sets the Codex skills directory; Agents are detected from real evidence |
| PD `AUGY_DEFAULT_AGENT` | agent-detection: augy use picks one agent in a fixed order; Unknown agent IDs for augy use fail with the valid list |
| PD `GITHUB_TOKEN` / `GH_TOKEN` | github-access: CI credentials through GH_TOKEN or GITHUB_TOKEN |
| PD GitHub access via `gh` | github-access: GitHub lookups use the GitHub CLI login |
| PD Downloads are a separate step | github-access: Skill downloads use the same GitHub login (intended behavior per Further Notes) |
