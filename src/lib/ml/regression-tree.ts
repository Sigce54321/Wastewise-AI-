// A minimal CART regression tree implemented from scratch (no native
// bindings), used as the building block for both the Random Forest and the
// Gradient Boosting ("XGBoost-style") regressors below.

export interface TreeNode {
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  value?: number;
}

function sse(values: number[]): number {
  if (values.length === 0) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - m) ** 2, 0);
}

export function buildRegressionTree(
  X: number[][],
  y: number[],
  maxDepth: number,
  minSamplesLeaf: number,
  featureSubsetSize?: number,
): TreeNode {
  function build(indices: number[], depth: number): TreeNode {
    const targetVals = indices.map((i) => y[i]);
    const leafValue = targetVals.reduce((a, b) => a + b, 0) / (targetVals.length || 1);

    if (depth >= maxDepth || indices.length < minSamplesLeaf * 2) {
      return { value: leafValue };
    }

    const numFeatures = X[0]?.length ?? 0;
    let candidateFeatures = Array.from({ length: numFeatures }, (_, i) => i);
    if (featureSubsetSize && featureSubsetSize < numFeatures) {
      candidateFeatures = candidateFeatures
        .sort(() => Math.random() - 0.5)
        .slice(0, featureSubsetSize);
    }

    let bestGain = 0;
    let bestFeature = -1;
    let bestThreshold = 0;
    const parentSse = sse(targetVals);

    for (const f of candidateFeatures) {
      const values = Array.from(new Set(indices.map((i) => X[i][f]))).sort((a, b) => a - b);
      for (let t = 0; t < values.length - 1; t++) {
        const threshold = (values[t] + values[t + 1]) / 2;
        const leftIdx = indices.filter((i) => X[i][f] <= threshold);
        const rightIdx = indices.filter((i) => X[i][f] > threshold);
        if (leftIdx.length < minSamplesLeaf || rightIdx.length < minSamplesLeaf) continue;

        const childSse =
          sse(leftIdx.map((i) => y[i])) + sse(rightIdx.map((i) => y[i]));
        const gain = parentSse - childSse;
        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    if (bestFeature === -1) {
      return { value: leafValue };
    }

    const leftIndices = indices.filter((i) => X[i][bestFeature] <= bestThreshold);
    const rightIndices = indices.filter((i) => X[i][bestFeature] > bestThreshold);

    return {
      featureIndex: bestFeature,
      threshold: bestThreshold,
      left: build(leftIndices, depth + 1),
      right: build(rightIndices, depth + 1),
    };
  }

  return build(
    Array.from({ length: X.length }, (_, i) => i),
    0,
  );
}

export function predictTree(node: TreeNode, x: number[]): number {
  let current = node;
  while (current.value === undefined) {
    if (current.featureIndex === undefined || current.threshold === undefined) break;
    current = x[current.featureIndex] <= current.threshold ? current.left! : current.right!;
  }
  return current.value ?? 0;
}
