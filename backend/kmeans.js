// 1D K-Means implemented from scratch (no libraries).

/**
 * @param {number[]} values  numeric values to cluster
 * @param {number} k         requested number of clusters
 * @returns {{centroids:number[], assignments:number[], iterations:number}}
 */
function kmeans1D(values, k = 3, maxIterations = 100) {
  const n = values.length;
  if (n === 0) return { centroids: [], assignments: [], iterations: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const distinct = new Set(sorted).size;
  k = Math.max(1, Math.min(k, distinct, n));

  // Deterministic init: evenly spaced quantiles of the sorted data
  // (k=3 -> min, median, max). Duplicate values are nudged to unused distinct values.
  let centroids = [];
  for (let i = 0; i < k; i++) {
    const idx = k === 1 ? 0 : Math.round((i * (n - 1)) / (k - 1));
    centroids.push(sorted[idx]);
  }
  if (new Set(centroids).size < k) {
    // Fallback (heavily duplicated data): pick k evenly spaced distinct values
    const uniq = [...new Set(sorted)];
    centroids = [];
    for (let i = 0; i < k; i++) {
      const idx = k === 1 ? 0 : Math.round((i * (uniq.length - 1)) / (k - 1));
      centroids.push(uniq[idx]);
    }
  }

  let assignments = new Array(n).fill(-1);
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    let changed = false;

    // Assign step
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestDist = Math.abs(values[i] - centroids[0]);
      for (let c = 1; c < k; c++) {
        const d = Math.abs(values[i] - centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }

    // Update step (empty cluster keeps its previous centroid)
    const sums = new Array(k).fill(0);
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      sums[assignments[i]] += values[i];
      counts[assignments[i]] += 1;
    }
    centroids = centroids.map((old, c) => (counts[c] > 0 ? sums[c] / counts[c] : old));

    if (!changed) break;
  }

  return { centroids, assignments, iterations };
}

module.exports = { kmeans1D };
