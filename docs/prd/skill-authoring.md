# Skill Authoring

> Status: Shipped (documented from v0.11.0, commit c725774). First released in v0.5.0.

## Problem Statement

augy started as a package manager for skills that already exist in GitHub repos. Many users also write their own skills: personal workflows, house conventions, and prompts they have refined over time. Without tooling, writing a skill means knowing each agent's skill folder, creating the directory and `SKILL.md` by hand, and copying it into every agent the user runs. augy then sees the result only as an unknown, untracked folder. A self-written skill has no upstream to update from, nothing records it, and it isn't backed up anywhere.

A second, related problem: the AI agents themselves are well placed to help draft skills, but they don't know augy's conventions or workflow.

## Solution

augy provides an `author` command group and a bundled meta-skill:

- **`augy author new <name>`** scaffolds a new skill. It creates the skill folder with a starter `SKILL.md` for each chosen agent on the machine, registers the skill in augy's lockfile as **authored** (no upstream source), and opens it in the user's editor. `--no-edit` skips opening the editor.
- **`augy author edit <name>`** opens an installed skill's folder in the user's editor.
- **Authored skills are first-class in augy's lifecycle.** `augy home push` commits their files to the user's home repo, `augy home pull` restores them on other machines (see the Home Repo PRD), and `augy update` always skips them, so an upstream check never fails or overwrites them.
- **The bundled `author` skill** ships in the augy package and repository. Installed into an agent, it teaches the agent what an augy skill is and walks it through the authoring workflow: scaffold, write, test, back up. It also gives the agent guidance on writing a good `SKILL.md`.

## User Stories

1. As a skill author, I want to create a new skill with one command (`augy author new <name>`), so that I don't have to find each agent's skills folder or create files by hand.
2. As a skill author, I want the new skill to start from a template (title, Overview, Workflow, Notes), so that I begin with a sensible structure instead of an empty file.
3. As a skill author with several AI agents installed, I want to choose which detected agents get the new skill, with all of them pre-selected, so that one command makes the skill available everywhere I work.
4. As a skill author with only one agent installed, I want augy to skip the agent question, so that scaffolding takes as few steps as possible.
5. As a skill author, I want the new skill opened in my editor (`$EDITOR`, then `$VISUAL`, falling back to `vi`) right after it's created, so that I can start writing immediately.
6. As a skill author who prefers to open files myself, or who is scripting, I want `--no-edit` to skip launching the editor, so that the command only scaffolds and registers.
7. As a skill author, I want augy to print where the skill was created and remind me to run `augy home push`, so that I know where the files are and how to back them up.
8. As a skill author, I want `augy author new` to refuse a name that already exists in augy's lockfile and point me to `augy author edit`, so that I never overwrite a skill augy is tracking.
9. As a skill author, I want a clear error when no agents are detected, so that I know to install an agent before authoring.
10. As a skill author, I want my new skill registered in augy's lockfile immediately, so that it appears in `augy list` and works with tagging, home push, and the other augy commands.
11. As a skill author, I want to reopen an existing skill with `augy author edit <name>`, so that I can revise it without remembering where it lives.
12. As a skill author, I want `augy author edit` to tell me when the skill isn't in the lockfile (and point me to `augy list`), so that a typo doesn't fail silently.
13. As a skill author, I want `augy author edit` to tell me when the skill has no active location on disk, so that I understand why nothing opened.
14. As a skill author, I want authored skills skipped by `augy update`, with a note naming them, so that update never fails trying to reach a nonexistent upstream and never overwrites my local work.
15. As a skill author with multiple machines, I want `augy home push` to commit my authored skills' files to my home repo, so that my own skills are backed up even though they have no public source.
16. As a skill author setting up a new machine, I want `augy home pull` to restore my authored skills from the home repo, so that my custom skills follow me.
17. As a skill author, I want authored skills kept with an empty source rather than given a home-repo URL, so that other machines never try (and fail) to download them from a private repo.
18. As a skill author, I want to tag authored skills as work, personal, or universal like any other skill, so that they're pre-selected correctly on each machine (see the Machine Contexts and Tags PRD).
19. As a user of an AI agent, I want to install the bundled `author` skill into my agent, so that the agent can help me design and write new skills that follow augy's conventions.
20. As a user of an AI agent with the `author` skill installed, I want the agent to know the authoring workflow (scaffold with `augy author new`, write, test with trigger phrases, back up with `augy home push`), so that it guides me through the whole lifecycle and not just the writing.
21. As a skill author, I want the bundled skill to describe what a good `SKILL.md` contains (a one-line description, trigger phrases, numbered workflow steps, examples, references), so that the skills I write with my agent's help are consistent and effective.
22. As a skill author, I want the bundled skill's tips (verb-first steps, concrete commands, fail states, one capability per skill, splitting beyond about 150 lines), so that my skills stay focused and easy for agents to follow.
23. As a skill author, I want the bundled skill to include a copyable `SKILL.md` template, so that my agent can draft a new skill in the expected shape.

## Implementation Decisions

Product decisions and behavioral rules:

- **Definition of authored.** A skill is authored when its upstream source is empty. `author new` always creates skills this way, and they are recorded with version label "unversioned". The same empty-source rule is what home push, home pull, and update use to recognize authored skills.
- **Scaffold behavior.**
  - `author new` lets the user pick among agents detected on this machine, all pre-selected. With exactly one detected agent, no prompt appears. There is no `--agent` flag.
  - For each chosen agent, it creates `<agent skills folder>/<name>/SKILL.md` from the starter template.
  - Each agent gets an independent copy. Authored skills don't use augy's shared store (`~/.augy/store/`), which regular installs have used since v0.11.0.
- **Starter template contract.** A Markdown file titled `# Skill: <name>` with `Overview`, `Workflow` (one empty numbered step), and `Notes` sections, each holding a placeholder comment.
- **Name uniqueness** is checked only against augy's lockfile. A name already registered is rejected. Skill names are not otherwise validated.
- **Editor rule.** The editor is resolved as `$EDITOR`, then `$VISUAL`, then `vi`. augy opens the skill's *folder*, not the `SKILL.md` file. The editor is launched in the background, and augy doesn't wait for it to close.
- **`author edit`** opens the first active location recorded for the skill. It works for any installed skill, not only authored ones.
- **Update exclusion.** `augy update` never checks or upgrades authored skills. It prints "Skipping N authored skill(s) — run `augy home push` to re-sync: …". Skills whose source points at the user's own home repo (a pre-v0.6.0 artifact) are treated the same way.
- **Backup path.** Authored skill files reach the home repo only through `augy home push`, and are restored only through `augy home pull`. The manifest lists authored skills with an empty source so the inventory is complete.
- **Bundled meta-skill.** The augy distribution ships a skill named `author` in its `skills/` directory, and the same skill is in the augy GitHub repository. Per the commit that introduced it, users install it by registering the repository as a tap (`augy tap add callmeradical/augy --path skills`) and then installing it like any other skill. No augy command installs it automatically. Content:
  - what a skill is
  - example agent skill folders
  - the four-step workflow (scaffold, write, test, back up)
  - what makes a good `SKILL.md`
  - a template
  - writing tips

## Testing Decisions

Observable behaviors that define correctness:

- `author new` creates a `SKILL.md` for each selected agent and registers the skill with an empty source and the selected agents.
- `author new` opens the editor unless `--no-edit` is given.
- `author new` refuses names already in the lockfile.
- `author new` errors when no agents are detected.
- `author edit` opens the first active location in the configured editor.
- `author edit` errors when the skill is unknown or has no active location.
- `augy update` skips authored skills and names them.
- Authored skills keep an empty source through `home push`, and are restored as files by `home pull`.

Coverage by existing automated tests (unit-level, with the filesystem, editor launch, and prompts mocked):

- **Covered for `author new`:** scaffolding into the selected agent's folder, registration with no source, opening the editor, `--no-edit`, and the duplicate-name error.
- **Covered for `author edit`:** opening the first active location with `$EDITOR`, the unknown-skill error, and the no-active-location error.
- **Authored handling in home push and pull:** covered (see the Home Repo PRD).
- **Not covered:**
  - the no-agents-detected error
  - auto-skipping the agent prompt when only one agent is detected
  - the editor fallback order (`$VISUAL`, then `vi`)
  - update's skipping of authored skills
  - template content beyond containing the skill name
  - the bundled `author` skill (no tests or validation of its content or installability)

## Out of Scope

- Publishing authored skills to a public repo or tap. The only destination is the user's personal home repo.
- Versioning authored skills inside augy. They have no commit-hash history, archives, diffs, or rollback in augy. History exists only in the home repo's git log.
- Validating or linting skill content, or checking that a skill loads in a given agent.
- Testing or running a skill. The bundled skill tells the user to try trigger phrases manually.
- Choosing target agents non-interactively for `author new` (no `--agent` flag).
- Keeping copies in sync when an authored skill is installed to several agents. Edits to one copy are not propagated to the others.
- Renaming, deleting, or forking skills through the `author` commands. Removal goes through `augy uninstall`.
- Installing the bundled `author` skill automatically on first run.

## Further Notes

Known gaps, inconsistencies, and bugs observed in v0.11.0:

1. **Edits to multi-agent authored skills diverge.** Each agent gets its own copy. `author edit` opens only the first agent's copy, and `home push` backs up only the first existing copy. Edits made in another agent's copy are silently left out of the backup, and the other copies go stale. Regular installs avoid this through the shared store (v0.11.0), but authored skills don't use it.
2. **Scaffold template lacks skill metadata.** The starter `SKILL.md` (and the bundled `author` skill itself) has no front-matter block with a skill name and description. Some agents, for example Claude Code, rely on that block to discover a skill and decide when to trigger it, so a freshly scaffolded skill may not be picked up by those agents until the user adds one. Flagged as likely; not verified against each agent.
3. **Unregistered folders can be overwritten.** The duplicate-name check looks only at augy's lockfile. If a folder with the same name already exists in an agent's skills directory but augy doesn't track it (for example a skill installed by another tool), `author new` overwrites its `SKILL.md` with the template. Inferred from behavior; not reproduced.
4. **Terminal editors may misbehave.** The editor is launched detached in the background, and augy exits right away. GUI editors such as VS Code work fine. A terminal editor (`vim`, `nano`, or the `vi` fallback) may end up competing with the shell for the terminal. Flagged as likely; not reproduced. The editor is also opened on the skill *folder*, which in `vi` shows a directory listing instead of `SKILL.md`. `$EDITOR` is checked before `$VISUAL`, the reverse of the usual Unix convention.
5. **`augy list` mislabels authored skills.** List shows them as "untracked" with "⚠ no source — run `augy set-source <name> <url>` to enable updates". That framing treats a deliberately source-less authored skill as a problem. Following the advice would convert it into an external skill, and it would then stop being backed up as files.
6. **Update's message is misleading.** The skip note says "run `augy home push` to re-sync". Push backs up authored skills. It doesn't update them, so there's nothing to re-sync.
7. **Templates disagree.** The CLI's starter template uses Overview / Workflow / Notes. The bundled skill's template uses a description line plus "Trigger on:" / Workflow / Notes. Its guidance also recommends Trigger phrases, Examples, and References sections that neither template includes.
8. **The bundled skill's examples are dated.** It lists only three agent skill folders (opencode, Claude, Codex), while augy supports 33 agents.
9. **Bundled skill discoverability.** The `author` skill is shipped inside the published package, but no command uses that copy. The install route (tap the augy repo, then install) appears only in a commit message, not in the README, the docs site, or CLI help.
10. **`author edit` works on any skill.** It opens external skills as well as authored ones. Local edits to an external skill are replaced on the next `augy update`. The previous version is archived first, so rollback can recover it, but nothing warns the user.
11. **Undocumented.** The README and docs site don't mention `augy author`. The CLI's top-of-file command summary omits it too.
12. **Uninstalling an authored skill.** Uninstall removes all local copies. augy keeps no archive of authored skills, so unless the skill was pushed it is unrecoverable. If it was pushed, it stays in the home repo (push never deletes) and comes back on the next pull.
