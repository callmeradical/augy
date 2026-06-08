import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFileFromRepo, putFileToRepo } from './github.js';

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockClear();
  vi.stubGlobal('fetch', mockFetch);
  delete process.env['GITHUB_TOKEN'];
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getFileFromRepo
// ---------------------------------------------------------------------------

describe('getFileFromRepo', () => {
  it('returns null when the file does not exist (404)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    });

    const result = await getFileFromRepo('alice', 'dotfiles', 'augy.json');
    expect(result).toBeNull();
  });

  it('returns decoded content and blob sha when the file exists', async () => {
    const rawContent = JSON.stringify({ version: 1, skills: { tdd: 'github:org/repo/tdd' } });
    const encoded = Buffer.from(rawContent).toString('base64');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sha: 'abc1234blob',
        content: encoded + '\n', // GitHub adds a newline
        encoding: 'base64',
      }),
    });

    const result = await getFileFromRepo('alice', 'dotfiles', 'augy.json');
    expect(result).not.toBeNull();
    expect(result!.content).toBe(rawContent);
    expect(result!.blobSha).toBe('abc1234blob');
  });

  it('throws on unexpected errors (non-404)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(getFileFromRepo('alice', 'dotfiles', 'augy.json')).rejects.toThrow('GitHub API 500');
  });
});

// ---------------------------------------------------------------------------
// putFileToRepo
// ---------------------------------------------------------------------------

describe('putFileToRepo', () => {
  it('creates a new file when no blobSha is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ commit: { sha: 'newcommit123' } }),
    });

    const result = await putFileToRepo('alice', 'dotfiles', 'augy.json', '{"version":1}', 'chore: update augy.json');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/alice/dotfiles/contents/augy.json');
    expect(init.method).toBe('PUT');

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['message']).toBe('chore: update augy.json');
    expect(body['content']).toBe(Buffer.from('{"version":1}').toString('base64'));
    expect(body['sha']).toBeUndefined();

    expect(result.commitSha).toBe('newcommit123');
  });

  it('includes blobSha in body when updating an existing file', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ commit: { sha: 'updatedcommit456' } }),
    });

    await putFileToRepo('alice', 'dotfiles', 'augy.json', '{}', 'chore: update', 'blobsha999');

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
    expect(body['sha']).toBe('blobsha999');
  });

  it('throws when the PUT request fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    await expect(
      putFileToRepo('alice', 'dotfiles', 'augy.json', '{}', 'chore: update'),
    ).rejects.toThrow('GitHub API 403');
  });
});
