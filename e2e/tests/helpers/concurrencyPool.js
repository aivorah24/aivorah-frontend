// Runs `worker(item)` for every item in `items`, with at most `limit` calls
// in flight at once - a bounded-concurrency replacement for the old
// "N at a time, wait for the whole batch, repeat" loop in global-setup.js.
//
// Unlike a naive Promise.all(items.map(worker)) (unbounded - fires everything
// at once) or the old sequential-batches approach (idle between batches -
// batch N+1 never starts until every item in batch N, including the slowest,
// finishes), this keeps exactly `limit` workers continuously busy: the moment
// any one finishes, it immediately picks up the next item. Total wall-clock
// time is close to (items.length / limit) * average-item-time, not
// (items.length / limit) * slowest-item-time-per-batch.
//
// Never throws on an individual item's rejection - callers get every
// settled result back (same shape as Promise.allSettled) and decide what
// counts as fatal themselves. One slow/failed item must not stop the pool
// from continuing to process everything else.
export async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runOne() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      try {
        const value = await worker(items[i], i);
        results[i] = { status: 'fulfilled', value };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  const poolSize = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: poolSize }, runOne));

  return results;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
