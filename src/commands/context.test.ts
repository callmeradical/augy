import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Registry } from '../registry.js';

vi.mock('../registry.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../registry.js')>();
  return { ...actual, readRegistry: vi.fn(), writeRegistry: vi.fn() };
});

function makeRegistry(ctx?: string): Registry {
  return { version: 1, taps: {}, skills: {}, machineContext: ctx };
}

let readRegistry:       ReturnType<typeof vi.fn>;
let writeRegistry:      ReturnType<typeof vi.fn>;
let contextSetCommand:  (ctx: string | undefined) => Promise<void>;
let contextShowCommand: () => Promise<void>;

beforeEach(async () => {
  vi.clearAllMocks();
  const reg = await import('../registry.js');
  readRegistry  = reg.readRegistry  as ReturnType<typeof vi.fn>;
  writeRegistry = reg.writeRegistry as ReturnType<typeof vi.fn>;
  writeRegistry.mockResolvedValue(undefined);
  const mod = await import('./context.js');
  contextSetCommand  = mod.contextSetCommand;
  contextShowCommand = mod.contextShowCommand;
});

describe('contextSetCommand', () => {
  it('stores the machine context in the registry', async () => {
    readRegistry.mockResolvedValue(makeRegistry());
    await contextSetCommand('work');
    const saved = writeRegistry.mock.calls[0]![0] as Registry;
    expect(saved.machineContext).toBe('work');
  });

  it('clears the context when called with undefined', async () => {
    readRegistry.mockResolvedValue(makeRegistry('work'));
    await contextSetCommand(undefined);
    const saved = writeRegistry.mock.calls[0]![0] as Registry;
    expect(saved.machineContext).toBeUndefined();
  });
});

describe('contextShowCommand', () => {
  it('resolves without throwing', async () => {
    readRegistry.mockResolvedValue(makeRegistry('personal'));
    await expect(contextShowCommand()).resolves.toBeUndefined();
  });
});
