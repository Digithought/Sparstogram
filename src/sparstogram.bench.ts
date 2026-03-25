import { Bench } from "tinybench";
import { Sparstogram } from "./sparstogram.js";

interface BenchResult {
	name: string;
	hz: number;
	mean: number;
	p75: number;
	p99: number;
	samples: number;
	type?: "memory";
}

// ── 1. add() hot path at varying maxCentroids ──────────────────────────

const addBench = new Bench({ time: 2000, warmup: true });

for (const maxCentroids of [50, 500, 5000]) {
	addBench.add(`add() maxCentroids=${maxCentroids} x10K`, () => {
		const s = new Sparstogram(maxCentroids);
		for (let i = 0; i < 10_000; i++) s.add(Math.sin(i) * 1000);
	});
}

// ── 2. compressOneBucket() via compression-heavy add ────────────────────

const compressHeavyBench = new Bench({ time: 2000, warmup: true });

for (const maxCentroids of [3, 5, 10]) {
	compressHeavyBench.add(`compression-heavy add() maxCentroids=${maxCentroids} x5K`, () => {
		const s = new Sparstogram(maxCentroids);
		for (let i = 0; i < 5_000; i++) s.add(i);
	});
}

// ── 3. compressOneBucket() via bulk reduction ───────────────────────────

const bulkCompressBench = new Bench({ time: 2000, warmup: true });

bulkCompressBench.add("bulk compress 5000→50 centroids", () => {
	const s = new Sparstogram(5000);
	for (let i = 0; i < 5000; i++) s.add(i);
	s.maxCentroids = 50;
});

// ── 4. mergeFrom() with varying sizes ───────────────────────────────────

const mergeBench = new Bench({ time: 2000, warmup: true });

for (const n of [100, 1000, 5000]) {
	mergeBench.add(`mergeFrom() N=${n} into maxCentroids=100`, () => {
		const a = new Sparstogram(100);
		const b = new Sparstogram(100);
		for (let i = 0; i < n; i++) {
			a.add(i);
			b.add(i + n);
		}
		a.mergeFrom(b);
	});
}

// ── 5. peaks() with varying smoothing and centroid counts ───────────────

const peaksBench = new Bench({ time: 2000, warmup: true });

for (const centroidCount of [100, 500, 2000]) {
	for (const smoothing of [1, 3, 10]) {
		peaksBench.add(`peaks(${smoothing}) centroids=${centroidCount}`, () => {
			const s = new Sparstogram(centroidCount);
			for (let i = 0; i < centroidCount; i++) s.add(Math.sin(i / 10) * 100 + i);
			// Consume iterator
			const peaks = Array.from(s.peaks(smoothing));
			void peaks;
		});
	}
}

// ── 6. Memory per centroid ──────────────────────────────────────────────

function measureMemoryPerCentroid(centroidCount: number): number {
	// Force GC if available to get a cleaner baseline
	if (global.gc) global.gc();
	const before = process.memoryUsage().heapUsed;

	const s = new Sparstogram(centroidCount);
	for (let i = 0; i < centroidCount; i++) s.add(i);

	// Prevent the histogram from being GC'd during measurement
	if (global.gc) global.gc();
	const after = process.memoryUsage().heapUsed;

	// Keep s alive past the measurement
	void s.centroidCount;

	const totalBytes = Math.max(0, after - before);
	return totalBytes / centroidCount;
}

// ── Run all benchmarks ──────────────────────────────────────────────────

function collectResults(bench: Bench): BenchResult[] {
	const results: BenchResult[] = [];
	for (const task of bench.tasks) {
		const r = task.result;
		if (!r || r.state !== "completed") continue;
		results.push({
			name: task.name,
			hz: r.throughput.mean,
			mean: r.latency.mean,
			p75: r.latency.p75,
			p99: r.latency.p99,
			samples: r.latency.samplesCount,
		});
	}
	return results;
}

async function main() {
	const allResults: BenchResult[] = [];

	const benches: [string, Bench][] = [
		["add() hot path", addBench],
		["compression-heavy add()", compressHeavyBench],
		["bulk compress", bulkCompressBench],
		["mergeFrom()", mergeBench],
		["peaks()", peaksBench],
	];

	for (const [label, bench] of benches) {
		process.stderr.write(`\nRunning: ${label}...\n`);
		await bench.run();
		// Print human-readable table to stderr
		const table = bench.table();
		process.stderr.write(formatTable(table) + "\n");
		allResults.push(...collectResults(bench));
	}

	// Memory benchmarks (outside tinybench timing)
	process.stderr.write("\nRunning: memory per centroid...\n");
	const memoryHeader = ["Centroid Count", "Bytes/Centroid"];
	const memoryRows: string[][] = [];
	for (const centroidCount of [100, 1000, 5000, 10_000]) {
		const bytesPerCentroid = measureMemoryPerCentroid(centroidCount);
		memoryRows.push([String(centroidCount), bytesPerCentroid.toFixed(1)]);
		allResults.push({
			name: `memory centroidCount=${centroidCount}`,
			hz: 0,
			mean: bytesPerCentroid,
			p75: 0,
			p99: 0,
			samples: 1,
			type: "memory",
		});
	}
	process.stderr.write(formatSimpleTable(memoryHeader, memoryRows) + "\n");

	// JSON output to stdout
	process.stdout.write(JSON.stringify(allResults, null, 2) + "\n");
}

// ── Table formatting helpers ────────────────────────────────────────────

function formatTable(table: (Record<string, number | string | undefined> | null)[]): string {
	if (table.length === 0) return "(no results)";
	const rows = table.filter((r): r is Record<string, number | string | undefined> => r !== null);
	if (rows.length === 0) return "(no results)";

	const keys = Object.keys(rows[0]);
	const widths = keys.map(k =>
		Math.max(k.length, ...rows.map(r => String(r[k] ?? "").length))
	);

	const header = keys.map((k, i) => k.padEnd(widths[i])).join(" | ");
	const sep = widths.map(w => "-".repeat(w)).join("-+-");
	const body = rows.map(r =>
		keys.map((k, i) => String(r[k] ?? "").padEnd(widths[i])).join(" | ")
	).join("\n");

	return `${header}\n${sep}\n${body}`;
}

function formatSimpleTable(headers: string[], rows: string[][]): string {
	const widths = headers.map((h, i) =>
		Math.max(h.length, ...rows.map(r => (r[i] ?? "").length))
	);
	const header = headers.map((h, i) => h.padEnd(widths[i])).join(" | ");
	const sep = widths.map(w => "-".repeat(w)).join("-+-");
	const body = rows.map(r =>
		r.map((c, i) => c.padEnd(widths[i])).join(" | ")
	).join("\n");
	return `${header}\n${sep}\n${body}`;
}

main().catch(err => {
	process.stderr.write(`Benchmark failed: ${err}\n`);
	process.exit(1);
});
