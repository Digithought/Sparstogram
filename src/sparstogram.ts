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

interface Marker {
	/** The rank of the value in the histogram */
	rank: number;
	/** The centroid at the quantile */
	centroid: Centroid;
	/** The offset within the centroid of this rank value */
	offset: number;
}

/** Represents a quantile in the histogram. */
interface Quantile extends Marker {
	/** Approximate value represented by the offset / count */
	value: number;
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
	private _markers: (Marker | undefined)[] | undefined;

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
		this.insertOrIncrementBucket({ value, variance: 0, count: 1 });
		if (this._centroidCount > this._maxCentroids) {
			return this.compressOneBucket();
		}
		return 0;	// No loss if new bucket is inserted
	}

	/** Adds a centroid to the histogram.
	 * If you want to dynamically limit loss, monitor the returned loss and adjust maxCentroids accordingly.
	 * @returns The loss incurred by compression, if any
	 */
	append(centroid: Centroid) {	// Not very DRY, but performance critical
		if (centroid.count < 1) {
			throw new Error("Centroid count must be at least 1");
		}
		if (centroid.variance < 0) {
			throw new Error("Centroid variance must be at least 0");
		}
		this._count += centroid.count;
		this.insertOrIncrementBucket(centroid);
		if (this._centroidCount > this._maxCentroids) {
			return this.compressOneBucket();
		}
		return 0;	// No loss if new bucket is inserted
	}

	/** Merges all the centroids from another histogram into this one.
	 * Adds all centroids before compressing to incur the least loss.
	 * If you want to reduce memory usage, or monitor loss, use an iterator with append rather than this method.
	 */
	mergeFrom(other: Sparstogram) {
		this._count += other.count;
		for (const centroid of other.ascending()) {
			this.insertOrIncrementBucket(centroid);
		}
		while (this._centroidCount > this._maxCentroids) {
			this.compressOneBucket();
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
	 * @param rank The rank (accumulated count from start) to find the value for
	 * @returns The Quantile information at the given rank in the histogram
	 */
	valueAt(rank: number): Quantile {
		let remainingRank = rank;
		for (const path of this._centroids.ascending(this._centroids.first())) {
			const entry = this._centroids.at(path)!;
			if (remainingRank <= entry.count) {
				return { rank, centroid: entry, offset: remainingRank - 1, value: inferValueFromOffset(remainingRank - 1, entry) };
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
		const rank = Math.round(quantile * this._count);
		return this.valueAt(rank);
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
		let left = new Array<Centroid>();	// TODO: replace these with ring buffers
		let right = new Array<Centroid>();
		const result: Peak[] = [];
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
	private insertOrIncrementBucket(centroid: Centroid) {
		const path = this._centroids.find(centroid.value);
		if (path.on) {
			const entry = this._centroids.at(path)!;
			const newCentroid = combineSharedMean(entry, centroid);
			const newLoss = this.getPriorLoss(path, newCentroid);
			this._centroids.updateAt(path, { ...newCentroid, loss: newLoss });
			this._losses.updateAt(this._losses.find(entry), { loss: newLoss, value: entry.value });
			this.updateNext(path, newCentroid);
		} else {
			++this._centroidCount;
			const loss = this.getPriorLoss(path, centroid);
			const newPath = this._centroids.insert({ ...centroid, loss });
			this._losses.insert({ loss, value: centroid.value });
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
					if (newRank > marker.rank) {
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
					} else if (newRank < marker.rank) {
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
		const loss = priorPriorEntry ? this.computeLoss(priorPriorEntry, newCentroid) : Infinity;
		const newEntry = { ...newCentroid, loss };

		// Update markers
		if (this._markers) {
			for (let i = 0; i < this._markers.length; ++i) {
				const marker = this._markers[i]!;
				if (marker.centroid.value === priorEntry.value) {
					marker.centroid = newEntry;
				} else if (marker.centroid.value === minEntry.value) {
					marker.offset += minEntry.count;
					marker.centroid = newEntry;
				}
			}
		}

		// Remove the old buckets and insert the merged one
		this._centroids.deleteAt(priorPath);
		this._centroids.deleteAt(this._centroids.find(minEntry.value)!);
		const newPath = this._centroids.insert(newEntry);
		this._losses.deleteAt(minLossPath);
		this._losses.deleteAt(this._losses.find(priorEntry)!);
		this._losses.insert({ loss, value: newEntry.value });
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
				? this._centroids.find(this.markerAt(criteria.markerIndex).centroid.value)
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
function combinedVariance(a: Centroid, b: Centroid) {
	// Assuming the direct combination of variances and mean difference
	return ((a.variance * a.count) + (b.variance * b.count)) / (a.count + b.count - 1)
				 + (a.count * b.count * Math.pow(a.value - b.value, 2)) / (a.count + b.count);
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

// /** Approximation of the CDF using Beasley-Springer-Moro algorithm - credit ChatGPT */
// function inverseNormalCDF(p: number): number {
// 	const a1 = -3.969683028665376e+01;
// 	const a2 = 2.209460984245205e+02;
// 	const a3 = -2.759285104469687e+02;
// 	const a4 = 1.383577518672690e+02;
// 	const a5 = -3.066479806614716e+01;
// 	const a6 = 2.506628277459239e+00;

// 	const b1 = -5.447609879822406e+01;
// 	const b2 = 1.615858368580409e+02;
// 	const b3 = -1.556989798598866e+02;
// 	const b4 = 6.680131188771972e+01;
// 	const b5 = -1.328068155288572e+01;

// 	const c1 = -7.784894002430293e-03;
// 	const c2 = -3.223964580411365e-01;
// 	const c3 = -2.400758277161838e+00;
// 	const c4 = -2.549732539343734e+00;
// 	const c5 = 4.374664141464968e+00;
// 	const c6 = 2.938163982698783e+00;

// 	const d1 = 7.784695709041462e-03;
// 	const d2 = 3.224671290700398e-01;
// 	const d3 = 2.445134137142996e+00;
// 	const d4 = 3.754408661907416e+00;

// 	// Define lower and upper fraction boundaries for rational approximations
// 	const pLow = 0.02425;
// 	const pHigh = 1 - pLow;

// 	// Rational approximation for lower region
// 	if (0 < p && p < pLow) {
// 		const q = Math.sqrt(-2 * Math.log(p));
// 		return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
// 			((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
// 	}

// 	// Rational approximation for central region
// 	if (pLow <= p && p <= pHigh) {
// 		const q = p - 0.5;
// 		const r = q * q;
// 		return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
// 			(((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
// 	}

// 	// Rational approximation for upper region
// 	if (pHigh < p && p < 1) {
// 		const q = Math.sqrt(-2 * Math.log(1 - p));
// 		return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
// 			((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
// 	}

// 	// If p is not in (0,1), return NaN as error state
// 	return NaN;
// }

// Non-linear interpolation of the value from the offset within the centroid - DISABLED... is it worth it?
// function inferValueFromOffset(offset: number, centroid: Centroid): number {
// 	if (centroid.variance === 0) {
// 			return centroid.value;
// 	} else {
// 			const standardDeviation = Math.sqrt(centroid.variance);

// 			// Normalize and scale the offset to fall within the range of the distribution.
// 			// This maps the offset to a percentile from 0 to 1, adjusting for distribution edges.
// 			const percentile = (offset / (centroid.count - 1)) * 0.6826894921370859 + 0.15865525393145707;	// 1 sigma
// 			// const percentile = (offset / (centroid.count - 1)) * 0.9544997361036416 + 0.022750131948179195;	// 2 sigma
// 			// const percentile = (offset / (centroid.count - 1)) * 0.9973002039367398 + 0.0013498980316300933;	// 3 sigma

// 			return centroid.value + standardDeviation * inverseNormalCDF(percentile);
// 	}
// }

// Linear interpolation of the value over 1-sigma standard deviation breadth
function inferValueFromOffset(offset: number, centroid: Centroid): number {
	if (centroid.variance === 0) {
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
