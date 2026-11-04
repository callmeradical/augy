# Design

## Context

Derived from `docs/prd/skill-installation.md` (documented from v0.11.0, commit c725774). See proposal.md for motivation. The specs (`skill-install`, `skill-uninstall`) state what install and uninstall must do as seen from the CLI, the lockfile, and the files in augy's home and each agent's skills folder. Neighboring areas are specified elsewhere: agent detection, the store and linking, and GitHub access in `multi-agent-support`; taps in `taps-and-discovery`; update, diff, rollback, pin, and version history in `skill-versioning`; product-wide rules in `augy-cli-foundation`.

## Goals / Non-Goals

**Goals:**
- Any common way of pointing at a skill on GitHub installs it in one command, interactively or unattended.
- Every install leaves a lockfile record complete enough for later update, diff, and rollback.
- Uninstall removes the skill everywhere in one confirmed step without losing archives by default.

**Non-Goals (from the PRD's Out of Scope):**
- Installing from a local folder, or from GitLab, Bitbucket, other non-GitHub hosts, or a GitHub Enterprise Server host.
- Version ranges, semantic versioning, or dependency resolution between skills.
- Choosing a ref with shorthand or with an abbreviated commit SHA; refs come only from `tree/` and `blob/` URLs, and only full 40-character SHAs are accepted as commit refs.
- Renaming or aliasing a skill at install time, and namespacing same-named skills from different sources.
- Project-local installs; only each agent's user-level skills folder is used.
- Validating, linting, or security-scanning skill contents.
- Non-interactive uninstall, uninstalling from only some agents, and removing an uninstalled skill from skillsets.

## Decisions

- **Classify input by shape.** No `/` and no `http` prefix means a bare name resolved through taps; anything else is a GitHub reference. Rationale (PRD): installing a trusted skill should take one word (US-6) while URLs and shorthand stay unambiguous.
- **Bare names match exactly and case-insensitively, across all taps.** Ambiguity prompts interactively and fails under `--yes` with full-path commands. Rationale (PRD): the user must never get a skill from a source they didn't mean (US-7), and CI installs must stay deterministic (US-22).
- **A skill is a directory with `SKILL.md` in any case; discovery goes to any depth and sorts by name.** Rationale (PRD): flat, categorized, and deeply nested catalogs, and authors with different conventions, all work (US-8, US-9).
- **The directory name is the skill's identity** (registry key, store folder, agent folder), with no namespacing. A same-named install replaces the existing one. Rationale: the PRD states this as a product decision; namespacing is explicitly out of scope.
- **Interactive picker always shown; new skills pre-selected, installed ones labeled and unselected.** Rationale (PRD): re-running install on a repo adds only what's new by default (US-11), and the user always sees what they're about to install (US-13).
- **Nothing is written until the summary is confirmed.** Rationale (PRD): US-14.
- **`--yes` contract.** No prompts; installs every discovered skill, including installed ones; agents from `--agent` or all detected; exit 1 for no source, ambiguous or unknown bare name, unresolvable or empty source, and empty agent list. Rationale (PRD): CI provisioning must be scriptable and must never hang or look successful when it installed nothing (US-19 to US-23).
- **Install writes one store copy and points each agent path at it, replacing whatever was there without a prompt.** Rationale (PRD): one copy per skill (see `multi-agent-support`), and re-installing repairs a broken deployment.
- **Each skill installs independently.** Rationale (PRD): one bad skill doesn't block the rest (US-28). The PRD states that the registry is saved once at the end; the specs require only that the successful skills end up recorded.
- **Lockfile record fields** (`source`, `tap`, `sha`, `shortSha`, `agents`, `installedAt`, `updatedAt`, `pinned`, `history`, store location). Rationale (PRD): later update, diff, and rollback depend on them (US-26).
- **Re-install keeps `installedAt`, `pinned`, and `history`, and replaces the agent list.** Rationale (PRD): US-27.
- **Uninstall requires a tracked skill, always confirms, and defaults to keeping archives.** Rationale (PRD): users know what will happen before it happens (US-29) and can still recover an old version later (US-31).
- **Uninstall always removes the registry entry, even when some deletions fail.** Rationale (PRD): the registry never keeps tracking a skill the user asked to remove (US-33).

## Risks / Trade-offs

All items below come from the PRD's Further Notes.

- [Default branch] Shorthand and plain repo URLs for repos whose default branch isn't `main` probably fail to download. → Spec requires installing from the real default branch.
- [Private repos] Downloads don't use the GitHub CLI login, so private repos are probably found and then fail to download. → Spec requires private installs to work end to end with the GitHub CLI login.
- [Version identity] Single-path installs record the branch head commit SHA, while multi-skill and tap installs record the skill directory's git tree SHA. Tap installs then probably report spurious updates, and for single-path sources any commit in the repo looks like an update. → The specs require an upstream version identifier and that the content matches it; the product overview's decision that a version is a commit SHA is in `augy-cli-foundation`. Update behavior belongs to `skill-versioning`.
- [Content vs. recorded version] Downloads fetch by branch or tag name, not by the recorded SHA, and may quietly fall back to a cached copy. → Spec requires installed content to match the recorded version.
- [Exit status] Install exits 0 and prints "Done! Registry saved" even when every skill failed. → Spec requires a non-zero exit when every skill failed.
- [Unknown `--agent` IDs] Unknown IDs are silently dropped. With all IDs unknown, interactive install exits "Installation cancelled" with code 0, and `--yes` prints a misleading "no agents detected" message. → The spec covers only the `--yes` empty-list exit; see Open Questions.
- [Stale help and docs] `--agent` help lists only three agents; the README and docs site omit `--yes`, the store, linked agents, and the GitHub CLI requirement; the source prompt doesn't mention bare names. → Documentation, not specified here.
- [Re-install side effects] Re-install drops tags and label, leaves untracked links when fewer agents are chosen, doesn't archive the outgoing version, and refreshes pinned skills. → Specs require keeping tags and label and leaving no untracked deployments; archiving and pinning are Open Questions.
- [Silent name collisions] Same-named skills from different sources overwrite each other; the only hint is the "already installed" label. → Accepted by the identity decision; namespacing is out of scope.
- [`--yes` vs. interactive defaults] `--yes` re-installs everything, including pinned skills, while the interactive default installs only new skills. → Specified as the PRD decides.
- [Discovery] Very large repos warn of a fallback that never runs, and branch names containing `/` in `tree/` URLs are split wrongly. → Specs require complete discovery and correct handling of `/` in branch names.
- [Tap errors] Tap query errors are swallowed and look like "not found in any tap". → Spec requires access errors to be reported as such.
- [Uninstall] No non-interactive mode (out of scope); skillsets keep the removed skill (out of scope); broken links are left on disk (spec requires removing them); the closing message always names `~/.augy/...` even under `AUGY_HOME` (see `multi-agent-support`).
- [Damaged lockfile] An invalid `registry.json` is treated as empty and overwritten, losing all tracking. → Spec requires that this not happen silently.

## Migration Plan

N/A — archived.

## Open Questions

- From the PRD: should install refuse, or warn louder, before replacing an agent directory that augy doesn't track (for example, a hand-written skill with the same name)? Today it replaces it without asking, and the spec records that decision.
- Should re-install archive the outgoing version so it can be rolled back to? The PRD decision says it doesn't; the Further Notes list this as lost state.
- Should re-install, and `--yes`, respect pinning instead of refreshing a pinned skill's content? The PRD decision says pinning is ignored; the Further Notes flag the difference from the interactive default.
- What should install do with unknown `--agent` IDs: drop them silently (the PRD decision), or fail and list the valid IDs (the Further Notes suggestion)? Also, should interactive install exit non-zero when every named ID is unknown?
- Is the recorded `sha` always a commit SHA, as the product overview decides, or may it be a tree SHA for multi-skill sources? This needs settling with `skill-versioning`.
- When some but not all skills fail, what should the exit code be? The PRD only shows that all-failed must not look like success.
- For a damaged lockfile, should install warn and continue, back the file up, or refuse to run? The PRD says only that tracking must not be lost silently.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | skill-install: Install from a repo URL |
| US-2 | skill-install: Install from a tree URL at a specific ref |
| US-3 | skill-install: Install from a blob URL to SKILL.md |
| US-4, US-5 | skill-install: Install from owner/repo shorthand |
| US-6 | skill-install: Classify the install source; Resolve a bare name through taps; Tap access errors are not reported as misses |
| US-7 | skill-install: Resolve a bare name through taps |
| US-8 | skill-install: Discover skills at the target location; Discovery is complete in large repos |
| US-9 | skill-install: Recognize SKILL.md in any case |
| US-10, US-12, US-13 | skill-install: Interactive skill picker |
| US-11 | skill-install: New skills pre-selected, installed skills not |
| US-14 | skill-install: Summary and confirmation before writing |
| US-15, US-16, US-17 | skill-install: Choose target agents |
| US-18 | skill-install: Plain augy starts the install flow |
| US-19 | skill-install: --yes installs everything with no prompts |
| US-20 | skill-install: --yes agent targets |
| US-21 | skill-install: --yes requires a source |
| US-22 | skill-install: --yes fails on an ambiguous bare name |
| US-23 | skill-install: --yes agent targets; A run where every skill failed is not a success |
| US-24 | skill-install: Install from a tree URL at a specific ref |
| US-25 | skill-install: Install from private repos with the GitHub CLI login; Tap access errors are not reported as misses |
| US-26 | skill-install: Lockfile record for each installed skill; Installed content matches the recorded version; A damaged lockfile is not silently reset |
| US-27 | skill-install: Re-install keeps the skill's history; Re-install keeps the skill's tags and label; Re-install leaves no untracked deployments |
| US-28 | skill-install: One failed skill doesn't stop the others |
| US-29 | skill-uninstall: Preview before uninstalling; Uninstall always asks for confirmation |
| US-30 | skill-uninstall: Remove the skill everywhere it was deployed; Broken links are removed too |
| US-31, US-32 | skill-uninstall: Archived versions kept unless the user chooses otherwise |
| US-33 | skill-uninstall: Registry entry removed even when deletions fail |
| PD Input classification | skill-install: Classify the install source |
| PD Accepted GitHub references | skill-install: Install from a repo URL; tree URL; blob URL; owner/repo shorthand |
| PD Bare-name resolution | skill-install: Resolve a bare name through taps; Bare name not found; --yes fails on an ambiguous bare name |
| PD What counts as a skill | skill-install: Recognize SKILL.md in any case; Discover skills at the target location |
| PD Directory name is identity | skill-install: A skill's directory name is its identity |
| PD Selection and confirmation | skill-install: Interactive skill picker; New skills pre-selected, installed skills not; Choose target agents; Summary and confirmation before writing |
| PD Unknown `--agent` IDs silently dropped | Design (Risks; Open Questions); skill-install: --yes agent targets (empty-list case) |
| PD `--yes` contract | skill-install: --yes installs everything with no prompts; --yes agent targets; --yes requires a source; --yes fails on an ambiguous bare name; --yes fails when there is nothing to install |
| PD What install writes | skill-install: Installed skills deploy through the store; One failed skill doesn't stop the others |
| PD Tracking fields | skill-install: Lockfile record for each installed skill |
| PD Re-install (keeps fields, replaces agents) | skill-install: Re-install keeps the skill's history |
| PD Re-install doesn't archive; ignores pinning | Design (Open Questions) |
| PD Bare `augy` | skill-install: Plain augy starts the install flow |
| PD Uninstall rules | skill-uninstall: all requirements |
