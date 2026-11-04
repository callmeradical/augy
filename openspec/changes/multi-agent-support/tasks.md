# Tasks

Every slice is verified from the outside: point `PATH`, the home directory, `AUGY_HOME`, and environment variables at test fixtures, fake GitHub through a controlled `gh`, run `augy`, then check which agents are reported, where each link points, what content each agent sees, the registry, output, and exit codes.

## 1. Tracer bullet — detect one agent, install through the store, see it in that agent

- [ ] 1.1 Write a failing end-to-end test: with only `claude` on `PATH`, `augy install owner/repo/skills/tdd --yes` targets Claude alone, writes one copy to `store/tdd/`, and makes `~/.claude/skills/tdd` a link that resolves to it (scenarios: Any one signal is enough; CI with agents present; Install to three agents) (validation: Conforms; no automated test at HEAD)
- [x] 1.2 Make it pass and verify the registry entry records the store location and Claude with its skill path (scenario: Registry after install) (validation: Conforms)

## 2. Supported agents and their directories

- [ ] 2.1 Write a failing test: deploying a skill to each of the 33 agent IDs lands it at the directory in the table, including Windsurf, Crush, Amp, and Augment; make it pass (scenarios: Each agent ID deploys to its skills directory; Unusual locations) (validation: Conforms; no automated test at HEAD)
- [x] 2.2 Verify Codex deploys to `$CODEX_HOME/skills` when set and `~/.codex/skills` otherwise (scenarios: Non-default Codex home; Default Codex home) (validation: Conforms)

## 3. Evidence-based detection

- [ ] 3.1 Write failing tests: each agent is detected exactly when one of its listed signals is true and not otherwise; make them pass (scenarios: Any one signal is enough; No signal) (validation: Conforms; no automated test at HEAD)
- [x] 3.2 Verify extension-storage, app-bundle, and `CODEX_HOME` signals each work alone (scenarios: Editor-extension agent; Desktop-app agent; CODEX_HOME is evidence) (validation: Conforms)
- [x] 3.3 Verify a populated skills folder alone never makes an agent detected (scenario: Folder left from an earlier install) (validation: Conforms)

## 4. Pickers and defaults

- [ ] 4.1 Write a failing test: the install agent picker lists detected agents first, pre-selected, with skills folders shown, then the rest labeled "not detected", and filters by typing; make it pass (scenarios: Picker on a machine with two agents; Filter by typing) (validation: Conforms; no automated test at HEAD)
- [x] 4.2 Verify `--agent` targets an undetected agent on install, and overrides detection on sync and home pull (scenarios: Name an undetected agent; --agent on sync and home pull) (validation: Conforms)
- [x] 4.3 Verify `install --yes` and `sync` with nothing detected exit non-zero, install nothing, and tell the user to pass `--agent` (scenario: Headless runner with nothing detected) (validation: Conforms)
- [x] 4.4 Verify `home pull` lists only detected agents, all pre-selected, and `author new` offers only detected agents (scenarios: Home pull picker; Author new choices) (validation: Conforms)
- [x] 4.5 Verify `augy use` resolves `--agent`, then `AUGY_DEFAULT_AGENT`, then the first detected agent in table order, and rejects unknown IDs from either source with the valid list (scenarios: Default agent from the environment; Flag overrides the environment; First detected agent; Typo in the flag; Typo in the environment) (validation: Conforms)

## 5. Store lifecycle

- [ ] 5.1 Write a failing test: after changing the store copy, every agent path shows the change; make it pass (scenario: Change visible through every agent) (validation: Conforms; no automated test at HEAD)
- [x] 5.2 Verify install replaces a stale copy and a broken link at an agent path with a working store link (scenarios: Stale copy; Broken link) (validation: Conforms)
- [x] 5.3 Verify `augy update` leaves both linked agents on the new version, records the new SHA, and archives the old version (scenario: Update a skill deployed to two agents) (validation: Conforms)
- [x] 5.4 Verify `augy uninstall` leaves no agent path or store folder (scenario: Nothing left behind) (validation: Conforms)

## 6. Deployment tracking

- [x] 6.1 Verify `augy list` and `augy info` name the agents each skill is deployed to (scenario: Coverage at a glance) (validation: Conforms)
- [ ] 6.2 Write a failing test: `augy scan` finds a hand-copied extra copy of a tracked skill and records the agent when the user accepts, even when nothing is untracked; make it pass (scenarios: Hand-copied into another agent; Nothing untracked) (validation: Deviates; scan.test.ts covers only findAdditionalAgentInstalls)

## 7. Pre-store skills

- [ ] 7.1 Write a failing test: a registry without store locations stays tracked and working after upgrading, and uninstall removes the per-agent copies; make it pass (scenarios: Old registry after upgrading augy; Uninstall a pre-store skill) (validation: Conforms; no automated test at HEAD)
- [x] 7.2 Verify re-install converts a pre-store skill to a store copy with agent links and records the store location (scenario: Re-install converts to links) (validation: Conforms)
- [ ] 7.3 Verify two successive updates of a pre-store skill leave every agent on the latest version, matching the registry (scenario: Two updates of a pre-store skill) (validation: Deviates)

## 8. Relocated home

- [ ] 8.1 Write a failing test: with `AUGY_HOME` set, the lockfile, store, archives, and `skillsets.json` live under it and `~/.augy` is unchanged; make it pass (scenario: Sandbox home) (validation: Conforms; no automated test at HEAD)
- [ ] 8.2 Verify archive paths recorded in history, and paths printed in messages, are under `$AUGY_HOME` (scenarios: Recorded archive path; Messages name the relocated home) (validation: Deviates)

## 9. GitHub access

- [ ] 9.1 Write a failing test: with only a `gh` login, augy lists a private repo's skills and versions using the signed-in rate limit; make it pass (scenarios: Private repo lookup; Authenticated rate limit) (validation: Deviates: diff bypasses gh; no automated test at HEAD)
- [ ] 9.2 Verify a private-repo skill downloads with `GIGET_AUTH` unset, and that downloads are authenticated (scenarios: Private repo download; Downloads are authenticated) (validation: Deviates)
- [ ] 9.3 Verify a CI runner with only `GH_TOKEN` installs from a private repo (scenario: Token-only CI runner) (validation: Deviates)
- [ ] 9.4 Verify a missing `gh` and a signed-out `gh` produce access errors, not raw `gh` errors or "not found in any tap" (scenarios: GitHub CLI not installed; GitHub CLI signed out) (validation: Deviates)
