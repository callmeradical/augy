# Tasks

## 1. Tracer bullet — scaffold and register one authored skill for one agent

Covers: "Skill created in the chosen agent", "One detected agent", "Lockfile entry", "No editor launched".

- [ ] 1.1 Write a failing test: with only Claude Code detected in a temporary augy home, `augy author new my-skill --no-edit` creates `my-skill/SKILL.md` in Claude Code's skills folder without asking about agents. It also records `my-skill` in the lockfile with an empty source, version `unversioned`, and a Claude Code location, and launches no editor. (validation: partial; no-agent-prompt not asserted)
- [x] 1.2 Implement the minimum to pass. (validation: Conforms)

## 2. Template, agent choice, and creation output

Covers: "Template structure", "Several detected agents", "Several agents", "Not store-backed", "No agents", "Listed", "Creation message".

- [ ] 2.1 Write a failing test that the scaffolded `SKILL.md` has `# Skill: my-skill`, `Overview`, `Workflow` (one empty numbered step), and `Notes` sections with placeholder comments. (validation: test only checks the name appears)
- [ ] 2.2 Write failing tests: with several detected agents, all are offered pre-selected and each chosen agent gets its own real directory, with nothing created under `~/.augy/store/`. With no agents detected, the command errors and creates nothing. (validation: no test)
- [ ] 2.3 Write failing tests that `augy list` includes the new skill, and that the output shows the created path and mentions `augy home push`. (validation: no test)
- [x] 2.4 Implement until 2.1–2.3 pass. (validation: Conforms)

## 3. Editor launch and duplicate names

Covers: "EDITOR used", "VISUAL fallback", "vi fallback", "Duplicate name".

- [ ] 3.1 Write failing tests that `author new` launches `$EDITOR`, else `$VISUAL`, else `vi`, on the new skill folder. (validation: only $EDITOR tested)
- [ ] 3.2 Write a failing test that a name already in the lockfile is refused with a pointer to `augy author edit`, and that the existing files and lockfile entry are unchanged. (validation: tests error only; no pointer or unchanged check)
- [x] 3.3 Implement until 3.1–3.2 pass. (validation: Conforms)

## 4. author edit

Covers: "Reopen an authored skill", "External skill", "Unknown skill", "No active location".

- [ ] 4.1 Write failing tests: `author edit` launches the resolved editor on the first active location of an authored or external skill. Unknown skills error with a pointer to `augy list`, skills with no active location error, and no editor is launched on either error. (validation: no external-skill or no-editor-on-error asserts)
- [ ] 4.2 Implement until 4.1 passes. (validation: Deviates: missing-on-disk path still opens editor)

## 5. Authored skills in the lifecycle

Covers: "Authored skill skipped", "Home-repo-sourced skill skipped", "Push then pull on a new machine", "Source after push", "Tag an authored skill".

- [ ] 5.1 Write failing tests: `augy update` doesn't contact any upstream for authored skills or for home-repo-sourced skills, leaves their files unchanged, and prints a note naming them and mentioning `augy home push`. (validation: no test)
- [ ] 5.2 Write a failing end-to-end test against a local bare repo standing in for the home repo: `author new`, then `home push`, then `home pull` into a second augy home. The skill's files are restored, and its source stays empty in both lockfiles and in the manifest. (validation: no test)
- [ ] 5.3 Write a failing test that `augy tag set my-skill personal` on an authored skill is reported by `augy tag show my-skill`. (validation: no test)
- [x] 5.4 Implement until 5.1–5.3 pass. (validation: Conforms)

## 6. Bundled author skill

Covers: "Install via tap", "Not auto-installed", "Workflow content", "Guidance and tips", "Template present".

- [ ] 6.1 Write a failing content check on the repository's `skills/author/SKILL.md`: it covers what a skill is, example agent skill folders, the four-step workflow (`augy author new`, write, test with trigger phrases, `augy home push`), the parts of a good `SKILL.md`, the five writing tips, and a copyable template. (validation: no test)
- [ ] 6.2 Write a failing check that the published package includes `skills/author/`, and that a fresh augy home has no `author` skill installed in any agent. (validation: no test)
- [x] 6.3 Verify the install route: `augy tap add callmeradical/augy --path skills` followed by installing `author` places it in the chosen agent's skills folder. (validation: Conforms; ran tap route)
- [x] 6.4 Add or fix the bundled skill content and packaging until 6.1–6.3 pass. (validation: Conforms)
