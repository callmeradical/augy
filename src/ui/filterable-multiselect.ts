/**
 * filterableMultiselect
 *
 * A filterable multi-select prompt built on @clack/core's MultiSelectPrompt.
 *
 * Layout:
 *   │
 *   ◆  message  (N total)
 *   │  / filter text█         N matched · space select · a all · enter confirm
 *   │
 *   │  ◻  option-name    hint text
 *   │  ◼  selected-name  hint text          ← cursor (green)
 *   └
 *
 * Typing filters the visible list in real time. Navigation keys (↑↓ space
 * enter) still work normally. Backspace removes the last filter character.
 * Selected items persist across filter changes.
 */

import { MultiSelectPrompt, isCancel } from '@clack/core';
import chalk from 'chalk';
import process from 'process';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterOption<T> {
  value: T;
  label: string;
  hint?: string;
  /** Pre-selected when the prompt opens */
  selected?: boolean;
}

// ---------------------------------------------------------------------------
// Constants (mirrors @clack/prompts visual style)
// ---------------------------------------------------------------------------

const S_BAR         = '│';
const S_BAR_END     = '└';
const S_RADIO_OFF   = '◻';
const S_RADIO_ON    = '◼';
const S_DIAMOND     = '◆';
const S_DIAMOND_OFF = '◇';

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function filterableMultiselect<T>(opts: {
  message: string;
  options: FilterOption<T>[];
  required?: boolean;
  pageSize?: number;
}): Promise<T[] | symbol> {
  // Keep the full list; options property on prompt holds the currently visible slice
  const allOptions = opts.options.map((o) => ({ value: o.value, label: o.label, hint: o.hint }));
  const initialValues = opts.options.filter((o) => o.selected).map((o) => o.value);

  let filterText   = '';
  let matchCount   = allOptions.length;
  const pageSize   = opts.pageSize ?? Math.min(14, process.stdout.rows - 6);

  // ------------------------------------------------------------------
  // Build the prompt with a custom render function
  // ------------------------------------------------------------------
  const prompt = new (MultiSelectPrompt as unknown as new (opts: object) => InstanceType<typeof MultiSelectPrompt>)({
    options: allOptions,
    initialValues,
    required: opts.required ?? true,
    render(this: InstanceType<typeof MultiSelectPrompt>) {
      const selectedValues: unknown[] = Array.isArray(this.value) ? this.value : [];

      // ── header ──────────────────────────────────────────────────────
      const headerPrefix =
        this.state === 'submit'  ? chalk.green(S_DIAMOND_OFF) :
        this.state === 'cancel'  ? chalk.red(S_DIAMOND_OFF)   :
        chalk.cyan(S_DIAMOND);

      const header =
        `${chalk.gray(S_BAR)}\n` +
        `${headerPrefix}  ${opts.message}` +
        chalk.dim(`  (${allOptions.length} total)\n`);

      // ── submitted / cancelled ───────────────────────────────────────
      if (this.state === 'submit') {
        const names = allOptions
          .filter((o) => selectedValues.includes(o.value))
          .map((o) => chalk.dim(o.label))
          .join(chalk.dim(', '));
        return `${header}${chalk.gray(S_BAR)}  ${names || chalk.dim('none')}\n`;
      }

      if (this.state === 'cancel') {
        return `${header}${chalk.gray(S_BAR)}  ${chalk.strikethrough(chalk.dim('cancelled'))}\n${chalk.gray(S_BAR)}\n`;
      }

      // ── filter line ─────────────────────────────────────────────────
      const cursor  = filterText.length > 0 ? chalk.inverse(' ') : chalk.inverse(chalk.hidden('_'));
      const noMatch = matchCount === 0 && filterText.length > 0;

      const matchLabel = noMatch
        ? chalk.red('no matches')
        : filterText
          ? chalk.dim(`${matchCount} matched`)
          : chalk.dim(`${allOptions.length} skills`);

      const hint = chalk.dim('space select · a all · enter confirm');

      const filterLine =
        `${chalk.cyan(S_BAR)}  ` +
        chalk.dim('/ ') +
        (filterText ? chalk.white(filterText) : chalk.dim('type to filter')) +
        cursor +
        `  ${matchLabel}  ${hint}`;

      // ── option rows ─────────────────────────────────────────────────
  const visibleOptions = paginate(
          this.options as Array<{ value: unknown; label: string; hint?: string }>,
          this.cursor,
          pageSize,
        );
        const optionLines = visibleOptions.map((row) => {
        if (row.type === 'ellipsis') {
          return `${chalk.cyan(S_BAR)}  ${chalk.dim('...')}`;
        }

        const { option, active } = row;
        const isSelected = selectedValues.includes(option.value);
        const radio = isSelected ? chalk.green(S_RADIO_ON) : S_RADIO_OFF;
        const label = active
          ? (isSelected ? chalk.green(option.label) : chalk.white(option.label))
          : chalk.dim(option.label);
        const hintStr = option.hint ? chalk.dim(`  ${option.hint}`) : '';
        const activeBar = active ? chalk.cyan(S_BAR) : chalk.gray(S_BAR);

        return `${activeBar}  ${radio}  ${label}${hintStr}`;
      });

      if (noMatch) {
        optionLines.push(`${chalk.gray(S_BAR)}  ${chalk.dim('(no skills match your filter)')}`);
      }

      return (
        `${header}` +
        `${filterLine}\n` +
        `${chalk.cyan(S_BAR)}\n` +
        optionLines.join('\n') + '\n' +
        `${chalk.cyan(S_BAR_END)}\n`
      );
    },
  });

  // ------------------------------------------------------------------
  // Intercept key events to drive the filter
  // ------------------------------------------------------------------
  (prompt as unknown as NodeJS.EventEmitter).on('key', (key: string) => {
    // Backspace / delete
    if (key === '\b' || key === '\x7f' || (key as unknown) === 'backspace') {
      filterText = filterText.slice(0, -1);
    } else if (key && key.length === 1 && key.charCodeAt(0) >= 32) {
      // Printable character — but ignore space (handled by MultiSelectPrompt as toggle)
      if (key === ' ') return;
      filterText += key;
    } else {
      return; // navigation keys — let MultiSelectPrompt handle them
    }

    // Apply filter to the prompt's visible options
    const filtered = filterText
      ? allOptions.filter((o) => o.label.toLowerCase().includes(filterText.toLowerCase()))
      : allOptions;

    matchCount = filtered.length;
    (prompt as InstanceType<typeof MultiSelectPrompt>).options = filtered;

    // Keep cursor in bounds
    if ((prompt as InstanceType<typeof MultiSelectPrompt>).cursor >= filtered.length) {
      (prompt as InstanceType<typeof MultiSelectPrompt>).cursor = Math.max(0, filtered.length - 1);
    }
  });

  const result = await (prompt as unknown as { prompt(): Promise<unknown> }).prompt();
  return isCancel(result) ? result : (result as T[]);
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

type PaginatedRow<T> =
  | { type: 'option'; option: T; index: number; active: boolean }
  | { type: 'ellipsis' };

function paginate<T extends { label: string; hint?: string; value: unknown }>(
  options: T[],
  cursor: number,
  pageSize: number,
): PaginatedRow<T>[] {
  if (options.length === 0) return [];

  const half  = Math.floor(pageSize / 2);
  const start = Math.max(0, Math.min(cursor - half, options.length - pageSize));
  const end   = Math.min(options.length, start + pageSize);

  const rows: PaginatedRow<T>[] = [];

  if (start > 0) rows.push({ type: 'ellipsis' });

  for (let i = start; i < end; i++) {
    rows.push({ type: 'option', option: options[i]!, index: i, active: i === cursor });
  }

  if (end < options.length) rows.push({ type: 'ellipsis' });

  return rows;
}
