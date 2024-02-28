import { Sparstogram } from '.'; // Adjust the import path as necessary

describe('Sparstogram', () => {
  let sparstogram: Sparstogram;

  beforeEach(() => {
    sparstogram = new Sparstogram(10, undefined); // Assuming maxCentroids is 10 for most tests
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
      for (let i = 0; i < 20; i++) {
        sparstogram.add(i);
      }
      expect(sparstogram.centroidCount).toBeLessThanOrEqual(10);
    });

    test('should accurately compute loss after compression', () => {
      sparstogram = new Sparstogram(5, undefined); // Lower maxCentroids for this test
      for (let i = 0; i < 100; i++) {
        sparstogram.add(i);
      }
      // Loss calculation is based on specific implementation details, so adjust expectation accordingly
      expect(sparstogram.add(101)).toBeGreaterThan(0);
    });
  });

  // Additional tests for atValue, atRank, atQuantile, atMarker, peaks, ascending, descending methods
  // These tests should verify the correctness of each method's functionality,
  // including handling of edge cases like empty histograms, single-item histograms, and large numbers of items.
});

describe('Sparstogram - atValue method', () => {
  let sparstogram: Sparstogram;

  beforeEach(() => {
    // Initialize Sparstogram with a reasonable number of centroids for testing
    sparstogram = new Sparstogram(10, undefined);
  });

  test('should return 0 for any value when histogram is empty', () => {
    expect(sparstogram.atValue(5)).toBe(0);
  });

  test('should return the correct rank for a single value in the histogram', () => {
    sparstogram.add(10); // Add a single value
    expect(sparstogram.atValue(5)).toBe(0); // Less than the added value
    expect(sparstogram.atValue(10)).toBe(1); // Equal to the added value
    expect(sparstogram.atValue(15)).toBe(1); // Greater than the added value
  });

  test('should return correct ranks for multiple values in a dense distribution', () => {
    for (let i = 1; i <= 10; i++) {
      sparstogram.add(i); // Add values 1 through 10
    }
    expect(sparstogram.atValue(0)).toBe(0); // No values are less than 0
    expect(sparstogram.atValue(5)).toBe(5); // Five values are less than or equal to 5
    expect(sparstogram.atValue(10)).toBe(10); // All values are less than or equal to 10
    expect(sparstogram.atValue(11)).toBe(10); // All values are less than 11
  });

  test('should handle sparse distributions correctly', () => {
    sparstogram.add(1);
    sparstogram.add(100);
    sparstogram.add(1000); // A sparse distribution of values
    expect(sparstogram.atValue(50)).toBe(1); // Only one value is less than or equal to 50
    expect(sparstogram.atValue(100)).toBe(2); // Two values are less than or equal to 100
    expect(sparstogram.atValue(500)).toBe(2); // Still only two values less than or equal to 500
    expect(sparstogram.atValue(1000)).toBe(3); // All values are less than or equal to 1000
  });

  test('should accurately reflect ranks after adding duplicate values', () => {
    sparstogram.add(5);
    sparstogram.add(5); // Add duplicate value
    sparstogram.add(10);
    expect(sparstogram.atValue(5)).toBe(2); // Two values are exactly 5
    expect(sparstogram.atValue(6)).toBe(2); // Still two values less than or equal to 6
    expect(sparstogram.atValue(10)).toBe(3); // All values are less than or equal to 10
  });
});

describe('Sparstogram atRank method', () => {
  let sparstogram: Sparstogram;

  beforeEach(() => {
    // Initialize Sparstogram with a reasonable number of centroids for testing
    sparstogram = new Sparstogram(10, undefined);
  });

  test('should return undefined for empty histogram', () => {
    const result = sparstogram.atRank(0);
    expect(result).toBeUndefined();
  });

  test('should return correct quantile for histogram with single item', () => {
    sparstogram.add(5); // Assuming add method correctly updates internal structures
    const result = sparstogram.atRank(1);
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
    const middleRankResult = sparstogram.atRank(5);
    expect(middleRankResult.centroid.value).toBeLessThanOrEqual(5);
    expect(middleRankResult.rank).toBe(5);

    // Test the highest rank
    const highestRankResult = sparstogram.atRank(10);
    expect(highestRankResult.centroid.value).toBe(10);
    expect(highestRankResult.rank).toBe(10);
  });

  test('should handle sparse histogram correctly', () => {
    // Add items with sparse values
    [1, 100, 200].forEach(value => sparstogram.add(value));
    // Test rank that should fall within the first value
    const lowRankResult = sparstogram.atRank(1);
    expect(lowRankResult.centroid.value).toBe(1);
    expect(lowRankResult.rank).toBe(1);

    // Test rank that should fall within the last value
    const highRankResult = sparstogram.atRank(3);
    expect(highRankResult.centroid.value).toBe(200);
    expect(highRankResult.rank).toBe(3);
  });

  test('should accurately reflect rank in a mixed-density histogram', () => {
    // Mix of dense and sparse values
    [1, 2, 2, 100].forEach(value => sparstogram.add(value));
    const result = sparstogram.atRank(4);
    expect(result.centroid.value).toBe(100);
    expect(result.rank).toBe(4);

    // Ensuring it handles lower ranks correctly
    const lowerRankResult = sparstogram.atRank(2);
    // Given the setup, rank 2 could still be at the first or second value due to duplicate values
    expect([1, 2]).toContain(lowerRankResult.centroid.value);
    expect(lowerRankResult.rank).toBe(2);
  });

	// Test atQuantile which uses atRank internally
	test('should return correct value for quantile in a dense histogram', () => {
		for (let i = 1; i <= 10; i++) {
			sparstogram.add(i);
		}
		const quantileResult = sparstogram.atQuantile(0.5);
		expect(quantileResult.centroid.value).toBe(5);
		expect(quantileResult.rank).toBe(5);
	});

  // More tests could be added to handle edge cases, such as ranks outside the range of the histogram,
  // very large histograms, and histograms with a lot of duplicate values.
});

describe('atMarker method', () => {
  test('should return undefined for empty histogram', () => {
    const sparstogram = new Sparstogram(10, [0.5]); // Median marker
    const marker = sparstogram.atMarker(0);
    expect(marker).toBeUndefined();
  });

  test('should return correct quantile for histogram with single value', () => {
    const sparstogram = new Sparstogram(10, [0, 0.5, 1]); // Min, median, max markers
    sparstogram.add(10); // Single value
    const minMarker = sparstogram.atMarker(0);
    const medianMarker = sparstogram.atMarker(1);
    const maxMarker = sparstogram.atMarker(2);

    expect(minMarker).toBeDefined();
    expect(minMarker?.centroid.value).toBe(10);
    expect(medianMarker).toBeDefined();
    expect(medianMarker?.centroid.value).toBe(10);
    expect(maxMarker).toBeDefined();
    expect(maxMarker?.centroid.value).toBe(10);
  });

  test('should return correct quantile for a dense histogram', () => {
    const markers = [0.25, 0.5, 0.75]; // Lower quartile, median, upper quartile
    const sparstogram = new Sparstogram(10, markers);
    for (let i = 1; i <= 100; i++) {
      sparstogram.add(i);
    }

    const lowerQuartile = sparstogram.atMarker(0);
    const median = sparstogram.atMarker(1);
    const upperQuartile = sparstogram.atMarker(2);

    expect(lowerQuartile).toBeDefined();
    expect(lowerQuartile?.centroid.value).toBeLessThanOrEqual(25);
    expect(median).toBeDefined();
    expect(median?.centroid.value).toBeCloseTo(50, -1);
    expect(upperQuartile).toBeDefined();
    expect(upperQuartile?.centroid.value).toBeGreaterThanOrEqual(75);
  });

  test('should handle sparse histogram accurately', () => {
    const markers = [0.1, 0.9]; // 10th percentile, 90th percentile
    const sparstogram = new Sparstogram(10, markers);
    // Adding sparse values
    sparstogram.add(1);
    sparstogram.add(1000);

    const tenthPercentile = sparstogram.atMarker(0);
    const ninetiethPercentile = sparstogram.atMarker(1);

    expect(tenthPercentile).toBeDefined();
    expect(tenthPercentile?.centroid.value).toBeCloseTo(1, -1);
    expect(ninetiethPercentile).toBeDefined();
    expect(ninetiethPercentile?.centroid.value).toBeCloseTo(1000, -1);
  });

  test('should return undefined for non-existent markers', () => {
    const sparstogram = new Sparstogram(10, [0.5]); // Only median marker
    for (let i = 1; i <= 10; i++) {
      sparstogram.add(i);
    }
    const nonExistentMarker = sparstogram.atMarker(1); // Attempting to access a marker that doesn't exist
    expect(nonExistentMarker).toBeUndefined();
  });
});
