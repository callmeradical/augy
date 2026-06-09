/**
 * augy author new <name> [--no-edit]
 * augy author edit <name>
 *
 * Create and edit self-authored skills.
 *
 * new  — scaffolds a SKILL.md template in each selected agent's skills dir,
 *         registers the skill as authored (no source), and opens it in $EDITOR.
 *
 * edit — opens an existing skill's directory in $EDITOR so you can modify it.
 *         After editing, run `augy home push` to commit changes to your home repo.
 */

import { intro, outro, multiselect, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';

import { AGENTS, agentSkillPath, detectInstalledAgents } from '../agents.js';
import {
  createSkillRecord,
  getSkill,
  readRegistry,
  upsertSkill,
  writeRegistry,
} from '../registry.js';

// ---------------------------------------------------------------------------
// SKILL.md template
// ---------------------------------------------------------------------------

function skillTemplate(name: string): string {
  return `# Skill: ${name}

## Overview

<!-- Describe what this skill does and when to use it. -->

## Workflow

<!-- Step-by-step instructions for the agent. -->

1. 

## Notes

<!-- Tips, caveats, or references. -->
`;
}

// ---------------------------------------------------------------------------
// author new
// ---------------------------------------------------------------------------

export async function authorNewCommand(
  name: string,
  opts: { noEdit?: boolean } = {},
): Promise<void> {
  intro(chalk.bold('augy') + chalk.dim(` — author new ${name}`));

  const registry = await readRegistry();

  if (getSkill(registry, name)) {
    throw new Error(`Skill "${name}" already exists in the registry. Use \`augy author edit ${name}\` to open it.`);
  }

  // -------------------------------------------------------------------------
  // Select target agents
  // -------------------------------------------------------------------------
  const available = detectInstalledAgents();
  if (!available.length) {
    throw new Error('No agents detected. Install an agent first.');
  }

  const selected = available.length === 1
    ? [available[0]!.id]
    : await multiselect<string>({
        message: 'Install for which agents?',
        options: available.map((a) => ({ value: a.id, label: a.name })),
        initialValues: available.map((a) => a.id),
      });

  if (isCancel(selected)) {
    console.log(chalk.dim('Cancelled.'));
    process.exit(0);
  }

  const targetAgents = AGENTS.filter((a) => (selected as string[]).includes(a.id));

  // -------------------------------------------------------------------------
  // Scaffold SKILL.md in each agent path
  // -------------------------------------------------------------------------
  const agentPaths: Record<string, string> = {};

  for (const agent of targetAgents) {
    const dest = agentSkillPath(agent, name);
    agentPaths[agent.id] = dest;
    await mkdir(dest, { recursive: true });
    await writeFile(join(dest, 'SKILL.md'), skillTemplate(name), 'utf8');
  }

  // -------------------------------------------------------------------------
  // Register in registry (no source — authored locally)
  // -------------------------------------------------------------------------
  const record = createSkillRecord({
    name,
    source:      '',
    gigetSource: '',
    sha:         'unversioned',
    agentIds:    targetAgents.map((a) => a.id),
    agentPaths,
  });
  upsertSkill(registry, record);
  await writeRegistry(registry);

  const firstPath = agentPaths[targetAgents[0]!.id]!;

  outro(
    `${chalk.green('✓')} ${chalk.cyan(name)} created\n` +
    chalk.dim(`  ${firstPath}\n`) +
    chalk.dim('  Run `augy home push` when ready to back it up.'),
  );

  // -------------------------------------------------------------------------
  // Open in $EDITOR
  // -------------------------------------------------------------------------
  if (!opts.noEdit) {
    openInEditor(firstPath);
  }
}

// ---------------------------------------------------------------------------
// author edit
// ---------------------------------------------------------------------------

export async function authorEditCommand(name: string): Promise<void> {
  const registry = await readRegistry();
  const skill    = getSkill(registry, name);

  if (!skill) {
    throw new Error(`Skill "${name}" not found in registry. Run \`augy list\` to see installed skills.`);
  }

  const agentPath = Object.values(skill.agents).find((a) => a.active)?.path;

  if (!agentPath) {
    throw new Error(`No active agent path found for "${name}".`);
  }

  console.log(chalk.dim(`Opening ${agentPath}…`));
  openInEditor(agentPath);
}

// ---------------------------------------------------------------------------
// Editor helper
// ---------------------------------------------------------------------------

function openInEditor(path: string): void {
  const editor = process.env['EDITOR'] ?? process.env['VISUAL'] ?? 'vi';
  const child  = spawn(editor, [path], {
    stdio:    'inherit',
    detached: true,
  });
  child.unref();
}
