import { describe, it, expect } from 'vitest';
import { repoToUrl } from './git.js';

// ---------------------------------------------------------------------------
// repoToUrl — pure URL conversion, no I/O
// ---------------------------------------------------------------------------

describe('repoToUrl', () => {
  it('converts owner/repo shorthand to HTTPS GitHub URL', () => {
    expect(repoToUrl('alice/my-skills')).toBe('https://github.com/alice/my-skills.git');
  });

  it('passes through a full HTTPS URL unchanged', () => {
    expect(repoToUrl('https://github.com/alice/my-skills.git')).toBe(
      'https://github.com/alice/my-skills.git',
    );
  });

  it('passes through an SSH URL unchanged', () => {
    expect(repoToUrl('git@github.com:alice/my-skills.git')).toBe(
      'git@github.com:alice/my-skills.git',
    );
  });
});
