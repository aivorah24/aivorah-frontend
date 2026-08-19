// Visual column subtraction — how a teacher actually solves it on the board for
// a child: numbers stacked in Tens/Ones columns, the borrow shown by crossing
// out the ten and writing the small carried "1". Parses "45 - 27" from a problem.
export function parseSubtraction(problem: string): { top: number; bottom: number } | null {
  const m = String(problem || '').replace(/[^0-9\-]/g, ' ').match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const top = parseInt(m[1], 10), bottom = parseInt(m[2], 10);
  if (isNaN(top) || isNaN(bottom) || top < bottom || top > 99 || bottom > 99) return null;
  return { top, bottom };
}
