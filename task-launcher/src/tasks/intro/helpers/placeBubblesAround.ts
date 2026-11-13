export type Rect = { left: number; top: number; right: number; bottom: number };

export type BubbleSlot = { x: number; y: number };

export type PlacedBubble = BubbleSlot & { size: number; required?: boolean };

/** Matches the largest translate in the `.float` keyframes. */
export const BUBBLE_FLOAT_PAD = 22;

/** Smallest bubble we will draw. Below this, drop a bubble instead of shrinking further. */
export const MIN_BUBBLE_PX = 64;

const CANDIDATE_STEP = 8;

function inflate(rect: Rect, pad: number): Rect {
  return {
    left: rect.left - pad,
    top: rect.top - pad,
    right: rect.right + pad,
    bottom: rect.bottom + pad,
  };
}

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.left >= outer.left && inner.top >= outer.top && inner.right <= outer.right && inner.bottom <= outer.bottom
  );
}

function bubbleRect(x: number, y: number, size: number): Rect {
  return { left: x, top: y, right: x + size, bottom: y + size };
}

function center(rect: Rect) {
  return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function obstacleAnchor(field: Rect, obstacles: Rect[]) {
  return obstacles.length
    ? obstacles
        .map(center)
        .reduce((sum, point) => ({ x: sum.x + point.x / obstacles.length, y: sum.y + point.y / obstacles.length }), {
          x: 0,
          y: 0,
        })
    : center(field);
}

/** Places each size, largest first, and returns bubbles in the requested order. */
export function placeBubblesOfSizes(
  field: Rect,
  obstacles: Rect[],
  sizes: number[],
  pad = BUBBLE_FLOAT_PAD,
): PlacedBubble[] | null {
  if (sizes.length === 0 || sizes.some((size) => size < 1)) return null;

  const blocked = obstacles.map((obstacle) => inflate(obstacle, pad));
  const anchor = obstacleAnchor(field, obstacles);
  const placed: PlacedBubble[] = new Array(sizes.length);
  const order = sizes.map((size, index) => ({ size, index })).sort((a, b) => b.size - a.size || a.index - b.index);

  for (const item of order) {
    let best: PlacedBubble | null = null;
    let bestScore = -1;

    for (let y = field.top; y <= field.bottom - item.size; y += CANDIDATE_STEP) {
      for (let x = field.left; x <= field.right - item.size; x += CANDIDATE_STEP) {
        const rest = bubbleRect(x, y, item.size);
        const swept = inflate(rest, pad);
        if (!contains(field, swept)) continue;
        if (blocked.some((obstacle) => intersects(obstacle, rest))) continue;
        if (
          placed.some((other) => other && intersects(swept, inflate(bubbleRect(other.x, other.y, other.size), pad)))
        ) {
          continue;
        }

        const slotCenter = center(rest);
        const others = placed.filter(Boolean);
        const score = others.length
          ? Math.min(...others.map((other) => distance(slotCenter, center(bubbleRect(other.x, other.y, other.size)))))
          : distance(slotCenter, anchor);

        if (score > bestScore) {
          bestScore = score;
          best = { x, y, size: item.size };
        }
      }
    }

    if (!best) return null;
    placed[item.index] = best;
  }

  return placed;
}

/**
 * Largest base size that places bubbles at `ratios * base` without their float
 * path crossing obstacles or each other.
 */
export function placeScaledBubbles(
  field: Rect,
  obstacles: Rect[],
  ratios: number[],
  maxBase: number,
  minBase = 64,
  pad = BUBBLE_FLOAT_PAD,
): PlacedBubble[] | null {
  const upper = Math.floor(maxBase);
  const lower = Math.ceil(minBase);
  if (ratios.length === 0 || ratios.some((ratio) => ratio <= 0) || upper < 1 || lower > upper) return null;

  let best: PlacedBubble[] | null = null;
  let lo = lower;
  let hi = upper;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const placed = placeBubblesOfSizes(
      field,
      obstacles,
      ratios.map((ratio) => Math.max(1, Math.floor(mid * ratio))),
      pad,
    );
    if (placed) {
      best = placed;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

/**
 * Largest bubble size that places `count` bubbles in `field` without their float
 * path crossing `obstacles` or each other. Returns null when even `minSize` cannot.
 */
export function placeBubblesAround(
  field: Rect,
  obstacles: Rect[],
  count: number,
  maxSize: number,
  minSize = 64,
  pad = BUBBLE_FLOAT_PAD,
): { size: number; slots: BubbleSlot[] } | null {
  if (count < 1) return null;
  const placed = placeScaledBubbles(
    field,
    obstacles,
    Array.from({ length: count }, () => 1),
    maxSize,
    minSize,
    pad,
  );
  if (!placed) return null;
  return { size: placed[0].size, slots: placed.map(({ x, y }) => ({ x, y })) };
}

/**
 * Shrinks toward `minSize`, then drops bubbles one at a time until some count fits.
 * Never goes below `minSize` unless `maxSize` itself is already smaller.
 */
export function placeFittingEqualBubbles(
  field: Rect,
  obstacles: Rect[],
  count: number,
  maxSize: number,
  minSize = MIN_BUBBLE_PX,
): { size: number; slots: BubbleSlot[] } | null {
  const upper = Math.floor(maxSize);
  if (count < 1 || upper < 1) return null;
  const floor = Math.min(Math.ceil(minSize), upper);

  for (let n = count; n >= 1; n--) {
    const placed = placeBubblesAround(field, obstacles, n, upper, floor);
    if (placed) return placed;
  }
  return null;
}

/**
 * Shrinks a ratio set toward `minPx` on the smallest bubble, then drops ratios from
 * the end until a prefix of at least `minCount` fits.
 */
export function placeFittingScaledBubbles(
  field: Rect,
  obstacles: Rect[],
  ratios: number[],
  maxBase: number,
  minPx = MIN_BUBBLE_PX,
  minCount = 1,
): PlacedBubble[] | null {
  const upper = Math.floor(maxBase);
  if (ratios.length === 0 || ratios.some((ratio) => ratio <= 0) || upper < 1) return null;
  const keep = Math.max(1, Math.min(minCount, ratios.length));

  for (let n = ratios.length; n >= keep; n--) {
    const subset = ratios.slice(0, n);
    const smallestRatio = Math.min(...subset);
    const neededBase = Math.ceil(minPx / smallestRatio);
    const lower = Math.min(upper, Math.max(1, neededBase));
    const placed = placeScaledBubbles(field, obstacles, subset, upper, lower);
    if (placed) return placed;
  }
  return null;
}
