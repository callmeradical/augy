import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFileFromRepo, putFileToRepo } from './github.js';

// ---------------------------------------------------------------------------
// Mock child_process.execFile so tests don't invoke the real `gh` CLI
// ---------------------------------------------------------------------------

const mockExecFile = vi.fn();

vi.mock('child_process', () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
}));

// util.promisify(execFile) wraps the callback style; replicate that here by
// having mockExecFile call its last argument as a Node-style callback.
function succeed(stdout: unknown) {
  return (...args: unknown[]) => {
    const cb = args.at(-1) as (err: null, result: { stdout: string; stderr: string }) => void;
    cb(null, { stdout: JSON.stringify(stdout), stderr: '' });
  };
}

function fail(message: string) {
  return (...args: unknown[]) => {
    const cb = args.at(-1) as (err: Error) => void;
    const err = Object.assign(new Error(message), { stderr: message, stdout: '' });
    cb(err);
  };
}

beforeEach(() => {
  mockExecFile.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getFileFromRepo
// ---------------------------------------------------------------------------

describe('getFileFromRepo', () => {
  it('returns null when the file does not exist (404)', async () => {
    mockExecFile.mockImplementation(
      fail('gh: Not Found (HTTP 404)'),
    );

    const result = await getFileFromRepo('alice', 'dotfiles', 'augy.json');
    expect(result).toBeNull();
  });

  it('returns decoded content and blob sha when the file exists', async () => {
    const rawContent = JSON.stringify({ version: 1, skills: { tdd: 'github:org/repo/tdd' } });
    const encoded = Buffer.from(rawContent).toString('base64');

    mockExecFile.mockImplementation(
      succeed({ sha: 'abc1234blob', content: encoded + '\n', encoding: 'base64' }),
    );

    const result = await getFileFromRepo('alice', 'dotfiles', 'augy.json');
    expect(result).not.toBeNull();
    expect(result!.content).toBe(rawContent);
    expect(result!.blobSha).toBe('abc1234blob');
  });

  it('throws on unexpected errors (non-404)', async () => {
    mockExecFile.mockImplementation(fail('Internal Server Error'));

    await expect(getFileFromRepo('alice', 'dotfiles', 'augy.json')).rejects.toThrow(
      'gh api repos/alice/dotfiles/contents/augy.json failed',
    );
  });
});

// ---------------------------------------------------------------------------
// putFileToRepo
// ---------------------------------------------------------------------------

describe('putFileToRepo', () => {
  it('creates a new file when no blobSha is provided', async () => {
    mockExecFile.mockImplementation(succeed({ commit: { sha: 'newcommit123' } }));

    const result = await putFileToRepo(
      'alice', 'dotfiles', 'augy.json', '{"version":1}', 'chore: update augy.json',
    );

    expect(result.commitSha).toBe('newcommit123');

    // Verify gh was called with PUT and the right endpoint
    const [cmd, args] = mockExecFile.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('gh');
    expect(args).toContain('repos/alice/dotfiles/contents/augy.json');
    expect(args).toContain('--method');
    expect(args).toContain('PUT');
    // sha field should not be present when blobSha is omitted
    expect(args.join(' ')).not.toContain('--raw-field sha=');
  });

  it('includes sha field when updating an existing file', async () => {
    mockExecFile.mockImplementation(succeed({ commit: { sha: 'updatedcommit456' } }));

    await putFileToRepo('alice', 'dotfiles', 'augy.json', '{}', 'chore: update', 'blobsha999');

    const [, args] = mockExecFile.mock.calls[0] as [string, string[]];
    expect(args).toContain('--raw-field');
    expect(args).toContain('sha=blobsha999');
  });

  it('throws when the PUT request fails', async () => {
    mockExecFile.mockImplementation(fail('gh: Forbidden (HTTP 403)'));

    await expect(
      putFileToRepo('alice', 'dotfiles', 'augy.json', '{}', 'chore: update'),
    ).rejects.toThrow('gh api repos/alice/dotfiles/contents/augy.json failed');
  });
});
