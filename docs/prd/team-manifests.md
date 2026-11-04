# Team Manifests

> Status: Shipped (documented from v0.11.0, commit c725774). Covers `augy bundle` and `augy sync`, and the `augy.json` manifest format.

## Problem Statement

A team that relies on AI coding agents wants everyone working from the same skills: the same TDD workflow, the same commit conventions, the same internal tooling skills. Without a shared definition, each developer installs skills by hand from memory or from a wiki page. The sets drift apart, new teammates spend their first day hunting for skill sources, and nobody can say for sure which skills "the team" uses.

The lockfile on one machine doesn't solve this. It holds machine-specific paths and personal settings, and no command reads another machine's lockfile.

## Solution

A small, committable manifest file, `augy.json`, lists skills by name and GitHub source.

- **`augy bundle`** writes `augy.json` from the skills in the local registry. By default it includes only skills with a known source. `--include-untracked` adds sourceless skills with an empty source as placeholders. `--output` writes the file somewhere other than `./augy.json`.
- **`augy sync [path]`** reads a manifest (default `./augy.json`) and compares each entry with the local registry and upstream GitHub. It prints a plan with four groups: Install, Upgrade, Up to date, and Skipped (no source). After confirmation it installs missing skills and upgrades out-of-date ones. Skills that are installed locally but missing from the manifest are left alone; nothing is removed automatically.
  - `--dry-run` shows the plan without changing anything.
  - `--agent` limits which agents receive skills.
  - `--yes` skips the confirmation prompt for CI and automation.

The workflow: a team lead runs `augy bundle` and commits `augy.json` to a shared repo. Teammates run `augy sync` to get the same skills. The same manifest format is used by the personal home repo feature (`augy home push` / `augy home pull`), which runs sync internally.

## User Stories

1. As a team lead, I want to generate a manifest of my installed skills with one command, so that I can publish the team's standard skill set without writing it by hand.
2. As a team lead, I want the manifest to be a small, readable JSON file mapping skill names to GitHub sources, so that it can be reviewed in pull requests like any other config.
3. As a team lead, I want skills with no known source left out of the bundle by default, so that the published manifest only contains skills teammates can actually install.
4. As a team lead, I want to be told how many sourceless skills were left out and how to include them, so that I know the manifest isn't my complete setup.
5. As a team lead, I want `--include-untracked` to add sourceless skills with an empty source, so that teammates can see them and someone can fill in the source later.
6. As a team lead, I want `--output <path>` to write the manifest anywhere (for example, into the team's repo checkout), so that I don't have to move the file by hand.
7. As a new teammate, I want to run `augy sync` in the team repo and get every skill in the manifest, so that I'm set up in minutes instead of hunting for sources.
8. As a new teammate, I want sync to install into every agent detected on my machine by default, so that all the tools I use get the team's skills.
9. As a developer who only wants the team's skills in some agents, I want `--agent` to choose the target agents, so that other agents are left alone.
10. As a developer, I want `augy sync --dry-run` to show what would be installed, upgraded, and skipped without changing anything, so that I can check what a manifest will do before running it.
11. As a developer, I want the plan grouped into Install, Upgrade (old SHA → new SHA), Up to date, and Skipped, so that I understand each change.
12. As a developer, I want to confirm before sync changes anything, and see which agents it will write to, so that I'm not surprised by changes to my agents.
13. As a CI pipeline or nightly job, I want `augy sync --yes` to apply the plan without prompting, so that skill sets can be kept current without anyone at the keyboard.
14. As a developer with personal skills that aren't in the team manifest, I want sync to leave them alone, so that adopting the team set never deletes my own skills.
15. As a developer who already has some of the team's skills, I want sync to upgrade only the ones whose upstream has changed, so that sync is safe to re-run.
16. As a developer, I want manifest entries with an empty source skipped with a visible warning, so that placeholder entries don't break the sync.
17. As a developer, I want sync to fail clearly when the manifest is missing or isn't valid JSON, and suggest `augy bundle`, so that I know what went wrong.
18. As a developer on a machine with no detected agents, I want sync to stop with a message telling me to install an agent or pass `--agent`, so that it doesn't do nothing silently.
19. As a developer, I want a skill that fails to install to be reported without stopping the others, so that one broken source doesn't block the rest of the team's skills.
20. As a developer whose sync was interrupted, I want each skill saved to my registry as soon as it's installed, so that re-running sync picks up where it stopped.
21. As a team that keeps skills in private GitHub repos, I want manifest sources to resolve using each developer's own GitHub CLI login, so that internal skills can be shared without a central service or shared token.
22. As a team that wants to follow a release line, I want manifest sources to accept GitHub tree URLs with a branch or tag, so that teammates follow that ref instead of the default branch.
23. As a developer who keeps several manifests (for example, one per project), I want `augy sync <path>` to read any manifest file, so that I'm not limited to the one in the current folder.
24. As a developer, I want a skill I had pinned locally to stay marked as pinned after sync upgrades it, so that later `augy update` runs still skip it.
25. As a developer, I want my existing version history for a skill kept when sync upgrades it, so that earlier archived versions can still be rolled back to.

## Implementation Decisions

- **Manifest format (`augy.json`), version 1:**

  ```json
  {
    "version": 1,
    "skills": { "<skill-name>": "<source>" },
    "contexts": { "<skill-name>": ["work", "universal"] }
  }
  ```

  - `skills` maps a skill name to a source string: a GitHub URL, a tree or blob URL, or `owner/repo[/path]` shorthand. An empty string means the source is unknown.
  - `contexts` is optional. `augy bundle` never writes it; it's written by `augy home push` and read by `augy home pull`. `augy sync` ignores it.
  - The manifest key is the skill's install name in each agent's skills folder.
- **Sources are copied as-is.** Bundle writes each skill's source exactly as it appears in the registry, whether that's a full URL or shorthand.
- **The manifest lists sources, not versions.** It has no SHA. Sync always resolves each entry to the current upstream version (of the default branch, or the ref in the source URL). Two teammates who sync at different times can end up with different versions.
- **Untracked skills are left out by default.** A skill with no source is excluded unless `--include-untracked` is passed, in which case it's written with an empty source. A skill that has a source but no resolved SHA (`unversioned`) is always included.
- **Bundle always overwrites the output file.** It doesn't prompt or merge with an existing manifest. If the registry is empty, it writes nothing.
- **Bundle's default output is `./augy.json` in the current folder.**
- **Sync's default manifest is `./augy.json`.** A missing file, invalid JSON, or no target agents ends sync with a non-zero exit. An empty `skills` map ends with "nothing to sync".
- **Target agents:**
  - With `--agent`, sync targets exactly the listed agent IDs. Unknown IDs are ignored.
  - Without it, sync targets every agent detected on the machine, with no picker.
- **How sync decides what to do with each entry:**
  - Empty source: skipped.
  - Not installed locally: install.
  - Installed, but the recorded SHA differs from upstream: upgrade.
  - Otherwise: up to date.
  - Entries whose upstream can't be resolved are also listed under "Skipped (no source)".
- **Nothing is ever removed.** Skills in the registry that aren't in the manifest are never uninstalled or changed.
- **Pins are kept but not honored.** A pinned skill whose upstream has changed is still upgraded by sync, and it stays marked as pinned afterwards.
- **What an upgrade keeps.** The original install date, pin flag, and existing version history are kept. The deployment list is replaced with the agents targeted by this run.
- **Confirmation.** Sync asks once before applying the whole plan, unless `--yes` is passed. `--dry-run` stops after printing the plan, even if `--yes` is also given.
- **Error handling.** Each skill is installed independently. A failure is shown on that skill's line and the rest continue. The registry is saved after each successful skill.
- **Sync copies files into each agent.** It downloads a separate copy of the skill into every target agent's skills folder, replacing whatever is there. It doesn't use the canonical store or symlinks.
- **GitHub access goes through the GitHub CLI.** Sync requires `gh` to be installed and logged in.

## Testing Decisions

Observable behaviors that define correctness:

- `augy bundle` with sourced and sourceless skills writes `{"version": 1, "skills": {...}}` with only the sourced skills, and reports how many were left out. With `--include-untracked` the sourceless skills appear with `""`.
- `augy bundle --output <path>` writes to that path. With an empty registry, no file is written.
- `augy sync` with no manifest at the given or default path exits non-zero and suggests `augy bundle`. Invalid JSON exits non-zero.
- With a manifest containing one not-installed skill, one installed but out-of-date skill, one up-to-date skill, and one empty-source skill, `--dry-run` prints one entry in each of the four groups and changes nothing on disk or in the registry.
- Without `--yes`, sync prompts before applying. With `--yes`, it applies without prompting.
- After sync, each installed or upgraded skill exists in every target agent's skills folder and in the registry with the manifest's source and a SHA.
- A skill installed locally but absent from the manifest is unchanged after sync.
- Re-running sync immediately after a successful sync should report everything as up to date. Today it probably doesn't; see Further Notes.
- With `--agent`, only the named agents receive files.

Current automated test coverage: there are no automated tests for `augy bundle`, `augy sync`, or manifest parsing. The home-repo tests cover home configuration and context matching only, not the manifest round trip.

## Out of Scope

- Removing skills that aren't in the manifest. There's no `--prune` or "exact match" mode.
- Pinning exact versions in the manifest. There's no SHA or lock field. The manifest follows upstream.
- Choosing a subset of skills to bundle. Bundle always exports the whole registry, minus sourceless skills by default. Narrowing it means editing the file by hand.
- Merging a new bundle into an existing manifest.
- Including self-authored skill files in the manifest. Only sources are recorded; the home-repo feature handles authored skill files.
- Applying context tags during sync, or filtering sync by context. That's `augy home pull`.
- Fetching a manifest from a URL or remote repo. Sync reads a local file only.
- Validating the manifest `version` field.

## Further Notes

Known gaps, inconsistencies, and likely bugs. These come from reading the code and haven't been reproduced unless noted. Several of these also affect `augy home pull`, which runs sync internally.

- **Sync probably reports "Upgrade" for every skill, every time.** To decide whether a skill is up to date, sync compares the registry SHA with the latest commit that touched the skill's path. But install, update, and sync itself record a different SHA: the branch head commit when the source points straight at a skill, or the skill folder's tree SHA when the source is a multi-skill repo. These will almost never match. So "Up to date" is effectively unreachable, and every sync (including `--yes` nightly jobs) re-downloads every manifest skill. That makes the "safe to re-run, only upgrades what changed" behavior unreliable in practice.
- **Failures are reported as "no source", and a run where everything fails reports success.** An entry whose upstream can't be resolved (gh not installed or not logged in, no access to a private repo, a typo, a network error) is put in "Skipped — no source". If every entry fails this way, sync prints "Everything is up to date." and exits successfully. A CI pipeline can't tell a broken sync from a clean one.
- **The exit code ignores per-skill failures.** When individual installs fail, sync still prints "Sync complete (N change(s) applied)" with N equal to the number attempted, not the number that succeeded, and exits with status 0.
- **Sync upgrades don't archive the previous version.** Unlike `augy update`, sync doesn't snapshot the current files before overwriting them, and doesn't add a history entry. So you can't `augy rollback` to the version that was installed before a sync.
- **Sync works against the canonical-store model.** Sync replaces each agent folder with a plain copy, even if it was a symlink into `~/.augy/store/`, and drops the store reference from the registry entry. As a result:
  - the store copy is left orphaned and stale
  - one skill now has several separate copies on disk
  - skillset switching (`augy use`), which only manages symlinks, will ignore these skills

  Inferred from the skillsets documentation; worth confirming with the store owner.
- **Upgrades drop other agents from the registry.** The deployment list is replaced with the agents targeted by this run. A skill that was also deployed to a non-targeted agent loses that registry entry, though the (now outdated) files stay on disk.
- **Tap and context metadata are lost on upgrade.** The registry entry is rebuilt, so the skill's tap and context tags are dropped.
- **Pins are not respected.** Pinned skills are upgraded by sync. This contradicts the general meaning of a pin ("freeze at current version"). It may be deliberate (the manifest wins over local pins), but nothing documents that.
- **Untracked skills of the same name are overwritten silently.** If a hand-installed skill with the same name as a manifest entry exists in a target agent's folder, sync replaces it without warning.
- **The wrong skill can be installed on a name mismatch.** When the manifest name doesn't match any skill found at the source, sync installs the first skill found there under the manifest's name.
- **The README promises more than sync delivers.** It says teammates "reproduce your exact skill set". Because the manifest has no SHAs, they reproduce the same sources at whatever upstream is current. Sourceless skills, local pins, and agent choices are not carried over.
- **Bundle's closing message always says "Commit augy.json"**, even when `--output` wrote to a different file name.
- **A code comment mentions a `--tracked-only` flag** that doesn't exist. Tracked-only is simply the default behavior.
- **The manifest format allows `contexts`, but bundle never writes it.** Only `augy home push` does, and sync ignores it. So a team manifest made with bundle never carries context tags.
- **Docs gaps.** `--yes` on sync isn't in the README or the docs site, though it's in the CLI help and was added for the nightly update workflow (commit 30812a5). The docs site lists only `[path] [--dry-run]` for sync.
- **A malformed manifest probably crashes sync.** A manifest that's valid JSON but has no `skills` object will likely make sync fail with an unhandled error rather than a clear message.
- Open question: should sync install through the canonical store (one copy, symlinked into each agent) like `augy install` does? Today the two commands leave different layouts on disk.
