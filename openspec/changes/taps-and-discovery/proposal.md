# Proposal

## Why

Skills live in GitHub repos scattered across authors, open-source collections and private organization repos, so without a way to register trusted sources every install means finding and typing a full URL, and the developer can't see what a source offers, what they already have, or whether their copies are current. Hosted marketplaces solve this with a central index the user has to trust, which can go down, usually can't see private repos and may be unreachable behind a corporate firewall. augy's users want decentralized discovery where the user decides which sources count and GitHub itself is the registry.

## What Changes

- Add Homebrew-style **taps**: a GitHub repo (public or private), optionally scoped to a subdirectory, that the user registers once as a trusted skill source and that is recorded in the user's lockfile.
- `augy tap add <repo> [--path <dir>] [--description <text>]` registers a tap from `owner/repo` shorthand or a GitHub URL, prompts for the skills subdirectory (suggesting `skills`) when `--path` is omitted, checks the tap by counting its skills, and still registers it when the check fails.
- `augy tap list` shows registered taps with subdirectory, description, date added and the number of installed skills that came from each, with a hint to `augy tap add` when there are none.
- `augy tap remove <repo>` lists the installed skills that came from the tap, asks for confirmation, and unregisters the tap without uninstalling any skill.
- `augy install <name>` with a bare name resolves it live, by exact case-insensitive name, across every registered tap; ambiguity brings up a picker (or, with `--yes`, an error listing full-path alternatives); the installed skill remembers its tap.
- `augy search [query]` builds a live index of every skill in every tap, fuzzy-matches names (exact, prefix, substring, subsequence), and shows each skill's upstream short SHA and install status. Taps are searched in parallel and a failing tap reports its error under its own heading.
- Discovery finds `SKILL.md` (case-insensitive) at any depth under a tap's path, using a small fixed number of GitHub requests per tap, authenticated through the user's existing GitHub CLI login.

## Capabilities

### New Capabilities
- `taps`: registering, listing and removing trusted GitHub skill sources, and resolving bare skill names against them at install time.
- `skill-search`: discovering the skills a tap contains and searching across all taps by name, with per-skill version and install status.

### Modified Capabilities
<!-- None: no existing specs in openspec/specs/. -->

## Impact

- CLI commands: new `augy tap add`, `augy tap list`, `augy tap remove`, `augy search`; `augy install` gains bare-name resolution (and its `--yes` behavior for ambiguous names); `augy info` shows a skill's tap provenance.
- User files: taps are stored in the lockfile `~/.augy/registry.json` (or under `AUGY_HOME`), and installed skills record the tap they came from.
- Prerequisites: the GitHub CLI (`gh`), installed and logged in, supplies authentication and rate limits for discovery. No other service or account is involved.
- Related PRDs: skill-installation (install flow, `--yes`), skill-versioning (version identifiers shared with `augy update`; see its note on inconsistent SHAs), skill-inventory (`augy info`).
