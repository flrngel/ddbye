import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '@/lib/time';

describe('formatRelativeTime', () => {
  it('returns "just now" for < 1 minute ago', () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
  });

  it('returns "5m ago" for 5 minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns "2h ago" for 2 hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });

  it('returns "3d ago" for 3 days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });
});
