import { buildRegressionTree, predictTree, TreeNode } from "./regression-tree";

// ---------------------------------------------------------------------------
// Moving average baseline
// ---------------------------------------------------------------------------

export function movingAveragePredict(series: number[], window = 7): number {
  if (series.length === 0) return 0;
  const slice = series.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// ---------------------------------------------------------------------------
// Linear regression (ordinary least squares via normal equation)
// ---------------------------------------------------------------------------

function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, c) => matrix.map((row) => row[c]));
}

function matMul(a: number[][], b: number[][]): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < a.length; i++) {
    result.push([]);
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j];
      result[i].push(sum);
    }
  }
  return result;
}

function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const identity = matrix.map((row, i) =>
    row.map((_, j) => (i === j ? 1 : 0)),
  );
  const M = matrix.map((row) => [...row]);

  for (let i = 0; i < n; i++) {
    let pivot = M[i][i];
    if (Math.abs(pivot) < 1e-10) {
      // Ridge-style regularization to avoid singular matrices with sparse data.
      M[i][i] += 1e-6;
      pivot = M[i][i];
    }
    for (let j = 0; j < n; j++) {
      M[i][j] /= pivot;
      identity[i][j] /= pivot;
    }
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = M[k][i];
      for (let j = 0; j < n; j++) {
        M[k][j] -= factor * M[i][j];
        identity[k][j] -= factor * identity[i][j];
      }
    }
  }
  return identity;
}

export interface LinearModel {
  weights: number[];
}

export function trainLinearRegression(X: number[][], y: number[]): LinearModel {
  const withBias = X.map((row) => [1, ...row]);
  const Xt = transpose(withBias);
  const XtX = matMul(Xt, withBias);
  const XtXInv = invertMatrix(XtX);
  const XtY = matMul(
    Xt,
    y.map((v) => [v]),
  );
  const weightsMatrix = matMul(XtXInv, XtY);
  return { weights: weightsMatrix.map((row) => row[0]) };
}

export function predictLinearRegression(model: LinearModel, x: number[]): number {
  const withBias = [1, ...x];
  return withBias.reduce((sum, v, i) => sum + v * model.weights[i], 0);
}

// ---------------------------------------------------------------------------
// Random Forest regressor (bagging of CART trees with feature subsampling)
// ---------------------------------------------------------------------------

export interface RandomForestModel {
  trees: TreeNode[];
}

export function trainRandomForest(
  X: number[][],
  y: number[],
  numTrees = 25,
  maxDepth = 5,
): RandomForestModel {
  const trees: TreeNode[] = [];
  const featureSubsetSize = Math.max(1, Math.round(Math.sqrt(X[0]?.length ?? 1)));

  for (let t = 0; t < numTrees; t++) {
    const sampleIndices: number[] = [];
    for (let i = 0; i < X.length; i++) {
      sampleIndices.push(Math.floor(Math.random() * X.length));
    }
    const sampledX = sampleIndices.map((i) => X[i]);
    const sampledY = sampleIndices.map((i) => y[i]);
    trees.push(buildRegressionTree(sampledX, sampledY, maxDepth, 2, featureSubsetSize));
  }

  return { trees };
}

export function predictRandomForest(model: RandomForestModel, x: number[]): number {
  if (model.trees.length === 0) return 0;
  const preds = model.trees.map((tree) => predictTree(tree, x));
  return preds.reduce((a, b) => a + b, 0) / preds.length;
}

// ---------------------------------------------------------------------------
// Gradient Boosted Trees ("XGBoost-style" additive boosting)
// ---------------------------------------------------------------------------

export interface GradientBoostingModel {
  baseValue: number;
  trees: TreeNode[];
  learningRate: number;
}

export function trainGradientBoosting(
  X: number[][],
  y: number[],
  numRounds = 60,
  learningRate = 0.1,
  maxDepth = 3,
): GradientBoostingModel {
  const baseValue = y.reduce((a, b) => a + b, 0) / (y.length || 1);
  let predictions = new Array(y.length).fill(baseValue);
  const trees: TreeNode[] = [];

  for (let round = 0; round < numRounds; round++) {
    const residuals = y.map((actual, i) => actual - predictions[i]);
    const tree = buildRegressionTree(X, residuals, maxDepth, 3);
    trees.push(tree);
    predictions = predictions.map((p, i) => p + learningRate * predictTree(tree, X[i]));
  }

  return { baseValue, trees, learningRate };
}

export function predictGradientBoosting(model: GradientBoostingModel, x: number[]): number {
  let value = model.baseValue;
  for (const tree of model.trees) {
    value += model.learningRate * predictTree(tree, x);
  }
  return value;
}
