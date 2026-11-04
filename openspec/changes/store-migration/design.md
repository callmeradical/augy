# Design

## Context

docs/prd/store-migration.md is a **draft, not shipped**. Its Implementation Decisions mix decided rules with items marked **(open)**. The specs in `specs/store-migration/spec.md` cover only the decided items. Every open item is listed under Open Questions below, and tasks.md blocks the work that depends on them.

See proposal.md for the motivation. The canonical store and link model come from docs/prd/multi-agent-support.md: one copy per skill at `store/<skill>/` under the augy home, agent skills folders hold symlinks to it, and the registry (`registry.json`) records each skill's store location and per-agent paths. The end state of a migrated skill is that same layout.

The PRD describes uncommitted draft work (a top-level `augy migrate`) that targets an earlier store location (`~/.augy/skills/`) and an earlier registry field. The PRD drops that location. The target is the shipped `store/` under the augy home. This design doesn't describe or rely on the draft's code.

## Goals / Non-Goals

**Goals:**

- One explicit, safe command that converts every tracked copy-based skill to the canonical-store layout.
- No loss of registry detail (history, pins, tags, tap, SHA, source, agent list).
- Repeat-safe and failure-contained, with a report of what was and wasn't migrated.
- Migrated skills indistinguishable from fresh v0.11.0 installs for `update`, `use`, `uninstall`, `list`, `info`, `diff` and `rollback`.

**Non-Goals** (PRD Out of Scope):

- Changing how fresh installs work. They already use the store.
- Migrating skills augy doesn't track. Users adopt them first with `augy scan` (docs/prd/adopting-existing-skills.md).
- Merging diverged copies line by line. At most the user picks one copy.
- Moving or rewriting the version archive under `~/.augy/versions/`.
- Reverting a store-backed skill to per-agent copies.

## Decisions

Decided product rules from the PRD, as design constraints:

1. **Target is the shipped store.** `store/<skill>/` under the augy home, following `AUGY_HOME`. The draft's `~/.augy/skills/` is dropped. Rationale: the PRD notes that restoring the draft as-is would build a second, parallel store (US-19).
2. **Migrated means fresh-install equivalent.** One stored copy, every recorded agent install a symlink to it, registry records store-backed. Rationale: migrated skills must update in every agent at once, work with skillsets, and take one copy on disk (US-1, US-4, US-16).
3. **Registry details carry over unchanged.** Source, SHA, version history, pin state, tags, source tap and agent list. Only file locations change. Rationale: reinstalling loses history and pins, which is the problem being solved (US-2, US-3).
4. **Skip what's already store-backed.** Rationale: the command must be safe to run any number of times (US-9). Whether "store-backed but agents still hold copies" counts as migrated is open (OQ-1).
5. **Scope is the registry and its recorded paths only.** Rationale: migration must only affect skills the user put under augy's management (US-20).
6. **Contain each failure.** A failure on one skill leaves that skill's agent installs as before and doesn't affect others. Rationale: a migration error must never leave an agent without a working skill (US-11). This rules out the draft's order of deleting an agent's install before its link exists, and the draft's single registry write at the end of the run (PRD Further Notes, Risks in the draft).
7. **Skip and report what can't be migrated.** A skill with no usable real directory is skipped, left untouched, and listed with its reason (US-10).
8. **Sourceless skills are first-class.** Adopted and authored skills migrate the same way (US-12, US-13). Reinstalling isn't possible for them, so migration is their only route to the store.
9. **An explicit command exists.** The Solution calls for "one safe command". Its name and placement (OQ-4) and whether migration also happens automatically (OQ-5) are open.

## Risks / Trade-offs

From the PRD's Further Notes:

- [Working-tree state] → An unresolved `git stash pop` conflict affects install, uninstall, update, use and the registry. The PRD says the committed side should win. The only unshipped stash work is the untracked `augy migrate` file, which must be pointed at the committed store location and registry field before it can work.
- [Shipped update bug motivating this PRD] → Copy-based skills stop updating in their agents after the first update, while augy reports them current. It affects every user upgrading from 0.10.x or earlier, with no warning. Whether migration repairs already-affected skills is OQ-1.
- [Draft silently keeps the first agent's copy when copies diverge] → User edits can be lost. See OQ-2.
- [Draft deletes each agent install before creating the symlink] → A failure in between leaves the agent without the skill. Ruled out by Decision 6.
- [Draft has no preview or confirmation] → See OQ-3.
- [Draft writes the registry once at the end] → A crash midway leaves files migrated but not recorded. Ruled out by Decision 6. How a rerun recognises such a skill is OQ-8.
- [Sources of new copies remain] → `augy sync`, `augy home pull`, `augy author new`, `augy rollback` and scan adoption still produce copies, so migration may need to be run repeatedly. See OQ-6.
- [No test prior art] → No existing test runs a command against a real temporary augy home. The acceptance criteria are about real files and symlinks, so tasks.md calls for filesystem-level tests against a temporary `AUGY_HOME`.

## Migration Plan

This change is itself the migration path for pre-v0.11.0 and copy-based skills. Rollout steps depend on OQ-4 (command name) and OQ-5 (automatic vs. explicit). Reverting a store-backed skill to copies is out of scope. Otherwise N/A — archived.

## Open Questions

From the PRD's **(open)** items. These must be resolved before the blocked slices in tasks.md proceed:

- **OQ-1 Repairing store-backed skills whose agents hold copies.** PRD proposal: skills marked store-backed whose agent installs are still copies (the update gap) count as *not* migrated and get repaired. Affects US-5 and the repeat-safety rule. If adopted, decide which copy becomes the stored one when the store copy is newer than the agents' copies.
- **OQ-2 Diverged copies.** The draft silently keeps the first copy. PRD proposal: detect the difference, prompt the user to pick, or skip the skill with a report in non-interactive mode. Affects US-7, US-8 and US-18.
- **OQ-3 Preview and confirmation.** PRD proposal: a `--dry-run` preview, and a confirmation prompt that `--yes` skips, matching `augy sync`. Affects US-6 and US-18. The Solution says the command should "show what it will do before doing it", but the mechanism is open.
- **OQ-4 Command name and placement.** Options: top-level `augy migrate` (the draft), a more specific name such as `augy store migrate`, or making it automatic. `augy tag migrate` already exists and means something unrelated (assigning context tags).
- **OQ-5 Automatic vs. explicit.** Should migration also happen on its own, for example when a legacy skill is updated or used?
- **OQ-6 Closing the sources of new copies.** Sync, home pull, author new, rollback and scan adoption still produce copies. Is changing them in scope for this PRD?

Raised while writing the specs:

- **OQ-7 Telling users migration is available (US-15).** The PRD has no decision on when or where augy tells users they have copy-based skills that could be migrated. The answer depends on OQ-4 and OQ-5. US-15 has no requirement until this is decided.
- **OQ-8 Skills left half-migrated by a crash.** If agent installs are already links to the store but the registry doesn't record the skill as store-backed, should a rerun simply record it? The draft would see no real directory and skip it.
- **OQ-9 Mixed or partial installs.** What should happen when some of a skill's recorded agent paths are links and others are copies, or some recorded paths are missing while others hold a usable copy? The specs only cover "all identical copies" and "no usable real directory".
- **OQ-10 Existing store copy for a not-store-backed skill.** If a folder already exists at `store/<skill>/` for a skill the registry doesn't record as store-backed, should migration replace it, use it, or skip the skill?
- **OQ-11 What "already migrated" reports in a mixed run.** The PRD's acceptance criterion covers a second run where everything is migrated. Should a run that both migrates and skips list already-migrated skills separately from skipped ones?

## Coverage

| US/PD | Requirement(s) or design constraint |
|---|---|
| US-1 | Migration produces the canonical-store layout |
| US-2 | Registry details are carried over unchanged (incl. "Rolling back after migration") |
| US-3 | Registry details are carried over unchanged |
| US-4 | Migration produces the canonical-store layout |
| US-5 | **Uncovered: blocked on OQ-1** (repair of store-backed skills whose agents hold copies is an open PD) |
| US-6 | **Uncovered: blocked on OQ-3** (preview mechanism is an open PD) |
| US-7 | **Uncovered: blocked on OQ-2** (diverged-copy detection is an open PD) |
| US-8 | **Uncovered: blocked on OQ-2** |
| US-9 | Repeat runs are safe |
| US-10 | Skills that can't be migrated are skipped and reported |
| US-11 | A failure on one skill is contained |
| US-12 | Skills without a source are migrated |
| US-13 | Skills without a source are migrated |
| US-14 | Migrated skills work with other commands ("Skillsets after migration") |
| US-15 | **Uncovered: blocked on OQ-7** (depends on OQ-4 and OQ-5) |
| US-16 | Migrated skills work with other commands |
| US-17 | Uninstalling a migrated skill removes everything |
| US-18 | Migration can run without prompts (means blocked on OQ-2, OQ-3) |
| US-19 | Migration uses the store under AUGY_HOME |
| US-20 | Only tracked skills and recorded paths are touched |
| PD: Target location | Migration uses the store under AUGY_HOME; Decision 1 |
| PD: What a migrated skill is | Migration produces the canonical-store layout; Decision 2 |
| PD: Carried over unchanged | Registry details are carried over unchanged; Decision 3 |
| PD: Safe to repeat (decided part) | Repeat runs are safe; Decision 4 |
| PD: Safe to repeat (open part) | OQ-1 |
| PD: Only tracked skills | Only tracked skills and recorded paths are touched; Decision 5 |
| PD: One failure stays contained | A failure on one skill is contained; Decision 6 |
| PD: Diverged copies (open) | OQ-2 |
| PD: Preview and confirmation (open) | OQ-3 |
| PD: Command name and placement (open) | OQ-4 |
| PD: Automatic vs. explicit (open) | OQ-5 |
| PD: Closing the source of new copies (open) | OQ-6 |
