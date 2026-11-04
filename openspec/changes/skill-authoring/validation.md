# Validation: skill-authoring

Code checked: committed HEAD `c725774`. Files were read with `git show HEAD:<path>`. Line numbers refer to HEAD.

Experiments ran in a throwaway sandbox (`git archive HEAD`, `npm ci --ignore-scripts`, `tsup` build). Each simulated machine had its own `HOME` and `AUGY_HOME`. `PATH` was limited to `node`, `/usr/bin`, `/bin`, plus empty shims for the agents meant to be detected. `code`, `nano`, and `vi` were shimmed to log their arguments. The home repos were local bare repos, reached through a git `insteadOf` rewrite. A read-only `gh` shim forwarded `gh api` GETs to the public api.github.com, used for `augy update` and for the tap install of `callmeradical/augy`. Interactive prompts were driven through a Python pty driver.

## Summary

| Verdict | Count |
|---|---|
| Conforms | 19 |
| Deviates | 1 |
| Missing | 0 |
| Unverifiable | 0 |
| **Total requirements** | **20** |

## Results

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Scaffold a new skill | Conforms | src/commands/author.ts:96-101 | ran: with only `claude` detected, `author new my-skill --no-edit` created `~/.claude/skills/my-skill/SKILL.md`. With three detected and two chosen, both got the folder. | |
| Starter template | Conforms | src/commands/author.ts:33-50 | ran: the file starts `# Skill: my-skill` and has `## Overview`, `## Workflow` (containing `1. `), and `## Notes`, each with an `<!-- … -->` placeholder. | |
| Choose target agents | Conforms | src/commands/author.ts:71-89 | ran: with opencode, claude, and codex detected, the prompt "Install for which agents?" showed `◼ OpenCode ◼ Claude ◼ Codex` and nothing undetected. With one detected agent, no prompt appeared. | |
| No agents detected | Conforms | src/commands/author.ts:71-74 | ran: with no agent shims, it printed `Error: No agents detected. Install an agent first.`, exit 1. `$AUGY_HOME` stayed empty and no skill folders were created. | Shown as an uncaught exception with a stack trace. |
| Independent copy per agent | Conforms | src/commands/author.ts:96-101 | ran: `~/.opencode/skills/my-skill` and `~/.claude/skills/my-skill` were each real directories (`-d`, not `-L`), and `$AUGY_HOME` held only `registry.json` (no `store/`). | |
| Register as authored | Conforms | src/commands/author.ts:106-115 | ran: the lockfile had `source:""`, `sha:"unversioned"`, and `agents.opencode/claude` with paths. `augy list` included `my-skill`. | `list` labels it "untracked … run `augy set-source`" (src/commands/list.ts:46-49). See below. |
| Open the new skill in the editor | Conforms | src/commands/author.ts:128-130,159-166 | ran: `EDITOR=code` launched `code <folder>`. EDITOR unset with `VISUAL=nano` launched `nano <folder>`. Both unset launched `vi <folder>`. With both set, `code` won. | `EDITOR="code --wait"` ended with `spawn code --wait ENOENT`, exit 1, after the skill was already created (no shell, so arguments aren't split). |
| Skip the editor | Conforms | src/index.ts:316-323; src/commands/author.ts:128 | ran: `EDITOR=code author new s-noedit --no-edit` created and registered the skill, and the editor log had no entry for it. | |
| Report location and backup step | Conforms | src/commands/author.ts:117-123 | ran: output showed `✓ my-skill created`, the first agent's path, and "Run `augy home push` when ready to back it up." | Only the first agent's path is printed. |
| Refuse a tracked name | Conforms | src/commands/author.ts:64-66 | ran: on a second `author new my-skill`, the output was ``Error: Skill "my-skill" already exists in the registry. Use `augy author edit my-skill` to open it.``, exit 1. The customized SKILL.md was kept and the lockfile was byte-identical. | |
| Edit an installed skill | Conforms | src/commands/author.ts:137-153 | ran: `author edit my-skill` opened the first recorded active path (opencode). External `tdd`, with an inactive codex entry before an active claude entry, opened claude's path. | |
| Edit errors | Deviates | src/commands/author.ts:141-149 | ran: unknown `my-skil` printed "not found … Run `augy list`", exit 1, and launched no editor (conforms). An entry with `active:false` printed "No active agent path found", exit 1 (conforms). An active path recorded but **missing on disk** printed `Opening …/ghost-missing…`, exit 0, and the editor was launched. | The requirement says "no active location on disk". The code checks only the `active` flag, never whether the path exists. |
| Update skips authored skills | Conforms | src/commands/update.ts:67-87 | ran: with home repo `alice/skills` and skills `my-skill` (authored), `old` (`alice/skills/skills/old`), and `author` (external): "Skipping 2 authored skill(s) — run `augy home push` to re-sync: my-skill, old". The `gh` call log showed only `callmeradical/augy` calls. `my-skill/SKILL.md` was unchanged (`cmp`). | Home-repo matching is a substring test, as in push. Wording is as the PRD quotes it. |
| Authored skills back up through the home repo | Conforms | src/commands/home.ts:151-178,357-375 | ran: `author new my-skill` then `home push` on machine A, then `home pull --agent claude` on machine B. `diff -r` of the two `my-skill` folders was identical, and B recorded `source:""`. | |
| Authored skills keep an empty source | Conforms | src/commands/home.ts:162-164,176-178 | ran: after push, the lockfile `my-skill.source` was `""` and the manifest had `"my-skill": ""`. | |
| Authored skills can be tagged | Conforms | src/commands/tag.ts:38-75 | ran: `tag set my-skill personal`, then `tag show my-skill` printed "my-skill  personal". | |
| Bundled author skill is installable | Conforms | package.json `files` includes `skills/**/*`; skills/author/SKILL.md | ran: `npm pack --dry-run` listed `skills/author/SKILL.md`. On a fresh augy home, `augy list` showed "No skills installed" and there were no agent folders. Then `tap add callmeradical/augy --path skills` and `install author --agent claude --yes` put `~/.claude/skills/author` (a store symlink) in place. | The install fetches from GitHub. No command ever uses the packaged copy. |
| Bundled skill teaches the authoring workflow | Conforms | skills/author/SKILL.md:6-17,19-54 | read: "What is an augy skill?", three example agent folders, and steps 1-4 (`augy author new`, write, test with trigger phrases, `augy home push`). | It lists only three of the 33 agent folders. |
| Bundled skill describes a good SKILL.md | Conforms | skills/author/SKILL.md:32-41,75-81 | read: description, trigger phrases, numbered workflow, examples, and references. Tips: verb-first (:77), concrete commands (:78), fail states (:79), one capability per skill (:40,:80-81), splitting beyond ~150 lines (:40-41). | Two of the five tips are in §2, not in "Tips". |
| Bundled skill includes a template | Conforms | skills/author/SKILL.md:56-73 | read: a fenced `markdown` template. | It differs from the CLI starter template (src/commands/author.ts:33-50). |

## Spec issues

- **"No active location on disk" vs the scenario.** The requirement text says "on disk". The scenario ("has no active location") only covers a lockfile entry with no active agent. The two can be read differently. This validation follows the requirement text.
- **Bundled-skill content checks are topic checks.** "Explains what a skill is" and the tip list can only be judged by reading for those topics, not by a mechanical test. The spec doesn't say whether all five tips must be in one list.
- **"Install via tap" depends on the live GitHub repo.** It verifies `callmeradical/augy@main`, not the package shipped at HEAD. A copy that changed after HEAD would still pass or fail the scenario.
- **The editor rule and "folder vs file".** The spec opens the folder. For `vi`, that gives a directory listing (PRD FN 4). This is not a conformance problem, but the "vi fallback" scenario passes while giving a poor experience.

## Behavior not covered by the spec

- **`author new` overwrites untracked folders.** An existing untracked `~/.claude/skills/foreign/SKILL.md` ("FOREIGN") was replaced by the template, exit 0 (reproduced PRD FN 3).
- **A missing editor crashes after scaffolding.** If `$EDITOR` holds arguments or names a missing binary, `author new`/`author edit` exits 1 with an uncaught `spawn … ENOENT`, after the files and lockfile entry already exist. An empty `EDITOR=""` would be passed through as well (`??` keeps `""`).
- **`augy list` advises `set-source`** for authored skills (src/commands/list.ts:46-49). Following that advice turns them external and stops their file backup.
- **The `gh` CLI on PATH makes "GitHub Copilot" a detected agent** (src/agents.ts:81-85). `author new` then prompts even when only one real agent is installed.
- **Inconsistent `shortSha`.** `author new` gives `unversi`, home-push reclassification gives `unversio`, and pull-restored authored skills get version `home`.

## PRD factual errors

- No PRD claim in this area was contradicted by the code.
- Further Note 3 ("inferred; not reproduced") was reproduced and is correct. Further Notes 4 (`$EDITOR` before `$VISUAL`, opens the folder, detached), 5, 6, 8 (33 agents in src/agents.ts), and 11 were confirmed.
- Testing Decisions understates one gap: the existing duplicate-name test (src/commands/author.test.ts:136-143) only checks the "already exists" message. It doesn't check the pointer to `augy author edit` or that nothing was written.
