# augy — Product Overview

> Status: Shipped (documented from v0.11.0, commit c725774). Umbrella PRD; each feature area has its own PRD, linked below.

## Problem Statement

AI coding agents (Claude, OpenCode, Codex, Cursor, Copilot, Gemini CLI, and dozens more) can load **skills**: directories with a `SKILL.md` file that the agent reads as context. Developers collect skills from many places: public GitHub repos, their organization's internal repos, and skills they write themselves. Managing them by hand doesn't scale:

- Skills are copied into each agent's skills folder by hand, so a developer who uses three agents keeps three copies that drift apart.
- Nothing records where a skill came from or which version is on disk, so nobody can tell whether it's out of date, what changed upstream, or how to undo a bad change.
- Hosted skill marketplaces fix some of this, but they bring their own costs. You have to trust a central service and its curation team. The service can go down. It often can't reach private repos, and it may not work behind corporate firewalls and proxies.
- Teams can't easily give every member the same set of skills, and individuals can't easily carry their skills (including self-authored ones) to a new machine.
- People who use one laptop for work and another for personal projects want different skills on each machine, without keeping two collections by hand.

## Solution

augy is "Homebrew for AI agent skills": a local, decentralized package manager for agent skills. **GitHub is the registry.** Any GitHub repo, public or private, can be a skill source. augy keeps a plain-JSON lockfile on the user's machine that records every installed skill's source and exact commit. It offers package-manager verbs on top of that: install, update, diff, roll back, pin, uninstall. No account, no API key for a registry, and no SaaS dependency.

Skills are stored once and deployed to every chosen agent, so they stay in sync across agents. On top of that core, augy adds:

- discovery through trusted repos ("taps")
- adoption of skills that were installed by hand
- team manifests for reproducible setups
- a personal "home" repo for backup and moving to a new machine
- context tagging (work / personal / universal)
- named skillsets for switching between working modes
- tools for writing your own skills

## Feature map

| Area | PRD | Core user value |
|---|---|---|
| Installing and removing skills | [skill-installation.md](skill-installation.md) | Get a skill from any GitHub source into your agents in one command |
| Multi-agent support | [multi-agent-support.md](multi-agent-support.md) | One skill, many agents, one copy on disk, auto-detected agents |
| Taps and discovery | [taps-and-discovery.md](taps-and-discovery.md) | Register trusted repos once; search and install by bare name |
| Versioning lifecycle | [skill-versioning.md](skill-versioning.md) | Update, diff, pin, and roll back skills like packages |
| Adopting existing skills | [adopting-existing-skills.md](adopting-existing-skills.md) | Bring hand-installed skills under management without reinstalling |
| Inventory | [skill-inventory.md](skill-inventory.md) | See what's installed, where from, which version, on which agents |
| Team manifests | [team-manifests.md](team-manifests.md) | Commit an `augy.json` so a team can reproduce one skill set |
| Home repo | [home-repo.md](home-repo.md) | Back up and restore your personal skill setup through your own GitHub repo |
| Machine contexts and tags | [machine-contexts-and-tags.md](machine-contexts-and-tags.md) | Keep work and personal skills separate across machines |
| Skillsets | [skillsets.md](skillsets.md) | Switch your active skills between named working modes |
| Skill authoring | [skill-authoring.md](skill-authoring.md) | Scaffold and edit your own skills as first-class managed skills |
| Store migration *(Draft, not shipped)* | [store-migration.md](store-migration.md) | Convert pre-v0.11.0 per-agent copies into store-backed symlinks |

## User Stories

1. As a developer using AI coding agents, I want to install a skill from a GitHub repo with one command, so that I don't have to clone and copy files by hand.
2. As a developer, I want augy to record each skill's source and exact commit, so that I always know what is running in my agents.
3. As a developer, I want my lockfile to be a plain, human-readable JSON file, so that I can inspect, diff, commit, and share it without special tools.
4. As a developer who uses several agents, I want one skill deployed to all of them at once, so that they behave the same way.
5. As a developer, I want augy to detect which agents I have installed, so that I'm not asked to pick from 33 agents I don't use.
6. As a developer, I want to update all my skills when upstream changes, so that I get fixes and improvements without tracking each repo myself.
7. As a cautious developer, I want to review what changed upstream before I upgrade, so that I don't load unreviewed instructions into my agents.
8. As a developer, I want to roll a skill back to a previous version, so that I can recover quickly when an update breaks my workflow.
9. As a developer, I want to pin a skill, so that it stays fixed at a known-good version.
10. As an enterprise developer behind a firewall, I want a skill manager that depends only on GitHub and my own machine, so that I can use it where hosted marketplaces are blocked.
11. As a developer at an organization with private skill repos, I want private repos to work the same way as public ones, so that internal skills get the same lifecycle management.
12. As a security-conscious user, I want to decide which repos I trust, so that no third-party curation team decides what can run in my agents.
13. As a developer, I want to register trusted repos once and install skills by short name, so that installing feels as easy as `brew install`.
14. As a developer with skills I installed by hand, I want augy to find and adopt them, so that I can manage them without reinstalling.
15. As a team lead, I want to publish a manifest of our team's skills, so that every teammate can reproduce the same setup.
16. As a new teammate, I want to sync my machine from the team manifest, so that I'm productive on day one.
17. As a CI pipeline, I want non-interactive install, update, and sync modes, so that I can provision agent environments automatically.
18. As a developer with several machines, I want to back up my skill setup to my own GitHub repo, so that a new machine can be restored in minutes.
19. As a consultant with separate work and personal machines, I want to tag skills by context and mark each machine's context, so that each machine gets only the skills that belong on it.
20. As a developer who switches between kinds of work, I want named skillsets I can activate, so that my agents only load skills relevant to the task at hand.
21. As a skill author, I want to scaffold and edit my own skills with augy, so that self-authored skills are managed and backed up like installed ones.
22. As a developer, I want augy never to auto-remove skills I didn't explicitly remove, so that a sync or switch can't silently delete my work.

## Implementation Decisions

Product-level decisions that apply across every feature area:

- **Decentralized by design.** No central index, account, or hosted service. GitHub repos are the only skill sources, and the user chooses which ones to trust.
- **A skill is a directory with a `SKILL.md`.** No other packaging format is required. Any GitHub repo whose directories contain `SKILL.md` is a valid source.
- **A version is a commit SHA.** Version identity, drift detection, diffs, and rollbacks are all expressed in upstream commit SHAs.
- **The lockfile is user-owned.** The registry lives at `~/.augy/registry.json` as plain JSON. `AUGY_HOME` relocates augy's whole home directory.
- **Local version history.** Before an upgrade overwrites a skill, augy archives the previous version under `~/.augy/versions/<skill>/<sha>/`, so rollbacks need no network access to a hosted service.
- **One copy, many agents.** Skills are stored once and linked into each target agent, so an update reaches every agent at the same time.
- **Interactive by default, scriptable on demand.** Commands prompt with pickers when choices are ambiguous. CI-oriented flags (`--yes`, `--all`, `--dry-run`) give non-interactive behavior.
- **Conservative about removal.** Syncing from manifests and switching skillsets never uninstalls skills. Deleting a skillset never deletes skill files.
- **Distribution.** Published to npm as `@callmeradical/augy`; the CLI command is `augy`. Requires Node.js 18 or later. Licensed MIT.

## Testing Decisions

- Correctness is defined by observable outcomes: what is on disk in each agent's skills folder, what the lockfile records, and what the CLI prints and returns. Tests should assert on those, not on internal structure.
- Each feature PRD lists its own acceptance criteria and notes which ones automated tests cover today.
- Across the product, automated tests cover the registry, skillsets, GitHub source parsing, git helpers, authoring, contexts, tags, home repo, and scan. The core install, update, diff, rollback, sync, and use flows rely mostly on manual verification. See each feature PRD for details.

## Out of Scope

- A hosted registry, marketplace, ratings, or curation service.
- User accounts or authentication beyond the user's own GitHub access.
- Skill sources other than GitHub (for example GitLab, Bitbucket, or arbitrary git hosts). Inferred from current behavior.
- Running, validating, or sandboxing skill content. augy manages files and does not judge what a skill instructs an agent to do.
- Managing agents themselves (installing or configuring the agent tools).

## Further Notes

- **Working-tree state at documentation time.** The repo had an unresolved `git stash pop` conflict. The stash holds older v0.10.0 work-in-progress: a separate canonical-store design under `~/.augy/skills/` plus a standalone `augy migrate` command. The committed design superseded it and uses `~/.augy/store/`. The shipped PRDs document committed behavior only. The one stash item that never shipped in any form, the untracked `augy migrate` command, is captured as a draft in [store-migration.md](store-migration.md).
- The README doesn't cover several shipped command groups (`home`, `context`, `tag`, `author`). The per-feature PRDs document them; consider bringing the README up to date.
- Each feature PRD's **Further Notes** section lists gaps and inconsistencies found in that area.
