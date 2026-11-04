# Design

## Context

See proposal.md (Why) for motivation. This change is documented from the "Skill Inventory" PRD (`docs/prd/skill-inventory.md`, status: shipped at v0.11.0). augy is being archived; the specs record the intended behavior so a validator can compare the shipped code against them. Everything below is derived from the PRD, not from the implementation.

Constraints from the PRD:

- The lockfile is the only store of inventory state; there is no remote service.
- `list` and `info` derive everything from the lockfile plus local disk checks (path existence, archive existence, `SKILL.md` contents).
- The lockfile contains absolute, machine-specific paths, local machine context, and home-repo settings, so it is an inspection artifact, not a portable one. The shareable artifact is `augy.json` (team-manifests change).

## Goals / Non-Goals

**Goals:**

- Answer "what do I have, where from, which version, which agents, pinned, what can I roll back to" from one command, offline.
- Keep the lockfile user-owned: readable, diffable, safe to hand-inspect, and relocatable.

**Non-Goals (from the PRD's Out of Scope):**

- Filtering, sorting, or searching the inventory; `list` has only `--json`, and `info` takes exactly one skill.
- Showing whether a skill is up to date with upstream (that's `augy update` / `augy search`).
- `--json` output for `info`.
- Editing metadata (for example `label`) through these commands.
- Showing context tags or the canonical store path in `list` or `info` (they appear only in the lockfile and `--json`).
- Importing or applying another machine's registry.
- Lockfile schema validation or repair.

## Decisions

1. **One plain-JSON lockfile at `~/.augy/registry.json`, relocatable via `AUGY_HOME`.** Rationale (PRD US-17, US-21): no hidden database; custom locations and isolated test harnesses must work.
2. **Pretty-printed, stable formatting and atomic replace-on-write.** Rationale (PRD US-18, US-19): the file must be diffable or committable to dotfiles, and an interrupted command must never leave a half-written registry. The PRD names the mechanism (write a temporary file, then rename into place); the specs state only the outcome.
3. **A missing lockfile is an empty registry; missing sections from older formats are filled in.** Rationale (PRD US-20, PD): first run and upgrades must just work.
4. **An unparseable lockfile is not silently treated as empty or overwritten.** Rationale: the PRD's Further Notes present silent emptying as undercutting the "readable, editable lockfile" promise (US-17). This is distinct from schema validation or repair, which stay out of scope.
5. **`list` and `info` are strictly read-only and make no network calls.** Rationale (PRD US-22, PD): inventory must work for firewalled users and must be safe to run anytime.
6. **"Untracked" in list means no source or SHA `unversioned`; otherwise show `@<short SHA>`.** Sourceless skills get the exact `augy set-source` command. Rationale (PRD US-7, PD).
7. **List shows a version count plus the three most recent previous versions; info shows the full history, newest first, with archive status.** Rationale (PRD US-6, US-13): list stays compact while still answering "can I roll back?"; info answers "which versions can actually be restored?".
8. **Info checks the disk for every deployment path and archive.** Rationale (PRD US-12, US-13): users must notice when something outside augy deleted files.
9. **The info preview comes from the first active agent deployment's `SKILL.md`, skipping the first top-level heading and showing up to five non-empty lines until the next heading.** The specs also require skipping YAML frontmatter, because the PRD's Further Notes present showing raw frontmatter as a defect against US-14.
10. **`list --json` prints the whole registry, not just skills.** Rationale (PRD US-9, US-23, PD): scripts and auditors see exact sources and SHAs plus taps, home, and machine context.
11. **Skills keep insertion order.** Rationale: PRD decision; no sorting.
12. **Unknown skill in `info` is an error with a non-zero exit and a pointer to `augy list`.** Rationale (PRD US-16).

## Risks / Trade-offs

All items below come from the PRD's Further Notes.

- [Sourceless skills display oddly in info] → Info shows an empty source line (list shows "unknown") and a short SHA of `unversi`, because `unversioned` is cut to seven characters. See Open Questions.
- [The info preview reads from an agent folder, not the canonical store] → It shows nothing if no deployment is active or that path is missing. Accepted per Decision 9.
- [The lockfile isn't portable] → It holds absolute, machine-specific paths, machine context, and home-repo settings; no augy command reads another machine's registry. Teams should share `augy.json`. The README's "commit and share" wording overstates this.
- [`--json` exposes local-only settings] → Output includes the home-repo configuration and machine context, which the registry describes as "local only, never pushed". People sharing a dump for audit should know.
- [Dates use the system locale's format] → Consistent on one machine, different across machines.
- [Docs gaps] → The README's layout diagram omits `store/` and `skillsets.json`, and says list shows "version history" when it shows a count and the last three entries.

## Migration Plan

N/A — archived.

## Open Questions

- (PRD) Should `augy list` warn when deployment paths are missing, as `augy info` does? Today it doesn't check the disk.
- How should `augy info` present a sourceless skill's source and SHA? The specs don't fix this; the PRD notes the current display ("unversi", empty source) is odd but doesn't state the intended form.
- When the lockfile can't be parsed, should augy stop with an error for every command, or only refuse to write? The specs require only that it not be silently treated as empty or overwritten.
- What should the info preview show when there is no active deployment, or its `SKILL.md` is missing: nothing, or a fallback to the canonical store copy?

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | List shows every registered skill |
| US-2 | List shows the short SHA of tracked skills |
| US-3 | List shows every registered skill |
| US-4 | List marks inactive deployments |
| US-5 | List shows a pinned badge |
| US-6 | List summarizes version history |
| US-7 | List marks untracked skills and gives the set-source fix |
| US-8 | Empty list points to install |
| US-9 | List JSON prints the entire registry |
| US-10 | Info shows source, tap, and SHA |
| US-11 | Info shows each deployment path with its disk status |
| US-12 | Info shows each deployment path with its disk status |
| US-13 | Info shows full version history with archive status |
| US-14 | Info previews the skill's SKILL.md |
| US-15 | Info shows dates, pin status, and label |
| US-16 | Info reports an unknown skill |
| US-17 | Inventory lives in one plain-JSON lockfile; Unreadable lockfile is not silently discarded |
| US-18 | Lockfile is pretty-printed with stable formatting |
| US-19 | Lockfile writes are atomic |
| US-20 | Older lockfile formats are upgraded in place |
| US-21 | AUGY_HOME relocates all augy state |
| US-22 | Inventory commands are read-only and offline |
| US-23 | List JSON prints the entire registry (with List shows every registered skill for the text form) |
| PD: both commands are read-only, no network | Inventory commands are read-only and offline |
| PD: what counts as "untracked" | List marks untracked skills and gives the set-source fix; List shows the short SHA of tracked skills |
| PD: history shown by list / info | List summarizes version history; Info shows full version history with archive status |
| PD: info checks the disk | Info shows each deployment path with its disk status; Info shows full version history with archive status |
| PD: description preview | Info previews the skill's SKILL.md |
| PD: `--json` prints the entire registry | List JSON prints the entire registry |
| PD: skill order | List shows every registered skill |
| PD: not-found handling | Info reports an unknown skill |
| PD: on-disk layout | Augy home folder layout; AUGY_HOME relocates all augy state |
| PD: lockfile content per skill; label shown by info | Per-skill lockfile contents; Info shows dates, pin status, and label |
| PD: writes are atomic | Lockfile writes are atomic; Decision 2 |
| PD: missing lockfile is empty registry | Missing lockfile is an empty registry |
