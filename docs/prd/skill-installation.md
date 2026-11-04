# Skill Installation and Uninstallation

> Status: Shipped (documented from v0.11.0, commit c725774)

## Problem Statement

Developers find useful agent skills in GitHub repos: a single skill folder, a repo full of skills, a deeply nested catalog, or a skill they only know by name from a repo they trust. Installing one by hand means finding the right folder, downloading it, and copying it into each agent's skills directory. After that, nothing records where it came from or which version is on disk. That makes later updates, diffs, and rollbacks guesswork, and removing the skill means hunting down every copy.

Teams and automation have their own problems. A CI job or a provisioning script can't answer interactive prompts. It needs to install a known skill in one command, and it needs a clear failure when the request is ambiguous.

## Solution

`augy install [url]` accepts any common way of pointing at a skill on GitHub: a repo URL, a `tree/` or `blob/` URL, `owner/repo[/path]` shorthand, or a bare skill name resolved through the user's registered taps. augy finds every skill at that location, at any depth. If it finds more than one, the user picks from a filterable list. The user then chooses which agents receive the skills and confirms a summary.

Each installed skill becomes **tracked**. augy records the source the user gave, the exact upstream version identifier (shown as a 7-character SHA), the tap it came from if any, the agents it went to, and the install time. These go into the lockfile at `~/.augy/registry.json`. The tracking record is what makes `augy update`, `augy diff`, and `augy rollback` possible later.

`--yes` makes install fully non-interactive for CI. Running `augy` with no subcommand starts the interactive install flow.

`augy uninstall <skill>` shows what will be removed and asks for confirmation. It then removes the skill from every agent it was deployed to, removes augy's stored copy, and deletes the registry entry. If archived previous versions exist, it asks whether to delete them too.

## User Stories

1. As an individual developer, I want to install a skill by pasting its GitHub URL, so that I don't have to download and copy folders by hand.
2. As an individual developer, I want to paste a `tree/<ref>/<path>` URL for a folder deep inside a repo, so that I can install exactly the skill I'm looking at in the browser.
3. As an individual developer, I want to paste a `blob/` URL to a skill's `SKILL.md` file and have augy install the folder that contains it, so that I can copy whatever link I happen to be on.
4. As an individual developer, I want to type `owner/repo` shorthand, so that I can install from a repo without typing a full URL.
5. As an individual developer, I want to type `owner/repo/path/to/skill` shorthand, so that I can target one skill in a repo without opening a browser.
6. As an individual developer, I want to install a skill by bare name (`augy install tdd`) from repos I've registered as taps, so that installing a skill I trust takes one word.
7. As an individual developer, I want augy to ask me which tap to use when a bare name exists in more than one tap, showing each candidate's version, so that I never get a skill from a source I didn't mean.
8. As an individual developer, I want augy to find every skill in a repo no matter how its folders are nested, so that flat, categorized, and deeply nested catalogs all work.
9. As an individual developer, I want augy to recognize skill files regardless of case (`SKILL.md`, `skill.md`, `Skill.md`), so that skills from authors with different conventions are still found.
10. As an individual developer installing from a repo with many skills, I want a multi-select list I can filter by typing, so that I can find the few skills I want among dozens.
11. As an individual developer, I want skills I already have installed labeled "already installed" and left unselected, while new skills start selected, so that re-running install on a repo only adds what's new by default.
12. As an individual developer, I want to toggle all visible skills with one key, so that installing a whole catalog is quick.
13. As an individual developer, I want to see each skill's short version SHA and repo path in the picker, so that I know exactly what I'm about to install.
14. As an individual developer, I want a final summary of each skill, its version, and its target agents, and a confirmation prompt, so that nothing is written to disk until I agree.
15. As an individual developer, I want to choose target agents from a list where agents installed on my machine come first and are pre-selected, so that the common case needs no extra input.
16. As a developer who uses several agents, I want to pass `--agent claude opencode` to name the target agents directly, so that I can skip the agent prompt.
17. As a developer setting up a new tool, I want to install to an agent augy doesn't detect yet, either by picking it from the "not detected" part of the list or by naming it with `--agent`, so that skills are ready before the agent is.
18. As a developer who isn't sure of the exact syntax, I want to run plain `augy` and be prompted for a source, so that I can start without reading the help.
19. As a CI pipeline, I want `augy install <source> --yes` to install every skill found at the source with no prompts, so that machine and container provisioning is scriptable.
20. As a CI pipeline, I want `--yes` to install to the agents I name with `--agent`, or to every detected agent if I name none, so that I control where skills land on headless runners.
21. As a CI pipeline, I want `--yes` with no source argument to fail immediately with a non-zero exit, so that a misconfigured job doesn't hang waiting for input.
22. As a CI pipeline, I want `--yes` to fail with a non-zero exit when a bare name matches more than one tap, and to print the exact full-path commands that would resolve it, so that the fix is obvious and installs stay deterministic.
23. As a CI pipeline, I want `--yes` to fail with a non-zero exit when no agents are detected and none were given, so that a run that would install nothing never looks like a success.
24. As a team lead, I want to pin an install to a branch, tag, or full commit SHA with a `tree/<ref>/...` URL, so that my team installs a known revision instead of whatever is on the default branch.
25. As an enterprise developer, I want to install from private and internal GitHub repos with my existing GitHub CLI login, so that I can use company skills without a separate account or registry.
26. As an individual developer, I want augy to record each installed skill's source, version, tap, agents, and install time in a readable lockfile, so that I can later update, diff, and roll back the skill, and can see where it came from.
27. As an individual developer, I want re-installing a skill to keep its original install date, pinned status, and version history, so that re-installing doesn't erase what augy knows about it.
28. As an individual developer installing several skills at once, I want one failed download to be reported without stopping the others, so that one bad skill doesn't block the rest.
29. As an individual developer, I want `augy uninstall <skill>` to list every agent path it will remove, marking any already missing, so that I know what will happen before I confirm.
30. As an individual developer, I want uninstall to remove the skill from every agent in one command, so that I don't have to clean up each agent's folder.
31. As an individual developer, I want uninstall to keep archived versions unless I explicitly choose to delete them (the default is "no"), so that I can still recover an old version later.
32. As an individual developer who wants a clean slate, I want to delete all of a skill's archived versions as part of uninstalling it, so that no leftover snapshots take up disk space.
33. As an individual developer, I want uninstall to remove the skill from the registry even if some files couldn't be deleted, and to show those failures as warnings, so that the registry never keeps tracking a skill I asked to remove.

## Implementation Decisions

**Accepted source forms and how input is classified**

- If the input has no `/` and doesn't start with `http`, it's a **bare skill name** and is resolved through taps. Anything else is a **GitHub reference**.
- Accepted GitHub references:
  - `https://github.com/owner/repo`. `http://` is accepted and upgraded to `https`, and a trailing slash is ignored.
  - `https://github.com/owner/repo/tree/<ref>/<path>`, which installs from a directory at a specific branch, tag, or full 40-character commit SHA.
  - `https://github.com/owner/repo/blob/<ref>/<path>/SKILL.md`. If the last segment contains a `.`, augy treats it as a file and uses the parent directory.
  - `owner/repo` and `owner/repo/<path>`. Shorthand has no way to specify a ref, so it uses the repo's default branch.
- Bare-name resolution: the name is matched exactly, case-insensitively, against the skill names in every registered tap.
  - No match: install fails and suggests `augy install owner/repo/path` or `augy tap add owner/repo`.
  - Exactly one match: that skill is used.
  - More than one match: the user picks a tap. With `--yes`, install fails and lists `augy install <tap>/<path> --yes` for each candidate.

**What counts as a skill and what it is called**

- A skill is a directory that contains a `SKILL.md` file, matched case-insensitively.
- If the target path itself contains `SKILL.md`, it's one skill named after the last path segment, or after the repo if the path is the repo root.
- Otherwise every directory under the target path that contains `SKILL.md`, at any depth, is a skill named after its own directory. Results are listed alphabetically.
- **The skill's directory name is its identity.** It's the registry key, augy's store folder name, and the folder name in every agent's skills directory. There's no namespacing by repo or owner, so installing a skill whose name matches an installed one (from any source) replaces it.

**Selection and confirmation**

- When interactive, the skill picker is always shown, even if only one skill was found. Skills not yet installed start selected. Installed ones are labeled "already installed" and start unselected. At least one skill must be selected.
- Agents:
  - `--agent <ids...>` selects exactly the named agent IDs. Unknown IDs are silently dropped.
  - Without `--agent`, interactive installs show an agent picker. Detected agents are listed first and pre-selected. Undetected agents are listed after them, labeled "not detected".
  - Without `--agent`, `--yes` installs to all detected agents.
- Before writing anything, augy prints a `skill @sha → agents` summary and asks for confirmation. `--yes` skips the confirmation.

**`--yes` contract (non-interactive mode)**

- A source argument is required. Without one, install exits with code 1.
- It installs **every** discovered skill, including skills that are already installed. Those are re-installed.
- It shows no skill picker, agent picker, or confirmation.
- It exits with code 1 when a bare name is ambiguous across taps, when a bare name isn't found, when the source can't be resolved or contains no skills, and when the resolved agent list is empty.

**What install writes**

- augy keeps one copy of each skill under `~/.augy/store/<skill>/`, and each selected agent's `<agent skills dir>/<skill>` points to that copy. See the Multi-Agent Support PRD.
- Whatever already exists at an agent's skill path (a copied folder, an old link, or an unrelated directory with the same name) is replaced without a prompt.
- Each skill is installed independently. If one fails, the failure is printed and the remaining skills still install. The registry is saved once at the end.

**Tracking: what the lockfile records per skill**

- `source`: exactly what the user typed for URLs and shorthand. For tap installs it's `owner/repo/<path-in-repo>`, and `tap` holds the tap's `owner/repo`.
- `sha` and `shortSha`: the upstream version identifier at install time.
- `agents`: each target agent ID and its skill path.
- `installedAt`, `updatedAt`, `pinned` (false on first install), and `history` (empty on first install).
- The store location of the skill's single copy.

**Re-install**

- Re-installing a tracked skill shows "already installed — updating record".
- It keeps the original `installedAt`, `pinned`, and `history`.
- It replaces the recorded agent list with the agents selected this time.
- It doesn't archive the version being replaced.
- It ignores pinning: a pinned skill's content is still refreshed.

**Bare `augy`**

- With no subcommand, augy starts the interactive install flow. The source prompt accepts the same forms as the argument, including bare names.

**Uninstall rules**

- The skill must be in the registry. If it isn't, uninstall exits with code 1, even if a folder with that name exists on disk.
- Uninstall always asks for confirmation. There is no `--yes` or `--agent` option.
- It shows the skill, its short SHA, each agent path it will remove (marked "already missing" when absent), and how many archived versions exist.
- It asks about deleting archives only if the skill has version history. The default answer is no.
- It removes the agent paths recorded for the skill, augy's stored copy, and, if the user agreed, the skill's whole archive folder under `~/.augy/versions/<skill>/`.
- Failures to delete files are shown as warnings. The registry entry is removed regardless.

## Testing Decisions

Observable behaviors that define correctness:

- Each accepted source form resolves to the same owner, repo, path, and ref as the examples above. `blob/` URLs resolve to the parent directory, and `tree/` URLs keep their ref.
- A bare name with no slash is resolved only through taps. An exact case-insensitive match in one tap installs from that tap. Matches in more than one tap prompt the user, or fail under `--yes` with suggested full-path commands. No match fails with guidance.
- Discovery returns one skill when the target path has a `SKILL.md`, and all nested skill directories otherwise, sorted by name.
- Interactive selection pre-selects only skills that aren't installed yet. The agent picker pre-selects only detected agents.
- `--yes` never prompts. It fails with a non-zero exit in each fail-fast case listed above, and installs all discovered skills to `--agent` agents or detected agents.
- After a successful install, the registry has an entry with the given source, a SHA, the chosen agents and their paths, and a store location. Each agent path resolves to the stored copy.
- Re-installing keeps `installedAt`, `pinned`, and `history`.
- Uninstall removes every recorded agent path and the stored copy, removes the registry entry, and deletes archives only when the user agrees.

Existing coverage: as of this commit there are **no automated tests** for install, uninstall, URL and shorthand parsing, skill discovery, bare-name tap resolution, the `--yes` paths, or registry record creation. The tests that touch GitHub cover only reading and writing a single repo file, which the home-repo feature uses. The CI workflow runs a typecheck and a build but not the test suite. Tests run only as part of the pre-publish step. A good future suite would exercise the command from the outside: fake the GitHub responses, point augy's home and the agent directories at a temporary location, then check the resulting files, links, registry contents, and exit codes.

## Out of Scope

- Installing from a local folder, or from GitLab, Bitbucket, or other non-GitHub hosts. Only `github.com` URLs and shorthand are parsed. No GitHub Enterprise Server host can be specified.
- Version ranges, semantic versioning, or dependency resolution between skills.
- Choosing a ref with shorthand, or with an abbreviated commit SHA. Refs are only read from `tree/` and `blob/` URLs, and only full 40-character SHAs are accepted as commit refs.
- Renaming or aliasing a skill at install time, and namespacing same-named skills from different sources.
- Project-local (per-repository) installs. augy installs only into each agent's user-level skills directory.
- Validating, linting, or security-scanning skill contents before installing.
- Non-interactive uninstall, uninstalling from only some agents, and removing an uninstalled skill from skillsets.

## Further Notes

Known gaps, inconsistencies, and probable bugs observed at this commit:

- **Repos whose default branch isn't `main` probably fail to install from shorthand or plain repo URLs.** Discovery looks up the repo's real default branch. The download step, though, uses only the ref written in the source, and when there's none it falls back to `main`. For a `master`-default repo this should make the download fail, or fetch a different `main` branch if one exists. `tree/<ref>/` URLs aren't affected. This conclusion comes from reading the code and hasn't been checked against a live repo.
- **Private-repo downloads are likely to fail.** Discovery and version lookups go through the GitHub CLI and its login. The download step doesn't use those credentials and authenticates only if the undocumented `GIGET_AUTH` environment variable is set. A private repo would probably be found and then fail to download. This conclusion comes from reading the code and hasn't been tested live.
- **The recorded "SHA" isn't always a commit SHA, and update checks may be inconsistent because of it.**
  - Installing a single skill path records the commit SHA at the head of the branch.
  - Installing from a multi-skill location, including every bare-name tap install, records the skill directory's content hash (a git tree SHA).
  - Tap installs record a tree SHA but store a single-skill `source`. The next `augy update` probably compares a commit SHA against that tree SHA and reports a spurious update.
  - For single-path sources, any commit anywhere in the repo changes the head SHA, so an "update" may be reported when the skill itself didn't change.
  - The docs say every install tracks "the exact GitHub commit SHA", which isn't accurate.
  - The skill versioning PRD should cover how this affects update, diff, and rollback.
- **The installed files may not match the recorded version.** Downloads fetch the branch or tag by name, not the recorded SHA, so the content can differ from the version shown if upstream changes in between. If a download fails and a cached copy from an earlier download exists, the download step may quietly use the cached copy.
- **Install exits with code 0 even when every skill failed.** It still prints "Done! Registry saved". That undercuts `--yes` in CI, because failed installs look successful.
- **Unknown `--agent` IDs are silently ignored.**
  - If all IDs are unknown in interactive mode, install exits with "Installation cancelled" and code 0.
  - Under `--yes`, the message is "no agents detected; pass --agent <ids...> explicitly", which is misleading when `--agent` was passed. Install should probably list the valid IDs instead.
- **Help text is stale.** `--agent` says "Target agent(s): opencode, claude, codex", but 33 agent IDs are accepted.
  - Neither the README nor the docs site mentions `--yes`, the store, linked agents, or the GitHub CLI requirement.
  - The README says a picker appears "when a repo contains multiple skills", but interactive installs always show the picker.
  - The interactive source prompt says "GitHub URL or owner/repo[/path]" and doesn't mention that bare names also work.
- **Re-installing loses some state.**
  - It drops the skill's context tags and label, because only install date, pin, and history are carried over.
  - It replaces the agent list with this run's selection. If an agent that previously had the skill isn't selected again, its link stays on disk but is no longer recorded, so a later uninstall won't remove it.
  - It doesn't archive the outgoing version, so that version can't be rolled back to.
- **Name collisions are silent.** Two different skills with the same directory name, whether from different repos or different folders of one repo, overwrite each other's store copy and registry entry. The only hint is the "already installed" label.
- **`--yes` re-installs everything at the source**, including skills that are already installed and pinned. That differs from the interactive default, which installs only new skills.
- **Discovery issues.**
  - In very large repos, discovery warns "repo tree truncated, falling back to shallow scan", but no fallback runs, so some skills may be missing from the list.
  - Branch names containing `/` (for example `feature/x`) in `tree/` URLs are split wrongly: the ref becomes `feature` and the path picks up the rest.
- **Tap errors look like misses.** Taps are queried in parallel and errors are swallowed, so a GitHub CLI that's missing or not authenticated looks like "not found in any tap" instead of an access error.
- **Uninstall issues.**
  - There's no non-interactive mode, which limits CI use. (Inference: there's no `--yes` here even though install, sync, update, and skillset delete have one.)
  - It doesn't remove the skill from any skillsets that include it.
  - An agent link whose target is already gone counts as "already missing" and is left on disk as a broken link.
  - Its closing message, like install's, always names `~/.augy/...` even when `AUGY_HOME` points elsewhere.
- **A damaged lockfile is silently reset.** If the registry file exists but isn't valid JSON, augy treats it as empty, and the next install rewrites it with only the new skill. All previous tracking is lost without warning.
- Open question: should install refuse, or warn louder, before replacing an agent directory that augy doesn't track (for example a hand-written skill with the same name)? Today it replaces it without asking.
