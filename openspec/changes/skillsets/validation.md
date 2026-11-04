# Validation: skillsets

Code checked: committed HEAD `c725774`, read with `git show HEAD:<path>`. Line numbers are at HEAD.

Sandbox: `git archive HEAD` extracted to a temp dir, `npm ci --ignore-scripts`, built with `tsup`, and run as `node dist/index.js` with `env -i`, a temp `HOME`, a temp `AUGY_HOME`, and `PATH` holding only `node`. With `which` missing from `PATH`, every `{ bin }` detection signal is false, so agent detection was controlled by creating `~/.opencode/config.json` and `~/.claude/settings.json` in the temp `HOME`. Fixture lockfiles (`registry.json`) and store copies (`$AUGY_HOME/store/<skill>/`) were written by hand. Confirmation prompts were driven through a pty (`script -q /dev/null`). Folders were compared before and after with a listing of entry type, symlink target and file hash. Nothing in the real `~/.augy` or real agent folders was touched.

## Summary

35 requirements (17 in `skillsets`, 18 in `skillset-activation`).

| Verdict | Count |
|---|---|
| Conforms | 30 |
| Deviates | 5 |
| Missing | 0 |
| Unverifiable | 0 |

Deviations:
- `skillset add` reports skipped duplicates as added.
- `skillset remove` reports names that weren't in the set as removed.
- `augy use` removes a symlink whose name is in the set when that skill isn't installed.
- Valid names that match `Object.prototype` keys (`constructor`, `toString`, `valueOf`, `hasOwnProperty`) are treated as existing skillsets. `create` refuses them, and `delete` reports success on one that doesn't exist.

## Results

### skillsets

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| Create an empty skillset | Deviates | src/commands/skillset/create.ts:31-37; src/skillsets.ts:74-76, 87-92 | ran: `create engineering` gave rc 0 and the file had `skills: []` plus equal `createdAt`/`updatedAt`. ran: `create constructor`, `create toString` and `create hasOwnProperty` on an empty home each printed `Skillset "<name>" already exists.` and exited 1 | Works for ordinary names. `getSkillset` indexes a plain object (`data.skillsets[name]`), so inherited `Object.prototype` keys look like existing sets, and creating a valid, non-existent set fails |
| Skillset names are letters, digits and hyphens | Conforms | src/skillsets.ts:83-85; create.ts:21-27 | ran: `engineering` and `my-set` were created; `my set`, `my_set` and `my.set!` each exited 1, and the file held only the two valid sets | The check runs before the file is read. `-x` (leading hyphen) is accepted (ran, via `create -- -x`) |
| Duplicate skillset names are rejected | Conforms | create.ts:31-34 | ran: with `engineering = [tdd, commit]`, `create engineering` exited 1 and `skillsets.json` was byte-identical | The guard is in the command only. The helper overwrites (skillsets.ts:87-92), as a unit test asserts (src/skillsets.test.ts:82-87) |
| Add several skills in one command | Conforms | add.ts:28-40; src/index.ts:393 | ran: `add engineering tdd commit` and then `add engineering tdd github summarize` gave `[tdd, commit, github, summarize]`, with `updatedAt` later than `createdAt` | `updatedAt` is bumped even when nothing changed (add.ts:39) |
| Adding a skill that isn't installed warns but proceeds | Conforms | add.ts:25-31 | ran: `summarize`, absent from the lockfile, printed `Skill "summarize" is not installed — adding anyway`, was added, and `registry.json` was byte-identical | |
| Adding a skill already in the set is skipped | **Deviates** | add.ts:32-36, 42-45 | ran: with `tdd` already in the set, `add engineering tdd github summarize` printed `"tdd" is already in engineering — skipping.` and then `✓ Added tdd, github, summarize to skillset engineering` | The set has no duplicates, but the outro lists every argument, so `tdd` is reported as added. This fails "the output does not report `tdd` as added" |
| Removing skills from a set never uninstalls them | Conforms | remove.ts:16-34 (reads and writes only skillsets.json) | ran: `remove engineering commit` dropped `commit`; `registry.json` was byte-identical and the store was untouched | |
| Removing a skill not in the set warns | **Deviates** | remove.ts:24-31, 36-39 | ran: `remove engineering commit tddd` printed `Skill "tddd" is not in skillset "engineering".` and then `✓ Removed commit, tddd from skillset engineering` | The warning is printed, but the outro reports `tddd` as removed |
| List skillsets | Conforms | list.ts:18-41 | ran: with `writing` (2), `engineering` (3), `my-set` (0) and `research` (0), the rows came out in name order with count and date | Date via `toLocaleDateString` (list.ts:34). Sort is `localeCompare`, not a code-point sort |
| Show one skillset | Conforms | show.ts:23-35 | ran: `show engineering` printed `Created:` and `Updated:` lines, then one skill per line | |
| Delete a skillset after confirmation | Conforms | delete.ts:28-39; prompt text at delete.ts:30 | ran (pty): answering `n` printed `Cancelled.` and left the file byte-identical. Answering `y` removed `engineering` only, with `registry.json` byte-identical and the store unchanged. read: the prompt says "This does not uninstall any skills." | The prompt text was read, not captured, because clack redraws the terminal. Declining exits 0 |
| Delete without a prompt using --yes | Conforms | delete.ts:28; src/index.ts:427 | ran: `delete writing --yes </dev/null` deleted the set with no prompt; the lockfile was unchanged | |
| Bare skillset command shows help | Conforms | src/index.ts:434-436 | ran: `augy skillset` printed help listing create, add, remove, list, show and delete, and exited 0 | |
| Naming a skillset that doesn't exist is an error | **Deviates** | add.ts:20-23; remove.ts:19-22; show.ts:18-21; delete.ts:23-26; skillsets.ts:74-76 | ran: `add`, `remove`, `show` and `delete --yes` on `nope` each exited 1 with `not found`, and the file was byte-identical. ran: `delete hasOwnProperty --yes` and `delete valueOf --yes` on sets that don't exist printed `✓ Skillset … deleted.` and exited 0 | Ordinary names conform. Prototype-key names are found by `getSkillset`, so `delete` "succeeds". `show constructor` prints `Object` and `Invalid Date` and then crashes with a TypeError. `add constructor tdd` crashes (rc 1, nothing written) |
| Skillsets are kept in a readable file under the augy home | Conforms | src/skillsets.ts:34-36, 62-68; src/registry.ts:113-116 | ran: with `AUGY_HOME` unset, the file was written to `$HOME/.augy/skillsets.json`. With `AUGY_HOME` set, it was written there and `$HOME` stayed empty. ran: adding `commit` to the file by hand showed up in `show`. The format matches the spec | `create` always prints `(~/.augy/skillsets.json)` (create.ts:42), even under `AUGY_HOME`. `AUGY_HOME=""` resolves to a path relative to the current directory (`??` at registry.ts:115; read) |
| A skillset holds skill names only | Conforms | src/skillsets.ts:18-23; add.ts:33 | ran: the stored entry is `{name, skills: [...], createdAt, updatedAt}`, with skills as bare strings | |
| A corrupted skillsets file stops augy with an error | Conforms | src/skillsets.ts:53-59 | ran: with a truncated JSON file, `list`, `create`, `add`, `remove`, `show` and `delete --yes` each exited 1 with `… contains invalid JSON. Please fix or delete the file.`, and the file was byte-identical | This covers only `JSON.parse` failures. An unreadable file, or valid JSON of the wrong shape, is silently replaced or crashes (see "Behavior not covered") |

### skillset-activation

| Requirement | Verdict | Evidence | How checked | Notes |
|---|---|---|---|---|
| augy use makes one agent's linked skills match the set | **Deviates** | src/commands/use.ts:61-68, 79, 100-117 | ran: links `tdd` and `commit` plus set `research = [search, summarize]` left only links `search` and `summarize`. ran: in-set link `tdd`, out-of-set link `grammar` and copy `notes` with set `[tdd, commit]` left links `tdd` and `commit` with `notes` unchanged. ran: set `[tdd, local]` with `local` not installed and a symlink `local` in the folder listed `local` under Remove and unlinked it | Both scenarios pass. The requirement says symlinks "whose names are in the set stay as already active". `desiredSet` is built from installed members only (use.ts:79), so a link named for an uninstalled member is removed |
| Switching never deletes skill files | Conforms | use.ts:165-173 (`unlink` only) | ran: after the `tdd` and `commit` links were removed, the listing and hashes of `$AUGY_HOME/store` were identical to before; `store/grammar` was still intact | |
| Plain copies are never touched | Conforms | use.ts:108 | ran: copies `notes` and `legacy-skill` had identical hashes after a switch to a set that didn't contain them. ran: a copy `commit` that is in the set was also left unchanged | The in-set copy is listed under Add and then fails with `EEXIST` on every run (see Spec issues) |
| New links point at the canonical copy | Conforms | use.ts:180-195, 202-204; update.ts:183-186 | ran: new links resolved to `$AUGY_HOME/store/<name>`. ran: for `notes` with no `storePath`, only an opencode location, and `--agent claude`, the link pointed at opencode's `notes`; when claude also had a recorded location, the link used claude's. ran: `ghost` with no location that exists gave `✗ Skill "ghost" has no resolvable path — skipping.`, and `notes` and `tdd` were still linked. Simulated update: replacing `store/tdd` in place (`rm`, `mkdir`, write) showed the new content through the link | Update itself wasn't run because it needs network. `update.ts` rewrites `skillStorePath(name)`, the same path the link targets, when `storePath` was created under the same `AUGY_HOME` |
| Switching never copies skills | Conforms | use.ts:204 (`symlink`; no `cp` in the file) | ran: switching between `engineering = [github, tdd]` and `research = [github, search]` left exactly one real `github/SKILL.md` on disk (in the store), and the agent's `github` was a symlink to it after each run | |
| The plan is printed before any change | Conforms | use.ts:124-142 come before use.ts:157-209 | ran: the output shows `Agent: Claude (claude)`, `Skillset: engineering`, `Remove (1) – grammar`, `Add (1) + commit` and `Already active (1): tdd`, then `Done` | The header count `(N skill(s))` includes uninstalled members (use.ts:125; ran: `e (3 skill(s))` with only 1 installed) |
| Dry run previews the switch without changing anything | Conforms | use.ts:82-86, 149-152 | ran: the `--dry-run` plan matched the following real run line for line (apart from the `[dry-run]` label), and the folder listing was identical after the dry run. ran: with no agent folder, the dry run didn't create it | |
| Only the chosen agent is affected | Conforms | use.ts:78, 202 | ran: with links in both the claude and opencode folders, `--agent claude` left the opencode listing identical | |
| AUGY_DEFAULT_AGENT sets the default agent | Conforms | src/agentResolver.ts:26 | ran: `AUGY_DEFAULT_AGENT=opencode` with no flag switched opencode and left claude unchanged. Adding `--agent claude` switched claude and left opencode identical | `--agent ''` skips the env var and auto-detects, because `'' ?? env` is `''` and `!raw` is true (ran) |
| Fall back to the first detected agent | Conforms | agentResolver.ts:44-60; src/agents.ts:40-58, 294-296 | ran: with both opencode and claude detected, opencode was switched and named in the plan. With only claude detected, claude was switched | Which agents count as detected depends on `PATH` and the files on the machine (agents.ts:258-274) |
| Unknown or missing agent is an error listing known IDs | Conforms | agentResolver.ts:29-36, 48-58 | ran: `--agent not-an-agent`, `AUGY_DEFAULT_AGENT=not-an-agent`, and no agent detected each exited 1 with `Known agents: opencode, claude, …`, and the `$HOME` listing was identical | |
| Skills that aren't installed are skipped with a warning | Conforms | use.ts:58-73 | ran: `[search, summarize]` with only `search` installed warned about `summarize` and linked `search`. ran: `[foo, bar]` with neither installed warned about each, printed `No installed skills in this skillset — no changes made.`, and left the existing `tdd` link in place | Exits 0 when none are installed |
| An empty skillset changes nothing | Conforms | use.ts:45-48 come before use.ts:53 | ran: `use empty --agent claude` warned, exited 0 and left the folder identical. ran: `use empty` with no agent detected warned and exited 0 with no agent error | |
| Re-running a switch reports already up to date | Conforms | use.ts:144-147 | ran: a second identical run printed `Already up to date — no changes needed.` and left the folder identical | Never reached while an in-set copy exists, because that copy is planned as Add on every run (ran) |
| Per-skill problems are collected and don't abort the switch | Conforms | use.ts:162-213 | ran: with a copy named `commit` in the folder and set `[commit, github]`, `github` was linked and `✗ Could not link "commit": Error: EEXIST …` was printed before the summary | Exit code is 0 even with errors (ran) |
| Summary after the switch | Conforms | use.ts:215-219 | ran: two links in, `grammar` out, and set `[tdd, commit, github]` gave `(−1 removed, +2 added, 1 unchanged)` | |
| Using a skillset that doesn't exist is an error | Conforms | use.ts:37-43 | ran: `use nope --agent claude` exited 1 and the folder was identical | `use toString` exits 1 with a TypeError instead of `not found` (ran). It is an error and changes nothing, but it isn't a clean error |
| Corrupted skillsets file stops augy use | Conforms | use.ts:37; skillsets.ts:53-59 | ran: with invalid JSON, `use engineering --agent claude` exited 1 with the fix-or-delete message, and the file was byte-identical | |

## Spec issues

- **Which "in the set" counts as already active.** "augy use makes one agent's linked skills match the set" says symlinks whose names are in the set stay. "Skills that aren't installed are skipped" says uninstalled members are skipped. The spec doesn't say whether a link named for an uninstalled member stays. Neither scenario covers it, and the code removes it.
- **In-set plain copies.** A copy whose name is in the set is "never touched", but the spec doesn't say how the plan should show it. The code lists it under Add on every run, reports a per-skill `EEXIST` error, and never reaches "already up to date". design.md Open Question 3 covers this, but the specs say nothing about it.
- **Corruption means "not valid JSON" only.** The intent ("never silently reset it") also applies to an unreadable file and to valid JSON of the wrong shape, but the requirement as written covers neither. Both are mishandled at HEAD (see below).
- **"Accept a name only if…" is a necessary condition, not a sufficient one.** As written, rejecting a valid name like `constructor` doesn't break the names requirement. Only the create requirement catches it. The spec should say that every name matching the pattern is accepted, and whether names with a leading hyphen, which clash with CLI flags, are allowed.
- **"A later `augy update` is visible through that link"** (New links point at the canonical copy) is a property of `augy update`, which belongs to another capability. It needs network to test end to end.
- **Exit codes are unspecified** for: per-skill errors (code: 0), "none installed" (0), and a declined delete (0).
- **"Last-updated date" and timestamp formats are unspecified.** The code uses locale-formatted output.
- **"First detected agent" depends on the machine.** The scenario is only testable with detection controlled (`PATH`, `HOME`).

## Behavior not covered by the spec

- **Unreadable `skillsets.json` is silently reset (data loss).** A read error returns an empty store (src/skillsets.ts:50-52). ran: after `chmod 000 skillsets.json`, `list` printed "No skillsets found" and `create research` replaced the file, so the `engineering` set was gone.
- **Valid JSON of the wrong shape.** The parsed value is shallow-merged into the default (skillsets.ts:55). ran: a file containing `[]` was silently replaced on `create`. ran: `{"version":1,"skillsets":null}` crashed `list` with a TypeError.
- **Prototype-key names** (`constructor`, `toString`, `valueOf`, `hasOwnProperty`, …) are treated as existing sets in every command (skillsets.ts:74-76). See the Deviates rows above.
- **`augy use` removes every out-of-set symlink**, including the user's own links and other tools' links (use.ts:108-113). ran: an unrelated dangling link `tdd-dangling` was unlinked.
- **Dangling in-set links count as already active.** If the store copy is gone, the link isn't repaired or reported (use.ts:109-110; ran). An in-set link pointing somewhere other than the canonical copy is also left alone (read).
- **The lockfile is never written by `augy use`.** use.ts:25 imports only `readRegistry`, so list, info, uninstall, diff and rollback drift from the folder (read).
- **Not atomic.** The file comments say "atomically swaps" (use.ts:4, skillsets.ts:4), but changes are applied one by one, and the exit code is 0 after partial failure (ran).
- **`AUGY_DEFAULT_AGENT` is read only by `augy use`** (only call site: use.ts:53). README.md:371 says it applies to "other commands that accept `--agent`".
- **`--agent ''` ignores `AUGY_DEFAULT_AGENT`** and auto-detects (agentResolver.ts:26-27; ran).
- **`add` and `remove` bump `updatedAt` even when nothing changed** (add.ts:39, remove.ts:33; read).
- **Hard-coded path in `create` output** (create.ts:42; ran under `AUGY_HOME`).
- **A real run creates the agent's skills folder if it's missing** (use.ts:82-86).
- **No referential cleanup.** Uninstalling a skill doesn't remove it from skillsets, and `add` accepts any string with only a warning (read).

## PRD factual errors

Checked against docs/prd/skillsets.md.

- **Implementation Decisions: "A symlink whose name is in the set counts as already active."** Contradicted. Only installed members count (use.ts:79, 109). ran: an in-set but uninstalled `local` link was removed.
- **Implementation Decisions: "It's never reset silently."** Contradicted for unreadable files and for wrong-shape JSON (skillsets.ts:50-55). ran: `chmod 000`, then `create` overwrote the file; `[]`, then `create` overwrote it. The claim holds only for JSON syntax errors.
- **Further Notes: "`augy list` and `augy info` still show skills as active for an agent after `use` removed them."** Partly wrong. `list` does (list.ts:69). `info` doesn't mark the agent `[inactive]`, but it shows the missing path in red with `(missing!)` (info.ts:70-74).
- **Confirmed, not errors.** "Self-authored skills are probably copies" is confirmed: author.ts:96-100 writes `SKILL.md` into each agent folder. The other Further Notes claims were checked and hold:
  - sync and home pull make copies (sync.ts:228-230, home.ts:364)
  - the agent order is opencode, claude, codex
  - the README overstates `AUGY_DEFAULT_AGENT`
  - apply isn't atomic and exits 0 on errors
  - the add/remove/header messages overstate success
  - `create` prints a hard-coded path
  - docs/index.html has no skillset mention
  - there is no lint script
  - a corrupt lockfile is treated as empty (registry.ts:152)
  - the description of current test coverage is accurate
