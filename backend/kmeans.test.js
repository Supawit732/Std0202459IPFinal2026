const test = require('node:test');
const assert = require('node:assert/strict');
const { kmeans1D } = require('./kmeans');

const sortedCentroids = (r) => [...r.centroids].sort((a, b) => a - b);

test('splits a wide salary spread into 3 tiers', () => {
  const salaries = [15000, 18000, 20000, 40000, 45000, 48000, 80000, 90000, 95000];
  const r = kmeans1D(salaries, 3);

  assert.equal(r.centroids.length, 3);
  assert.equal(r.assignments.length, salaries.length);
  assert.ok(r.iterations >= 1 && r.iterations <= 100);

  const c = sortedCentroids(r);
  assert.ok(Math.abs(c[0] - 17667) < 1);
  assert.ok(Math.abs(c[1] - 44333) < 1);
  assert.ok(Math.abs(c[2] - 88333) < 1);

  // salaries in the same band share a cluster, different bands do not
  const low = new Set(r.assignments.slice(0, 3));
  const mid = new Set(r.assignments.slice(3, 6));
  const high = new Set(r.assignments.slice(6, 9));
  assert.equal(low.size, 1);
  assert.equal(mid.size, 1);
  assert.equal(high.size, 1);
  assert.equal(new Set([...low, ...mid, ...high]).size, 3);
});

test('is deterministic regardless of input order', () => {
  const a = kmeans1D([95000, 15000, 45000, 80000, 18000, 48000], 3);
  const b = kmeans1D([15000, 18000, 45000, 48000, 80000, 95000], 3);
  assert.deepEqual(sortedCentroids(a), sortedCentroids(b));
});

test('0 salaries returns no clusters', () => {
  const r = kmeans1D([], 3);
  assert.deepEqual(r.centroids, []);
  assert.deepEqual(r.assignments, []);
  assert.equal(r.iterations, 0);
});

test('1 salary gives a single cluster at that value', () => {
  const r = kmeans1D([45000], 3);
  assert.deepEqual(r.centroids, [45000]);
  assert.deepEqual(r.assignments, [0]);
});

test('2 distinct salaries give 2 clusters', () => {
  const r = kmeans1D([20000, 80000], 3);
  assert.deepEqual(sortedCentroids(r), [20000, 80000]);
  assert.notEqual(r.assignments[0], r.assignments[1]);
});

test('2 distinct values repeated still use k = distinct count', () => {
  const r = kmeans1D([10, 10, 90, 90], 3);
  assert.deepEqual(sortedCentroids(r), [10, 90]);
});

test('all-same salaries collapse to one cluster without NaN', () => {
  const r = kmeans1D([5000, 5000, 5000, 5000], 3);
  assert.deepEqual(r.centroids, [5000]);
  assert.deepEqual(r.assignments, [0, 0, 0, 0]);
  assert.ok(r.centroids.every(Number.isFinite));
});

test('never produces NaN centroids for varied inputs', () => {
  for (const salaries of [[1, 1, 2], [1, 2, 3], [7], [3, 3, 3, 100], [1, 1, 1, 2, 2, 2, 3, 3, 3]]) {
    const r = kmeans1D(salaries, 3);
    assert.ok(r.centroids.length >= 1 && r.centroids.length <= 3);
    assert.ok(r.centroids.every(Number.isFinite), `NaN for ${salaries}`);
  }
});
