# Machine Contexts and Skill Tags

> Status: Shipped (documented from v0.11.0, commit c725774). Skill tags first released in v0.7.0; machine context in v0.8.0.

## Problem Statement

People who use AI agents on more than one machine rarely want the same skills everywhere. A consultant may keep client or employer skills (internal tooling, company conventions, proprietary workflows) on the work laptop and hobby or personal-productivity skills on the personal one. Some skills, like a generic TDD or commit-message skill, belong on every machine.

With a home repo (see the Home Repo PRD), all of a person's skills live in one place. Without a way to say which skills belong where, restoring onto a machine means choosing skill by skill every time. That is tedious, and it's easy to put a work-only skill on a personal machine or the reverse.

## Solution

augy adds two small, connected concepts:

- **Skill tags (contexts):** each installed skill can carry zero or more free-form tags. The conventional ones are `work`, `personal`, and `universal`, and any custom string is accepted. `augy tag set` assigns tags, `augy tag show` displays them, and `augy tag migrate` walks through every untagged skill interactively so an existing collection can be tagged in one sitting. Tags are saved in the home repo manifest on `augy home push`, so they travel with the skills.
- **Machine context:** each machine can be marked with a single context (`augy context set work`, `show`, `clear`). The setting is local to the machine and never pushed. When the user runs `augy home pull`, it decides which skills are **pre-selected**: skills tagged with that context, skills tagged `universal`, and untagged skills. A one-off `--context` flag on pull overrides it.

Stated purpose (from the feature's commit history): "machine-specific filtering on home pull" and context tags that "survive across machines on home pull — no need to re-run tag migrate on each machine."

## User Stories

1. As a consultant with work and personal laptops, I want to mark my work laptop as `work`, so that augy knows which of my skills belong on it.
2. As a consultant, I want to mark my personal laptop as `personal`, so that work-only skills aren't pre-selected when I restore skills there.
3. As a developer with an unusual setup (for example a `client-acme` machine or a `homelab` box), I want to use any custom context name, so that I'm not limited to work and personal.
4. As a developer, I want `augy context set` to confirm the new context and explain its effect on `home pull`, so that I understand what changed.
5. As a developer, I want `augy context show` to display the current machine context, or tell me none is set and how to set one, so that I can check the machine's setting quickly.
6. As a developer, I want `augy context clear` to remove the machine context, so that `home pull` goes back to pre-selecting everything.
7. As a privacy-conscious developer, I want the machine context to stay on the machine and never be pushed to my home repo, so that each machine keeps its own identity and one machine's setting can't overwrite another's.
8. As a developer, I want to tag a skill with one or more contexts in one command (`augy tag set tdd work universal`), so that I can classify skills quickly.
9. As a developer, I want running `augy tag set <skill>` with no contexts to clear its tags, so that I can return a skill to untagged (treated as universal).
10. As a developer, I want `augy tag set` to replace a skill's tags rather than append to them, so that the result is exactly what I typed.
11. As a developer, I want `augy tag show <skill>` to display a skill's current tags, or say it is untagged and treated as universal, so that I can confirm how it will behave on pull.
12. As a developer, I want a clear error when I tag or inspect a skill that isn't installed, so that a typo doesn't fail silently.
13. As a developer with dozens of untagged skills, I want `augy tag migrate` to step through each untagged skill and ask for its contexts, so that I can tag my whole collection in one pass.
14. As a developer running a migration, I want each prompt to show the skill name and its source (or "authored (no external source)"), so that I can recall what the skill is before tagging it.
15. As a developer, I want the migration picker to offer `universal`, `personal`, and `work` with short explanations, so that I can choose without having to remember the conventions.
16. As a developer, I want migration to skip skills that already have tags and tell me how many are tagged versus remaining, so that I only spend time on what's left.
17. As a developer, I want each skill's tags saved as soon as I answer, so that cancelling or crashing partway through loses no progress.
18. As a developer, I want to cancel a migration midway and be told progress was saved, so that I can finish later.
19. As a developer, I want migration to say when every skill is already tagged, so that I know there's nothing to do.
20. As a developer, I want migration to end with a reminder to run `augy home push`, so that I remember tags only travel once pushed.
21. As a developer with multiple machines, I want tags saved in the home repo manifest on push, so that I tag once and every machine sees the same classification.
22. As a consultant setting up a new work laptop, I want `augy home pull` to pre-select only work, universal, and untagged skills when the machine context is `work`, so that I get the right set by pressing Enter.
23. As a developer, I want untagged skills treated as universal, so that skills I haven't classified yet are never hidden from me by default.
24. As a developer, I want a skill tagged `universal` pre-selected in every context, so that I can explicitly mark skills that belong everywhere.
25. As a developer, I want a skill tagged with several contexts (for example `work` and `personal`) pre-selected in any of them, so that one skill can serve several machine types.
26. As a developer, I want `augy home pull --context personal` to override the machine context for one run, so that I can pull a different subset without changing the machine's setting.
27. As a developer, I want the pull picker to show each skill's tags and the active context in its header, so that I can see why a skill is or isn't pre-selected.
28. As a developer, I want pre-selection to be only a default, so that I can still pick a skill from another context deliberately.

## Implementation Decisions

Product decisions and behavioral rules:

- **Tags are free-form strings.** `work`, `personal`, and `universal` are conventions that augy suggests but doesn't enforce. Any value is accepted as typed, case-sensitively, with no validation or de-duplication.
- **Matching rule** (one rule used wherever a context filter applies):
  - If no context filter is in effect, every skill matches.
  - An untagged skill (no tags, or an empty tag list) matches every context.
  - A skill tagged `universal` matches every context.
  - Otherwise a skill matches only if one of its tags equals the context exactly.
- **Machine context is single-valued and local.** It is stored in the machine's lockfile (`~/.augy/registry.json`, or under `AUGY_HOME`), is never included in anything pushed to the home repo, and has no default.
- **Precedence on pull:** explicit `--context` flag first, then the machine context, then no filter.
- **Context affects pre-selection only.** It never hides skills or blocks the user from choosing any skill on `home pull`. It doesn't affect any other command: install, sync, update, list, use, and bundle all ignore it.
- **Tags live on installed skills.** A skill must be present in the local lockfile to be tagged. The tag commands work only with locally installed skills.
- **`tag set` replaces** the full tag list. Passing no contexts sets an empty list, which behaves as universal.
- **`tag migrate`:**
  - It considers only untagged skills and prompts once per skill, in lockfile order.
  - It offers only the three suggested contexts.
  - Selecting none is allowed and is recorded as an empty list, which means universal.
  - It saves after every answer, and cancelling stops with "Migration paused — progress saved."
- **Where tags travel.**
  - `augy home push` writes a `contexts` map (skill name to tag list) into the home repo manifest for every tagged skill.
  - `augy home pull` reads tags from the manifest first and falls back to local tags, both to decide pre-selection and to show hints.
  - `augy bundle` manifests can also carry a `contexts` map.
- **Command shape.** Tags are managed through a `tag` command group (`tag set`, `tag show`, `tag migrate`). An earlier shape (`augy tag <skill> [contexts…]`) was restructured into subcommands "to avoid duplicate command name" (per commit history).

## Testing Decisions

Observable behaviors that define correctness:

- `context set <ctx>` persists the context. `context clear` removes it. `context show` reports the context or a hint.
- `tag set` stores exactly the given tags, replaces previous tags, clears them when called with none, and errors for unknown skills.
- `tag show` errors for unknown skills and otherwise reports tags, or "treated as universal".
- `tag migrate` skips tagged skills, prompts once per untagged skill, saves after each answer, keeps progress on cancel, and reports when there is nothing to do.
- The matching rule holds in every case: no filter, untagged, `universal`, matching tag, non-matching tag.
- On pull, pre-selection reflects an explicit `--context` when given and the machine context otherwise.
- Tags pushed in the manifest are honored for pre-selection on another machine.

Coverage by existing automated tests (unit-level, with the lockfile and prompts mocked):

- **context:** set and clear are covered. `show` is checked only for not throwing.
- **tag set:** set, replace, clear, and unknown-skill errors are covered.
- **tag show:** the unknown-skill error is covered. The success case is checked only for not throwing.
- **tag migrate:** skipping tagged skills, one prompt per untagged skill, save-after-each, and the nothing-to-do message are covered. Cancel-midway is not.
- **Matching rule:** the untagged, matching-tag, non-matching-tag, and no-filter cases are covered. The `universal` case is covered only indirectly, through a pull test.
- **Pull pre-selection:** covered for an explicit `--context`, using tags from the local lockfile.
- **Not covered:**
  - pre-selection driven by the machine context
  - manifest tags taking precedence over local tags
  - tags being written to the manifest on push
  - tags being restored onto skills after pull
  - the precedence of `--context` over the machine context

## Out of Scope

- Hiding or blocking skills by context. Context only decides the picker's defaults.
- Applying context to anything other than `home pull`. For example, `install`, `sync`, and `update` don't filter by context, and nothing removes off-context skills already on a machine.
- More than one context per machine.
- Syncing the machine context across machines.
- Tagging skills that exist only in the home repo and aren't installed locally.
- Entering custom tags during `tag migrate`. Custom tags must be set with `tag set`.
- Listing all skills grouped or filtered by tag. `augy list` and `augy info` don't show tags; they appear only in `tag show`, in the pull picker, and in `list --json`.
- Validating, normalizing, or matching tag names case-insensitively.
- Relation to skillsets. Skillsets (`augy skillset` / `augy use`) are a separate mechanism for switching which installed skills are active. Machine contexts don't interact with them.

## Further Notes

Known gaps, inconsistencies, and bugs observed in v0.11.0:

1. **Tags of external skills are lost on round trips (bug).** Pull reapplies manifest tags only to authored skills. External skills installed through pull get no tags locally, and already-installed external skills upgraded through pull lose the tags they had. Push then rebuilds the manifest's `contexts` map from local tags only. So pulling onto a new machine and pushing from it erases tags for those skills in the home repo, and for any skill not installed on that machine. This undercuts the stated goal that tags "survive across machines."
2. **Skipped skills look tagged but aren't.** In `tag migrate`, choosing no contexts prints "✓ <skill> (universal)" and counts toward "N skill(s) tagged". The skill is stored with an empty tag list, though, so it is still "untagged" and will be offered again on the next migrate. There is no explicit "skip" or "mark as universal" option, although the user can pick `universal` to stop the repeat prompts.
3. **Terminology collision.** The README describes skillsets as a way "to maintain separate skill contexts (engineering, research, writing)". "Context" in this PRD means something unrelated (machine/tag filtering). Users may confuse the two.
4. **Undocumented.** The README and docs site don't mention `augy context` or `augy tag`. The CLI's top-of-file command summary also omits them, while listing `home`.
5. **Stale help text in the source.** The tag feature's own header comment still describes the pre-restructure syntax (`augy tag <skill> [contexts…]`, `augy tag <skill>`). The CLI help is correct (`tag set`, `tag show`). This has no user-facing impact unless that comment is copied into docs.
6. **Case-sensitivity.** `Work` and `work` are different contexts, both for tags and for machine context. Nothing warns about near-duplicates.
7. **Setting the machine context to `universal`** is accepted. It then pre-selects only untagged and `universal`-tagged skills, which is probably not what a user expects. (Edge case; inferred from the matching rule.)
8. **Open question:** pull uses manifest tags first and local tags second. When the two disagree, nothing tells the user which one won.
