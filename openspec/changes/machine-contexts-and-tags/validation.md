# Validation: machine-contexts-and-tags

Code checked: committed HEAD `c725774`. Files were read with `git show HEAD:<path>`. Line numbers refer to HEAD.

Experiments ran in a throwaway sandbox (`git archive HEAD`, `npm ci --ignore-scripts`, `tsup` build). Each simulated machine had its own `HOME` and `AUGY_HOME`, and `PATH` was limited to `node`, `/usr/bin`, `/bin`, plus empty agent shims. The home repos were local bare repos, reached through a git `insteadOf` rewrite of `https://github.com/`. A read-only `gh` shim forwarded `gh api` GETs to the public api.github.com, so sync could install the public `callmeradical/augy/skills/author` skill. Interactive prompts (`home pull`, `tag migrate`) were driven through a Python pty driver.

## Summary

| Verdict | Count |
|---|---|
| Conforms | 22 |
| Deviates | 1 |
| Missing | 0 |
| Unverifiable | 0 |
| **Total requirements** | **23** (machine-context 10, skill-tags 13) |

## Results

### machine-context

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Set the machine context | Conforms | src/commands/context.ts:24-27; src/registry.ts:263-265 | ran: `context set work`, `client-acme`, `personal`, `Work` in turn. The lockfile's `machineContext` was exactly each value, each replacing the one before. | `context set ""` stores `""` and prints "Machine context cleared". See below. |
| Confirm the context and its effect | Conforms | src/commands/context.ts:29-31 | ran: output was "Machine context set to work" and "`augy home pull` will now pre-select skills tagged work or universal." | The message leaves out untagged skills, which are also pre-selected. |
| Show the machine context | Conforms | src/commands/context.ts:37-47 | ran: printed "Machine context: Work". With none set: "No machine context set." and "Run `augy context set <ctx>` to set one". | |
| Clear the machine context | Conforms | src/index.ts:270-276; src/commands/context.ts:32-33 | ran: after `context clear`, the lockfile had no `machineContext` key and the next `home pull` showed every row ◼. On a fresh machine, `context show` reported none. | |
| Machine context stays on the machine | Conforms | src/commands/home.ts:170-191 (manifest has only `version/skills/contexts`); home.ts:293 (read only) | ran: with machine context `work`, `grep -r work` on the pushed tree found nothing. After `home pull --context work`, `context show` was still `personal`. | Pull never assigns `machineContext`. Reading home.ts:236-394 confirms no write. |
| Machine context drives pull pre-selection | Conforms | src/commands/home.ts:293,302; src/registry.ts:267-275 | ran: machine context `personal`, manifest `a:work b:personal c:universal d:untagged`. The picker showed ◻a ◼b ◼c ◼d. | The spec's `work` scenario is the mirror image. `--context work` produced ◼a ◻b ◼c ◼d. |
| One-off context override on pull | Conforms | src/commands/home.ts:293 | ran: machine context `personal`, `home pull --context work`. Pre-selection followed `work`, and the stored context was still `personal` afterwards. | The "no machine context" case is the same `??` expression (read). |
| Pull shows the active context and tags | Conforms | src/commands/home.ts:296-308 | ran: header `[context: work]`, entry `tdd  universal  octo/skills/tdd`. | |
| Context sets defaults only | Conforms | src/commands/home.ts:298-310; src/ui/filterable-multiselect.ts:58-59 | ran: with context `personal`, the off-context `a` (`work`) was listed as ◻. Space selected it, and pull installed it to `~/.claude/skills/a` with tags `["work"]`. | |
| Other commands ignore the context | Conforms | a search for `getMachineContext\|machineContext` across `src` at HEAD found it only in src/commands/context.ts and src/commands/home.ts | read | No command removes or deactivates skills based on context. |

### skill-tags

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Set a skill's tags | Conforms | src/commands/tag.ts:38-55; src/index.ts:285-291 | ran: `tag set tdd work universal` stored `["work","universal"]`. `tag set tdd personal` stored `["personal"]`. `Client-Acme` was stored exactly. `work work` was stored as `["work","work"]` (no de-duplication, as specified). | |
| Clear a skill's tags | Conforms | src/commands/tag.ts:46,50-52 | ran: `tag set tdd` stored `[]`. `tag show tdd` printed "none  (treated as universal)". | |
| Show a skill's tags | Conforms | src/commands/tag.ts:61-75 | ran: printed "tdd  work, universal". Untagged `lint` printed "lint  none  (treated as universal)". | It says "none" rather than "untagged". The meaning is the same. |
| Tags apply only to installed skills | Conforms | src/commands/tag.ts:42-44,65-67 | ran: `tag set tddd work` and `tag show tddd` both printed `Error: Skill "tddd" not found in registry.` and exited 1. The lockfile was byte-identical afterwards (`cmp`). | The error arrives as an uncaught exception with a stack trace. |
| Context matching rule | Conforms | src/registry.ts:267-275 | read, and ran through pull pre-selection (universal, untagged, exact tag, non-match) | Matching is case-sensitive (`Array.includes`). |
| Migrate untagged skills interactively | Conforms | src/commands/tag.ts:84-114 | ran: lockfile `t1(tagged) u1 t2(tagged) u2 t3(tagged)` prompted u1, then u2, once each. The note for u1 showed `github:org/skills/tdd`. The note for u2 showed "authored (no external source)". | "Lockfile order" is `Object.values` order. Names that look like integers (for example `10`) would be prompted first. |
| Migration offers the suggested contexts | Conforms | src/commands/tag.ts:28-32,110-114 | ran: the options were universal, personal, and work, each with a hint ("install on every machine", and so on). There was no free-text option. Enter with none selected stored `[]`. | Clack shows each hint only on the focused row. |
| Migration skips tagged skills and reports progress | Conforms | src/commands/tag.ts:86,93-96 | ran: printed "3 skill(s) already tagged · 2 to tag", and only u1 and u2 were prompted. | |
| Migration saves after every answer | Conforms | src/commands/tag.ts:116-125 | ran: answered u1 = work, then Ctrl-C at u2. Output was "Migration paused — progress saved.", the lockfile had u1 `["work"]`, and u2 was unchanged. | |
| Migration with nothing to do | Conforms | src/commands/tag.ts:88-91 | ran: printed "All skills already have context tags." with no prompt. | |
| Migration ends with a push reminder | Conforms | src/commands/tag.ts:134-135 | ran: "1 skill(s) tagged." and "Run `augy home push` to save contexts to your home repo." | The cancel path doesn't remind. |
| Tags travel in the home repo manifest | Conforms | src/commands/home.ts:181-186,299-310 | ran: push wrote the `contexts` map. On a machine with no local tags, pull showed `tdd universal` and pre-selected it. `lint` with no manifest tags but local `work` showed `work` and followed it for pre-selection. | |
| Pulled skills receive their home-repo tags | Deviates | src/commands/home.ts:372,388-393; src/commands/sync.ts:233-248 | ran: (1) external `author`, tagged `universal` in the manifest, was pulled onto a fresh machine and recorded with **no** `contexts`. (2) Installed `author` tagged `work`, manifest with no tags, upgraded via pull: the record lost `contexts` (and also `storePath` and `tap`). (3) Authored `d`, tagged `work` locally, with no manifest tags: pulled with **no** tags. (4) Push from the machine in case 1: the manifest had no `contexts`. | Only "Authored skill tags restored" conforms (`my-skill` and `a` got their manifest tags). |

## Spec issues

- **Empty-string context.** "Any string SHALL be accepted as typed" includes `""`. The code stores `""`, prints "cleared", and treats it as no context. The spec doesn't say whether that is allowed.
- **"Lockfile order".** This is not defined for JSON objects whose keys look like integers. JavaScript orders those keys numerically, ahead of the others.
- **Machine context `universal`.** The spec allows it. It then pre-selects only untagged and `universal` skills (design.md Open Question). It can't be tested as either intended or a defect.
- **"Each with a short explanation".** It isn't stated whether every explanation must be visible at once. Clack shows only the focused option's hint.
- **"Upgrade keeps tags".** The spec chooses "keep local tags when the manifest has none", which the PRD doesn't state (listed as an Open Question in design.md). This validation judges the code against the spec's choice.

## Behavior not covered by the spec

- **Upgrades through sync rebuild the whole record.** They drop `contexts`, `storePath`, and `tap`, and replace the agent's symlink into `~/.augy/store/` with a plain directory, which orphans the store copy (observed on `author`). This is wider than the tag loss.
- **Choosing none in migrate** prints "✓ u2 (universal)" and counts as tagged, but the next `tag migrate` offers u2 again ("4 skill(s) already tagged · 1 to tag").
- **Unknown-skill errors** are uncaught exceptions, so users see a Node stack trace above the message.
- **Pull overwrites an authored skill's local record.** Any local tag is lost when the manifest has none for it.

## PRD factual errors

- **Testing Decisions → "The `universal` case is covered only indirectly, through a pull test" is wrong.** src/registry.test.ts:69-72 tests `skillMatchesContext(['universal'], 'work')` and `(['universal'], 'personal')` directly.
- **Implementation Decisions → "`augy bundle` manifests can also carry a `contexts` map" is misleading.** Only the manifest type allows the field (src/commands/bundle.ts:31). `augy bundle` never writes it (bundle.ts:52-65), and `augy sync` never reads it (sync.ts:76). In practice only `augy home push` produces `contexts`.
- **Further Note 1 understates the loss.** Besides tags, an upgrade through pull also drops `storePath` and `tap` and replaces the store symlink (reproduced).
- Further Notes 2, 4, 5, and 6 were confirmed (migrate re-offer reproduced; src/index.ts:5-27 omits `context`/`tag`; src/commands/tag.ts:1-4 shows the old syntax; case-sensitive matching).
