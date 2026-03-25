import { BTree, Path } from "digitree";

/** Represents a centroid in the histogram. */
export interface Centroid {
	value: number;
	variance: number;
	count: number;
}

interface CentroidEntry extends Centroid {
	// Curvature‑aware *score* for the pair (this centroid, prior centroid).
	// score = baseLoss / (eps + localCurvature).  Matches the key stored in
	// the _losses priority queue so that _losses.find(entry) succeeds.
	// See getPriorScore/updateNextScore for computation details.
	loss: number; // curvature-aware score to prior (Infinity for first)
}

interface Loss {
	loss: number;
	value: number;
}

/** Represents a peak in the histogram. */
export interface Peak {
	start: number;
	end: number;
	max: number;
	min: number;
	sum: number;
}

export interface Marker {
	/** The rank of the value in the histogram */
	rank: number;
	/** The centroid at the quantile */
	centroid: Centroid;
	/** The offset within the centroid of this rank value */
	offset: number;
}

/** Represents a quantile in the histogram. */
export interface Quantile extends Marker {
	/** Approximate value represented by the offset / count */
	value: number;
}

/** Criteria for navigating in the histogram */
export interface Criteria {
	/** The marker index to start at (0 = median, 1 = lower quartile, 2 = upper quartile, etc.) */
	markerIndex?: number;
	/** The value to start at */
	value?: number;
	/** The quantile to start at */
	quantile?: Quantile;
}

/** A histogram that maintains a complete or sparse approximation of the data frequency.
 * The representation will be complete if the number of distinct values is less than or equal to the maxCentroids.
 * Otherwise, the values will be compressed to a smaller number of centroids in a way that minimizes the loss.
 * The histogram can also maintain a set of quantiles, which are maintained with each new value (e.g. median can be efficiently maintained).
 * The structure is adaptive in range and resolution, and can be used for streaming data.
 * The histogram is roughly based on the ideas in the paper "Approximate Frequency Counts over Data Streams" by Gurmeet Singh Manku and Rajeev Motwani.
 * The implementation uses B+Trees to efficiently maintain the centroids and losses, which is a self-balancing structure; so this should be able to scale efficiently.
 */
export class Sparstogram {
	/** The centroids ordered by value */
	private _centroids = new BTree<number, CentroidEntry>((e: CentroidEntry) => e.value, (a: number, b: number) => a - b);
	private _centroidCount = 0;
	private _count = 0;
	/** Centroids ordered by loss between the centroid and prior (in value order).  Ordered by (loss ascending, value) */
	// Pairs ordered by *score* (not necessarily the raw base loss).  The score is
	// a curvature‑aware adjustment that prefers keeping mass where the empirical
	// CDF bends (peaks/tails).  Inspired by k‑point discrete approximations such
	// as DAUD (data‑aware uniform discretization) and W1‑oriented quantizers used
	// for stable sketch arithmetic.
	// References (context/inspiration):
	// 	- "k‑point discrete approximations minimizing KL / W1" (DAUD‑style)
	// 	- Divide‑and‑Conquer quantization with W1 error guarantees (merge‑stable)
	private _losses = new BTree<Loss, Loss>((e: Loss) => e, (a: Loss, b: Loss) => a.loss === b.loss ? a.value - b.value : a.loss - b.loss);
	private _maxCentroids!: number;
	private _markers: (Marker | undefined)[] | undefined;

	// Cheap global‑error proxy; correlates with W1 drift: sum_i min(w_i,w_{i+1})*|Δx_i|
	private _tightnessJ = 0;

	constructor(
		/** The initial maximum number of centroids to store.
		 * This must be at least 1.
		 * This can be changed at any time.
		 * Note that nothing is allocated by this; it represents the point at which point centroids will begin to be collapsed. */
		maxCentroids: number,
		/** Optional persisted quantiles to be maintained with each new value.
		 * These don't have to be in order, but they must be between 0 and 1.
		 * The quantiles will be maintained with each new value, and can be retrieved with atMarker. */
		public markers?: number[],
	) {
		// Ensure quantiles are all between 0-1
		if (markers) {
			markers.forEach(q => {
				if (q < 0 || q > 1) {
					throw new Error("Quantiles must be between 0 and 1.  e.g. 0.5 for median, 0.25 for quartiles, etc.");
				}
			});
			this._markers = markers.map(q => undefined);
		}
		Object.freeze(markers);
		this.maxCentroids = Math.floor(maxCentroids);
	}

	/** The current maximum number of centroids to store before compression. */
	get maxCentroids() {
		return this._maxCentroids;
	}

	set maxCentroids(value: number) {
		if (value < 1) {
			throw new Error("maxCentroids must be at least 1");
		}
		this._maxCentroids = Math.floor(value);
		while (this._centroidCount > this._maxCentroids) {
			this.compressOneBucket();
		}
	}

	/** The current total count accumulated in the histogram (sum of counts of all values) */
	get count() {
		return this._count;
	}

	/**
	 * Cheap global tightness metric for the current discretization.
	 * - Proxy for 1‑Wasserstein (Earth Mover's) drift; maintained incrementally.
	 * - Roughly the sum over adjacent centroids of min(count_i, count_{i+1}) * |x_{i+1} - x_i|.
	 * - Units: count × value‑units; non‑negative; 0 only when all mass is at one value.
	 * - Directionality: lower = tighter/less spread; higher = looser/more separation between neighbors.
	 * - Caveats: heuristic/approximate (not exact W1), unnormalized and scale/total‑count dependent—best for
	 *   relative monitoring within the same dataset/scale (e.g., tracking compression drift), not as an
	 *   absolute error bound.
	 */
	get tightnessJ() { return this._tightnessJ; }

	/** The current number of distinct values (centroids) in the histogram.
	 * This may be fewer than the number of distinct values added if `maxCentroids` is less than the number of distinct values added. */
	get centroidCount() {
		return this._centroidCount;
	}

	/** Adds a value to the histogram.
	 * If you want to dynamically limit loss, monitor the returned loss and adjust maxCentroids accordingly.
	 * @returns The loss incurred by compression, if any
	 */
	add(value: number): number {
		if (!Number.isFinite(value)) {
			throw new Error("Value must be a finite number (NaN and Infinity are not supported)");
		}
		++this._count;
		this.insertOrIncrementBucket({ value, variance: 0, count: 1 });
		if (this._centroidCount > this._maxCentroids) {
			return this.compressOneBucket();
		}
		return 0;	// No loss if new bucket is inserted
	}

	/** Adds one or more centroids to the histogram.
	 * Adds all centroids before compressing to incur the least loss.
	 * If you want to reduce memory usage, or monitor loss, use an iterator with sequential calls to this rather than this method.
	 * @returns The maximal loss incurred by compression, if any
	 */
	append(...centroids: Centroid[]) {
		for (const centroid of centroids) {
			if (!Number.isFinite(centroid.value)) {
				throw new Error("Centroid value must be a finite number");
			}
			if (centroid.count < 1) {
				throw new Error("Centroid count must be at least 1");
			}
			if (centroid.variance < 0) {
				throw new Error("Centroid variance must be at least 0");
			}
			this._count += centroid.count;
			this.insertOrIncrementBucket(centroid);
		}
		let loss = 0;
		while (this._centroidCount > this._maxCentroids) {
			loss = this.compressOneBucket();
		}
		return loss;
	}

	/** Merges all the centroids from another histogram into this one.
	 * Adds all centroids before compressing to incur the least loss.
	 * If you want to reduce memory usage, or monitor loss, use an iterator with sequential calls to append rather than this method.
	 */
	mergeFrom(other: Sparstogram) {
		if (other === this) {
			throw new Error("Cannot merge a histogram into itself");
		}
		this._count += other.count;
		for (const centroid of other.ascending()) {
			this.insertOrIncrementBucket(centroid);
		}
		const batchSize = Math.max(1, Math.ceil(this._maxCentroids / 4));
		while (this._centroidCount > this._maxCentroids) {
			for (let i = 0; i < batchSize && this._centroidCount > this._maxCentroids; ++i) {
				this.compressOneBucket();
			}
		}
	}

	/** Returns the rank of a value in the histogram - count of all values less than or equal to the given value
	 * This method interpolates the rank between and beyond centroids based on the normal distribution of each centroid.
	 * @param value The value to find the rank for.
	 * @returns The rank of the value in the histogram
	 */
	rankAt(value: number): number {
		let rank = 0;
		let path = this._centroids.find(value);
		const prior = this._centroids.prior(path);
		if (path.on) {
			rank = rankAtMean(this._centroids.at(path)!);
			path = prior;
		}
		else {
			const next = this._centroids.next(path);
			if (next.on && prior.on) {
				rank = interpolateRank(value, this._centroids.at(prior)!, this._centroids.at(next)!);
			}
			else if (next.on) {
				return inferRank(value, this._centroids.at(next)!);
			}
			else if (prior.on) {
				rank = inferRank(value, this._centroids.at(prior)!);
			}
			path = this._centroids.prior(prior);
		}
		while (path.on) {
			const entry = this._centroids.at(path)!;
			rank += entry.count;
			path = this._centroids.prior(path);
		}
		return rank;
	}

	/** Returns the centroid at a given rank in the histogram (count / 2 = median)
	 * @param rank The rank (accumulated count from start if positive, end if negative) to find the value for
	 * @returns The Quantile information at the given rank in the histogram - always returns a positive rank
	 */
	valueAt(rank: number): Quantile {
		if (rank === 0) {
			throw new Error("Rank must be non-zero (positive for from-start, negative for from-end)");
		}
		let remainingRank = Math.abs(rank);
		for (const path of rank >= 0
			? this._centroids.ascending(this._centroids.first())
			: this._centroids.descending(this._centroids.last())) {
			const entry = this._centroids.at(path)!;
			if (remainingRank <= entry.count) {
				const positiveRank = rank >= 0 ? rank : (this._count + rank + 1);
				const offset = rank >= 0 ? remainingRank - 1 : (entry.count - remainingRank);
				return {
					rank: positiveRank,
					centroid: entry,
					offset,
					value: inferValueFromOffset(offset, entry)
				};
			}
			remainingRank -= entry.count;
		}
		throw new Error("Rank out of range");
	}

	/** Returns the interpolated count of values at a given value in the histogram
	 * @param value The value to find the count for
	 * @returns The count of the value in the histogram (interpolated, but in whole counts)
	 */
	countAt(value: number): number {
		const path = this._centroids.find(value);
		if (path.on) {
			return rankAtMean(this._centroids.at(path)!);
		}
		else {
			const next = this._centroids.next(path);
			const prior = this._centroids.prior(path);
			if (next.on && prior.on) {
				return interpolateCount(value, this._centroids.at(prior)!, this._centroids.at(next)!);
			}
			else if (next.on) {
				return inferCount(value, this._centroids.at(next)!);
			}
			else if (prior.on) {
				return inferCount(value, this._centroids.at(prior)!);
			}
			return 0;	// no data - count is 0 everywhere
		}
	}

	/** Returns the value at a given quantile in the histogram (0.5 = median)
	 * @param quantile The quantile (0-1) to find the value for
	 * @returns The centroid at the given quantile in the histogram
	 */
	quantileAt(quantile: number): Quantile {
		const rank = Math.min(this._count, Math.max(1, Math.round(quantile * this._count)));
		const pos = (quantile <= 0.5 ? rank : -(this._count - rank + 1)) // Search from the closest end
		return this.valueAt(pos);
	}

	/** Returns the quantile marker at a given index, as given by markers at construction (0 = median, 1 = lower quartile, 2 = upper quartile, etc.)
	 * @param index The index of the marker to find the value for
	 * @returns The Quartile information at the given marker in the histogram
	 */
	markerAt(index: number): Quantile {
		if (this._markers) {
			const marker = this._markers[index];
			if (marker) {
				return { ...marker, value: inferValueFromOffset(marker.offset, marker.centroid) };
			}
		}
		throw new Error("Invalid marker - not in list of markers given to constructor");
	}

	/** Computes the peaks in the histogram.
	 * This is a simple peak detection algorithm that finds local maxima in the histogram for frequency of cluster detection.
	 * A peak is defined as a local maximum where the count is greater than the counts of the centroids on either side.
	 * If there are too few centroids to allow for the given smoothing in the histogram, no peaks will be returned
	 * @param smoothing The number of centroids in each "direction" to consider for smoothing the peaks (default 3)
	 * @returns Iterator for the computed Peak entries in the histogram
	 */
	*peaks(smoothing: number = 3): IterableIterator<Peak> {
		const left = new Array<Centroid>();	// TODO: replace these with ring buffers
		const right = new Array<Centroid>();
		let peak: Peak | undefined;
		let trend = 1;
		for (let path of this._centroids.ascending(this._centroids.first())) {
			const entry = this._centroids.at(path)!;
			right.push(entry);
			if (right.length > smoothing) {
				left.push(right.shift()!);
			}
			if (left.length > smoothing) {
				left.shift();
			}
			if (left.length === smoothing && right.length === smoothing) {
				const newTrend = left.reduce((a, b) => a + b.count, 0) / smoothing <= right.reduce((a, b) => a + b.count, 0) / smoothing ? 1 : -1;
				if (trend === 1 && newTrend === -1) {
					trend = -1;
				} else if (trend === -1 && newTrend === 1) {
					yield peak!;
					peak = undefined;
					trend = 1;
				}
				peak = updatePeak(left.at(-1)!, peak);
			}
		}
		if (peak) {
			yield peak;
		}

		function updatePeak(c: Centroid, existing: Peak | undefined): Peak | undefined {
			return existing
				? { start: existing.start, end: c.value, max: Math.max(existing.max, c.count), min: Math.min(existing.min, c.count), sum: existing.sum + c.count }
				: { start: c.value, end: c.value, max: c.count, min: c.count, sum: c.count };
		}
	}

	/** Returns an iterator for the centroids in the histogram in ascending order
	 * @param criteria If specified, the iterator will start at the centroid at the given marker index or value; otherwise it will start at the first centroid
	 * @remarks Mutating the histogram during iteration (via {@link add}, {@link append}, {@link mergeFrom}, or the {@link maxCentroids} setter) invalidates the iterator and may produce incorrect results or errors.
	 */
	*ascending(criteria?: Criteria): IterableIterator<Centroid> {
		const startPath = this.criteriaToPath(criteria) ?? this._centroids.first();
		for (const path of this._centroids.ascending(startPath)) {
			yield this._centroids.at(path)!;
		}
	}

	/** Returns an iterator for the centroids in the histogram in descending order
	 * @param criteria If specified, the iterator will start at the centroid at the given marker index or value; otherwise it will start at the last centroid
	 * @remarks Mutating the histogram during iteration (via {@link add}, {@link append}, {@link mergeFrom}, or the {@link maxCentroids} setter) invalidates the iterator and may produce incorrect results or errors.
	 */
	*descending(criteria?: Criteria): IterableIterator<Centroid> {
		const startPath = this.criteriaToPath(criteria) ?? this._centroids.last();
		for (const path of this._centroids.descending(startPath)) {
			yield this._centroids.at(path)!;
		}
	}

	/** Base *pair* loss between two centroids.
	 * Kept independent of ranking heuristics; ordering may use curvature‑aware scores.
	 */
	private computeLoss(a: Centroid, b: Centroid): number {
		// Weighted mean distance between centroids
		const weightedDistance = Math.abs(a.value - b.value) * (a.count + b.count);

		// Combine weighted distance and combined variance
		// TODO: consider scaling factors for weightedDistance and combinedVariance to balance their contributions
		return weightedDistance + combinedVariance(a, b);
	}

	// ----- Curvature‑aware local scoring -------------------------------------
	// We approximate a local CDF curvature near the seam (prior, current) using
	// density differences on the left and right: |dens(l,prior) - dens(prior,curr)|
	// and |dens(prior,curr) - dens(curr,r)|.  The score used in _losses is:
	//   score = baseLoss * (eps + 0.5*(leftCurv + rightCurv))
	// This cheaply preserves bends (peaks/tails) while keeping operations local.
	private getPriorScore(path: Path<number, CentroidEntry>, newCentroid: Centroid): number {
		const prior = this._centroids.prior(path);
		if (!prior.on) return Infinity;
		const a = this._centroids.at(prior)!; // prior
		const b = newCentroid; // current
		const base = this.computeLoss(a, b);
		const lpath = this._centroids.prior(prior);
		const rpath = this._centroids.next(path);
		const l = lpath.on ? this._centroids.at(lpath)! : undefined;
		const r = rpath.on ? this._centroids.at(rpath)! : undefined;
		const curv = this.localCurvature(l, a, b, r);
		return base * (SCORE_EPSILON + curv);
	}

	private updateNextScore(path: Path<number, CentroidEntry>, newCentroid: Centroid): number {
		const next = this._centroids.next(path);
		if (!next.on) return Infinity;
		const a = newCentroid; // prior in pair
		const b = this._centroids.at(next)!; // current in pair
		const base = this.computeLoss(a, b);
		const lpath = this._centroids.prior(path);
		const rpath = this._centroids.next(next);
		const l = lpath.on ? this._centroids.at(lpath)! : undefined;
		const r = rpath.on ? this._centroids.at(rpath)! : undefined;
		const curv = this.localCurvature(l, a, b, r);
		return base * (SCORE_EPSILON + curv);
	}

	private localCurvature(l: Centroid | undefined, a: Centroid, b: Centroid, r: Centroid | undefined): number {
		const dens = (u: Centroid, v: Centroid) => (u.count + v.count) / (Math.abs(v.value - u.value) + DENSITY_EPSILON);
		const left = l ? Math.abs(dens(l, a) - dens(a, b)) : dens(a, b);
		const right = r ? Math.abs(dens(a, b) - dens(b, r)) : dens(a, b);
		return 0.5 * (left + right);
	}

	// Signature to allow binding via prototype to helper below
	private edgeContribution(u: Centroid, v: Centroid): number { return edgeContribution(u, v); }

	/** Inserts a new value into the histogram or increments the count of the existing bucket */
	private insertOrIncrementBucket(centroid: Centroid) {
		const path = this._centroids.find(centroid.value);
		if (path.on) {
			const entry = this._centroids.at(path)!;
			// Get all neighbor information before any tree mutations
			const priorPath = this._centroids.prior(path);
			const nextPath = this._centroids.next(path);
			const priorCentroid = priorPath.on ? this._centroids.at(priorPath)! : undefined;
			const nextCentroid = nextPath.on ? this._centroids.at(nextPath)! : undefined;

			const beforeL = priorCentroid ? this.edgeContribution(priorCentroid, entry) : 0;
			const afterR = nextCentroid ? this.edgeContribution(entry, nextCentroid) : 0;

			const newCentroid = combineSharedMean(entry, centroid);
			const priorScore = this.getPriorScore(path, newCentroid);
			this._centroids.updateAt(path, { ...newCentroid, loss: priorScore });
			this._losses.updateAt(this._losses.find(entry), { loss: priorScore, value: entry.value });
			this.updateNext(path, newCentroid);

			// update J locally
			const afterL2 = priorCentroid ? this.edgeContribution(priorCentroid, newCentroid) : 0;
			const afterR2 = nextCentroid ? this.edgeContribution(newCentroid, nextCentroid) : 0;
			this._tightnessJ += -beforeL - afterR + afterL2 + afterR2;
		} else {
			++this._centroidCount;
			const prior = this._centroids.prior(path);
			const next = this._centroids.next(path);
			// Get the actual centroids before inserting (paths will be invalid after)
			const priorCentroid = prior.on ? this._centroids.at(prior)! : undefined;
			const nextCentroid = next.on ? this._centroids.at(next)! : undefined;
			const newPath = this._centroids.insert({ ...centroid, loss: Infinity });
			const priorScore = this.getPriorScore(newPath, centroid);
			this._centroids.updateAt(newPath, { ...centroid, loss: priorScore });
			this._losses.insert({ loss: priorScore, value: centroid.value });
			// update J locally for edge splits
			if (priorCentroid && nextCentroid) {
				this._tightnessJ -= this.edgeContribution(priorCentroid, nextCentroid);
				this._tightnessJ += this.edgeContribution(priorCentroid, centroid);
				this._tightnessJ += this.edgeContribution(centroid, nextCentroid);
			} else if (priorCentroid) {
				this._tightnessJ += this.edgeContribution(priorCentroid, centroid);
			} else if (nextCentroid) {
				this._tightnessJ += this.edgeContribution(centroid, nextCentroid);
			}
			this.updateNext(newPath, centroid);
			this.updateMarkers(centroid.value);
		}
	}

	/** Updates the markers to reflect the new value */
	private updateMarkers(value: number) {
		if (this._markers) {
			for (let i = 0; i < this._markers.length; ++i) {
				let marker = this._markers[i];
				if (!marker) {	// this must be the first centroid
					this._markers[i] = marker = { rank: 1, centroid: this._centroids.at(this._centroids.first())!, offset: 0 };
				} else {
					if (value < marker.centroid.value) {
						++marker.rank;
					}
					const newRank = Math.round(this.markers![i] * (this._count - 1)) + 1;	// Rank is 1 based
					while (newRank > marker.rank) {
						if (marker.offset < marker.centroid.count - 1) {
							++marker.offset;
						} else {	// move to the next centroid
							const nextPath = this._centroids.next(this._centroids.find(marker.centroid.value));
							if (nextPath.on) {	// There should always be a next; if not just stay on the last centroid
								marker.centroid = this._centroids.at(nextPath)!;
								marker.offset = 0;
							}
						}
						++marker.rank;
					}
					while (newRank < marker.rank) {
						if (marker.offset > 0) {
							--marker.offset;
						} else {	// move to the prior centroid
							const priorPath = this._centroids.prior(this._centroids.find(marker.centroid.value));
							if (priorPath.on) {	// There should always be a prior; if not just stay on the first centroid
								marker.centroid = this._centroids.at(priorPath)!;
								marker.offset = marker.centroid.count - 1;
							}
						}
						--marker.rank;
					}
				}
			}
		}
	}

	private updateNext(path: Path<number, CentroidEntry>, newCentroid: Centroid) {
		const next = this._centroids.next(path);
		if (next.on) {
			const nextEntry = this._centroids.at(next)!;
			const newScore = this.updateNextScore(path, newCentroid);
			this._centroids.updateAt(next, { ...nextEntry, loss: newScore });
			this._losses.updateAt(this._losses.find(nextEntry), { loss: newScore, value: nextEntry.value });
		}
	}

	/** Compresses the two buckets with the smallest *score* into one bucket */
	private compressOneBucket(): number {
		const maxStaleRetries = 1000;

		for (let attempt = 0; ; attempt++) {
			if (attempt >= maxStaleRetries) {
				throw new Error(`compressOneBucket: exceeded ${maxStaleRetries} stale-entry retries – loss index corrupt`);
			}

			const minLossPath = this._losses.first();
			const minLossEntry = this._losses.at(minLossPath)!;
			const minPath = this._centroids.find(minLossEntry.value);
			if (!minPath.on) {
				// Selected loss refers to a centroid that no longer exists. Drop and retry.
				this._losses.deleteAt(minLossPath);
				const nextLoss = this._losses.first();
				if (!nextLoss.on) {
					throw new Error("No compressible centroid pair available – loss index corrupt");
				}
				continue;
			}
			const minEntry = this._centroids.at(minPath)!;
			const priorPath = this._centroids.prior(minPath);	// This should be there because the first entry should have infinite loss and never be selected
			if (!priorPath.on) {
				// Stale loss entry that points at the first centroid (no prior). Drop and retry.
				this._losses.deleteAt(minLossPath);
				const nextLoss = this._losses.first();
				if (!nextLoss.on) {
					throw new Error("No compressible centroid pair available – loss index corrupt");
				}
				continue;
			}
			const priorEntry = this._centroids.at(priorPath)!;
			if (!priorEntry) {
				// Defensive: if prior entry vanished due to concurrent manipulation, remove loss entry and retry.
				this._losses.deleteAt(minLossPath);
				const nextLoss = this._losses.first();
				if (!nextLoss.on) {
					throw new Error("No compressible centroid pair available – loss index corrupt");
				}
				continue;
			}

			// Found a valid pair — proceed with merge
			const priorPriorPath = this._centroids.prior(priorPath);
			const priorPriorEntry = priorPriorPath.on ? this._centroids.at(priorPriorPath)! : undefined;
			const nextPath = this._centroids.next(minPath);
			const nextEntry = nextPath.on ? this._centroids.at(nextPath)! : undefined;

			// Micro‑recentering: place merged centroid at the weighted median of the pair
			const newCount = priorEntry.count + minEntry.count;
			const newVariance = combinedVariance(priorEntry, minEntry);
			const xWeightedMedian = (priorEntry.count >= minEntry.count) ? priorEntry.value : minEntry.value;
			const newCentroid = { value: xWeightedMedian, count: newCount, variance: newVariance };
			const newEntry = { ...newCentroid, loss: Infinity }; // placeholder; real score set after insert

			// Update markers
			if (this._markers) {
				for (let i = 0; i < this._markers.length; ++i) {
					const marker = this._markers[i];
					if (marker && marker.centroid) {
						if (marker.centroid.value === priorEntry.value) {
							marker.centroid = newEntry;
						} else if (marker.centroid.value === minEntry.value) {
							marker.offset += priorEntry.count;
							marker.centroid = newEntry;
						}
					}
				}
			}

			// Remove the old buckets and insert the merged one
			// Update tightness J locally for edges affected: (priorPrior,prior), (prior,min), (min,next)
			if (priorPriorEntry) this._tightnessJ -= this.edgeContribution(priorPriorEntry, priorEntry);
			this._tightnessJ -= this.edgeContribution(priorEntry, minEntry);
			if (nextEntry) this._tightnessJ -= this.edgeContribution(minEntry, nextEntry);

			this._centroids.deleteAt(priorPath);
			this._centroids.deleteAt(this._centroids.find(minEntry.value)!);
			const newPath = this._centroids.insert(newEntry);
			const newScore = this.getPriorScore(newPath, newCentroid);
			this._centroids.updateAt(newPath, { ...newEntry, loss: newScore });
			this._losses.deleteAt(minLossPath);
			this._losses.deleteAt(this._losses.find(priorEntry)!);
			this._losses.insert({ loss: newScore, value: newEntry.value });
			this.updateNext(newPath, newCentroid);

			// Add new edge contributions
			if (priorPriorEntry) this._tightnessJ += this.edgeContribution(priorPriorEntry, newCentroid);
			if (nextEntry) this._tightnessJ += this.edgeContribution(newCentroid, nextEntry);

			this._centroidCount--; // Reflect the merge in the bucket count

			return this.computeLoss(priorEntry, minEntry); // base loss for API compatibility
		}
	}

	private criteriaToPath(criteria?: Criteria): Path<number, CentroidEntry> | undefined {
		if (criteria) {
			const fieldCount = (criteria.markerIndex !== undefined ? 1 : 0)
				+ (criteria.value !== undefined ? 1 : 0)
				+ (criteria.quantile !== undefined ? 1 : 0);
			if (fieldCount > 1) {
				throw new Error("Only one of markerIndex, value, or quantile can be specified as criteria");
			}
			if (fieldCount === 0) {
				throw new Error("Either markerIndex, value, or quantile must be specified as criteria");
			}
			return criteria.markerIndex !== undefined ? this._centroids.find(this.markerAt(criteria.markerIndex).centroid.value)
				: criteria.quantile ? this._centroids.find(criteria.quantile.centroid.value)
					: this._centroids.find(criteria.value!);
		}
		return undefined;
	}
}

/** Returns the merged centroid, assuming a shared mean */
function combineSharedMean(centroidA: Centroid, centroidB: Centroid) {
	const count = centroidA.count + centroidB.count;
	const variance = (centroidA.variance * (centroidA.count - 1) + centroidB.variance * (centroidB.count - 1))
		/ (count - 1);	// Remove DOF
	return { value: centroidA.value, count, variance };
}

/** Estimates combined variance if merged, considering the weighted mean */
function combinedVariance(a: Centroid, b: Centroid): number {
	const nA = a.count;
	const nB = b.count;
	const totalN = nA + nB;

	if (totalN <= 1) {
		return 0; // Variance is undefined or 0 for a single point or no points
	}

	// Sum of squares for centroid A. Initial centroids (count=1) have variance=0, so ssA will be 0.
	const ssA = nA > 0 ? a.variance * (nA > 1 ? nA - 1 : 0) : 0;
	// Sum of squares for centroid B.
	const ssB = nB > 0 ? b.variance * (nB > 1 ? nB - 1 : 0) : 0;

	// This check avoids division by zero if totalN is 0, though nA, nB should be >= 1 from context of use.
	const ssBetween = (nA === 0 || nB === 0 || totalN === 0)
		? 0
		: (nA * nB * Math.pow(a.value - b.value, 2)) / totalN;

	const totalDF = totalN - 1;

	// Avoid division by zero if totalDF is 0 (e.g. totalN=1 implies totalDF=0)
	return totalDF > 0 ? (ssA + ssB + ssBetween) / totalDF : 0;
}

// ---- Constants ----------------------------------------------------------------
const SCORE_EPSILON = 1e-9;
const DENSITY_EPSILON = 1e-12;

// ---- Helpers for local metrics ------------------------------------------------

/** Computes the edge contribution to the tightness metric for a pair of centroids.
 * Returns min(u.count, v.count) * |v.value - u.value|
 * @param u First centroid
 * @param v Second centroid
 * @returns Edge contribution value
 */
export function edgeContribution(u: Centroid, v: Centroid): number {
	return Math.min(u.count, v.count) * Math.abs(v.value - u.value);
}
/** Calculates the Cumulative Distribution Function (CDF) for a normal distribution */
function normalCDF(x: number, mean: number, variance: number): number {
	const standardDeviation = Math.sqrt(variance);
	return 0.5 * (1 + erf((x - mean) / (standardDeviation * Math.sqrt(2))));
}

// Error function needed for the CDF calculation
function erf(x: number): number {
	const a1 = 0.254829592;
	const a2 = -0.284496736;
	const a3 = 1.421413741;
	const a4 = -1.453152027;
	const a5 = 1.061405429;
	const p = 0.3275911;

	// Save the sign of x
	const sign = x < 0 ? -1 : 1;
	x = Math.abs(x);

	// A&S formula 7.1.26
	const t = 1.0 / (1.0 + p * x);
	const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

	return sign * y;
}

// Linear interpolation of the value over 1-sigma standard deviation breadth
function inferValueFromOffset(offset: number, centroid: Centroid): number {
	if (centroid.variance === 0 || centroid.count === 1) {
		return centroid.value;
	} else {
		const standardDeviation = Math.sqrt(centroid.variance);
		const fraction = offset / (centroid.count - 1); // Normalize offset to range [0, 1]
		const scalar = -1 + 2 * fraction;	// 1 Sigma linear interpolation
		return centroid.value + standardDeviation * scalar;
	}
}

function interpolateCentroids(value: number, centroidA: Centroid, centroidB: Centroid): number {
	// Calculate the CDF values for the value from both centroids
	const cdfA = normalCDF(value, centroidA.value, centroidA.variance);
	const cdfB = normalCDF(value, centroidB.value, centroidB.variance);

	// Assuming linear interpolation of CDF values based on counts
	const totalCounts = centroidA.count + centroidB.count;
	const weightA = centroidA.count / totalCounts;
	const weightB = centroidB.count / totalCounts;

	// Weighted average of the CDF values to get the interpolated rank
	return (cdfA * weightA) + (cdfB * weightB);
}

/** Infer the rank within the given centroid pair given a value, assuming a normal distribution and with interpolation */
function interpolateRank(value: number, centroidA: CentroidEntry, centroidB: CentroidEntry): number {
	return Math.floor(interpolateCentroids(value, centroidA, centroidB) * (centroidA.count + centroidB.count));
}

/** Infer the rank within the given centroid given a value, assuming a normal distribution and no interpolation with neighbors */
function inferRank(value: number, centroid: Centroid): number {
	return Math.floor(normalCDF(value, centroid.value, centroid.variance) * centroid.count);
}

/** Mean is a special case.  If variance is 0, treat the count as discretely accumulated at the mean point, otherwise the mean point splits the count */
function rankAtMean(entry: CentroidEntry): number {
	return entry.variance === 0 ? entry.count : Math.floor(entry.count / 2);
}

function calculateDensity(value: number, mean: number, variance: number): number {
	if (variance === 0) {
		return value === mean ? 1 : 0;
	}
	const standardDeviation = Math.sqrt(variance);
	return (1 / (standardDeviation * Math.sqrt(2 * Math.PI))) *
		Math.exp(-0.5 * Math.pow((value - mean) / standardDeviation, 2));
}

function interpolateCount(value: number, centroidA: Centroid, centroidB: Centroid): number {
	// Calculate PDF values for the value from both centroids
	const pdfA = calculateDensity(value, centroidA.value, centroidA.variance);
	const pdfB = calculateDensity(value, centroidB.value, centroidB.variance);

	// Take the maximum of the two densities as the interpolated count
	return Math.round(Math.max(pdfA * centroidA.count, pdfB * centroidB.count));
}

function inferCount(value: number, centroid: Centroid): number {
	return Math.round(calculateDensity(value, centroid.value, centroid.variance) * centroid.count);
}
