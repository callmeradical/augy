# Design

## Context

See proposal.md (Why). This change specifies taps and discovery as described in docs/prd/taps-and-discovery.md (status: shipped, documented from v0.11.0). It is written from the PRD alone; it does not describe the existing code. The requirements live in `specs/taps/spec.md` and `specs/skill-search/spec.md`.

Constraints the PRD fixes:
- GitHub is the registry. Discovery goes through the GitHub CLI (`gh`), so the user's existing login supplies authentication and authenticated rate limits.
- Taps live in the user's lockfile (`~/.augy/registry.json`, or under `AUGY_HOME`), next to the installed-skill records they are counted against.
- Every search and bare-name install queries GitHub live.

## Goals / Non-Goals

**Goals:**
- Register, list and remove trusted GitHub sources with no account or service beyond GitHub.
- Install by bare name across all taps without guessing when the name is ambiguous.
- Browse and fuzzy-search all taps, with per-skill version and install status, tolerating individual tap failures.
- Work with flat, nested and category-organized repos, public or private.

**Non-Goals (from the PRD's Out of Scope):**
- A hosted or central index, curation, ratings or popularity data.
- Searching skill descriptions or `SKILL.md` contents; search matches names only.
- Hosts other than github.com (GitHub Enterprise Server, GitLab, Bitbucket, plain git remotes).
- Pinning a tap to a branch, tag or commit.
- Registering several subdirectories of one repo as separate taps.
- A local tap index cache or offline search.
- Machine-readable search output (for example JSON).
- Non-interactive tap removal (no `--yes` on `tap remove`).
- Uninstalling, or warning about the future of, skills from a removed tap beyond the one-time notice.

## Decisions

- **A tap is only a pointer.** A tap records owner, repo, an optional subdirectory, the date added and an optional description. Rationale (PRD): decentralized trust; the user, not a curation team, decides which sources count.
- **Identity is `owner/repo`; one tap per repo.** A second add of the same repo, whatever its subdirectory, is a successful no-op. Rationale (PRD): prevents duplicates (US-11). Alternative excluded by the PRD: multiple subdirectories per repo (Out of Scope).
- **Taps follow the default branch.** Refs and extra path segments in a tap URL are dropped; the subdirectory comes from `--path` or the prompt. Rationale (PRD): keeps a tap a simple pointer; ref pinning is Out of Scope.
- **Add is forgiving.** The skill-count check is advisory: failure warns, zero skills is reported, and the tap is still added. Rationale (PRD, US-4): a temporary network problem shouldn't block setup. Trade-off: typos get registered (see Risks).
- **Removal is cautious but non-destructive.** Always confirm after listing affected skills, then clear only the tap association. Rationale (PRD, US-15/US-16): removing a source never breaks current agents.
- **Bare-name resolution is exact, not fuzzy.** A bare name (no `/`, not starting with `http`) is matched case-insensitively and exactly across all taps. One match installs, several prompt (or error under `--yes` with full paths), none is an error. Rationale (PRD, US-17/US-19): feels like `brew install` while ensuring automation never guesses.
- **Discovery is recursive and case-insensitive on `SKILL.md`**, with a tap path that is itself a skill treated as a single skill, and a fixed number of GitHub requests per tap. Rationale (PRD, US-26/US-27/US-28): any repo layout works and large taps stay under rate limits.
- **Search ranks per tap, not globally.** Exact > prefix > substring > subsequence, best-first within each tap, with non-matching taps omitted. Rationale (PRD): results stay grouped by the source the user trusts.
- **Install status is by name.** A skill is "installed" when any installed skill has that name; "up to date" when the SHAs are equal. Rationale (PRD): simple badge for spotting what to install or upgrade. Trade-off: a same-named skill from another repo counts as installed (see Risks).
- **Comparable version identifiers.** The SHA discovery reports for a tapped skill must be comparable with what install and update record for it. The PRD calls the current inconsistency a likely bug, so the spec states the intended outcome (unchanged skills show "up to date") and doesn't prescribe which kind of identifier to use. That choice is shared with the skill-versioning change.

## Risks / Trade-offs

All items are from the PRD's Further Notes.
- [Inconsistent SHAs cause permanent "update available"] → Specified as intended behavior in `skill-search` ("Unchanged skills installed from a tap show as up to date"). Must be resolved together with skill-versioning; the PRD hasn't reproduced it against live GitHub.
- [Tap errors hidden when nothing matches] → Specified: errors are shown even when nothing matched.
- [Bare-name resolution hides tap failures: an unreachable tap yields "not found in any tap" with no mention of the failure] → Not specified as a requirement, because the PRD states no intended behavior for install-time tap errors. See Open Questions.
- [Ambiguity within one tap: same-named directories at different depths can only be told apart by short SHA, and the lockfile is keyed by name, so only one can be installed] → The spec requires full `owner/repo/path` alternatives only in the `--yes` error, because that is all the PRD states. The picker is an Open Question.
- [Large repos silently truncated, while augy prints a fallback message it doesn't act on] → Specified: no silent loss of skills.
- [Misleading path prompt: the prompt says blank means repo root but blank accepts `skills`, and `--path` help says "(default: skills)" though omitting it prompts] → Spec keeps the PRD's decisions (prompt with default `skills`; explicit empty `--path` means root). Whether blank at the prompt should mean root is an Open Question.
- [Typos get registered because a failed check still adds the tap] → Accepted trade-off of the forgiving add (US-4).
- [Private repos may fail at the download step because the downloader may not use the `gh` login (inferred, unverified)] → Spec requires private repos to work for tapping and discovery; end-to-end install is an Open Question.
- [README omits the `gh` prerequisite and presents `GITHUB_TOKEN` as the rate-limit control] → Documentation issue; no spec change.
- [README implies support beyond github.com] → GitHub Enterprise Server is Out of Scope.
- [Name-only install status marks a skill installed even if it came from a different repo] → Accepted per the PRD decision.

## Migration Plan

N/A — archived.

## Open Questions

- From the PRD: should a tap URL that includes `/tree/<ref>/<path>` set the tap's path (and ref) instead of silently dropping it? (Specs currently follow the PRD decision: dropped.)
- Should leaving the interactive path prompt blank mean repo root, as its wording suggests, or accept the `skills` default? The specs require only that accepting the default yields `skills` and that `--path ""` yields root.
- When a tap can't be reached during bare-name resolution, should augy name the failing tap instead of only reporting "not found in any tap"?
- Should the interactive bare-name picker show each candidate's full path, so same-named skills within one tap can be told apart?
- Must `augy install <name>` from a private tap succeed using only the `gh` login (no `GIGET_AUTH` or other token), given US-9's "exactly the way I'd tap a public one"?
- Is search matching case-insensitive? The PRD states case-insensitivity for bare-name resolution and `SKILL.md`, but not for search queries.
- What should `augy search` show when no taps are registered? The PRD gives a hint only for `augy tap list`.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | taps: Register a tap from shorthand or URL |
| US-2 | taps: Register a tap from shorthand or URL |
| US-3 | taps: Check a new tap by counting its skills |
| US-4 | taps: Tap registered even when the check fails |
| US-5 | taps: Tap subdirectory from --path |
| US-6 | taps: Prompt for subdirectory when --path is omitted |
| US-7 | taps: Tap subdirectory from --path |
| US-8 | taps: Free-text tap description |
| US-9 | taps: Discovery uses only GitHub and the user's GitHub CLI login |
| US-10 | taps: Discovery uses only GitHub and the user's GitHub CLI login |
| US-11 | taps: One tap per repo |
| US-12 | taps: List registered taps |
| US-13 | taps: Hint when there are no taps |
| US-14 | taps: Unregister a tap |
| US-15 | taps: Warn and confirm before removing a tap |
| US-16 | taps: Removing a tap never uninstalls skills |
| US-17 | taps: Bare name resolves by exact case-insensitive match across taps |
| US-18 | taps: Choose among ambiguous bare-name matches |
| US-19 | taps: Ambiguous bare name fails under --yes |
| US-20 | taps: Bare name not found in any tap |
| US-21 | taps: Bare-name installs record source and tap |
| US-22 | skill-search: Browse all skills with no query |
| US-23 | skill-search: Fuzzy name matching with ranked results |
| US-24 | skill-search: Each discovered skill has a version identifier; Install status per result; Unchanged skills installed from a tap show as up to date |
| US-25 | skill-search: Taps searched in parallel with per-tap errors |
| US-26 | skill-search: Skills discovered at any depth; No silent loss of skills in large repos |
| US-27 | skill-search: SKILL.md matched case-insensitively |
| US-28 | skill-search: Fixed request budget per tap |
| US-29 | skill-search: Hint when nothing matches |
| PD: trust model, no central index | Design: A tap is only a pointer |
| PD: lockfile storage, keyed by owner/repo, fields | taps: Tap entry recorded in the lockfile |
| PD: tapped only once, identity owner/repo | taps: One tap per repo |
| PD: track default branch, only owner/repo from argument | taps: Taps track the default branch; Register a tap from shorthand or URL |
| PD: prompt with default `skills` | taps: Prompt for subdirectory when --path is omitted |
| PD: check failure warns, zero skills reported | taps: Check a new tap by counting its skills; Tap registered even when the check fails |
| PD: duplicate add is a successful no-op | taps: One tap per repo |
| PD: remove confirms, clears association, never uninstalls | taps: Warn and confirm before removing a tap; Removing a tap never uninstalls skills |
| PD: removing unregistered tap is an error | taps: Unregister a tap |
| PD: bare-name definition | taps: Bare-name detection |
| PD: live exact case-insensitive resolution | taps: Bare name resolves by exact case-insensitive match across taps |
| PD: one/several/no matches | taps: Bare name resolves...; Choose among ambiguous bare-name matches; Ambiguous bare name fails under --yes; Bare name not found in any tap |
| PD: records owner/repo/path source and tap | taps: Bare-name installs record source and tap |
| PD: SKILL.md case-insensitive, name = directory | skill-search: Skills discovered at any depth; SKILL.md matched case-insensitively |
| PD: path that is itself a skill; sorted by name | skill-search: Tap path that is itself a skill; Skills discovered at any depth |
| PD: version identifier per skill | skill-search: Each discovered skill has a version identifier |
| PD: fuzzy scoring, per-tap ranking | skill-search: Fuzzy name matching with ranked results |
| PD: name-only status, SHA equality | skill-search: Install status per result |
| PD: concurrent taps, failing tap shown, empty taps omitted | skill-search: Taps searched in parallel with per-tap errors; Taps with no matches are omitted |
| PD: `gh` login, private repos visible when login can see them | taps: Discovery uses only GitHub and the user's GitHub CLI login |
