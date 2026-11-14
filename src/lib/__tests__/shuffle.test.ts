import { describe, it, expect } from 'vitest';
import { seededShuffle } from '../shuffle';

describe('seededShuffle', () => {
  const items = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  it('is deterministic with the same seed', () => {
    const shuffle1 = seededShuffle(items, 42);
    const shuffle2 = seededShuffle(items, 42);
    expect(shuffle1).toEqual(shuffle2);
  });

  it('generates different order with different seeds', () => {
    const shuffle1 = seededShuffle(items, 12345);
    const shuffle2 = seededShuffle(items, 67890);
    expect(shuffle1).not.toEqual(shuffle2);
  });

  it('preserves all items without duplication or loss', () => {
    const shuffled = seededShuffle(items, 999);
    expect(shuffled).toHaveLength(items.length);
    expect(shuffled.sort()).toEqual([...items].sort());
  });

  it('does not mutate the original array', () => {
    const original = ['1', '2', '3'];
    const copy = [...original];
    seededShuffle(original, 555);
    expect(original).toEqual(copy);
  });
});
