# Sparstogram Library

Sparse, adaptive, scalable histogram in TypeScript

This Typescript library provides a sophisticated data structure for efficiently characterizing large datasets through histograms.

## Summary

Sparstogram is a histogram that maintains a complete or sparse approximation of the data frequency.  The representation will be complete if the number of distinct values is less than or equal to the `maxCentroids`.  Otherwise, the values will be compressed to a smaller number of centroids in a way that minimizes the loss.  The histogram can also maintain a set of quantiles, which are maintained with each new value (e.g. median can be efficiently maintained).  The structure is adaptive in range and resolution, and can be used for streaming or large data digests.

The implementation uses B+Trees to efficiently maintain the centroids and losses, which is a self-balancing structure; so this should be able to scale efficiently.  As the number of unique data values grows beyond the configured `maxCentroids`, the loss returned from the `add` method will begin to be non-zero and represents how well the data in question compresses.  If and when this loss grows over some threshold, the user can choose to increase the `maxCentroids` value to maintain higher accuracy.  On the other hand, `maxCentroids` can by dynamically shrunk to reduce memory, at the expense of more approximation.

### Features:
* Lossy or lossless depending on configured `maxCentroids`
* Only allocates memory for actual distinct values
* Adaptive to actual values given - works on any numerical scale
* `maxCentroids` can be dynamically adjusted up or down
* Add method returns the loss value, allowing dynamic growth to reduce loss
* Can maintain quantile "markers", which maintain their relative rank without re-scanning
  * Allows efficient maintenance of median, 95th percentile, etc. without traversal
* Traversal based operations for finding rank by value, value by rank, or value by quantile are also provided
* Quantile information includes the centroid, variance, count, rank, and offset within bucket
* Can compute local maxima ("peaks") with average window smoothing
* Directional iteration of centroids from the ends, a marker, a value, or by loss

### Why programmers need histograms

Sadly I never used histograms for most of my early career as a developer; I missed out.  Histograms are a powerful statistical tool that offer a frequency representation of the distribution of a dataset, making them invaluable for programmers across various disciplines. They provide a quick way to perceive the underlying distribution, outliers, skewness, and central tendency of data. For example, in image processing, histograms are crucial for scaling pixel values. By examining the histogram of an image's pixel intensities, you can accurately adjust the contrast and brightness, enhancing the image quality by stretching or compressing the range of pixel values to utilize the full spectrum more effectively.

In performance optimization and system monitoring, histograms play a vital role in determining timing thresholds. By generating a histogram of response times or execution times of a system, you can identify common performance bottlenecks and outliers. This enables you to set appropriate thresholds for alerts or to optimize system performance by focusing on the most impactful areas. For instance, understanding the distribution of database query times can help in optimizing indexes or rewriting queries to reduce the tail latencies that affect user experience.

Histograms are also essential in signal processing and data analysis for deciphering noise from signal. You can differentiate between meaningful data patterns and random noise by establishing a cut-off quantile, or computing k-Means. In fields such as financial analysis, histograms can reveal the volatility of stock prices or the typical transaction sizes.

## Background

Sparstogram is inspired by the paper "Approximate Frequency Counts over Data Streams" by Gurmeet Singh Manku and Rajeev Motwani. Though similar in spirit, this implementation is quite different:
* Utilizes B+Trees for maintaining centroids and their associated losses, facilitating efficient scaling and automatic balancing.
* The variance within each centroid is also maintained to facilitate more accurate loss estimates
* Persisting the centroids ordered by their losses allows merging of centroids without scanning

## Installation

To install the Sparstogram library, use the following command:

```bash
npm install sparstogram
```

Or, if you prefer using `pnpm`:

```bash
pnpm add sparstogram
```

## Usage Examples

### Creating a Sparstogram

```ts
import { Sparstogram } from "sparstogram";

// Initialize a Sparstogram with a maximum of 100 centroids and a quantile marker for maintaining the median
const histogram = new Sparstogram(100, [0.5]);
```

### Adding Values to the Histogram

```ts
// Add a series of values to the histogram
histogram.add(5.0);
histogram.add(2.5);
const loss = histogram.add(3.7);

// Dynamically adjust maxCentroids based on the application's precision requirements
if (loss > 3.5) {
  histogram.maxCentroids = 150;
}
```

### Retrieving Data from the Histogram

```ts
// Retrieve the median value
const median = histogram.atQuantile(0.5).centroid.value;

// Or the same using the marker
const fastMedian = histogram.atMarker(0).centroid.value;

// Get the total count of values in the histogram
const totalCount = histogram.count;

// Find the rank of a specific value
const rank = histogram.atValue(3.7);

// Find the value at the given rank
const value = histogram.atRank(2);

// Iterate all centroids
for (const entry of histogram.ascending()) {
  console.log(entry);
}

// Iterate from the median backwards
for (const entry of histogram.descending({ markerIndex: 0 })) {
  console.log(entry);
}

// Iterate from a value forwards
for (const entry of histogram.ascending({ value: 2.5 })) {
  console.log(entry);
}
```

### Analyzing Histogram Peaks

```ts
// Find the local maxima with 5 item window smoothing for a simple analysis of the data distribution
const peaks = histogram.getPeaks(3);
```

## Contributing

Contributions to the Digitree Sparstogram library are welcome! Here's how you can contribute:

- **Reporting Bugs:** Open an issue describing the bug and how to reproduce it.
- **Suggesting Enhancements:** For new features or improvements, open an issue with a clear title and description.
- **Pull Requests:** For direct contributions, please make your changes in a separate branch and submit a pull request with a clear list of what you've done.

TODO:
* kMeans computation - maybe even an option to maintain?


### Environment

* If using VSCode use the editorconfig plugin to honor the conventions in `.editorconfig`
* Build: `pnpm build` or `npm run build`
* Test: `pnpm test` or `npm test`

## License

This project is licensed under the MIT License - see the LICENSE file for details.
