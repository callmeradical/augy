# Taps and Discovery

> Status: Shipped (documented from v0.11.0, commit c725774)

## Problem Statement

Skills live in GitHub repos, scattered across individual authors, open-source collections, and private organization repos. Without a way to register the repos a developer trusts, every install means finding and typing a full GitHub URL or `owner/repo/path` reference. The developer also can't see what a trusted source offers, which of those skills they already have, or whether their copies are current.

Hosted skill marketplaces solve discovery by putting a central index in the middle. That index is a service the user has to trust. It can go down, it usually can't see private repos, and it may be unreachable from behind a corporate firewall. augy's users want discovery that is decentralized: the user, not a curation team, decides which sources count, and GitHub itself is the registry.

## Solution

augy borrows Homebrew's "tap" model. A **tap** is a GitHub repo, public or private, that the user registers once as a trusted skill source, optionally scoped to a subdirectory of that repo. After that:

- `augy install <name>` resolves a bare skill name, with no slash, by looking across every registered tap. When more than one tap has a skill by that name, the user picks one.
- `augy search [query]` builds a live index of every skill in every tap and shows, for each skill, whether it is installed and whether the installed version matches the tap.
- `augy tap list` shows the registered taps, and `augy tap remove` unregisters one. Removing a tap never uninstalls the skills that came from it.

Discovery finds skills recursively. Any directory at any depth under the tap's path that contains a `SKILL.md` file (matched case-insensitively) counts as a skill, so flat, nested, and category-organized repos all work. Taps are recorded in the user's lockfile (`~/.augy/registry.json`), and no account or service beyond GitHub is involved.

## User Stories

1. As an individual developer, I want to register a GitHub repo I trust as a tap, so that I can install its skills by name instead of typing full URLs.
2. As an individual developer, I want to register a tap with either `owner/repo` shorthand or a full `https://github.com/owner/repo` URL, so that I can paste whatever I have to hand.
3. As an individual developer, I want augy to check a new tap by counting the skills it contains when I add it, so that I know right away whether I pointed it at the right place.
4. As an individual developer, I want augy to register a tap even when that check fails, for example because I'm offline or rate-limited, so that a temporary network problem doesn't block my setup.
5. As a skill-collection maintainer whose skills sit under a subdirectory, I want users to be able to scope a tap with `--path`, so that only that part of my repo is indexed.
6. As an individual developer, I want augy to ask me for the skills subdirectory when I don't pass `--path`, with `skills` as the suggested default, so that I don't need to know the flag for the common layout.
7. As an individual developer, I want to point a tap at a repo's root by passing an empty path, so that repos that keep skills at the top level work too.
8. As an individual developer, I want to attach a free-text `--description` to a tap, so that I remember later why I trusted it.
9. As an enterprise developer, I want to tap a private repo in my organization exactly the way I'd tap a public one, so that internal skills are as easy to find as open-source ones.
10. As an enterprise developer behind a firewall, I want discovery to talk only to GitHub, using my existing GitHub CLI login, so that no third-party registry or extra account is needed.
11. As an individual developer, I want augy to tell me when I try to add a tap that is already registered, so that I don't create duplicates.
12. As an individual developer, I want to list my registered taps with their subdirectory, description, date added, and how many installed skills came from each, so that I can review the sources I trust.
13. As an individual developer, I want a helpful hint pointing me to `augy tap add` when I have no taps, so that I know how to start.
14. As an individual developer, I want to unregister a tap, so that I stop resolving names against a source I no longer trust.
15. As an individual developer, I want augy to warn me which installed skills came from a tap before I remove it, and to ask for confirmation, so that I understand the impact first.
16. As an individual developer, I want skills from a removed tap to stay installed, losing only their tap association, so that removing a source never breaks my current agents.
17. As an individual developer, I want `augy install tdd` to find the skill named `tdd` in whichever tap has it, matching the name case-insensitively, so that installing feels like `brew install`.
18. As an individual developer, I want augy to let me choose the tap when several taps contain a skill with the same name, so that I install the one I mean.
19. As a CI pipeline, I want a bare-name install with `--yes` to fail with a clear error that lists the full `owner/repo/path` alternatives when the name is ambiguous, so that automation never guesses.
20. As an individual developer, I want a clear message telling me to use a full path or add a tap when a bare name isn't in any tap, so that I know what to do next.
21. As an individual developer, I want skills installed by bare name to remember which tap they came from, so that I can see their provenance in `augy info` and in tap listings.
22. As an individual developer, I want `augy search` with no query to list every skill in every tap, grouped by tap, so that I can browse what's available.
23. As an individual developer, I want `augy search <query>` to fuzzy-match skill names, ranking exact matches first, then prefix matches, then substring matches, then subsequence matches, so that I find skills even when I only half remember the name.
24. As an individual developer, I want each search result to show the skill's current upstream version (short SHA) and a status of "not installed", "up to date", or "update available" with the old and new short SHAs, so that I can spot what to install or upgrade.
25. As an individual developer with several taps, I want all taps searched in parallel and one unreachable tap to show an error under its own heading without failing the whole search, so that one bad source doesn't block discovery.
26. As a skill-collection maintainer, I want discovery to find `SKILL.md` files at any depth, including nested category folders, so that I can organize my repo however I like.
27. As a skill author, I want `SKILL.md` matched case-insensitively (for example `skill.md`), so that small naming differences don't hide my skill.
28. As a user with a large tap, I want discovery to make a small, fixed number of GitHub requests per tap instead of one per skill, so that I stay under GitHub rate limits.
29. As an individual developer, I want a "try a broader term" hint when a query matches nothing, so that I can adjust my search.

## Implementation Decisions

**Trust model**
- A tap is just a pointer to a GitHub repo, with an optional subdirectory, that the user has decided to trust. There is no central index, curation, or account. GitHub is the registry.
- Taps are stored in the user's lockfile (`~/.augy/registry.json`, or under `AUGY_HOME` if set), keyed by `owner/repo`. Each entry records the owner, the repo, the skills subdirectory (an empty string means the repo root), the date it was added, and an optional description.
- A repo can be tapped only once. The tap's identity is `owner/repo` no matter which subdirectory it covers.
- Taps always track the repo's default branch. A branch, tag, or extra path given in a tap URL is not kept. Only owner and repo are taken from the argument, and the subdirectory comes from `--path` or the prompt.

**Adding and removing**
- `augy tap add <repo> [--path <dir>] [--description <text>]`. Without `--path`, the user is prompted, and the suggested default is `skills`.
- Adding a tap tries to check it by counting its skills. If the check fails, the tap is still added and a warning is shown. A check that finds zero skills is reported but doesn't block the add.
- Adding a tap that is already registered is reported as a no-op and exits successfully.
- `augy tap remove <repo>` always asks for confirmation, after listing the installed skills that came from the tap. Removing a tap clears the tap association on those skills but never uninstalls them.
- Removing a tap that isn't registered is an error.

**Bare-name resolution**
- An install argument counts as a bare name when it has no `/` and doesn't start with `http`. Anything else is treated as a GitHub URL or shorthand and skips the taps.
- Resolution searches every tap live and keeps only skills whose name exactly matches the argument, ignoring case. The fuzzy matching used by search does not apply here.
- One match installs directly. Several matches (across taps, or within one tap) bring up a picker, or, with `--yes`, an error listing the full-path alternatives. No match is an error.
- A skill installed by bare name records `owner/repo/<path-to-skill>` as its source and remembers the tap it came from.

**Discovery and search**
- A skill is any directory containing a file named `SKILL.md`, matched case-insensitively. The skill's name is the name of that directory.
- If the tap's path is itself a skill directory, the tap holds exactly that one skill. Otherwise every `SKILL.md` at any depth under the path is discovered. Results are sorted by name.
- Each discovered skill gets a version identifier (SHA) so search can compare it with the installed version.
- Fuzzy scoring for search: exact match, then starts-with, then contains, then subsequence (every query character appears in order). Results are sorted best-first within each tap. Taps aren't merged into one global ranking.
- Install status in search is decided by skill name only: a skill counts as "installed" if any installed skill has the same name. "Up to date" means the installed SHA equals the SHA discovery reports for the tap.
- Taps are searched concurrently. A failing tap is shown with its error. Taps with no matching skills are left out of the output.

**Prerequisites (user-facing contract)**
- Discovery uses the GitHub CLI (`gh`), so the user's existing GitHub login supplies authentication, and authenticated rate limits apply. Private repos are visible to discovery exactly when the user's GitHub login can see them.

## Testing Decisions

Observable behaviors that define correctness:

- Adding a tap by `owner/repo` or by GitHub URL records the same tap. A trailing slash is ignored. An argument without `owner/repo` is rejected.
- Adding a duplicate tap leaves the registry unchanged.
- `--path` is stored as given, and an empty `--path` means the repo root. Without the flag, the user is prompted and `skills` is the default.
- A failed check still adds the tap, with a warning.
- Removing a tap clears the tap association from every installed skill that came from it, and none of those skills are uninstalled.
- `tap list` shows the description, the subdirectory, and the count of installed skills from each tap.
- Bare-name install with exactly one exact (case-insensitive) match installs that skill and records the tap. With several matches it prompts, or errors under `--yes`. With no match it errors.
- Search with no query lists every discovered skill in every tap. Search with a query ranks exact > prefix > substring > subsequence and leaves out non-matches.
- Search status badges are correct for skills that aren't installed, that are installed at the same SHA, and that are installed at a different SHA.
- Discovery finds `SKILL.md` at any depth, matches it case-insensitively, and treats a path that is itself a skill as a single skill.

Current automated coverage: none of the behaviors above have automated tests. The existing suite covers lockfile helpers for other features, reading and writing single files on GitHub, and GitHub URL handling used elsewhere. Tap add, remove, and list, bare-name resolution, fuzzy scoring, search output, and recursive discovery are untested, and nothing exercises them against a mocked GitHub. Good future tests would mock GitHub responses and check user-visible outcomes: lockfile contents after tap commands, the ranking and status badges search prints, and which skill a bare name resolves to. They shouldn't assert on internal call sequences.

## Out of Scope

- A hosted or central skill index, curation, ratings, or popularity data.
- Searching skill descriptions or `SKILL.md` contents. Search matches skill names only.
- Hosts other than github.com: GitHub Enterprise Server, GitLab, Bitbucket, or plain git remotes.
- Pinning a tap to a branch, tag, or commit. Taps always follow the default branch.
- Registering more than one subdirectory of the same repo as separate taps.
- Caching the tap index locally or searching offline. Every search and bare-name install queries GitHub live.
- Machine-readable search output (for example JSON).
- Non-interactive tap removal. There is no `--yes` on `tap remove`.
- Automatically uninstalling, or warning about the future of, skills from a removed tap beyond the one-time notice.

## Further Notes

- **Version identifiers are inconsistent, so "update available" in search is often wrong (likely bug).** Discovery reports two kinds of SHA. When the target path is itself a skill, it reports the latest commit on the repo's default branch. When it scans a folder of skills, which is what happens for taps, it reports a fingerprint of the skill's own directory. A skill installed by bare name is recorded with the directory fingerprint, but its source is the skill's own path. The first `augy update` then sees a different kind of SHA and upgrades it, and after that search compares the commit SHA with the tap's directory fingerprint and shows "↑ update available" forever. The same thing happens for skills installed directly by `owner/repo/path/to/skill`. (See also the skill-versioning PRD.) I found this by reading the code and haven't reproduced it against live GitHub.
- **Tap errors are hidden when nothing matches.** If every tap fails, or the only taps that would match fail, search prints "No skills found" and exits without showing the per-tap errors. Errors appear only when at least one skill matched somewhere.
- **Bare-name resolution hides tap failures.** If a tap can't be reached (network, auth, rate limit), its skills just aren't considered, and the user gets "not found in any tap" with no mention of the failure.
- **Ambiguity within one tap is indistinguishable.** Two directories with the same name at different depths of one tap are both discovered. The install picker labels both with the same tap name and can only tell them apart by short SHA. The lockfile is keyed by skill name, so only one of them can be installed anyway.
- **Large repos are silently truncated.** When GitHub truncates a very large repo tree, augy prints "falling back to shallow scan", but it doesn't fall back. It continues with the truncated list, so some skills may be missing without anyone noticing.
- **The interactive path prompt is misleading.** The prompt says "leave blank for repo root", but leaving it blank accepts the default `skills`. The only way to get the repo root is an explicit empty `--path ""`. The `--path` help text says "(default: skills)", yet omitting it prompts instead of silently using the default, which matters for non-interactive use.
- **Typos get registered.** Because a failed check still adds the tap, a mistyped repo name is saved and fails on every later search.
- **Private repos may fail at the download step (inferred, unverified).** Discovery uses the user's GitHub CLI login, but the step that downloads skill files doesn't appear to use those credentials. Reading the dependency, it only honors its own token environment variable (`GIGET_AUTH`). So `augy tap add org/private-skills` and `augy search` likely work, while `augy install <name>` from that tap may fail unless that variable is set. The README's "private repos work the same way" claim should be verified end to end.
- **README and actual prerequisites disagree.** The README never says the GitHub CLI must be installed and authenticated, though discovery depends on it. The README presents `GITHUB_TOKEN` as how to raise rate limits, but discovery has gone through the GitHub CLI since v0.9.2. `GITHUB_TOKEN` now matters only in the places that still call GitHub directly (for example the diff browser), and to the GitHub CLI itself if the user relies on it.
- **README claims beyond github.com.** The philosophy section says augy "works in enterprise environments … with internal repos". That holds for private and internal repos on github.com, but GitHub Enterprise Server URLs aren't accepted.
- **Name-only install status.** Search marks a skill "installed" when any installed skill has the same name, even if it came from a different repo.
- Open question: should a tap URL that includes `/tree/<ref>/<path>` set the tap's path (and ref) instead of silently dropping it?
