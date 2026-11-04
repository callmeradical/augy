# Adopting Existing Skills

> Status: Shipped (documented from v0.11.0, commit c725774). Covers `augy scan` and `augy set-source`.

## Problem Statement

Most developers who come to augy already have skills on disk. They copied them into `~/.claude/skills` by hand, cloned a skills repo into an agent's folder, used another installer, or wrote their own. augy can't see any of those skills. It can't tell where they came from or which version is installed, so it can't update, diff, or roll them back. They don't show up in `augy list` and are never included in a team manifest.

Asking people to uninstall everything and reinstall through augy is slow and error-prone. Often they don't remember where a skill came from in the first place. And a skill that is already tracked for one agent can be copied by hand into another agent's folder. augy doesn't know about that copy either, so it falls out of sync.

A related problem: some skills reach the registry with no known source, because the user couldn't find it at import time or the skill was self-authored. Those skills sit in the lockfile, but augy can't do anything with them until it learns where they live on GitHub.

## Solution

`augy scan` searches the skills folders of every supported agent. It finds every skill directory (a directory containing `SKILL.md`) that augy doesn't track, then tries to work out where each one came from:

1. **Git remote.** If the skill sits inside a git checkout whose `origin` points at GitHub, augy uses that repo, the skill's path within it, and the last commit that touched that path.
2. **`SKILL.md` frontmatter.** If the frontmatter has a `source`, `repo`, or `origin` field that points at GitHub, augy uses it.
3. **Tap match.** If a registered tap offers a skill with the same name, augy uses that tap entry.

The results are shown in two groups. **Provenance detected** lists each skill with its source, its SHA when known, and how the source was found. **No provenance found** lists each skill with its path in every agent and the first line of its `SKILL.md`, so the user can identify it. The user confirms the import, picks skills from a filterable list (all pre-selected), and then, one skill at a time, either accepts the detected source or types a GitHub URL / `owner/repo[/path]`. They can also leave the field blank to import the skill without a source. Each import is saved as soon as it finishes.

After importing, scan looks for tracked skills that also exist in other agents' folders under the same name. It lists them and offers to add those agent paths to the registry.

`augy set-source <skill> <url>` attaches a GitHub source to a skill that's already in the registry. It accepts tree URLs, blob URLs (the file's parent directory becomes the skill root), plain repo URLs, and `owner/repo[/path]` shorthand. augy checks that the source exists on GitHub and records the latest commit for that path. From then on the skill can be updated, diffed, and rolled back.

Both commands write the confirmed source back into the skill's `SKILL.md` frontmatter. Future scans, on this machine or any other, can then identify the skill without a git checkout or a tap.

## User Stories

1. As an individual developer who has hand-copied skills into several agents, I want one command that finds every skill augy isn't tracking, so that I can bring my whole collection under management without reinstalling anything.
2. As a developer new to augy, I want scan to search the skills folder of every supported agent, even agents augy doesn't detect as installed, so that skills left in an old or rarely used agent's folder still turn up.
3. As a developer who cloned a whole skills repo into my agent's skills folder, I want scan to look inside nested folders until it finds `SKILL.md`, so that skills grouped in category folders are still found.
4. As a developer who installed skills with `git clone`, I want augy to read the GitHub remote and the skill's path within the repo, so that the correct source is filled in for me.
5. As a developer who cloned over SSH, I want `git@github.com:owner/repo.git` remotes to be recognized like HTTPS remotes, so that the way I cloned doesn't matter.
6. As a skill author, I want augy to read a `source` (or `repo` / `origin`) field from my skill's `SKILL.md` frontmatter, so that people who copy my skill by hand can still have augy track it back to my repo.
7. As a developer with taps registered, I want an untracked skill whose name matches a skill in one of my taps to be suggested as coming from that tap, so that I don't have to look up its URL.
8. As a developer reviewing scan results, I want skills grouped into "provenance detected" and "no provenance found", with each detected source labeled git, frontmatter, or tap, so that I know how much to trust each suggestion.
9. As a developer looking at a skill augy couldn't identify, I want to see its path in each agent and the first line of its `SKILL.md`, so that I can work out what it is and where it came from.
10. As a developer, I want to be asked before anything is imported, so that running scan just to look is safe.
11. As a developer with many untracked skills, I want to choose which ones to import from a filterable list where everything starts selected, so that I can leave out experiments or junk quickly.
12. As a developer, I want to accept or reject each detected source one skill at a time, so that a wrong guess (for example, a dotfiles repo remote) doesn't get recorded.
13. As a developer who knows where a skill came from even though augy doesn't, I want to type a GitHub URL or `owner/repo[/path]` while importing, so that the skill is fully tracked right away.
14. As a developer who doesn't know where a skill came from, I want to import it without a source, so that it's still listed in my inventory and I can add the source later.
15. As a developer, I want a skill that exists in several agents to be imported once, with every agent location recorded, so that my registry has one entry per skill.
16. As a developer, I want each imported skill saved to the registry as soon as it's done, so that cancelling or a crash partway through doesn't lose the skills already imported.
17. As a developer, I want a skill whose upstream SHA can't be fetched to still be imported (as "unversioned"), so that a network or permission problem doesn't block adoption.
18. As a developer who manually copied a tracked skill into another agent's folder, I want scan to notice the copy and offer to register that agent path, so that the registry shows everywhere the skill is deployed.
19. As a developer, I want augy to write the confirmed source into the skill's `SKILL.md` frontmatter, so that later scans (on this machine or another) identify it without guessing.
20. As a developer with an imported skill that has no source, I want `augy set-source <skill> <url>`, so that I can turn on update, diff, and rollback once I find the repo.
21. As a developer browsing GitHub, I want to paste a tree URL (folder) or a blob URL (for example, a link to the skill's `SKILL.md`) into set-source, so that I can copy whatever link is in my browser.
22. As a developer, I want set-source to check that the source exists on GitHub before saving it, so that a typo doesn't leave a broken source in my lockfile.
23. As a developer, I want set-source to point a skill at a specific branch or tag through the URL's ref (for example `/tree/v2/...`), so that I can follow a release line instead of the default branch.
24. As an enterprise developer whose skills live in private GitHub repos, I want scan and set-source to resolve sources with my existing GitHub CLI login, so that private sources work without extra token setup.
25. As a developer, I want `augy list` to flag sourceless skills and show the exact `augy set-source` command to run, so that I know how to finish adopting them.
26. As a developer whose skills are all tracked, I want scan to say so and exit, so that I can run it any time to check that nothing has slipped through.

## Implementation Decisions

- **A skill is a directory that contains `SKILL.md`.** Scan treats the directory name as the skill name. Once it finds a skill directory it doesn't search inside it. Directories without `SKILL.md` are searched recursively.
- **Every agent's skills folder is scanned**, all 33 supported agents, whether or not augy detects the agent as installed.
- **Identity across agents is by name.** Folders with the same name in different agents' skills folders are treated as one skill with several agent locations.
- **Provenance is tried in a fixed order: git remote, then frontmatter, then tap.** The first match wins. The match type is shown as a confidence label: `git`, `frontmatter`, or `tap`.
- **Only GitHub sources are recognized.** Git provenance uses only the `origin` remote, and only when it points at github.com (HTTPS or SSH). Frontmatter sources must be GitHub URLs or `owner/repo[/path]` shorthand.
- **Git provenance records a SHA from the local checkout.** The SHA is the last local commit that touched the skill's path. Frontmatter provenance doesn't carry a SHA, so augy fetches one from GitHub during import.
- **Tap matching needs at least one tap.** When several tap entries share the name, the first one is used.
- **Scan is read-only until the user confirms.** It asks twice: once to import untracked skills at all, and once (a single yes/no) to register any additional agent paths it found.
- **Detected sources are never applied without confirmation.** Each detected source goes through a per-skill "Use detected source?" prompt that defaults to yes. Saying no falls back to manual entry.
- **Importing without a source is allowed.** The skill is recorded with an empty source and the SHA `unversioned`. It shows up in inventory but is skipped by update and left out of team manifests by default.
- **A failed SHA lookup doesn't block the import.** The skill is imported with the source the user gave and the SHA `unversioned`.
- **Adopted skills stay where they are.** Scan only records their current location in each agent. It doesn't move them into the canonical store under `~/.augy/store/` or replace them with symlinks.
- **The registry is saved after each imported skill**, not once at the end.
- **The source is written back into `SKILL.md`.** After a successful import with a resolved SHA, augy adds `source: <source>` to the skill's frontmatter, creating a frontmatter block if there isn't one. It never overwrites an existing `source` field. Scan writes only to the first agent location. Set-source writes to every active agent location.
- **Set-source only works on skills already in the registry.** It overwrites any existing source without asking. The source string is stored exactly as typed. The recorded SHA is the latest upstream commit for that path, not a fingerprint of the files on disk.
- **URL forms accepted by set-source:**
  - `https://github.com/owner/repo`
  - `.../tree/<ref>/<path>`
  - `.../blob/<ref>/<path/to/file.ext>` (the file's parent directory is used)
  - `owner/repo`
  - `owner/repo/<path>`
- **GitHub access goes through the GitHub CLI.** Resolving sources requires `gh` to be installed and logged in. Git provenance also requires `git` on the PATH.

## Testing Decisions

Observable behaviors that define correctness:

- Given skill folders in several agents' skills folders, scan reports every folder containing `SKILL.md` that isn't in the registry, including nested ones, and groups same-named folders into one skill.
- A skill inside a github.com git checkout is reported with source `owner/repo/<path>`, a SHA, and confidence `git`. SSH and HTTPS remotes give the same source.
- A skill whose frontmatter has `source: owner/repo` is reported with confidence `frontmatter`.
- A skill matching a tap entry is reported with confidence `tap` and gets that tap recorded on import.
- Skills with no provenance are listed with their paths and the first line of their content (frontmatter and headings skipped, truncated to 80 characters).
- Declining the import prompt leaves the registry untouched.
- Each imported skill appears in the registry with every agent location it was found in. A sourceless import has an empty source and SHA `unversioned`.
- After an import with a resolved SHA, the skill's `SKILL.md` contains a `source:` frontmatter line, and an existing one is never overwritten.
- A tracked skill found in an unregistered agent's folder is offered as an additional install and, once confirmed, its path appears under that agent in the registry.
- Set-source on an unknown skill exits with an error. Set-source with an unresolvable URL exits with an error and changes nothing. Set-source with a valid tree or blob URL updates source and SHA and writes the source into `SKILL.md`.

Current automated test coverage: only the "additional agent installs" logic has automated tests. Four unit-level cases cover: no new paths, ignoring untracked skills, finding a new agent path for a tracked skill, and several skills with several new paths each. Nothing automated covers:

- the directory search
- provenance detection (git, frontmatter, or tap)
- the interactive import flow
- the frontmatter write-back
- `augy set-source`
- parsing of tree, blob, and shorthand GitHub URLs

## Out of Scope

- Moving adopted skills into the canonical store, or replacing them with symlinks.
- Non-GitHub sources: GitLab, Bitbucket, self-hosted git, and GitHub Enterprise hosts other than github.com.
- Git remotes other than `origin`.
- Checking whether a skill's files on disk match the source the user gives or that augy detects. No content comparison is done.
- Removing, deduplicating, or reconciling skills on disk. Scan only adds registry entries.
- Non-interactive scanning. Scan has no flags (no `--yes`, `--json`, or `--dry-run`) and always prompts.
- Adopting skills that aren't in an agent's skills folder (arbitrary project directories).
- Clearing a source. Set-source can only set or replace one.

## Further Notes

Known gaps, inconsistencies, and likely bugs. These come from reading the code and haven't been reproduced unless noted.

- **Additional-install detection rarely runs.** Scan exits with "All installed skills are already tracked" when nothing is untracked, before it gets to the additional-install step. Declining the import prompt also exits first. So a hand-copied tracked skill is only offered for registration if there's at least one untracked skill and the user agrees to import. The commit that added this feature (cbd969e) says it "closes the gap" for manual installs into new agents, but in the common case (everything already tracked) it never triggers.
- **Symlinked skill folders are invisible to scan.** The search only follows real directories. Skills that another tool (or the user) installed as symlinks aren't found, and a symlinked copy of a tracked skill in another agent's folder isn't reported as an additional install.
- **Frontmatter sources written as full tree URLs probably resolve wrongly.** A frontmatter source like `https://github.com/o/r/tree/main/skills/x` appears to be converted to the shorthand `o/r/tree/main/skills/x`. The shorthand parser would then read that as a path beginning with `tree/main/...`, so the SHA lookup fails and the skill is imported "unversioned" with a broken source. The same problem can come back on another machine for a skill whose source was set with set-source using a tree URL, because that URL is written verbatim into `SKILL.md`.
- **Frontmatter sources ignore refs.** A branch or tag in the frontmatter source isn't kept.
- **SHA identity differs from what update uses.** Git provenance and set-source record "last commit touching the path". Update compares against a different SHA: the branch head commit, or the folder's tree SHA in multi-skill repos. So the first `augy update` after adopting a skill or setting its source will probably report drift even when nothing has changed. Accepting it overwrites the local files with upstream content; the previous files are archived under a SHA label that may not match what they actually contained. This overlaps with the versioning PRD.
- **Same name, different skills.** Two different skills with the same folder name (in different agents, or at different nesting depths) are merged into one registry entry without warning.
- **Git provenance can pick up an unrelated repo.** If an agent's config folder is itself tracked in a git repo (for example, a dotfiles repo), git provenance will attribute every skill in it to that repo. The per-skill confirmation step is the only safeguard.
- **Scan edits user files.** Writing `source:` into `SKILL.md` changes the user's files. For skills inside a git checkout, that leaves a modified file in the working tree. Scan doesn't mention this before doing it.
- **Imported skills behave like hand-copied ones.** Adopted skills aren't in the canonical store, so other features that only manage symlinks (such as `augy use` skillset switching) appear to ignore them. Inferred from the skillset documentation ("skills installed as copies are left untouched").
- **"Scanned N agent(s)" counts every supported agent** (33), not only the folders that exist.
- **Sourceless skills on SHA failure.** When the SHA lookup fails during import, the user's source is kept but the skill is marked `unversioned`, and `augy list` then shows it as "untracked" even though it has a source.
- The README says set-source "accepts tree and blob URLs". It also accepts plain repo URLs and shorthand.
- Open question: should set-source compare the local files against the upstream files before recording the latest upstream SHA? Today it assumes the local copy matches the latest upstream version.
