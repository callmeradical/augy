# Skill: author

A meta-skill for authoring new augy skills. Use this when the user wants
to create a new skill for their AI agents.

## What is an augy skill?

A skill is a directory containing a `SKILL.md` file. That file is loaded
by an AI agent as context — giving it specialised knowledge, workflows,
or tool integrations for a specific task.

Skills are installed per-agent:
```
~/.opencode/skills/<name>/SKILL.md
~/.claude/skills/<name>/SKILL.md
~/.codex/skills/<name>/SKILL.md
```

## Workflow

### 1. Scaffold the skill

```sh
augy author new <name>
```

This creates the skill directory for your installed agents, registers it
in the augy registry, and opens it in `$EDITOR`.

### 2. Write the SKILL.md

A good SKILL.md has:

- **One-line description** — what this skill does and when to invoke it
- **Trigger phrases** — phrases the user says that should activate this skill
- **Workflow** — numbered steps the agent follows
- **Examples** — concrete inputs and expected outputs
- **References** — links to docs, files, or other skills

Keep it focused. One skill = one capability. If it grows beyond ~150 lines,
consider splitting it.

### 3. Test it

Load the skill into your agent and try the trigger phrases. Check that the
agent follows the workflow correctly.

### 4. Back it up

```sh
augy home push
```

This commits the skill to your home repo so it's available on all your machines.

## SKILL.md template

```markdown
# Skill: <name>

<One-sentence description of what this skill does.>
Trigger on: <phrase 1>, <phrase 2>, <phrase 3>.

## Workflow

1. <First step>
2. <Second step>
3. <Third step>

## Notes

<!-- Tips, caveats, edge cases -->
```

## Tips

- **Verb-first steps**: "Run the tests", not "Tests should be run"
- **Concrete over abstract**: Show exact commands, not just concepts
- **Fail states**: Tell the agent what to do when things go wrong
- **Scope**: If you find yourself writing "unless X, in which case Y", that's
  a second skill
