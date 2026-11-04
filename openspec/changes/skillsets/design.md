# Design

## Context

This change specifies skillsets and `augy use` as described in docs/prd/skillsets.md (status: shipped in v0.10.0, documented from v0.11.0). See proposal.md for the motivation. It depends on concepts owned by other PRDs:

- The canonical store (one copy of each skill at `~/.augy/store/<skill>/`, linked into each agent's skills folder) and agent detection with a fixed agent order come from docs/prd/multi-agent-support.md.
- "Installed" means present in the skills lockfile, which is owned by the skill-installation PRD.
- Skills installed as plain copies (before v0.11.0, or by sync, home pull, authoring and scan adoption) are the subject of docs/prd/store-migration.md.

The behavior contracts are in `specs/skillsets/spec.md` and `specs/skillset-activation/spec.md`. This document records the product decisions behind them, the PRD's known risks, and the open questions.

## Goals / Non-Goals

**Goals:**

- Named skillsets that users can manage and inspect from the CLI and read or edit as a file.
- One command that switches one agent's active skills to a skillset by linking and unlinking only.
- Edits to skillsets and switches between them that can never delete or copy a skill.

**Non-Goals** (PRD Out of Scope):

- Installing, uninstalling or downloading skills. `augy use` links only installed skills; `skillset add` never installs.
- Switching several agents in one command.
- Remembering or reporting which skillset is active.
- Renaming, nesting or composing skillsets, or per-skillset versions or pins.
- Sharing skillsets through team manifests or the home repo (`augy bundle`, `augy sync`, `augy home push/pull`).
- Managing copy-based skills, including legacy per-agent copies and team-manifest copies.
- Atomic, all-or-nothing switching. Changes are applied one at a time; per-skill failures are reported, not rolled back.

## Decisions

1. **Skillsets get their own file, separate from the skills lockfile.** `skillsets.json` under the augy home (follows `AUGY_HOME`), versioned (`"version": 1`), with `name`, `skills`, `createdAt`, `updatedAt` per set. Rationale (PRD US-28): users can read, back up and edit it by hand, and editing skillsets can't damage the lockfile.
2. **A skillset is a list of names only.** No source, version or agent. Membership is by name and order of addition is kept. Rationale (PRD PD): a skillset is a view over installed skills, so one skill can belong to many sets while existing once (US-17), and sets can be planned before their skills are installed (US-5).
3. **Corruption is a hard stop, never a reset.** Invalid JSON stops every command that reads skillsets, and the file is left alone. Rationale (US-29): silently starting over would lose the user's sets. The PRD contrasts this with the skills lockfile, which is treated as empty when corrupt.
4. **Editing a set never touches skills.** `add` doesn't install, `remove` and `delete` don't uninstall, and delete's confirmation says so. Rationale (US-7, US-11): cleaning up sets must always be safe.
5. **`augy use` works only through symlinks.** It removes symlinks and creates symlinks; it never deletes or copies skill files, and it ignores entries that aren't symlinks. Rationale (US-15, US-16, US-17): switching can't destroy a skill, and skills augy doesn't manage as links are never touched.
6. **Links target the canonical copy first.** Fallback order: canonical copy, then this agent's recorded location, then any other agent's recorded location that still exists. Rationale (US-27): links into the store are what later `augy update` runs refresh.
7. **One agent per run, resolved `--agent` > `AUGY_DEFAULT_AGENT` > first detected agent in the fixed order.** Unknown IDs and "no agent detected" are errors listing known IDs. Rationale (US-19 to US-22): predictable targeting with a sensible default and a fixable error.
8. **Guard rails before agent resolution.** An empty skillset warns and exits successfully before the agent is chosen; a set with no installed skills warns and changes nothing. Rationale (US-24, US-23): a mistake can't wipe out every active skill.
9. **Plan first, then apply; dry run stops after the plan.** The plan lists agent, skillset, Remove, Add and Already active. Rationale (US-18): the user can check a switch before it happens, and the preview matches the real run.
10. **Per-skill problems are collected, not fatal.** Rationale (US-23, US-26): one bad skill doesn't block the switch; the end-of-run summary gives counts and errors.

## Risks / Trade-offs

All from the PRD's Further Notes.

- [`augy use` removes every symlink not in the set, including links the user or another tool made] → Targets aren't deleted, but the links vanish without warning. Left as the decided behavior; see Open Questions.
- [The lockfile isn't updated by `augy use`] → `augy list`/`info` can show skills as active after `use` removed them; `augy uninstall` may leave dangling links that `use` created; `augy diff` may fail on a removed location; `augy rollback` may write a copy back into a location `use` switched off. See Open Questions.
- [A copy in the set produces a misleading plan] → The skill is listed under Add, then fails with "Could not link" because the name is taken. Affects skills from team-manifest sync, home-repo pull, pre-v0.11.0 installs, and probably self-authored skills. Mitigated by store-migration; see Open Questions.
- [Auto-detection silently picks one agent] → A user with several agents may switch the wrong one. The plan names the agent before changes are made.
- [`AUGY_DEFAULT_AGENT` is documented as broader than it is] → Only `augy use` reads it; install and sync ignore it.
- [Not atomic] → A failure partway leaves a mixed state, and the command still exits successfully when per-skill errors occur. Accepted per Out of Scope.
- [Messages overstate success] → `skillset add` reported skipped duplicates as added; `skillset remove` reported names not in the set as removed; the `use` header's skill count includes uninstalled skills. The specs require add/remove not to report skipped names as done (US-6, US-8).
- [No referential cleanup] → Uninstalling a skill doesn't remove it from skillsets, and typos in `skillset add` stay in the set; later `use` runs warn "not installed — skipping".
- [Hard-coded path in output] → `skillset create` prints `~/.augy/skillsets.json` even when `AUGY_HOME` points elsewhere.
- [Docs-site gap] → Only the README documents skillsets and `augy use`.
- [Unverified original acceptance criteria] → The original request's under-two-seconds switch time and lint gate are untested.

## Migration Plan

N/A — archived.

## Open Questions

1. (PRD) Should `augy use` only consider symlinks that point into augy's canonical store, so that user-made links and other tools' links are safe?
2. (PRD) Should `augy use` record what it links and unlinks in the skills lockfile, so that `list`, `info`, `uninstall`, `diff` and `rollback` see the switched state?
3. When a skill in the set already exists in the agent folder as a plain copy, should the plan list it as already active, as skipped, or as a per-skill error, instead of listing it under Add and then failing? The PRD calls the current plan misleading but doesn't state the intended behavior.
4. Should `augy use` exit non-zero when per-skill errors occur? The PRD notes it exits successfully and doesn't say whether that's intended.
5. Should `skillset create` print the actual skillsets file path under `AUGY_HOME`? The PRD flags the hard-coded path but doesn't state a requirement.
6. Should uninstalling a skill remove it from skillsets, and should `skillset add` validate names beyond the not-installed warning? The PRD lists the lack of referential cleanup without deciding.
7. Should the `use` header's skill count exclude skills that aren't installed?
8. A symlink whose name is in the set counts as already active even if it points somewhere other than the canonical copy (PRD PD). Should such a link be repointed? The specs follow the PRD and leave it in place.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | skillsets: Create an empty skillset |
| US-2 | skillsets: Skillset names are letters, digits and hyphens |
| US-3 | skillsets: Duplicate skillset names are rejected |
| US-4 | skillsets: Add several skills in one command |
| US-5 | skillsets: Adding a skill that isn't installed warns but proceeds |
| US-6 | skillsets: Adding a skill already in the set is skipped |
| US-7 | skillsets: Removing skills from a set never uninstalls them |
| US-8 | skillsets: Removing a skill not in the set warns |
| US-9 | skillsets: List skillsets |
| US-10 | skillsets: Show one skillset |
| US-11 | skillsets: Delete a skillset after confirmation |
| US-12 | skillsets: Delete without a prompt using --yes |
| US-13 | skillsets: Bare skillset command shows help |
| US-14 | skillset-activation: augy use makes one agent's linked skills match the set |
| US-15 | skillset-activation: Switching never deletes skill files |
| US-16 | skillset-activation: Plain copies are never touched |
| US-17 | skillset-activation: Switching never copies skills; skillsets: A skillset holds skill names only |
| US-18 | skillset-activation: The plan is printed before any change; Dry run previews the switch without changing anything |
| US-19 | skillset-activation: Only the chosen agent is affected |
| US-20 | skillset-activation: AUGY_DEFAULT_AGENT sets the default agent |
| US-21 | skillset-activation: Fall back to the first detected agent |
| US-22 | skillset-activation: Unknown or missing agent is an error listing known IDs |
| US-23 | skillset-activation: Skills that aren't installed are skipped with a warning |
| US-24 | skillset-activation: An empty skillset changes nothing |
| US-25 | skillset-activation: Re-running a switch reports already up to date |
| US-26 | skillset-activation: Summary after the switch; Per-skill problems are collected and don't abort the switch |
| US-27 | skillset-activation: New links point at the canonical copy |
| US-28 | skillsets: Skillsets are kept in a readable file under the augy home |
| US-29 | skillsets: A corrupted skillsets file stops augy with an error; skillset-activation: Corrupted skillsets file stops augy use |
| PD: own file, format, `AUGY_HOME` | skillsets: Skillsets are kept in a readable file under the augy home; Decision 1 |
| PD: names only, order kept | skillsets: A skillset holds skill names only; Add several skills in one command; Decision 2 |
| PD: invalid JSON stops commands | skillsets: A corrupted skillsets file stops augy with an error; Decision 3 |
| PD: create/add/remove/list/show/delete rules | skillsets requirements above; Decision 4 |
| PD: nonexistent skillset is an error | skillsets: Naming a skillset that doesn't exist is an error; skillset-activation: Using a skillset that doesn't exist is an error |
| PD: one agent, resolution order, errors | skillset-activation: Only the chosen agent is affected; AUGY_DEFAULT_AGENT sets the default agent; Fall back to the first detected agent; Unknown or missing agent is an error listing known IDs; Decision 7 |
| PD: empty set before agent resolution | skillset-activation: An empty skillset changes nothing; Decision 8 |
| PD: uninstalled skills skipped; none installed changes nothing | skillset-activation: Skills that aren't installed are skipped with a warning |
| PD: only symlinks considered; copies never removed | skillset-activation: augy use makes one agent's linked skills match the set; Plain copies are never touched; Decision 5 |
| PD: link target fallback order | skillset-activation: New links point at the canonical copy; Decision 6 |
| PD: plan printed first; `--dry-run` stops after plan | skillset-activation: The plan is printed before any change; Dry run previews the switch without changing anything; Decision 9 |
| PD: per-skill problems collected | skillset-activation: Per-skill problems are collected and don't abort the switch; Decision 10 |
| PD: never deletes, never copies | skillset-activation: Switching never deletes skill files; Switching never copies skills |
