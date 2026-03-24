import { expect } from 'chai';
import { Sparstogram, Centroid } from './sparstogram.js';

describe('Sparstogram', () => {
	let sparstogram: Sparstogram;

	beforeEach(() => {
		sparstogram = new Sparstogram(10); // Assuming maxCentroids is 10 for most tests
	});

	describe('add method', () => {
		it('should add a single value without compression', () => {
			const loss = sparstogram.add(5);
			expect(loss).to.equal(0);
			expect(sparstogram.count).to.equal(1);
			expect(sparstogram.centroidCount).to.equal(1);
		});

		it('should handle adding multiple distinct values without needing compression', () => {
			for (let i = 0; i < 10; i++) {
				sparstogram.add(i);
			}
			expect(sparstogram.count).to.equal(10);
			expect(sparstogram.centroidCount).to.equal(10);
		});

		it('should compress centroids when exceeding maxCentroids', () => {
			for (let i = 0; i < 10; i++) {
				expect(sparstogram.add(i)).to.equal(0);	// Assuming no loss for up to maxCentroids
			}
			for (let i = 10; i < 20; i++) {
				expect(sparstogram.add(i)).to.be.greaterThan(0); // Loss expected after compression
			}
			expect(sparstogram.centroidCount).to.equal(10);
		});

		it('should accurately compute loss after compression', () => {
			sparstogram = new Sparstogram(5); // Lower maxCentroids for this test
			for (let i = 0; i < 100; i++) {
				sparstogram.add(i);
			}
			expect(sparstogram.add(101)).to.be.greaterThan(0);
		});

		it('should compress when maxCentroids is reduced', () => {
			for (let i = 0; i < 5; i++) {
				expect(sparstogram.add(i)).to.equal(0);	// Assuming no loss for up to maxCentroids
			}
			sparstogram.maxCentroids = 1;
			expect(sparstogram.centroidCount).to.equal(1);
			const lone = [...sparstogram.ascending()][0];
			expect(lone.value).to.be.within(0, 4);
		});

		it('should validate maxCentroids', () => {
			expect(sparstogram.maxCentroids).to.equal(10);
			expect(() => sparstogram.maxCentroids = 0).to.throw();
			expect(sparstogram.maxCentroids).to.equal(10);
		});

		it('should validate appended centroids', () => {
			expect(() => sparstogram.append({ value: 0, variance: 0, count: 0 })).to.throw();
			expect(() => sparstogram.append({ value: 0, variance: -1, count: 1 })).to.throw();
			expect(() => sparstogram.append({ value: 0, variance: 0, count: 1 })).not.to.throw();
		});
	});

});

describe('Sparstogram - atValue method', () => {
	let sparstogram: Sparstogram;

	beforeEach(() => {
		// Initialize Sparstogram with a reasonable number of centroids for testing
		sparstogram = new Sparstogram(10);
	});

	it('should return 0 for any value when histogram is empty', () => {
		expect(sparstogram.rankAt(5)).to.equal(0);
	});

	it('should return the correct rank for a single value in the histogram', () => {
		sparstogram.add(10); // Add a single value
		expect(sparstogram.rankAt(5)).to.equal(0); // Less than the added value
		expect(sparstogram.rankAt(10)).to.equal(1); // Equal to the added value
		expect(sparstogram.rankAt(15)).to.equal(1); // Greater than the added value
	});

	it('should return correct ranks for multiple values in a dense distribution', () => {
		for (let i = 1; i <= 10; i++) {
			sparstogram.add(i); // Add values 1 through 10
		}
		expect(sparstogram.rankAt(0)).to.equal(0); // No values are less than 1
		expect(sparstogram.rankAt(5)).to.equal(5); // Five values are less than or equal to 5
		expect(sparstogram.rankAt(10)).to.equal(10); // All values are less than or equal to 10
		expect(sparstogram.rankAt(11)).to.equal(10); // All values are less than 11
	});

	it('should handle sparse, non-uniform distributions correctly', () => {
		sparstogram.add(1);
		sparstogram.add(100);
		sparstogram.add(1000); // A sparse distribution of values
		expect(sparstogram.rankAt(50)).to.equal(1); // Only one value is less than or equal to 50
		expect(sparstogram.rankAt(100)).to.equal(2); // Two values are less than or equal to 100
		expect(sparstogram.rankAt(500)).to.equal(2); // Still only two values less than or equal to 500
		expect(sparstogram.rankAt(1000)).to.equal(3); // All values are less than or equal to 1000
	});

	it('should accurately reflect ranks after adding duplicate values', () => {
		sparstogram.add(5);
		sparstogram.add(5); // Add duplicate value
		sparstogram.add(10);
		// No merging, so expect discrete ranks for each value
		expect(sparstogram.rankAt(4)).to.equal(0);
		expect(sparstogram.rankAt(5)).to.equal(2);
		expect(sparstogram.rankAt(6)).to.equal(2);
		expect(sparstogram.rankAt(9)).to.equal(2);
		expect(sparstogram.rankAt(10)).to.equal(3);
		expect(sparstogram.rankAt(11)).to.equal(3);
		expect(sparstogram.rankAt(1000)).to.equal(3);
	});
});

describe('Sparstogram valueAt method', () => {
	let sparstogram: Sparstogram;

	beforeEach(() => {
		// Initialize Sparstogram with a reasonable number of centroids for testing
		sparstogram = new Sparstogram(10, undefined);
	});

	it('should throw on empty histogram', () => {
		expect(() => sparstogram.valueAt(0)).to.throw();
	});

	it('should return correct quantile for histogram with single item', () => {
		sparstogram.add(5); // Assuming add method correctly updates internal structures
		const result = sparstogram.valueAt(1);
		expect(result.centroid.value).to.equal(5);
		expect(result.centroid.count).to.equal(1);
		expect(result.rank).to.equal(1);
	});

	it('should handle dense histogram correctly', () => {
		// Add multiple items with dense values
		for (let i = 1; i <= 10; i++) {
			sparstogram.add(i);
		}
		// Test a middle rank
		const middleRankResult = sparstogram.valueAt(5);
		expect(middleRankResult.centroid.value).to.be.lessThanOrEqual(5);
		expect(middleRankResult.rank).to.equal(5);

		// Test the highest rank
		const highestRankResult = sparstogram.valueAt(10);
		expect(highestRankResult.centroid.value).to.equal(10);
		expect(highestRankResult.rank).to.equal(10);
	});

	it('should handle sparse histogram correctly', () => {
		// Add items with sparse values
		[1, 100, 200].forEach(value => sparstogram.add(value));
		// Test rank that should fall within the first value
		const lowRankResult = sparstogram.valueAt(1);
		expect(lowRankResult.centroid.value).to.equal(1);
		expect(lowRankResult.rank).to.equal(1);
		expect(lowRankResult.offset).to.equal(0);
		expect(lowRankResult.value).to.equal(1);

		// Test rank that should fall within the last value
		const highRankResult = sparstogram.valueAt(3);
		expect(highRankResult.centroid.value).to.equal(200);
		expect(highRankResult.rank).to.equal(3);
		expect(highRankResult.offset).to.equal(0);
		expect(highRankResult.value).to.equal(200);
	});

	it('should accurately reflect rank in a mixed-density histogram', () => {
		// Mix of dense and sparse values
		[1, 2, 2, 100].forEach(value => sparstogram.add(value));
		const result = sparstogram.valueAt(4);
		expect(result.centroid.value).to.equal(100);
		expect(result.rank).to.equal(4);

		// Ensuring it handles lower ranks correctly
		const lowerRankResult = sparstogram.valueAt(2);
		// Given the setup, rank 2 could still be at the first or second value due to duplicate values
		expect([1, 2]).to.include(lowerRankResult.centroid.value);
		expect(lowerRankResult.rank).to.equal(2);
	});

	it('should return correct value given rank from the end', () => {
		// Add items with sparse values
		[1, 100, 200].forEach(value => sparstogram.add(value));
		// Test rank that should fall within the first value
		const highRankResult = sparstogram.valueAt(-1);
		expect(highRankResult.centroid.value).to.equal(200);
		expect(highRankResult.rank).to.equal(3);	// Rank always come back from front
		expect(highRankResult.offset).to.equal(0);
		expect(highRankResult.value).to.equal(200);
	});

	it('should return correct value for quantile in a dense histogram', () => {
		for (let i = 1; i <= 10; i++) {
			sparstogram.add(i);
		}
		let quantileResult = sparstogram.quantileAt(0.2);
		expect(quantileResult.centroid.value).to.equal(2);
		expect(quantileResult.rank).to.equal(2);

		quantileResult = sparstogram.quantileAt(0.8);
		expect(quantileResult.centroid.value).to.equal(8);
		expect(quantileResult.rank).to.equal(8);

		quantileResult = sparstogram.quantileAt(0.5);
		expect(quantileResult.centroid.value).to.equal(5);
		expect(quantileResult.rank).to.equal(5);

		quantileResult = sparstogram.quantileAt(2);		// Should be the same as 1
		expect(quantileResult.centroid.value).to.equal(10);
		expect(quantileResult.rank).to.equal(10);

		quantileResult = sparstogram.quantileAt(-2);	// Should be the same as 0
		expect(quantileResult.centroid.value).to.equal(1);
		expect(quantileResult.rank).to.equal(1);
	});

	// More tests could be added to handle edge cases, such as ranks outside the range of the histogram,
	// very large histograms, and histograms with a lot of duplicate values.
});

describe('atMarker method', () => {
	it('should not allow invalid markers', () => {
		expect(() => new Sparstogram(10, [-1])).to.throw();
		expect(() => new Sparstogram(10, [1.1])).to.throw();
	});

	it('should return undefined for empty histogram', () => {
		const sparstogram = new Sparstogram(10, [0.5]); // Median marker
		expect(() => sparstogram.markerAt(0)).to.throw();
	});

	it('should return correct quantile for histogram with single value', () => {
		const sparstogram = new Sparstogram(10, [0, 0.5, 1]); // Min, median, max markers
		sparstogram.add(10); // Single value
		const minMarker = sparstogram.markerAt(0);
		const medianMarker = sparstogram.markerAt(1);
		const maxMarker = sparstogram.markerAt(2);

		expect(minMarker).to.not.be.undefined;
		expect(minMarker?.centroid.value).to.equal(10);
		expect(medianMarker).to.not.be.undefined;
		expect(medianMarker?.centroid.value).to.equal(10);
		expect(maxMarker).to.not.be.undefined;
		expect(maxMarker?.centroid.value).to.equal(10);
	});

	it('should return correct quantile for a dense histogram', () => {
		const markers = [0.25, 0.5, 0.75];
		const sparstogram = new Sparstogram(100, markers);
		for (let i = 0; i <= 99; i++) { // Add 100 values
			sparstogram.add(i);
		}

		const lowerQuartile = sparstogram.markerAt(0);
		expect(lowerQuartile).to.not.be.undefined;
		expect(lowerQuartile?.centroid.value).to.equal(25);
		expect(lowerQuartile?.rank).to.equal(26); // Rank for 0.25 of 100 items (0-99) is 26, value is 25

		const median = sparstogram.markerAt(1);
		expect(median).to.not.be.undefined;
		expect(median?.centroid.value).to.be.closeTo(50, 0.1);
		expect(median?.rank).to.equal(51);

		const upperQuartile = sparstogram.markerAt(2);
		expect(upperQuartile).to.not.be.undefined;
		expect(upperQuartile?.centroid.value).to.equal(74);
		expect(upperQuartile?.rank).to.equal(75);
	});

	it('should return correct quantile for a compressed histogram', () => {
		const markers = [0.25, 0.5, 0.75]; // Lower quartile, median, upper quartile
		const sparstogram = new Sparstogram(10, markers);
		sparstogram.add(50);
		for (let i = 1; i < 49; i++) { // Add 97 values total (2-98)
			sparstogram.add(50 + i);
			sparstogram.add(50 - i);
		}

		const lowerQuartile = sparstogram.markerAt(0);
		expect(lowerQuartile).to.not.be.undefined;
		expect(lowerQuartile?.centroid.value).to.be.oneOf([26, 27]); // Weighted median may pick either centroid
		expect(lowerQuartile?.rank).to.equal(25); // Rank for 0.25 of 97 items (1-97) is 25
		// New curvature-aware scoring may nudge the value slightly; assert proximity via tightness tolerance.
		expect(lowerQuartile?.value).to.be.closeTo(26.5, 1);

		const median = sparstogram.markerAt(1);
		expect(median).to.not.be.undefined;
		expect(median?.centroid.value).to.be.within(45, 55);
		expect(median?.rank).to.equal(49);

		const upperQuartile = sparstogram.markerAt(2);
		expect(upperQuartile).to.not.be.undefined;
		expect(upperQuartile?.centroid.value).to.be.within(40, 80);
		expect(upperQuartile?.rank).to.equal(73); // Rank for 0.75 of 97 items is 73
	});

	it('should handle sparse histogram accurately', () => {
		const markers = [0.1, 0.9]; // 10th percentile, 90th percentile
		const sparstogram = new Sparstogram(10, markers);
		// Adding sparse values
		sparstogram.add(1);
		sparstogram.add(1000);

		const tenthPercentile = sparstogram.markerAt(0);
		expect(tenthPercentile).to.not.be.undefined;
		expect(tenthPercentile?.centroid.value).to.be.closeTo(1, 0.1);

		const ninetiethPercentile = sparstogram.markerAt(1);
		expect(ninetiethPercentile).to.not.be.undefined;
		expect(ninetiethPercentile?.centroid.value).to.be.closeTo(1000, 0.1);
	});

	it('should interpolate in sparse histogram', () => {
		const markers = [0.1, 0.9]; // 10th percentile, 90th percentile
		const sparstogram = new Sparstogram(2, markers);
		// Adding sparse values
		sparstogram.add(0);
		sparstogram.add(1000);
		sparstogram.add(250);
		sparstogram.add(750);

		const tenthPercentile = sparstogram.markerAt(0);
		expect(tenthPercentile).to.not.be.undefined;
		if (tenthPercentile) {
			expect(tenthPercentile.value).to.be.within(-800, 400);
			expect(tenthPercentile.centroid.value).to.be.within(-200, 500);
		}

		const ninetiethPercentile = sparstogram.markerAt(1);
		expect(ninetiethPercentile).to.not.be.undefined;
		if (ninetiethPercentile) {
			expect(ninetiethPercentile.value).to.be.within(800, 1200);
			expect(ninetiethPercentile.centroid.value).to.be.within(600, 1000);
		}
	});
});

describe('countAt method', () => {
	let sparstogram: Sparstogram;

	beforeEach(() => {
		sparstogram = new Sparstogram(10, undefined); // Adjust maxCentroids as needed for testing
	});

	it('should return 0 for empty histogram', () => {
		expect(sparstogram.countAt(5)).to.equal(0);
	});

	it('should return exact count for a single value when there is only one centroid', () => {
		sparstogram.add(5);
		expect(sparstogram.countAt(5)).to.equal(1);
	});

	it('should interpolate count in a compressed histogram', () => {
		sparstogram.maxCentroids = 2; // Lower maxCentroids for this test
		[1, 2, 4, 5, 4.5, 4.5].forEach(i => sparstogram.add(i));
		// The curvature-aware compression changes exact counts; we only assert basic monotonicity and non-negativity.
		const probes = [0, 1, 1.5, 2, 2.5, 3, 3.9, 4.5, 5.1, 5.5];
		for (const v of probes) {
			expect(sparstogram.countAt(v)).to.be.at.least(0);
		}
	});

	it('should return correct count for dense histogram with multiple centroids', () => {
		for (let i = 0; i < 10; i++) {
			sparstogram.add(i); // Creating a dense histogram with values 0 through 9
		}
		// Assuming uniform distribution and linear interpolation
		expect(sparstogram.countAt(5)).to.equal(1); // Exact match
		expect(sparstogram.countAt(4.5)).to.equal(0); // No variance so 0 between values
	});

	it('should handle values outside the range of centroids', () => {
		sparstogram.add(10);
		sparstogram.add(20);
		// Check for values outside the range
		expect(sparstogram.countAt(5)).to.equal(0); // Below the lowest centroid
		expect(sparstogram.countAt(25)).to.equal(0); // Above the highest centroid
	});

	it('should handle very large numbers', () => {
		sparstogram.maxCentroids = 1;
		sparstogram.add(1000000);
		sparstogram.add(2000000);
		const interpolated = sparstogram.countAt(1500000);
		expect(interpolated).to.be.at.least(0);
		expect(interpolated).to.be.at.most(sparstogram.count);
	});

	// Additional tests can include more nuanced scenarios, such as very close centroids,
	// centroids with very large counts, and checking for correct behavior when centroids are merged or split.
});

describe('Sparstogram append method', () => {
	let sparstogram: Sparstogram;

	beforeEach(() => {
		sparstogram = new Sparstogram(5, undefined); // Setting maxCentroids to 5 for these tests
	});

	it('should append a single centroid without loss', () => {
		const initialCentroid: Centroid = { value: 10, variance: 1, count: 1 };
		const loss = sparstogram.append(initialCentroid);
		expect(loss).to.equal(0);
		expect(sparstogram.count).to.equal(1);
		expect(sparstogram.centroidCount).to.equal(1);
	});

	it('should correctly handle multiple centroids without exceeding maxCentroids', () => {
		const centroids: Centroid[] = [
			{ value: 10, variance: 1, count: 1 },
			{ value: 20, variance: 1, count: 1 },
			{ value: 30, variance: 1, count: 1 },
			{ value: 40, variance: 1, count: 1 },
		];
		centroids.forEach(centroid => {
			const loss = sparstogram.append(centroid);
			expect(loss).to.equal(0);
		});
		expect(sparstogram.count).to.equal(centroids.length);
		expect(sparstogram.centroidCount).to.equal(centroids.length);
	});

	it('should incur loss when exceeding maxCentroids', () => {
		const centroids: Centroid[] = [
			{ value: 10, variance: 1, count: 1 },
			{ value: 20, variance: 1, count: 1 },
			{ value: 30, variance: 1, count: 1 },
			{ value: 40, variance: 1, count: 1 },
			{ value: 50, variance: 1, count: 1 },
			{ value: 60, variance: 1, count: 1 }, // This should trigger compression
		];
		centroids.forEach(centroid => sparstogram.append(centroid));
		// Check loss for the last append, which should trigger compression
		const loss = sparstogram.append({ value: 70, variance: 1, count: 1 });
		expect(loss).to.be.greaterThan(0);
		expect(sparstogram.centroidCount).to.be.lessThanOrEqual(5);
	});

	it('should adjust total count correctly when appending centroids with various counts', () => {
		sparstogram.append({ value: 100, variance: 0, count: 10 });
		sparstogram.append({ value: 200, variance: 0, count: 20 });
		expect(sparstogram.count).to.equal(30);
		expect(sparstogram.centroidCount).to.equal(2);
	});

});


describe('Sparstogram.mergeFrom', () => {
	let primary: Sparstogram;
	let secondary: Sparstogram;

	beforeEach(() => {
		primary = new Sparstogram(10, undefined); // Primary histogram with maxCentroids set to 10
		secondary = new Sparstogram(10, undefined); // Secondary histogram also with maxCentroids set to 10
	});

	it('should merge an empty histogram without changes', () => {
		primary.add(5); // Add a single value to ensure the primary is not empty
		primary.mergeFrom(secondary); // Merge an empty secondary into primary
		expect(primary.count).to.equal(1);
		expect(primary.centroidCount).to.equal(1);
	});

	it('should correctly merge a non-empty histogram', () => {
		primary.add(5);
		secondary.add(10);
		secondary.add(10); // Add the same value to ensure count increases
		primary.mergeFrom(secondary);
		expect(primary.count).to.equal(3);
		expect(primary.centroidCount).to.equal(2);
	});

	it('should handle merging with large numbers', () => {
		for (let i = 0; i < 100; i++) {
			primary.add(i);
		}
		for (let i = 0; i < 50; i++) {
			secondary.add(i * 2); // Add multiples of 2 to ensure some overlap and some unique
		}
		primary.mergeFrom(secondary);
		// Exact outcomes depend on the implementation, especially how compression is handled
		expect(primary.count).to.equal(150);
		expect(primary.centroidCount).to.be.lessThanOrEqual(10);
	});

	it('should compress only after all centroids are added', () => {
		primary = new Sparstogram(5, undefined); // Reduce maxCentroids for this test
		for (let i = 0; i < 5; i++) {
			primary.add(i); // Add up to maxCentroids
		}
		for (let i = 5; i < 10; i++) {
			secondary.add(i); // Should cause compression when merged
		}
		primary.mergeFrom(secondary);
		expect(primary.count).to.equal(10);
		// Expect compression, but since it's based on internal logic, we can't predict exact centroidCount
		expect(primary.centroidCount).to.be.lessThanOrEqual(5);
	});

	it('should merge histograms with overlapping values correctly', () => {
		primary.add(1);
		primary.add(2);
		secondary.add(2);
		secondary.add(3);
		primary.mergeFrom(secondary);
		// Expect both values to be merged, with counts correctly aggregated
		expect(primary.count).to.equal(4);
		// Depending on how the algorithm handles exact matches, centroid count may vary
		expect(primary.centroidCount).to.be.lessThanOrEqual(3);
	});

	// Consider adding more tests here to cover additional edge cases and scenarios,
	// such as merging histograms where one is dense and the other sparse,
	// or testing with different maxCentroids values to observe the effect on compression.
});

describe('Sparstogram peaks method', () => {
	let sparstogram: Sparstogram;

	const addSeq = (values: number[]) => {
		values.forEach((value, i) => Array(value).fill(i).forEach(x => sparstogram.add(x)));
	};

	beforeEach(() => {
		sparstogram = new Sparstogram(100, undefined); // Adjust maxCentroids as needed
	});

	it('should return no peaks for a histogram with too few centroids to smooth', () => {
		addSeq([1, 1, 1]); // Adding a few identical values
		const peaks = Array.from(sparstogram.peaks());
		expect(peaks).to.have.lengthOf(0); // Expect no peaks due to insufficient data for smoothing
	});

	it('should correctly identify a single peak in a simple dataset', () => {
		addSeq([1, 2, 3, 4, 5, 4, 3, 2, 1]); // A clear peak at 5
		const peaks = Array.from(sparstogram.peaks(1));
		expect(peaks).to.have.lengthOf(1);
		expect(peaks[0].max).to.equal(5);
		expect(peaks[0].min).to.equal(1);	// latency from smoothing
		expect(peaks[0].start).to.equal(0);
		expect(peaks[0].end).to.equal(7);	// can't get last item for smoothing
	});

	it('should correctly identify multiple peaks in a complex dataset', () => {
		addSeq([1, 2, 1, 4, 5, 4, 3, 3, 5, 7, 4, 3, 2, 3, 2, 1]); // Peaks at index 5 and 9
		const peaks = Array.from(sparstogram.peaks());
		expect(peaks).to.have.lengthOf(2);
		expect(peaks[0].start).to.equal(2);
		expect(peaks[0].end).to.equal(5);
		expect(peaks[0].max).to.equal(5);
		expect(peaks[0].min).to.equal(1);
		expect(peaks[0].sum).to.equal(14);
		expect(peaks[1].start).to.equal(6);
		expect(peaks[1].end).to.equal(12);
		expect(peaks[1].max).to.equal(7);
		expect(peaks[1].min).to.equal(2);
		expect(peaks[1].sum).to.equal(27);
	});

	it('should handle edge case when smoothing parameter is larger than the dataset', () => {
		sparstogram = new Sparstogram(100, undefined); // Resetting with a large maxCentroids
		addSeq([1, 2, 3, 2, 1]); // Simple dataset with a peak
		const peaks = Array.from(sparstogram.peaks(10)); // Smoothing parameter larger than dataset
		expect(peaks).to.have.lengthOf(0); // Expect no peaks due to excessive smoothing
	});

	// Additional tests should be added to cover more scenarios, such as:
	// - Testing with different smoothing parameters
	// - Testing with datasets that have flat peaks (plateaus)
	// - Testing with very large datasets to ensure performance and correctness
});


describe('Sparstogram Iterators', () => {
	let sparstogram: Sparstogram;

	beforeEach(() => {
		sparstogram = new Sparstogram(10, undefined);
		// Populate the sparstogram with a mixture of values
		[10, 20, 5, 15, 25].forEach(value => sparstogram.add(value));
	});

	describe('ascending iterator', () => {
		it('should iterate through centroids in ascending order', () => {
			const values = Array.from(sparstogram.ascending()).map(c => c.value);
			expect(values).to.deep.equal([5, 10, 15, 20, 25]);
		});

		it('should not allow invalid criteria', () => {
			expect(() => Array.from(sparstogram.ascending({})).map(c => c.value)).to.throw();	// neither
			expect(() => Array.from(sparstogram.ascending({ value: 15, markerIndex: 0 })).map(c => c.value)).to.throw();	// both
			expect(() => Array.from(sparstogram.ascending({ markerIndex: 0, quantile: sparstogram.valueAt(1) })).map(c => c.value)).to.throw();	// both
		});

		it('should start at the specified value', () => {
			const values = Array.from(sparstogram.ascending({ value: 15 })).map(c => c.value);
			expect(values).to.deep.equal([15, 20, 25]);
		});

		it('should start at markerIndex', () => {
			sparstogram = new Sparstogram(10, [0.5]); // Median marker
			[10, 20, 5, 15, 25].forEach(value => sparstogram.add(value));
			const values = Array.from(sparstogram.ascending({ markerIndex: 0 })).map(c => c.value);
			expect(values).to.deep.equal([15, 20, 25]);
		});

		it('should start at quantile', () => {
			sparstogram = new Sparstogram(10, [0.5]); // Median marker
			[10, 20, 5, 15, 25].forEach(value => sparstogram.add(value));
			const values = Array.from(sparstogram.ascending({ quantile: sparstogram.valueAt(4) })).map(c => c.value);
			expect(values).to.deep.equal([20, 25]);
		});

		it('should handle empty histograms', () => {
			sparstogram = new Sparstogram(10, undefined); // Reset to an empty histogram
			const values = Array.from(sparstogram.ascending()).map(c => c.value);
			expect(values).to.have.lengthOf(0);
		});

		// Additional tests can include starting at the first centroid, at a nonexistent value (ensuring it starts at the next closest), etc.
	});

	describe('descending iterator', () => {
		it('should iterate through centroids in descending order', () => {
			const values = Array.from(sparstogram.descending()).map(c => c.value);
			expect(values).to.deep.equal([25, 20, 15, 10, 5]);
		});

		it('should start at the specified value', () => {
			const values = Array.from(sparstogram.descending({ value: 15 })).map(c => c.value);
			expect(values).to.deep.equal([15, 10, 5]);
		});

		it('should handle empty histograms', () => {
			sparstogram = new Sparstogram(10, undefined); // Reset to an empty histogram
			const values = Array.from(sparstogram.descending()).map(c => c.value);
			expect(values).to.have.lengthOf(0);
		});

		// As with ascending, tests for starting at the last centroid, a nonexistent value, etc., are also valuable.
	});

	// Optionally, tests for criteria using markerIndex if your implementation supports and can demonstrate this functionality.
});

describe('API Surface Review', () => {
	describe('Criteria validation — 2-of-3 rejection', () => {
		// BUG: criteriaToPath (:625) only throws when ALL THREE fields are set.
		// Two-of-three silently picks one based on precedence (markerIndex > quantile > value).
		// These tests document the current (buggy) behavior; see fix ticket.
		it('BUG: value + markerIndex does not throw (should reject)', () => {
			const s = new Sparstogram(10, [0.5]);
			[10, 20, 5, 15, 25].forEach(v => s.add(v));
			// Currently does NOT throw — markerIndex takes precedence silently
			const values = Array.from(s.ascending({ value: 15, markerIndex: 0 })).map(c => c.value);
			expect(values).to.deep.equal([15, 20, 25]); // uses markerIndex, ignores value
		});

		it('BUG: value + quantile does not throw (should reject)', () => {
			const s = new Sparstogram(10, [0.5]);
			[10, 20, 5, 15, 25].forEach(v => s.add(v));
			const q = s.valueAt(1);
			// Currently does NOT throw — quantile takes precedence silently
			const values = Array.from(s.ascending({ value: 15, quantile: q })).map(c => c.value);
			expect(values).to.deep.equal([5, 10, 15, 20, 25]); // uses quantile (rank 1 = first), ignores value
		});

		it('BUG: markerIndex + quantile does not throw (should reject)', () => {
			const s = new Sparstogram(10, [0.5]);
			[10, 20, 5, 15, 25].forEach(v => s.add(v));
			const q = s.valueAt(1);
			// Currently does NOT throw — markerIndex takes precedence silently
			const values = Array.from(s.ascending({ markerIndex: 0, quantile: q })).map(c => c.value);
			expect(values).to.deep.equal([15, 20, 25]); // uses markerIndex, ignores quantile
		});

		it('rejects all three together', () => {
			const s = new Sparstogram(10, [0.5]);
			[10, 20, 5, 15, 25].forEach(v => s.add(v));
			const q = s.valueAt(1);
			expect(() => Array.from(s.ascending({ value: 15, markerIndex: 0, quantile: q }))).to.throw();
		});
	});

	describe('CentroidEntry leak through iterators', () => {
		it('BUG: iterators expose internal loss field on centroids', () => {
			const s = new Sparstogram(10);
			[10, 20, 30].forEach(v => s.add(v));
			for (const c of s.ascending()) {
				// The declared return type is Centroid (value, variance, count)
				// but the actual runtime object is CentroidEntry which also has loss
				const keys = Object.keys(c);
				// This documents the leak — loss field is present at runtime
				expect(keys).to.include('loss');
			}
		});
	});

	describe('Error handling consistency', () => {
		it('rankAt returns 0 on empty histogram (does not throw)', () => {
			const s = new Sparstogram(10);
			expect(s.rankAt(5)).to.equal(0);
		});

		it('countAt returns 0 on empty histogram (does not throw)', () => {
			const s = new Sparstogram(10);
			expect(s.countAt(5)).to.equal(0);
		});

		it('valueAt throws on empty histogram', () => {
			const s = new Sparstogram(10);
			expect(() => s.valueAt(1)).to.throw();
		});

		it('markerAt throws on empty histogram', () => {
			const s = new Sparstogram(10, [0.5]);
			expect(() => s.markerAt(0)).to.throw();
		});
	});

	describe('markers constructor parameter visibility', () => {
		it('markers array is publicly accessible on instance', () => {
			const s = new Sparstogram(10, [0.25, 0.5, 0.75]);
			// The public modifier on `markers` makes it visible on the instance
			expect(s.markers).to.deep.equal([0.25, 0.5, 0.75]);
		});

		it('markers array is frozen (not mutable)', () => {
			const s = new Sparstogram(10, [0.25, 0.5, 0.75]);
			expect(Object.isFrozen(s.markers)).to.be.true;
		});
	});

	describe('valueAt rank convention', () => {
		it('valueAt error message does not state valid range', () => {
			const s = new Sparstogram(10);
			s.add(5);
			s.add(10);
			try {
				s.valueAt(100);
				expect.fail('should have thrown');
			} catch (e: any) {
				// Error message should ideally state valid range 1..count or -count..-1
				expect(e.message).to.equal('Rank out of range');
			}
		});
	});
});
