import { BTree, Path } from "digitree";

/** Represents a centroid in the histogram. */
export interface Centroid {
	value: number;
	variance: number;
	count: number;
}

interface CentroidEntry extends Centroid {
	loss: number;	// Loss between this centroid and the prior centroid (infinity for the first centroid)
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

/** Represents a quantile in the histogram. */
export interface Quantile {
	/** The rank of the value in the histogram */
	rank: number;
	/** The centroid at the quantile */
	centroid: Centroid;
	/** The offset within the centroid of this rank value */
	offset: number;
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
	private _centroids = new BTree<number, CentroidEntry>(e => e.value);
	private _centroidCount = 0;
	private _count = 0;
	/** Centroids ordered by loss between the centroid and prior (in value order).  Ordered by (loss ascending, value) */
	private _losses = new BTree<Loss, Loss>(e => e, (a, b) => a.loss < b.loss ? -1 : a.loss > b.loss ? 1 : (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
	private _maxCentroids!: number;
	private _markers: (Quantile | undefined)[] | undefined;

	constructor(
		/** The initial maximum number of centroids to store.
		 * This must be at least 1.
		 * This can be changed at any time.
		 * Note that nothing is allocated by this; it represents the point at which point centroids will begin to be collapsed. */
		maxCentroids: number,
		/** Persisted quantiles to be maintained with each new value.
		 * These don't have to be in order, but they must be between 0 and 1.
		 * The quantiles will be maintained with each new value, and can be retrieved with atMarker. */
		public markers: number[] | undefined,
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
		++this._count;
		this.insertOrIncrementBucket(value);
		if (this._centroidCount > this._maxCentroids) {
			return this.compressOneBucket();
		}
		return 0;	// No loss if new bucket is inserted
	}

	/** Returns the rank of a value in the histogram - count of all values less than or equal to the given value
	 * @param value The value to find the rank for
	 * @returns The rank of the value in the histogram
	 */
	atValue(value: number): number {
		let rank = 0;
		let path = this._centroids.find(value);
		while (path.on) {
			const entry = this._centroids.at(path)!;
			rank += entry.count;
			path = this._centroids.prior(path);
		}
		return rank;
	}

	/** Returns the centroid at a given rank in the histogram (count / 2 = median)
	 * @param rank The rank (accumulated count from start) to find the value for
	 * @returns The Quantile information at the given rank in the histogram
	 */
	atRank(rank: number): Quantile {
		let remainingRank = rank;
		for (const path of this._centroids.ascending(this._centroids.first())) {
			const entry = this._centroids.at(path)!;
			if (remainingRank <= entry.count) {
				return { rank, centroid: entry, offset: remainingRank };
			}
			remainingRank -= entry.count;
		}
		throw new Error("Rank out of range");
	}

	/** Returns the value at a given quantile in the histogram (0.5 = median)
	 * @param quantile The quantile (0-1) to find the value for
	 * @returns The centroid at the given quantile in the histogram
	 */
	atQuantile(quantile: number): Quantile {
		const rank = Math.round(quantile * this._count);
		return this.atRank(rank);
	}

	/** Returns the quantile marker at a given index, as given by markers at construction (0 = median, 1 = lower quartile, 2 = upper quartile, etc.)
	 * @param index The index of the marker to find the value for
	 * @returns The Quartile information at the given marker in the histogram
	 */
	atMarker(index: number): Quantile {
		if (this._markers) {
			const quantile = this._markers[index];
			if (quantile) {
				return { ...quantile };
			}
		}
		throw new Error("Not enabled - pass markers to the constructor to enable persisted quantile calculations");
	}

	/** Computes the peaks in the histogram.
	 * This is a simple peak detection algorithm that finds local maxima in the histogram.
	 * A peak is defined as a local maximum where the count is greater than the counts of the centroids on either side.
	 * If there are too few centroids to allow for the given smoothing in the histogram, no peaks will be returned
	 * @param smoothing The number of centroids in each "direction" to consider for smoothing the peaks (default 3)
	 * @returns The computed Peak entries in the histogram
	 */
	peaks(smoothing: number = 3): Peak[] {
		let left = new Array<Centroid>();
		let right = new Array<Centroid>();
		const result: Peak[] = [];
		let peak: Peak | undefined;
		let trend = 1;
		let i = 0;
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
					result.push(peak!);
					peak = undefined;
					trend = 1;
				}
				peak = updatePeak(right[0], peak);
			}
		}
		if (peak) {
			result.push(peak);
		}

		return result;

		function updatePeak(c: Centroid, existing: Peak | undefined): Peak | undefined {
			return existing
				? { start: existing.start, end: c.value, max: Math.max(existing.max, c.count), min: Math.min(existing.min, c.count), sum: existing.sum + c.count }
				: { start: c.value, end: c.value, max: c.count, min: c.count, sum: c.count };
		}
	}

	/** Returns an iterator for the centroids in the histogram in ascending order
	 * @param criteria If specified, the iterator will start at the centroid at the given marker index or value; otherwise it will start at the first centroid
	 */
	*ascending(criteria?: { markerIndex?: number, value?: number }): IterableIterator<Centroid> {
		const startPath = this.criteriaToPath(criteria) ?? this._centroids.first();
		for (const path of this._centroids.ascending(startPath)) {
			yield this._centroids.at(path)!;
		}
	}

	/** Returns an iterator for the centroids in the histogram in descending order
	 * @param criteria If specified, the iterator will start at the centroid at the given marker index or value; otherwise it will start at the last centroid
	 */
	*descending(criteria?: { markerIndex?: number, value?: number }): IterableIterator<Centroid> {
		const startPath = this.criteriaToPath(criteria) ?? this._centroids.last();
		for (const path of this._centroids.descending(startPath)) {
			yield this._centroids.at(path)!;
		}
	}

	/** Computes the loss between two centroids
	 * This is the sum of the weighted distance between the centroids and the combined variance of the centroids
	 */
	private computeLoss(a: Centroid, b: Centroid): number {
		// Weighted mean distance between centroids
		const weightedDistance = Math.abs(a.value - b.value) * (a.count + b.count);

		// Combine weighted distance and combined variance
		// TODO: consider scaling factors for weightedDistance and combinedVariance to balance their contributions
		return weightedDistance + combinedVariance(a, b);
	}

	/** Inserts a new value into the histogram or increments the count of the existing bucket */
	private insertOrIncrementBucket(value: number) {
		const path = this._centroids.find(value);
		if (path.on) {
			const entry = this._centroids.at(path)!;
			const count = entry.count + 1;
			const newCentroid = { value: entry.value, count, variance: (entry.variance * entry.count) / count };
			const newLoss = this.getPriorLoss(path, newCentroid);
			this._centroids.updateAt(path, { ...newCentroid, loss: newLoss });
			this._losses.updateAt(this._losses.find(entry), { loss: newLoss, value: entry.value });
			this.updateNext(path, newCentroid);
		} else {
			++this._centroidCount;
			const newCentroid = { value: value, count: 1, variance: 0 };
			const loss = this.getPriorLoss(path, newCentroid);
			this._centroids.insert({ ...newCentroid, loss });
			this._losses.insert({ loss, value: value });
			this.updateNext(path, newCentroid);
			this.updateMarkers(value);
		}
	}

	/** Updates the markers to reflect the new value */
	private updateMarkers(value: number) {
		if (this._markers) {
			for (let i = 0; i < this._markers.length; ++i) {
				let quantile = this._markers[i];
				if (!quantile) {	// first and only quantile
					this._markers[i] = quantile = { rank: 0, centroid: this._centroids.at(this._centroids.first())!, offset: 0 };
				} else {
					if (value < quantile.centroid.value) {
						++quantile.rank;
					}
					const newRank = Math.round(this.markers![i] * this._count);
					if (newRank > quantile.rank) {
						if (quantile.offset < quantile.centroid.count) {
							++quantile.offset;
						} else {	// move to the next centroid
							const nextPath = this._centroids.next(this._centroids.find(quantile.centroid.value));
							if (nextPath.on) {	// There should always be a next; if not just stay on the last centroid
								quantile.centroid = this._centroids.at(nextPath)!;
								quantile.offset = 0;
							}
						}
						++quantile.rank;
					} else if (newRank < quantile.rank) {
						if (quantile.offset > 0) {
							--quantile.offset;
						} else {	// move to the prior centroid
							const priorPath = this._centroids.prior(this._centroids.find(quantile.centroid.value));
							if (priorPath.on) {	// There should always be a prior; if not just stay on the first centroid
								quantile.centroid = this._centroids.at(priorPath)!;
								quantile.offset = quantile.centroid.count - 1;
							}
						}
						--quantile.rank;
					}
				}
			}
		}
	}

	private getPriorLoss(path: Path<number, CentroidEntry>, newCentroid: Centroid): number {
		const prior = this._centroids.prior(path);
		return prior.on ? this.computeLoss(this._centroids.at(prior)!, newCentroid) : Infinity;
	}

	private updateNext(path: Path<number, CentroidEntry>, newCentroid: Centroid) {
		const next = this._centroids.next(path);
		if (next.on) {
			const nextEntry = this._centroids.at(next)!;
			const newLoss = this.computeLoss(newCentroid, nextEntry);
			this._centroids.updateAt(next, { ...nextEntry, loss: newLoss });
			this._losses.updateAt(this._losses.find(nextEntry), { loss: newLoss, value: nextEntry.value });
		}
	}

	/** Compresses the two buckets with the smallest loss into one bucket */
	private compressOneBucket(): number {
		const minLossPath = this._losses.first();
		const minLossEntry = this._losses.at(minLossPath)!;
		const minPath = this._centroids.find(minLossEntry.value);
		const minEntry = this._centroids.at(minPath)!;
		const priorPath = this._centroids.prior(minPath);	// This should be there because the first entry should have infinite loss and never be selected
		const priorEntry = this._centroids.at(priorPath)!;
		const priorPriorEntry = this._centroids.at(this._centroids.prior(priorPath))!;	// New prior entry after the merge

		const newCentroid = {
			value: (priorEntry.value * priorEntry.count + minEntry.value * minEntry.count) / (priorEntry.count + minEntry.count),
			count: priorEntry.count + minEntry.count,
			variance: combinedVariance(priorEntry, minEntry)
		};
		const loss = this.computeLoss(priorPriorEntry, newCentroid);
		const newEntry = { ...newCentroid, loss };

		// Update markers
		if (this._markers) {
			for (let i = 0; i < this._markers.length; ++i) {
				const quantile = this._markers[i]!;
				if (quantile.centroid === priorEntry) {
					quantile.centroid = newEntry;
				} else if (quantile.centroid === minEntry) {
					quantile.offset += minEntry.count;
					quantile.centroid = newEntry;
				}
			}
		}

		// Remove the old buckets and insert the merged one
		this._centroids.deleteAt(priorPath);
		this._centroids.deleteAt(this._centroids.find(minEntry.value)!);
		const newPath = this._centroids.insert(newEntry);
		this.updateNext(newPath, newCentroid);

		this._centroidCount--; // Reflect the merge in the bucket count

		return minEntry.loss;
	}

	private criteriaToPath(criteria?: { markerIndex?: number, value?: number }): Path<number, CentroidEntry> | undefined {
		if (criteria) {
			if (criteria.markerIndex !== undefined && criteria.value !== undefined) {
				throw new Error("Only one of markerIndex or value can be specified as criteria");
			}
			if (criteria.markerIndex === undefined && criteria.value === undefined) {
				throw new Error("Either markerIndex or value must be specified as criteria");
			}
			return criteria.markerIndex !== undefined
					? this._centroids.find(this.atMarker(criteria.markerIndex).centroid.value)
					: this._centroids.find(criteria.value!);
		}
		return undefined;
	}
}

/** Estimates combined variance if merged, considering the weighted mean */
function combinedVariance(a: Centroid, b: Centroid) {
	return ((a.variance * a.count) + (b.variance * b.count)) / (a.count + b.count)
		+ (a.count * b.count * Math.pow(a.value - b.value, 2)) / Math.pow(a.count + b.count, 2);
}
