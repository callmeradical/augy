# Design

## Context

See proposal.md (Why). This change is written from `docs/prd/machine-contexts-and-tags.md` (shipped feature, documented from v0.11.0) and describes the product behavior that PRD calls for, not the existing code. Push and pull themselves are specified in the `home-repo` change. This change owns the machine context, the tag commands, the matching rule, and the rules for how tags travel. Where the two overlap (pre-selection on pull, `contexts` in the manifest), the requirements are compatible and trace to both PRDs.

## Goals / Non-Goals

**Goals:**
- Tag once, then have every machine pre-select the right subset of skills on `augy home pull` when the user presses Enter.
- Keep the machine context local so that each machine keeps its own identity.
- Never hide skills: context only sets the defaults.

**Non-Goals (from the PRD's Out of Scope):**
- Hiding or blocking skills by context.
- Applying context to anything other than `home pull` (install, sync, and update don't filter, and nothing removes off-context skills).
- More than one context per machine, or syncing the machine context across machines.
- Tagging skills that exist only in the home repo.
- Custom tags inside `tag migrate` (use `tag set`).
- Listing or grouping skills by tag in `augy list` / `augy info`.
- Validating, normalizing, or case-insensitive matching of tag names.
- Any interaction with skillsets (`augy skillset` / `augy use`).

## Decisions

- **Tags are free-form, case-sensitive strings.** `work`, `personal`, and `universal` are suggested but not enforced. There is no validation or de-duplication. Rationale (PRD): users with unusual setups (`client-acme`, `homelab`) shouldn't be limited (US-3).
- **One matching rule everywhere.** No filter matches all. Untagged (no tags or an empty list) matches all. `universal` matches all. Otherwise an exact tag match is required. Rationale (PRD): unclassified skills are never hidden by default (US-23), and `universal` lets a user state "belongs everywhere" explicitly (US-24).
- **Machine context is single-valued, local, and has no default.** It is stored in the machine's lockfile and is never pushed. Rationale (PRD): one machine's setting can't overwrite another's (US-7).
- **Precedence on pull:** `--context`, then machine context, then no filter (US-26).
- **Context affects pre-selection only**, and only on `home pull`. Install, sync, update, list, use, and bundle ignore it. Rationale (PRD): pre-selection is a convenience. The user keeps full choice (US-28).
- **Tags live on installed skills.** The tag commands work only on skills in the local lockfile (US-12).
- **`tag set` replaces.** No contexts means an empty list, which behaves as universal (US-9, US-10).
- **`tag migrate`** considers only untagged skills, in lockfile order, offers only the three suggested contexts, allows none (recorded as an empty list), saves after every answer, and on cancel stops with "Migration paused — progress saved." Rationale (PRD): a whole collection can be tagged in one sitting without risk of losing progress (US-13, US-17).
- **Where tags travel.** Push writes a `contexts` map for tagged skills. Pull reads manifest tags first, then local tags, both for pre-selection and for hints. Pulled skills are recorded with their manifest tags, which is the PRD's stated purpose ("context tags survive across machines on home pull"). The Team Manifests manifest format allows a `contexts` map. Per the Team Manifests PRD, `augy bundle` never writes it and `augy sync` ignores it, so no requirement is placed on bundle here.
- **Command shape.** Tags are managed through a `tag` group (`tag set`, `tag show`, `tag migrate`). The earlier `augy tag <skill> [contexts…]` form was restructured into subcommands to avoid a duplicate command name.

## Risks / Trade-offs

All items come from the PRD's Further Notes for v0.11.0.

- [Tags of external skills lost on round trips (FN 1, bug)] → The intended behavior is specified in "Pulled skills receive their home-repo tags". Tags of skills not installed on the pushing machine are still dropped from the manifest, because push is a full snapshot (see the `home-repo` change). That is a known trade-off, not covered here.
- [Skipped skills look tagged but aren't (FN 2)] → Choosing none records an empty list, which is untagged, so migrate offers the skill again next time. Picking `universal` avoids the repeat. Open question.
- [Terminology collision with skillsets' "contexts" (FN 3)] → Documentation concern only.
- [Undocumented (FN 4) and stale header comment (FN 5)] → No user-facing behavior. Not specified.
- [Case-sensitivity (FN 6)] → `Work` and `work` are different, and nothing warns about it. Accepted per the PD. Specified as case-sensitive matching.
- [Machine context `universal` (FN 7)] → Accepted, but it pre-selects only untagged and `universal` skills. Open question.
- [Manifest and local tags disagree on pull (FN 8)] → The manifest wins silently. Open question.

## Migration Plan

N/A — archived.

## Open Questions

- **Choosing none in `tag migrate` (FN 2).** It prints "(universal)" and counts as tagged, but the skill stays untagged and is offered again. Should "none" be stored so that migrate stops asking, or be reported as skipped?
- **Machine context `universal` (FN 7).** Should `augy context set universal` be rejected or warned about?
- **Manifest vs local tag disagreement (FN 8).** Should pull tell the user when manifest tags override different local tags?
- **Upgrade with no manifest tags.** This spec keeps a skill's local tags when the manifest has none for it. The PRD only says tags "survive". Confirm that keeping local tags is the intent rather than clearing them.
- **Tag counts in migrate (US-16).** The PRD doesn't say whether "tagged versus remaining" is reported before prompting, after, or both. The spec requires that it is reported.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | machine-context: Set the machine context |
| US-2 | machine-context: Set the machine context; Machine context drives pull pre-selection |
| US-3 | machine-context: Set the machine context |
| US-4 | machine-context: Confirm the context and its effect |
| US-5 | machine-context: Show the machine context |
| US-6 | machine-context: Clear the machine context |
| US-7 | machine-context: Machine context stays on the machine |
| US-8 | skill-tags: Set a skill's tags |
| US-9 | skill-tags: Clear a skill's tags |
| US-10 | skill-tags: Set a skill's tags |
| US-11 | skill-tags: Show a skill's tags |
| US-12 | skill-tags: Tags apply only to installed skills |
| US-13 | skill-tags: Migrate untagged skills interactively |
| US-14 | skill-tags: Migrate untagged skills interactively |
| US-15 | skill-tags: Migration offers the suggested contexts |
| US-16 | skill-tags: Migration skips tagged skills and reports progress |
| US-17 | skill-tags: Migration saves after every answer |
| US-18 | skill-tags: Migration saves after every answer |
| US-19 | skill-tags: Migration with nothing to do |
| US-20 | skill-tags: Migration ends with a push reminder |
| US-21 | skill-tags: Tags travel in the home repo manifest; Pulled skills receive their home-repo tags |
| US-22 | machine-context: Machine context drives pull pre-selection |
| US-23 | skill-tags: Context matching rule |
| US-24 | skill-tags: Context matching rule |
| US-25 | skill-tags: Context matching rule |
| US-26 | machine-context: One-off context override on pull |
| US-27 | machine-context: Pull shows the active context and tags |
| US-28 | machine-context: Context sets defaults only |
| PD Tags are free-form strings | skill-tags: Set a skill's tags; Context matching rule (case-sensitive) |
| PD Matching rule | skill-tags: Context matching rule |
| PD Machine context single-valued and local | machine-context: Set the machine context; Clear the machine context; Machine context stays on the machine |
| PD Precedence on pull | machine-context: Machine context drives pull pre-selection; One-off context override on pull |
| PD Context affects pre-selection only | machine-context: Context sets defaults only; Other commands ignore the context |
| PD Tags live on installed skills | skill-tags: Tags apply only to installed skills |
| PD `tag set` replaces | skill-tags: Set a skill's tags; Clear a skill's tags |
| PD `tag migrate` | skill-tags: Migrate untagged skills interactively; Migration offers the suggested contexts; Migration saves after every answer |
| PD Where tags travel | skill-tags: Tags travel in the home repo manifest; Pulled skills receive their home-repo tags; Decision "Where tags travel" (bundle) |
| PD Command shape | Decision "Command shape"; skill-tags requirements use `tag set` / `tag show` / `tag migrate` |
