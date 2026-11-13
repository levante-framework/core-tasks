import { describe, expect, it } from 'vitest';
import { BUBBLE_FLOAT_PAD, placeBubblesAround, placeScaledBubbles, type Rect } from './placeBubblesAround';

function rect(x: number, y: number, size: number): Rect {
  return { left: x, top: y, right: x + size, bottom: y + size };
}

function overlaps(a: Rect, b: Rect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

describe('placeBubblesAround', () => {
  const field: Rect = { left: 0, top: 0, right: 1280, bottom: 800 };
  const text: Rect = { left: 200, top: 160, right: 1080, bottom: 250 };

  it('places seven bubbles clear of the text, each other, and the screen edge', () => {
    const placed = placeBubblesAround(field, [text], 7, 176);
    expect(placed).not.toBeNull();
    if (!placed) return;

    expect(placed.slots).toHaveLength(7);
    expect(placed.size).toBeLessThanOrEqual(176);
    expect(placed.size).toBeGreaterThanOrEqual(64);

    const blocked = {
      left: text.left - BUBBLE_FLOAT_PAD,
      top: text.top - BUBBLE_FLOAT_PAD,
      right: text.right + BUBBLE_FLOAT_PAD,
      bottom: text.bottom + BUBBLE_FLOAT_PAD,
    };

    for (const slot of placed.slots) {
      const swept = {
        left: slot.x - BUBBLE_FLOAT_PAD,
        top: slot.y - BUBBLE_FLOAT_PAD,
        right: slot.x + placed.size + BUBBLE_FLOAT_PAD,
        bottom: slot.y + placed.size + BUBBLE_FLOAT_PAD,
      };
      expect(swept.left).toBeGreaterThanOrEqual(field.left);
      expect(swept.top).toBeGreaterThanOrEqual(field.top);
      expect(swept.right).toBeLessThanOrEqual(field.right);
      expect(swept.bottom).toBeLessThanOrEqual(field.bottom);
      expect(overlaps(rect(slot.x, slot.y, placed.size), blocked)).toBe(false);
    }

    for (let i = 0; i < placed.slots.length; i++) {
      for (let j = i + 1; j < placed.slots.length; j++) {
        const a = placed.slots[i];
        const b = placed.slots[j];
        const gapX = Math.abs(a.x - b.x) >= placed.size + BUBBLE_FLOAT_PAD * 2;
        const gapY = Math.abs(a.y - b.y) >= placed.size + BUBBLE_FLOAT_PAD * 2;
        expect(gapX || gapY).toBe(true);
      }
    }
  });

  it('uses the requested size when the field has room', () => {
    const placed = placeBubblesAround({ left: 0, top: 0, right: 2000, bottom: 2000 }, [], 7, 100);
    expect(placed?.size).toBe(100);
    expect(placed?.slots).toHaveLength(7);
  });

  it('places a large bubble and a small bubble clear of the text and each other', () => {
    const placed = placeScaledBubbles(field, [text], [2, 1], 120);
    expect(placed).not.toBeNull();
    if (!placed) return;

    expect(placed[0].size).toBe(placed[1].size * 2);
    const swept = placed.map((bubble) => ({
      left: bubble.x - BUBBLE_FLOAT_PAD,
      top: bubble.y - BUBBLE_FLOAT_PAD,
      right: bubble.x + bubble.size + BUBBLE_FLOAT_PAD,
      bottom: bubble.y + bubble.size + BUBBLE_FLOAT_PAD,
    }));
    for (const bubble of swept) {
      expect(bubble.left).toBeGreaterThanOrEqual(field.left);
      expect(bubble.top).toBeGreaterThanOrEqual(field.top);
      expect(bubble.right).toBeLessThanOrEqual(field.right);
      expect(bubble.bottom).toBeLessThanOrEqual(field.bottom);
    }
    expect(overlaps(swept[0], swept[1])).toBe(false);
    const blocked = {
      left: text.left - BUBBLE_FLOAT_PAD,
      top: text.top - BUBBLE_FLOAT_PAD,
      right: text.right + BUBBLE_FLOAT_PAD,
      bottom: text.bottom + BUBBLE_FLOAT_PAD,
    };
    expect(overlaps(rect(placed[0].x, placed[0].y, placed[0].size), blocked)).toBe(false);
    expect(overlaps(rect(placed[1].x, placed[1].y, placed[1].size), blocked)).toBe(false);
  });

  it('returns null when the bubbles cannot fit', () => {
    expect(placeBubblesAround({ left: 0, top: 0, right: 80, bottom: 80 }, [], 7, 40, 40)).toBeNull();
  });
});
