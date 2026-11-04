# Design

## Context

See proposal.md (Why). This change is written from `docs/prd/skill-authoring.md` (shipped feature, documented from v0.11.0) and describes the product behavior that PRD calls for, not the existing code. Authored skills cross several other features. Push and pull of their files are specified in detail in the `home-repo` change, tagging in `machine-contexts-and-tags`, and update's skip rules in the Skill Versioning PRD. This change restates only the authored-skill side of those contracts.

## Goals / Non-Goals

**Goals:**
- One command to scaffold, register, and open a new skill in every agent the user works with.
- Authored skills are first-class: listed, taggable, backed up, restored, and never broken by `augy update`.
- An agent with the bundled `author` skill can guide the user through the whole lifecycle.

**Non-Goals (from the PRD's Out of Scope):**
- Publishing authored skills to a public repo or tap.
- Versioning authored skills inside augy (no hashes, archives, diffs, or rollback).
- Validating, linting, loading, testing, or running skill content.
- Choosing agents non-interactively for `author new` (there is no `--agent` flag).
- Keeping multi-agent copies of an authored skill in sync.
- Renaming, deleting, or forking through `author`. Removal is `augy uninstall`.
- Installing the bundled `author` skill automatically.

## Decisions

- **Authored means empty source.** `author new` always creates skills with an empty source and version label `unversioned`. Home push, home pull, and update all use the same rule. Rationale (PRD): one definition shared across the lifecycle.
- **Interactive agent choice only.** Detected agents are offered, all pre-selected. With exactly one detected agent there is no prompt, and there is no `--agent` flag. Rationale (PRD): scaffolding takes as few steps as possible (US-4).
- **Independent per-agent copies, not the shared store.** Authored skills don't use `~/.augy/store/`. The PRD records this as a known source of divergence (see Risks).
- **Starter template contract.** `# Skill: <name>` with `Overview`, `Workflow` (one empty numbered step), and `Notes`, each with a placeholder comment. Rationale (PRD): a sensible structure instead of an empty file (US-2).
- **Uniqueness only against the lockfile.** A registered name is rejected, and names aren't otherwise validated. Rationale (PRD): never overwrite a skill augy is tracking (US-8).
- **Editor rule.** `$EDITOR`, then `$VISUAL`, then `vi`. augy opens the skill's folder, not the `SKILL.md` file, launches the editor in the background, and doesn't wait for it to close. This is a design constraint, not a spec scenario, because the PRD flags the background launch as a risk for terminal editors.
- **`author edit` works on any installed skill** and opens its first active location.
- **Update exclusion.** `augy update` never checks or upgrades authored skills, or skills whose source points at the user's home repo (pre-v0.6.0). It names them in a skip note. The PRD quotes the current note as "Skipping N authored skill(s) — run `augy home push` to re-sync: …". The spec requires the note to name the skills and point to `augy home push`, without fixing its wording, because the PRD calls the wording misleading (FN 6).
- **Backup path.** Authored files reach the home repo only through `augy home push`, and come back only through `augy home pull`. The manifest lists authored skills with an empty source so the inventory is complete.
- **Bundled meta-skill distribution.** An `author` skill ships in the augy package's and repository's `skills/` directory. It is installed via `augy tap add callmeradical/augy --path skills` and then a normal install. No command installs it automatically, and no command uses the packaged copy.

## Risks / Trade-offs

All items come from the PRD's Further Notes for v0.11.0.

- [Multi-agent copies diverge (FN 1)] → `author edit` opens only the first copy, and push backs up only the first existing copy. Accepted because syncing copies is out of scope. Users should edit through `author edit`.
- [No front-matter metadata in the template or the bundled skill (FN 2)] → Some agents, for example Claude Code, may not discover a freshly scaffolded skill. Open question.
- [Untracked folders with the same name can be overwritten (FN 3)] → The uniqueness check covers only the lockfile. Open question.
- [Terminal editors and folder opening (FN 4)] → A background launch may compete with the shell for the terminal, `vi` shows a directory listing, and `$EDITOR` takes precedence over `$VISUAL`, the reverse of the usual Unix convention. The PRD states the order explicitly (US-5), so the spec keeps it.
- [`augy list` mislabels authored skills as untracked and suggests `set-source` (FN 5)] → Following that advice turns the skill external and stops its file backup. Open question.
- [Misleading update skip note (FN 6)] → Wording not fixed by the spec. Open question.
- [Templates disagree (FN 7) and the bundled skill's examples are dated (FN 8)] → The CLI template and the bundled template differ, and the bundled skill lists three agent folders while augy supports 33. Not specified beyond the PRD's content list.
- [Bundled skill is hard to discover (FN 9) and `augy author` is undocumented (FN 11)] → The install route appears only in a commit message. Documentation gap.
- [`author edit` on external skills (FN 10)] → Local edits are replaced on the next `augy update` (an archive is kept), and nothing warns the user. Kept per the PD that edit works for any installed skill.
- [Uninstalling an unpushed authored skill is unrecoverable (FN 12)] → If it was pushed, it returns on the next pull because push never deletes.

## Migration Plan

N/A — archived.

## Open Questions

- **Front matter (FN 2).** Should the starter template include a name and description front-matter block so that agents such as Claude Code discover the skill?
- **Untracked same-name folders (FN 3).** Should `author new` also refuse, or warn, when an agent's skills folder already holds an untracked folder of that name?
- **List labeling (FN 5).** How should `augy list` present authored skills, so that it doesn't advise `augy set-source`? (Owned by the Skill Inventory PRD.)
- **Update skip wording (FN 6).** The PRD quotes "run `augy home push` to re-sync" and calls "re-sync" misleading. What should the note say?
- **Template alignment (FN 7).** Should the CLI starter template and the bundled skill's template be the same?
- **Bundled skill content specificity (US-20 to US-23).** The spec checks that the listed topics are present, not their exact wording or the template's sections.

## Coverage

| US/PD | Requirement(s) |
|---|---|
| US-1 | Scaffold a new skill |
| US-2 | Starter template |
| US-3 | Choose target agents |
| US-4 | Choose target agents |
| US-5 | Open the new skill in the editor |
| US-6 | Skip the editor |
| US-7 | Report location and backup step |
| US-8 | Refuse a tracked name |
| US-9 | No agents detected |
| US-10 | Register as authored |
| US-11 | Edit an installed skill |
| US-12 | Edit errors |
| US-13 | Edit errors |
| US-14 | Update skips authored skills |
| US-15 | Authored skills back up through the home repo |
| US-16 | Authored skills back up through the home repo |
| US-17 | Authored skills keep an empty source |
| US-18 | Authored skills can be tagged |
| US-19 | Bundled author skill is installable |
| US-20 | Bundled skill teaches the authoring workflow |
| US-21 | Bundled skill describes a good SKILL.md |
| US-22 | Bundled skill describes a good SKILL.md |
| US-23 | Bundled skill includes a template |
| PD Definition of authored | Register as authored; Update skips authored skills |
| PD Scaffold behavior | Scaffold a new skill; Choose target agents; Independent copy per agent; Decision "Interactive agent choice only" (no `--agent`) |
| PD Starter template contract | Starter template |
| PD Name uniqueness | Refuse a tracked name |
| PD Editor rule | Open the new skill in the editor; Decision "Editor rule" (folder, background, no wait) |
| PD `author edit` | Edit an installed skill |
| PD Update exclusion | Update skips authored skills |
| PD Backup path | Authored skills back up through the home repo; Authored skills keep an empty source |
| PD Bundled meta-skill | Bundled author skill is installable; Bundled skill teaches the authoring workflow; Bundled skill includes a template |
