# Proposal

## Why

Developers load agent skills from public repos, private company repos, and their own work, and they copy them into each agent's folder by hand. The copies drift apart, nothing records where a skill came from or which version is on disk, and hosted marketplaces require trusting a central service that may be blocked, unable to reach private repos, or down. Teams can't share one skill set, and individuals can't carry their setup between machines or keep work and personal skills apart (PRD: Problem Statement).

## What Changes

- Establish augy as a local, decentralized package manager for agent skills, where GitHub is the only registry and the user decides which repos to trust (US-1, US-10, US-11, US-12).
- Define a skill as a directory containing `SKILL.md`, and a skill's version as an upstream commit SHA (US-2).
- Keep a user-owned, plain-JSON lockfile at `~/.augy/registry.json`, relocatable with `AUGY_HOME` (US-2, US-3).
- Provide package-manager verbs (install, update, diff, roll back, pin, uninstall) and archive previous versions locally so rollback needs no hosted service (US-6, US-7, US-8, US-9).
- Store each skill once and deploy it to every chosen agent, defaulting to the agents detected on the machine (US-4, US-5).
- Prompt when choices are ambiguous, and offer non-interactive flags for CI that fail instead of waiting for input (US-17).
- Never remove skills the user didn't explicitly remove (US-22).
- Offer the feature areas listed in the PRD's feature map from the one `augy` command: taps, adoption, team manifests, home repo, contexts and tags, skillsets, authoring (US-13 to US-16, US-18 to US-21).

This change covers only the cross-cutting rules. Per-feature behavior is specified in the sibling changes: `skill-installation`, `multi-agent-support`, `taps-and-discovery`, `skill-versioning`, `adopting-existing-skills`, `skill-inventory`, `team-manifests`, `home-repo`, `machine-contexts-and-tags`, `skillsets`, `skill-authoring`, and `store-migration` (draft, not shipped).

## Capabilities

### New Capabilities
- `cli-conventions`: Product-wide rules every augy command follows: GitHub-only decentralized sources, what a skill and a version are, the user-owned lockfile and `AUGY_HOME`, local version history, one copy deployed to many agents, interactive-by-default with scriptable non-interactive modes, conservative removal, distribution, and the feature areas reachable from the `augy` command.

### Modified Capabilities
<!-- None: no specs exist yet. -->

## Impact

- User-facing surfaces: the `augy` command and its subcommands; `~/.augy/` (or `$AUGY_HOME`) containing `registry.json`, the skill store, version archives, and skillset definitions; each agent's user-level skills folder.
- Distribution: npm package `@callmeradical/augy`, command `augy`, Node.js 18 or later, MIT license.
- Depends on the user's own GitHub access; no augy account, registry API key, or hosted service.
- Related PRDs: `docs/prd/augy-product-overview.md` (source) and every feature PRD in `docs/prd/`, each of which maps to its own sibling change.
