import { db } from "@/db";
import { wasteRecords } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  movingAveragePredict,
  trainLinearRegression,
  predictLinearRegression,
  trainRandomForest,
  predictRandomForest,
  trainGradientBoosting,
  predictGradientBoosting,
} from "./models";
import { mae, rmse, mape, round } from "./stats";

export interface DailyPoint {
  date: string;
  quantityKg: number;
  peopleCount: number;
  mealsServed: number;
  eventFlag: boolean;
}

export interface FeaturizedPoint {
  date: string;
  target: number;
  features: number[];
}

const FEATURE_NAMES = [
  "day",
  "month",
  "day_of_week",
  "week_of_year",
  "weekend",
  "lag_1",
  "lag_7",
  "rolling_mean_7",
  "rolling_mean_14",
  "waste_per_person",
  "meals_per_person",
  "event_flag",
];

const MIN_RAW_DAYS = 24;
const LOOKBACK = 14;

function weekOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d.getTime() - start.getTime()) / 86400000;
  return Math.ceil((diff + start.getDay() + 1) / 7);
}

export async function loadDailySeries(
  organizationId: string,
  locationId?: string,
  category?: string,
): Promise<DailyPoint[]> {
  const conditions = [eq(wasteRecords.organizationId, organizationId)];
  if (locationId) conditions.push(eq(wasteRecords.locationId, locationId));
  if (category) conditions.push(eq(wasteRecords.wasteCategory, category));

  const rows = await db
    .select()
    .from(wasteRecords)
    .where(and(...conditions));

  const byDate = new Map<string, { qty: number; people: number[]; meals: number[]; event: boolean }>();
  for (const r of rows) {
    const entry = byDate.get(r.date) ?? { qty: 0, people: [], meals: [], event: false };
    entry.qty += r.quantityKg;
    if (r.peopleCount) entry.people.push(r.peopleCount);
    if (r.mealsServed) entry.meals.push(r.mealsServed);
    entry.event = entry.event || r.eventFlag;
    byDate.set(r.date, entry);
  }

  const series = Array.from(byDate.entries())
    .map(([date, v]) => ({
      date,
      quantityKg: round(v.qty, 3),
      peopleCount: v.people.length ? Math.round(v.people.reduce((a, b) => a + b, 0) / v.people.length) : 0,
      mealsServed: v.meals.length ? Math.round(v.meals.reduce((a, b) => a + b, 0) / v.meals.length) : 0,
      eventFlag: v.event,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return series;
}

export function featurize(series: DailyPoint[]): FeaturizedPoint[] {
  const points: FeaturizedPoint[] = [];
  for (let i = LOOKBACK; i < series.length; i++) {
    const cur = series[i];
    const d = new Date(cur.date + "T00:00:00Z");
    const lag1 = series[i - 1].quantityKg;
    const lag7 = series[i - 7].quantityKg;
    const rolling7 =
      series.slice(i - 7, i).reduce((a, b) => a + b.quantityKg, 0) / 7;
    const rolling14 =
      series.slice(i - 14, i).reduce((a, b) => a + b.quantityKg, 0) / 14;

    points.push({
      date: cur.date,
      target: cur.quantityKg,
      features: [
        d.getUTCDate(),
        d.getUTCMonth() + 1,
        d.getUTCDay(),
        weekOfYear(d),
        d.getUTCDay() === 0 || d.getUTCDay() === 6 ? 1 : 0,
        lag1,
        lag7,
        rolling7,
        rolling14,
        cur.peopleCount > 0 ? cur.quantityKg / cur.peopleCount : 0,
        cur.mealsServed > 0 ? cur.quantityKg / cur.mealsServed : 0,
        cur.eventFlag ? 1 : 0,
      ],
    });
  }
  return points;
}

export interface ModelEvaluation {
  model: string;
  mae: number;
  rmse: number;
  mape: number;
}

export interface ForecastResult {
  status: "ok";
  historical: DailyPoint[];
  forecast: { date: string; predictedKg: number }[];
  evaluations: ModelEvaluation[];
  chosenModel: string;
  trainSize: number;
  validationSize: number;
  testSize: number;
  featureNames: string[];
}

export interface InsufficientDataResult {
  status: "insufficient_data";
  message: string;
  daysAvailable: number;
  daysRequired: number;
}

export async function runForecast(
  organizationId: string,
  locationId?: string,
  category?: string,
): Promise<ForecastResult | InsufficientDataResult> {
  const series = await loadDailySeries(organizationId, locationId, category);

  if (series.length < MIN_RAW_DAYS) {
    return {
      status: "insufficient_data",
      message:
        "Insufficient data for forecasting. Upload at least 24 days of daily waste records for this scope.",
      daysAvailable: series.length,
      daysRequired: MIN_RAW_DAYS,
    };
  }

  const points = featurize(series);
  if (points.length < 15) {
    return {
      status: "insufficient_data",
      message: "Insufficient data for forecasting after feature engineering.",
      daysAvailable: series.length,
      daysRequired: MIN_RAW_DAYS + 15,
    };
  }

  const trainEnd = Math.floor(points.length * 0.7);
  const valEnd = Math.floor(points.length * 0.85);

  const trainSet = points.slice(0, trainEnd);
  const valSet = points.slice(trainEnd, valEnd);
  const testSet = points.slice(valEnd);

  const finalTestSet = testSet.length >= 2 ? testSet : points.slice(-Math.max(2, Math.floor(points.length * 0.15)));

  const Xtrain = trainSet.map((p) => p.features);
  const ytrain = trainSet.map((p) => p.target);
  const XtrainFull = [...trainSet, ...valSet].map((p) => p.features);
  const ytrainFull = [...trainSet, ...valSet].map((p) => p.target);

  const Xtest = finalTestSet.map((p) => p.features);
  const ytest = finalTestSet.map((p) => p.target);

  const evaluations: ModelEvaluation[] = [];

  // 1. Moving average baseline
  const maPreds = finalTestSet.map((_, i) => {
    const historyUpTo = points.slice(0, valEnd + i).map((p) => p.target);
    return movingAveragePredict(historyUpTo.length ? historyUpTo : ytrain, 7);
  });
  evaluations.push({
    model: "moving_average",
    mae: round(mae(ytest, maPreds)),
    rmse: round(rmse(ytest, maPreds)),
    mape: round(mape(ytest, maPreds)),
  });

  // 2. Linear regression
  const linModel = trainLinearRegression(Xtrain, ytrain);
  const linPreds = Xtest.map((x) => predictLinearRegression(linModel, x));
  evaluations.push({
    model: "linear_regression",
    mae: round(mae(ytest, linPreds)),
    rmse: round(rmse(ytest, linPreds)),
    mape: round(mape(ytest, linPreds)),
  });

  // 3. Random forest
  const rfModel = trainRandomForest(Xtrain, ytrain, 30, 5);
  const rfPreds = Xtest.map((x) => predictRandomForest(rfModel, x));
  evaluations.push({
    model: "random_forest",
    mae: round(mae(ytest, rfPreds)),
    rmse: round(rmse(ytest, rfPreds)),
    mape: round(mape(ytest, rfPreds)),
  });

  // 4. Gradient boosting (XGBoost-style)
  const gbModel = trainGradientBoosting(Xtrain, ytrain, 70, 0.12, 3);
  const gbPreds = Xtest.map((x) => predictGradientBoosting(gbModel, x));
  evaluations.push({
    model: "xgboost_style_gradient_boosting",
    mae: round(mae(ytest, gbPreds)),
    rmse: round(rmse(ytest, gbPreds)),
    mape: round(mape(ytest, gbPreds)),
  });

  const chosen = evaluations.reduce((best, cur) => (cur.rmse < best.rmse ? cur : best));

  // Retrain the chosen model family on the FULL dataset (train+val+test) for
  // the actual production forecast, then roll it forward 7 days.
  const extendedSeries = [...series];
  const forecast: { date: string; predictedKg: number }[] = [];

  const finalGbModel = trainGradientBoosting(XtrainFull.concat(Xtest), ytrainFull.concat(ytest), 70, 0.12, 3);
  const finalRfModel = trainRandomForest(XtrainFull.concat(Xtest), ytrainFull.concat(ytest), 30, 5);
  const finalLinModel = trainLinearRegression(XtrainFull.concat(Xtest), ytrainFull.concat(ytest));

  const predictWithChosen = (features: number[]): number => {
    switch (chosen.model) {
      case "linear_regression":
        return Math.max(0, predictLinearRegression(finalLinModel, features));
      case "random_forest":
        return Math.max(0, predictRandomForest(finalRfModel, features));
      case "moving_average":
        return Math.max(0, movingAveragePredict(extendedSeries.map((p) => p.quantityKg), 7));
      default:
        return Math.max(0, predictGradientBoosting(finalGbModel, features));
    }
  };

  const lastKnownPeople = series[series.length - 1].peopleCount || 0;
  const lastKnownMeals = series[series.length - 1].mealsServed || 0;

  for (let step = 0; step < 7; step++) {
    const lastDate = new Date(extendedSeries[extendedSeries.length - 1].date + "T00:00:00Z");
    const nextDate = new Date(lastDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextDateStr = nextDate.toISOString().slice(0, 10);

    const lag1 = extendedSeries[extendedSeries.length - 1].quantityKg;
    const lag7 = extendedSeries[extendedSeries.length - 7].quantityKg;
    const rolling7 = extendedSeries.slice(-7).reduce((a, b) => a + b.quantityKg, 0) / 7;
    const rolling14 = extendedSeries.slice(-14).reduce((a, b) => a + b.quantityKg, 0) / 14;

    const features = [
      nextDate.getUTCDate(),
      nextDate.getUTCMonth() + 1,
      nextDate.getUTCDay(),
      weekOfYear(nextDate),
      nextDate.getUTCDay() === 0 || nextDate.getUTCDay() === 6 ? 1 : 0,
      lag1,
      lag7,
      rolling7,
      rolling14,
      lastKnownPeople > 0 ? lag1 / lastKnownPeople : 0,
      lastKnownMeals > 0 ? lag1 / lastKnownMeals : 0,
      0,
    ];

    const predicted = round(predictWithChosen(features), 2);
    forecast.push({ date: nextDateStr, predictedKg: predicted });
    extendedSeries.push({
      date: nextDateStr,
      quantityKg: predicted,
      peopleCount: lastKnownPeople,
      mealsServed: lastKnownMeals,
      eventFlag: false,
    });
  }

  return {
    status: "ok",
    historical: series,
    forecast,
    evaluations,
    chosenModel: chosen.model,
    trainSize: trainSet.length,
    validationSize: valSet.length,
    testSize: finalTestSet.length,
    featureNames: FEATURE_NAMES,
  };
}
