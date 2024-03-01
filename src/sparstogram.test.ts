import { Centroid, Sparstogram } from '.'; // Adjust the import path as necessary

describe('Sparstogram', () => {
  let sparstogram: Sparstogram;

  beforeEach(() => {
    sparstogram = new Sparstogram(10); // Assuming maxCentroids is 10 for most tests
  });

  describe('add method', () => {
    test('should add a single value without compression', () => {
      const loss = sparstogram.add(5);
      expect(loss).toBe(0);
      expect(sparstogram.count).toBe(1);
      expect(sparstogram.centroidCount).toBe(1);
    });

    test('should handle adding multiple distinct values without needing compression', () => {
      for (let i = 0; i < 10; i++) {
        sparstogram.add(i);
      }
      expect(sparstogram.count).toBe(10);
      expect(sparstogram.centroidCount).toBe(10);
    });

    test('should compress centroids when exceeding maxCentroids', () => {
      for (let i = 0; i < 10; i++) {
        expect(sparstogram.add(i)).toBe(0);	// Assuming no loss for up to maxCentroids
      }
      for (let i = 10; i < 20; i++) {
        expect(sparstogram.add(i)).toBeGreaterThan(0); // Loss expected after compression
      }
      expect(sparstogram.centroidCount).toBe(10);
    });

    test('should accurately compute loss after compression', () => {
      sparstogram = new Sparstogram(5); // Lower maxCentroids for this test
      for (let i = 0; i < 100; i++) {
        sparstogram.add(i);
      }
      expect(sparstogram.add(101)).toBeGreaterThan(0);
    });
  });

});

describe('Sparstogram - atValue method', () => {
  let sparstogram: Sparstogram;

  beforeEach(() => {
    // Initialize Sparstogram with a reasonable number of centroids for testing
    sparstogram = new Sparstogram(10);
  });

  test('should return 0 for any value when histogram is empty', () => {
    expect(sparstogram.rankAt(5)).toBe(0);
  });

  test('should return the correct rank for a single value in the histogram', () => {
    sparstogram.add(10); // Add a single value
    expect(sparstogram.rankAt(5)).toBe(0); // Less than the added value
    expect(sparstogram.rankAt(10)).toBe(1); // Equal to the added value
    expect(sparstogram.rankAt(15)).toBe(1); // Greater than the added value
  });

  test('should return correct ranks for multiple values in a dense distribution', () => {
    for (let i = 1; i <= 10; i++) {
      sparstogram.add(i); // Add values 1 through 10
    }
    expect(sparstogram.rankAt(0)).toBe(0); // No values are less than 1
    expect(sparstogram.rankAt(5)).toBe(5); // Five values are less than or equal to 5
    expect(sparstogram.rankAt(10)).toBe(10); // All values are less than or equal to 10
    expect(sparstogram.rankAt(11)).toBe(10); // All values are less than 11
  });

  test('should handle sparse, non-uniform distributions correctly', () => {
    sparstogram.add(1);
    sparstogram.add(100);
    sparstogram.add(1000); // A sparse distribution of values
    expect(sparstogram.rankAt(50)).toBe(1); // Only one value is less than or equal to 50
    expect(sparstogram.rankAt(100)).toBe(2); // Two values are less than or equal to 100
    expect(sparstogram.rankAt(500)).toBe(2); // Still only two values less than or equal to 500
    expect(sparstogram.rankAt(1000)).toBe(3); // All values are less than or equal to 1000
  });

  test('should accurately reflect ranks after adding duplicate values', () => {
    sparstogram.add(5);
    sparstogram.add(5); // Add duplicate value
    sparstogram.add(10);
		// No merging, so expect discrete ranks for each value
    expect(sparstogram.rankAt(4)).toBe(0);
    expect(sparstogram.rankAt(5)).toBe(2);
    expect(sparstogram.rankAt(6)).toBe(2);
    expect(sparstogram.rankAt(9)).toBe(2);
    expect(sparstogram.rankAt(10)).toBe(3);
    expect(sparstogram.rankAt(11)).toBe(3);
    expect(sparstogram.rankAt(1000)).toBe(3);
  });
});

describe('Sparstogram valueAt method', () => {
  let sparstogram: Sparstogram;

  beforeEach(() => {
    // Initialize Sparstogram with a reasonable number of centroids for testing
    sparstogram = new Sparstogram(10, undefined);
  });

  test('should throw on empty histogram', () => {
    expect(() => sparstogram.valueAt(0)).toThrow();
  });

  test('should return correct quantile for histogram with single item', () => {
    sparstogram.add(5); // Assuming add method correctly updates internal structures
    const result = sparstogram.valueAt(1);
    expect(result.centroid.value).toBe(5);
    expect(result.centroid.count).toBe(1);
    expect(result.rank).toBe(1);
  });

  test('should handle dense histogram correctly', () => {
    // Add multiple items with dense values
    for (let i = 1; i <= 10; i++) {
      sparstogram.add(i);
    }
    // Test a middle rank
    const middleRankResult = sparstogram.valueAt(5);
    expect(middleRankResult.centroid.value).toBeLessThanOrEqual(5);
    expect(middleRankResult.rank).toBe(5);

    // Test the highest rank
    const highestRankResult = sparstogram.valueAt(10);
    expect(highestRankResult.centroid.value).toBe(10);
    expect(highestRankResult.rank).toBe(10);
  });

  test('should handle sparse histogram correctly', () => {
    // Add items with sparse values
    [1, 100, 200].forEach(value => sparstogram.add(value));
    // Test rank that should fall within the first value
    const lowRankResult = sparstogram.valueAt(1);
    expect(lowRankResult.centroid.value).toBe(1);
    expect(lowRankResult.rank).toBe(1);
		expect(lowRankResult.offset).toBe(0);
		expect(lowRankResult.value).toBe(1);

    // Test rank that should fall within the last value
    const highRankResult = sparstogram.valueAt(3);
    expect(highRankResult.centroid.value).toBe(200);
    expect(highRankResult.rank).toBe(3);
		expect(highRankResult.offset).toBe(0);
		expect(highRankResult.value).toBe(200);
  });

  test('should accurately reflect rank in a mixed-density histogram', () => {
    // Mix of dense and sparse values
    [1, 2, 2, 100].forEach(value => sparstogram.add(value));
    const result = sparstogram.valueAt(4);
    expect(result.centroid.value).toBe(100);
    expect(result.rank).toBe(4);

    // Ensuring it handles lower ranks correctly
    const lowerRankResult = sparstogram.valueAt(2);
    // Given the setup, rank 2 could still be at the first or second value due to duplicate values
    expect([1, 2]).toContain(lowerRankResult.centroid.value);
    expect(lowerRankResult.rank).toBe(2);
  });

	// Test atQuantile which uses atRank internally
	test('should return correct value for quantile in a dense histogram', () => {
		for (let i = 1; i <= 10; i++) {
			sparstogram.add(i);
		}
		const quantileResult = sparstogram.quantileAt(0.5);
		expect(quantileResult.centroid.value).toBe(5);
		expect(quantileResult.rank).toBe(5);
	});

  // More tests could be added to handle edge cases, such as ranks outside the range of the histogram,
  // very large histograms, and histograms with a lot of duplicate values.
});

describe('atMarker method', () => {
  test('should return undefined for empty histogram', () => {
    const sparstogram = new Sparstogram(10, [0.5]); // Median marker
    expect(() => sparstogram.markerAt(0)).toThrow();
  });

  test('should return correct quantile for histogram with single value', () => {
    const sparstogram = new Sparstogram(10, [0, 0.5, 1]); // Min, median, max markers
    sparstogram.add(10); // Single value
    const minMarker = sparstogram.markerAt(0);
    const medianMarker = sparstogram.markerAt(1);
    const maxMarker = sparstogram.markerAt(2);

    expect(minMarker).toBeDefined();
    expect(minMarker?.centroid.value).toBe(10);
    expect(medianMarker).toBeDefined();
    expect(medianMarker?.centroid.value).toBe(10);
    expect(maxMarker).toBeDefined();
    expect(maxMarker?.centroid.value).toBe(10);
  });

  test('should return correct quantile for a dense histogram', () => {
    const markers = [0.25, 0.5, 0.75];
    const sparstogram = new Sparstogram(100, markers);
    for (let i = 0; i <= 99; i++) { // Add 100 values
      sparstogram.add(i);
    }

    const lowerQuartile = sparstogram.markerAt(0);
    expect(lowerQuartile).toBeDefined();
    expect(lowerQuartile?.centroid.value).toBe(25);
		expect(lowerQuartile?.rank).toBe(26);	// One based

		const median = sparstogram.markerAt(1);
    expect(median).toBeDefined();
    expect(median?.centroid.value).toBeCloseTo(50, -1);
		expect(median?.rank).toBe(51);

		const upperQuartile = sparstogram.markerAt(2);
    expect(upperQuartile).toBeDefined();
    expect(upperQuartile?.centroid.value).toBe(74);
		expect(upperQuartile?.rank).toBe(75);
  });

  test('should return correct quantile for a compressed histogram', () => {
    const markers = [0.25, 0.5, 0.75]; // Lower quartile, median, upper quartile
    const sparstogram = new Sparstogram(10, markers);
		sparstogram.add(50);
    for (let i = 1; i < 49; i++) { // Add 100 values with alternating increments
      sparstogram.add(50 + i);
      sparstogram.add(50 - i);
    }

    const lowerQuartile = sparstogram.markerAt(0);
    expect(lowerQuartile).toBeDefined();
    expect(lowerQuartile?.centroid.value).toBeCloseTo(25, -1);
		expect(lowerQuartile?.rank).toBe(25);

		const median = sparstogram.markerAt(1);
    expect(median).toBeDefined();
    expect(median?.centroid.value).toBeCloseTo(50, -1);
		expect(median?.rank).toBe(49);

		const upperQuartile = sparstogram.markerAt(2);
    expect(upperQuartile).toBeDefined();
    expect(upperQuartile?.centroid.value).toBeCloseTo(75, -1);
		expect(upperQuartile?.rank).toBeCloseTo(75, -1);
  });

  test('should handle sparse histogram accurately', () => {
    const markers = [0.1, 0.9]; // 10th percentile, 90th percentile
    const sparstogram = new Sparstogram(10, markers);
    // Adding sparse values
    sparstogram.add(1);
    sparstogram.add(1000);

    const tenthPercentile = sparstogram.markerAt(0);
    expect(tenthPercentile).toBeDefined();
    expect(tenthPercentile?.centroid.value).toBeCloseTo(1, -1);

    const ninetiethPercentile = sparstogram.markerAt(1);
    expect(ninetiethPercentile).toBeDefined();
    expect(ninetiethPercentile?.centroid.value).toBeCloseTo(1000, -1);
  });

  test('should interpolate in sparse histogram', () => {
    const markers = [0.1, 0.9]; // 10th percentile, 90th percentile
    const sparstogram = new Sparstogram(2, markers);
    // Adding sparse values
    sparstogram.add(0);
    sparstogram.add(1000);
    sparstogram.add(250);
    sparstogram.add(750);

    const tenthPercentile = sparstogram.markerAt(0);
    expect(tenthPercentile).toBeDefined();
    expect(tenthPercentile?.value).toBeCloseTo(-51, -1);
    expect(tenthPercentile?.centroid.value).toBeCloseTo(125, -1);

    const ninetiethPercentile = sparstogram.markerAt(1);
    expect(ninetiethPercentile).toBeDefined();
    expect(ninetiethPercentile?.value).toBeCloseTo(1051, -1);
    expect(ninetiethPercentile?.centroid.value).toBeCloseTo(875, -1);
  });
});

describe('countAt method', () => {
  let sparstogram: Sparstogram;

  beforeEach(() => {
    sparstogram = new Sparstogram(10, undefined); // Adjust maxCentroids as needed for testing
  });

  test('should return 0 for empty histogram', () => {
    expect(sparstogram.countAt(5)).toBe(0);
  });

  test('should return exact count for a single value when there is only one centroid', () => {
    sparstogram.add(5);
    expect(sparstogram.countAt(5)).toBe(1);
  });

  test('should interpolate count in a compressed histogram', () => {
		sparstogram.maxCentroids = 2; // Lower maxCentroids for this test
		[1, 2, 4, 5, 4.5, 4.5].forEach(i => sparstogram.add(i));
    // Assuming linear interpolation, check for a value halfway between
    expect(sparstogram.countAt(0)).toBe(0);
    expect(sparstogram.countAt(1)).toBe(1);
    expect(sparstogram.countAt(1.5)).toBe(1);
    expect(sparstogram.countAt(2)).toBe(1);
    expect(sparstogram.countAt(2.5)).toBe(0);
    expect(sparstogram.countAt(3)).toBe(0);
    expect(sparstogram.countAt(3.9)).toBe(1);
    expect(sparstogram.countAt(4.5)).toBe(2);
    expect(sparstogram.countAt(5.1)).toBe(1);
    expect(sparstogram.countAt(5.5)).toBe(0);
  });

  test('should return correct count for dense histogram with multiple centroids', () => {
    for (let i = 0; i < 10; i++) {
      sparstogram.add(i); // Creating a dense histogram with values 0 through 9
    }
    // Assuming uniform distribution and linear interpolation
    expect(sparstogram.countAt(5)).toBe(1); // Exact match
    expect(sparstogram.countAt(4.5)).toBe(0); // No variance so 0 between values
  });

  test('should handle values outside the range of centroids', () => {
    sparstogram.add(10);
    sparstogram.add(20);
    // Check for values outside the range
    expect(sparstogram.countAt(5)).toBe(0); // Below the lowest centroid
    expect(sparstogram.countAt(25)).toBe(0); // Above the highest centroid
  });

  test('should handle very large numbers', () => {
		sparstogram.maxCentroids = 1;
    sparstogram.add(1000000);
    sparstogram.add(2000000);
    // Test interpolation with large numbers
    expect(sparstogram.countAt(1500000)).toBeCloseTo(1);
  });

  // Additional tests can include more nuanced scenarios, such as very close centroids,
  // centroids with very large counts, and checking for correct behavior when centroids are merged or split.
});

describe('Sparstogram append method', () => {
  let sparstogram: Sparstogram;

  beforeEach(() => {
    sparstogram = new Sparstogram(5, undefined); // Setting maxCentroids to 5 for these tests
  });

  test('should append a single centroid without loss', () => {
    const initialCentroid: Centroid = { value: 10, variance: 1, count: 1 };
    const loss = sparstogram.append(initialCentroid);
    expect(loss).toBe(0);
    expect(sparstogram.count).toBe(1);
    expect(sparstogram.centroidCount).toBe(1);
  });

  test('should correctly handle multiple centroids without exceeding maxCentroids', () => {
    const centroids: Centroid[] = [
      { value: 10, variance: 1, count: 1 },
      { value: 20, variance: 1, count: 1 },
      { value: 30, variance: 1, count: 1 },
      { value: 40, variance: 1, count: 1 },
    ];
    centroids.forEach(centroid => {
      const loss = sparstogram.append(centroid);
      expect(loss).toBe(0);
    });
    expect(sparstogram.count).toBe(centroids.length);
    expect(sparstogram.centroidCount).toBe(centroids.length);
  });

  test('should incur loss when exceeding maxCentroids', () => {
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
    expect(loss).toBeGreaterThan(0);
    expect(sparstogram.centroidCount).toBeLessThanOrEqual(5);
  });

  test('should adjust total count correctly when appending centroids with various counts', () => {
    sparstogram.append({ value: 100, variance: 0, count: 10 });
    sparstogram.append({ value: 200, variance: 0, count: 20 });
    expect(sparstogram.count).toBe(30);
    expect(sparstogram.centroidCount).toBe(2);
  });

});


describe('Sparstogram.mergeFrom', () => {
  let primary: Sparstogram;
  let secondary: Sparstogram;

  beforeEach(() => {
    primary = new Sparstogram(10, undefined); // Primary histogram with maxCentroids set to 10
    secondary = new Sparstogram(10, undefined); // Secondary histogram also with maxCentroids set to 10
  });

  test('should merge an empty histogram without changes', () => {
    primary.add(5); // Add a single value to ensure the primary is not empty
    primary.mergeFrom(secondary); // Merge an empty secondary into primary
    expect(primary.count).toBe(1);
    expect(primary.centroidCount).toBe(1);
  });

  test('should correctly merge a non-empty histogram', () => {
    primary.add(5);
    secondary.add(10);
    secondary.add(10); // Add the same value to ensure count increases
    primary.mergeFrom(secondary);
    expect(primary.count).toBe(3);
    expect(primary.centroidCount).toBe(2);
  });

  test('should handle merging with large numbers', () => {
    for (let i = 0; i < 100; i++) {
      primary.add(i);
    }
    for (let i = 0; i < 50; i++) {
      secondary.add(i * 2); // Add multiples of 2 to ensure some overlap and some unique
    }
    primary.mergeFrom(secondary);
    // Exact outcomes depend on the implementation, especially how compression is handled
    expect(primary.count).toBe(150);
    expect(primary.centroidCount).toBeLessThanOrEqual(10);
  });

  test('should compress only after all centroids are added', () => {
    primary = new Sparstogram(5, undefined); // Reduce maxCentroids for this test
    for (let i = 0; i < 5; i++) {
      primary.add(i); // Add up to maxCentroids
    }
    for (let i = 5; i < 10; i++) {
      secondary.add(i); // Should cause compression when merged
    }
    primary.mergeFrom(secondary);
    expect(primary.count).toBe(10);
    // Expect compression, but since it's based on internal logic, we can't predict exact centroidCount
    expect(primary.centroidCount).toBeLessThanOrEqual(5);
  });

  test('should merge histograms with overlapping values correctly', () => {
    primary.add(1);
    primary.add(2);
    secondary.add(2);
    secondary.add(3);
    primary.mergeFrom(secondary);
    // Expect both values to be merged, with counts correctly aggregated
    expect(primary.count).toBe(4);
    // Depending on how the algorithm handles exact matches, centroid count may vary
    expect(primary.centroidCount).toBeLessThanOrEqual(3);
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

  test('should return no peaks for a histogram with too few centroids to smooth', () => {
    addSeq([1, 1, 1]); // Adding a few identical values
    const peaks = Array.from(sparstogram.peaks());
    expect(peaks.length).toBe(0); // Expect no peaks due to insufficient data for smoothing
  });

  test('should correctly identify a single peak in a simple dataset', () => {
    addSeq([1, 2, 3, 4, 5, 4, 3, 2, 1]); // A clear peak at 5
    const peaks = Array.from(sparstogram.peaks(1));
    expect(peaks.length).toBe(1);
    expect(peaks[0].max).toBe(5);
    expect(peaks[0].min).toBe(1);	// latency from smoothing
    expect(peaks[0].start).toBe(0);
    expect(peaks[0].end).toBe(7);	// can't get last item for smoothing
  });

  test('should correctly identify multiple peaks in a complex dataset', () => {
    addSeq([1, 2, 1, 4, 5, 4, 3, 3, 5, 7, 4, 3, 2, 3, 2, 1]); // Peaks at index 5 and 9
    const peaks = Array.from(sparstogram.peaks());
    expect(peaks.length).toBe(2);
    expect(peaks[0].start).toBe(2);
    expect(peaks[0].end).toBe(5);
    expect(peaks[0].max).toBe(5);
    expect(peaks[0].min).toBe(1);
    expect(peaks[0].sum).toBe(14);
    expect(peaks[1].start).toBe(6);
    expect(peaks[1].end).toBe(12);
    expect(peaks[1].max).toBe(7);
    expect(peaks[1].min).toBe(2);
    expect(peaks[1].sum).toBe(27);
  });

  test('should handle edge case when smoothing parameter is larger than the dataset', () => {
    sparstogram = new Sparstogram(100, undefined); // Resetting with a large maxCentroids
    addSeq([1, 2, 3, 2, 1]); // Simple dataset with a peak
    const peaks = Array.from(sparstogram.peaks(10)); // Smoothing parameter larger than dataset
    expect(peaks.length).toBe(0); // Expect no peaks due to excessive smoothing
  });

  // Additional tests should be added to cover more scenarios, such as:
  // - Testing with different smoothing parameters
  // - Testing with datasets that have flat peaks (plateaus)
  // - Testing with very large datasets to ensure performance and correctness
});
