# Design

## Context

This change is the umbrella for augy, derived from `docs/prd/augy-product-overview.md` (documented from v0.11.0, commit c725774). See proposal.md for motivation. It states only the rules that hold across every feature area. Each feature area has its own PRD and its own sibling change, which carries that area's detailed requirements:

| Area | Sibling change |
|---|---|
| Installing and removing skills | `skill-installation` |
| Multi-agent support, store, GitHub access | `multi-agent-support` |
| Taps and discovery | `taps-and-discovery` |
| Versioning lifecycle | `skill-versioning` |
| Adopting existing skills | `adopting-existing-skills` |
| Inventory | `skill-inventory` |
| Team manifests | `team-manifests` |
| Home repo | `home-repo` |
| Machine contexts and tags | `machine-contexts-and-tags` |
| Skillsets | `skillsets` |
| Skill authoring | `skill-authoring` |
| Store migration (draft, not shipped) | `store-migration` |

## Goals / Non-Goals

**Goals:**
- One set of product rules that every sibling change can rely on without restating it.
- Every overview user story traceable to a requirement here, with per-feature detail delegated to a sibling change.

**Non-Goals (from the PRD's Out of Scope):**
- A hosted registry, marketplace, ratings, or curation service.
- User accounts or authentication beyond the user's own GitHub access.
- Skill sources other than GitHub (GitLab, Bitbucket, arbitrary git hosts).
- Running, validating, or sandboxing skill content. augy manages files and does not judge what a skill tells an agent to do.
- Installing or configuring the agent tools themselves.

## Decisions

- **Decentralized by design.** No central index, account, or hosted service; GitHub repos are the only sources and the user picks which to trust. Rationale (PRD): hosted marketplaces force trust in a central curation team, can go down, often can't reach private repos, and may be blocked behind corporate firewalls and proxies.
- **A skill is a directory with `SKILL.md`.** No other packaging format. Rationale (PRD): any GitHub repo with such directories becomes a valid source with no publishing step.
- **A version is a commit SHA.** Version identity, drift, diffs, and rollbacks are all expressed in upstream commit SHAs. Rationale (PRD): users need to know exactly what is running in their agents (US-2).
- **The lockfile is user-owned plain JSON** at `~/.augy/registry.json`, with `AUGY_HOME` relocating the whole home. Rationale (PRD): users can inspect, diff, commit, and share it without special tools (US-3).
- **Local version history** under `~/.augy/versions/<skill>/<sha>/`. Rationale (PRD): rollbacks need no hosted service.
- **One copy, many agents.** Rationale (PRD): an update reaches every agent at the same time and agents can't drift apart.
- **Interactive by default, scriptable on demand** (`--yes`, `--all`, `--dry-run`). Rationale (PRD): pickers make ambiguous choices safe for people, and CI must run unattended (US-17).
- **Conservative about removal.** Sync and skillset switching never uninstall, and deleting a skillset never deletes files. Rationale (PRD): a sync or switch must not silently delete the user's work (US-22).
- **Distribution** as `@callmeradical/augy` on npm, command `augy`, Node.js 18+, MIT.
- **Correctness is observable** (PRD Testing Decisions): verification checks what is on disk in each agent's skills folder, what the lockfile records, and what the CLI prints and returns, not internal structure.

## Risks / Trade-offs

- [Stash conflict in the working tree] The PRD notes an unresolved `git stash pop` holding superseded v0.10.0 work (a `~/.augy/skills/` store and an `augy migrate` command). The committed design uses `~/.augy/store/`. → These specs describe committed behavior only; the unshipped migration command is the separate draft change `store-migration`.
- [Documentation lag] The PRD notes the README omits the `home`, `context`, `tag`, and `author` command groups. → Out of scope for specs; the sibling changes document those areas.
- [Version identity] The overview decides that a version is a commit SHA, but the Skill Installation PRD's Further Notes report that some installs record a git tree SHA. → The requirement here follows the product decision; `skill-installation` and `skill-versioning` deal with the consequences.
- [Feature gaps] Each feature PRD's Further Notes lists that area's gaps. → Those are handled in the sibling changes, not here.

## Migration Plan

N/A — archived.

## Open Questions

- The PRD names `--yes`, `--all`, and `--dry-run` as the CI flags but doesn't say which commands carry which flag. The requirement here commits only to install, update, and sync (US-17). Per-command flags are left to the sibling changes.
- The PRD doesn't say whether non-interactive behavior should also apply when stdin isn't a terminal and no flag was passed. The spec requires it only when a non-interactive flag is given.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | GitHub is the only skill registry; Package-manager lifecycle verbs |
| US-2 | A version is an upstream commit SHA; The lockfile is a user-owned plain JSON file |
| US-3 | The lockfile is a user-owned plain JSON file |
| US-4 | One copy deployed to many agents |
| US-5 | Detected agents are the default targets |
| US-6 | Package-manager lifecycle verbs |
| US-7 | Package-manager lifecycle verbs (Review before upgrading) |
| US-8 | Previous versions are archived locally before an upgrade; Package-manager lifecycle verbs |
| US-9 | Package-manager lifecycle verbs (Pinned skill stays fixed) |
| US-10 | GitHub is the only skill registry |
| US-11 | GitHub is the only skill registry (Private repo treated like a public one) |
| US-12 | The user decides which sources are trusted |
| US-13 | The user decides which sources are trusted; Feature areas (Taps and short names) |
| US-14 | Feature areas (Adopt hand-installed skills) |
| US-15, US-16 | Feature areas (Team manifest) |
| US-17 | Scriptable non-interactive modes |
| US-18 | Feature areas (Home repo backup and restore) |
| US-19 | Feature areas (Machine contexts and tags) |
| US-20 | Feature areas (Skillsets) |
| US-21 | Feature areas (Authoring) |
| US-22 | Never remove skills the user didn't remove |
| PD Decentralized by design | GitHub is the only skill registry; The user decides which sources are trusted |
| PD A skill is a directory with `SKILL.md` | A skill is a directory containing SKILL.md |
| PD A version is a commit SHA | A version is an upstream commit SHA |
| PD The lockfile is user-owned / `AUGY_HOME` | The lockfile is a user-owned plain JSON file; AUGY_HOME relocates augy's home directory |
| PD Local version history | Previous versions are archived locally before an upgrade |
| PD One copy, many agents | One copy deployed to many agents |
| PD Interactive by default, scriptable on demand | Interactive by default; Scriptable non-interactive modes |
| PD Conservative about removal | Never remove skills the user didn't remove |
| PD Distribution | Distribution |
