description: Replace peaks() Array.shift() with a ring buffer for O(1) sliding windows
dependencies: none
files: src/sparstogram.ts (peaks ~:328-363)
----

## Context

The `peaks()` generator method (~line 328) uses two plain arrays `left` and `right` as fixed-size
sliding windows. Elements are added with `push()` and removed with `shift()`. `Array.shift()` is
O(n) because it reindexes, so with large `smoothing` values the window operations become quadratic.

With the default `smoothing=3` this is invisible, but for exotic use cases (smoothing > 100) it
matters. The existing TODO comment at line 329 requests this change.

## Design

### RingBuffer class (private, in sparstogram.ts)

Implement a minimal generic `RingBuffer<T>` class directly in `sparstogram.ts` (not exported — this
is an internal implementation detail). No external library needed for something this small.

Interface:
```ts
class RingBuffer<T> {
  constructor(capacity: number)
  push(item: T): void      // Append to tail. If full, oldest is silently dropped.
  get length(): number      // Current number of items
  at(index: number): T      // Access by logical index (0 = oldest)
  reduce<U>(fn: (acc: U, item: T) => U, initial: U): U  // Fold over items oldest→newest
}
```

Implementation: fixed-size `Array<T>` of `capacity`, a `head` pointer, and a `count`.
- `push`: write at `(head + count) % capacity`. If `count === capacity`, advance `head` instead.
- `at(i)`: return `buffer[(head + i) % capacity]`.
- `reduce`: iterate from `head` for `count` items.

This gives O(1) push (which replaces both `push()+shift()` when full, and plain `push()` when not full).

### Changes to peaks()

Replace:
```ts
const left = new Array<Centroid>();  // TODO: replace these with ring buffers
const right = new Array<Centroid>();
```
With:
```ts
const left = new RingBuffer<Centroid>(smoothing);
const right = new RingBuffer<Centroid>(smoothing);
```

The loop body changes from explicit `shift()` + length checks to using the ring buffer's
auto-eviction on push when full:

```
right.push(entry);
if (right.length > smoothing) {    // becomes: after push, if right was already full, the
    left.push(right.shift()!);     //   oldest was evicted — but we need it for left.
}                                  // So we must check *before* push and transfer first.
```

Actually, the transfer logic requires reading the oldest element before eviction. The cleaner
approach: keep the explicit length checks but replace `shift()` with ring buffer reads:

```ts
if (right.length === smoothing) {
    left.push(right.at(0));  // transfer oldest from right to left (left auto-evicts if full)
}
right.push(entry);  // right auto-evicts oldest if full (we already transferred it)
```

Wait — that won't work because `right` auto-evicts silently. We need a ring buffer where push
returns the evicted item, OR we restructure the logic.

**Simplest correct approach**: Use a ring buffer that does NOT auto-evict (push only works when
not full), plus an explicit `shift()` that is O(1) — just advances the head pointer:

```ts
class RingBuffer<T> {
  push(item: T): void       // Append. Throws if full.
  shift(): T                 // Remove oldest. O(1) — just moves head.
  get length(): number
  at(index: number): T
  reduce<U>(fn: (acc: U, item: T) => U, initial: U): U
}
```

Then the loop body is structurally identical to the current code — just the container type changes.
The `shift()` is now O(1) instead of O(n). This is the cleanest approach: same logic, better
data structure.

### Loop body (unchanged logic, new container)

```ts
const left = new RingBuffer<Centroid>(smoothing);
const right = new RingBuffer<Centroid>(smoothing);
// ... rest of loop identical, using push/shift/at/reduce on RingBuffer
```

The `.at(-1)` usage on line 351 (`left.at(-1)!`) needs support. Add negative index support to `at()`:
if index < 0, resolve as `count + index`.

The `.reduce()` usage on line 343 needs to work identically.

### Tests

Existing `peaks()` tests (lines 529-583, 915-958, 1562-1583) cover the behavior thoroughly.
No new peaks tests needed — the ring buffer is an internal optimization. All existing tests must
continue to pass unchanged.

Optionally add a unit test for the RingBuffer class itself to verify push/shift/at/reduce/length.

### Key test expectations (from existing tests)
- Empty histogram → no peaks
- Too few centroids for smoothing → no peaks
- Single peak `[1,2,3,4,5,4,3,2,1]` with smoothing=1 → 1 peak, max=5
- Multiple peaks `[1,2,1,4,5,4,3,3,5,7,4,3,2,3,2,1]` with smoothing=3 → 2 peaks with specific bounds
- Excessive smoothing → no peaks
- 500 centroids with smoothing=3 completes in <1s

## TODO

- Implement `RingBuffer<T>` class in `src/sparstogram.ts` (not exported, above `Sparstogram` class)
  - constructor(capacity), push(item), shift(): T, length, at(index) (with negative index), reduce()
- Replace `left`/`right` arrays in `peaks()` with `RingBuffer<Centroid>(smoothing)`
- Remove the TODO comment at line 329
- Run existing tests to verify no behavioral change
- Run type check (`npx tsc --noEmit`) to verify no type errors
