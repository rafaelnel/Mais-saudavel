import { calculateStepCalories } from '../utils/metabolic';

export interface GoogleFitSyncResult {
  steps: number;
  activeCalories: number;
  latestWeightKg: number | null;
  liveApiUsed: boolean;
  message: string;
}

/**
 * Queries the official Google Fitness REST API v1 for the given YYYY-MM-DD date.
 * Uses dataTypeName:
 * - com.google.step_count.delta
 * - com.google.calories.expended
 * - com.google.weight
 */
export async function fetchGoogleFitDataForDate(
  accessToken: string,
  isoDate: string,
  userWeightKg: number
): Promise<GoogleFitSyncResult> {
  const [y, m, d] = isoDate.split('-').map(Number);
  const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

  const response = await fetch(
    'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.calories.expended' },
          { dataTypeName: 'com.google.weight' },
        ],
        bucketByTime: { durationMillis: endOfDay - startOfDay },
        startTimeMillis: startOfDay,
        endTimeMillis: endOfDay,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Fit API (${response.status}): ${errText.slice(0, 180)}`);
  }

  const data = await response.json();
  let steps = 0;
  let totalExpendedKcal = 0;
  let latestWeightKg: number | null = null;

  const buckets = Array.isArray(data?.bucket) ? data.bucket : [];
  for (const bucket of buckets) {
    const datasets = Array.isArray(bucket?.dataset) ? bucket.dataset : [];
    for (const ds of datasets) {
      const points = Array.isArray(ds?.point) ? ds.point : [];
      for (const pt of points) {
        const values = Array.isArray(pt?.value) ? pt.value : [];
        for (const val of values) {
          if (ds.dataSourceId?.includes('step_count') && typeof val.intVal === 'number') {
            steps += val.intVal;
          } else if (ds.dataSourceId?.includes('calories') && typeof val.fpVal === 'number') {
            totalExpendedKcal += val.fpVal;
          } else if (ds.dataSourceId?.includes('weight') && typeof val.fpVal === 'number') {
            latestWeightKg = Number(val.fpVal.toFixed(1));
          }
        }
      }
    }
  }

  const activeCalories =
    steps > 0
      ? calculateStepCalories(steps, userWeightKg)
      : Math.round(totalExpendedKcal * 0.25);

  return {
    steps,
    activeCalories,
    latestWeightKg,
    liveApiUsed: true,
    message:
      steps > 0
        ? `Sincronizado via Google Fit API: ${steps.toLocaleString('pt-BR')} passos (${activeCalories} kcal ativas).`
        : 'Conectado à API Google Fit (0 passos registrados na conta hoje; você pode informar manualmente ou sincronizar do relógio).',
  };
}

export interface AppleHealthParsedSummary {
  date: string;
  steps: number;
  activeCalories: number;
  restingHeartRate: number;
  sleepHours: number;
  weightKg: number | null;
  recordsCount: number;
}

/**
 * Parses Apple Health export files (.xml from HealthKit export.xml, or .json from iOS Shortcuts)
 * for the target date (or latest available date in the file).
 */
export function parseAppleHealthFileContent(
  rawContent: string,
  targetDate: string,
  userWeightKg: number
): AppleHealthParsedSummary {
  const trimmed = rawContent.trim();

  // 1. JSON format (e.g. Apple Shortcuts Health Export JSON)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    const obj = Array.isArray(parsed) ? parsed[0] || {} : parsed;
    const steps = Math.max(0, Math.min(200000, Math.round(Number(obj.steps ?? obj.stepCount ?? 0))));
    const activeCalories = Math.max(
      0,
      Math.min(
        15000,
        Math.round(Number(obj.activeCalories ?? obj.activeEnergyBurned ?? calculateStepCalories(steps, userWeightKg)))
      )
    );
    const restingHeartRate = Math.max(
      0,
      Math.min(250, Math.round(Number(obj.restingHeartRate ?? obj.heartRate ?? 62)))
    );
    const sleepHours = Math.max(
      0,
      Math.min(24, Number(Number(obj.sleepHours ?? obj.sleep ?? 7.5).toFixed(1)))
    );
    const weightKg =
      obj.weightKg || obj.bodyMass
        ? Number(Number(obj.weightKg ?? obj.bodyMass).toFixed(1))
        : null;

    return {
      date: typeof obj.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : targetDate,
      steps,
      activeCalories,
      restingHeartRate,
      sleepHours,
      weightKg,
      recordsCount: 1,
    };
  }

  // 2. Apple HealthKit XML format (<Record type="HKQuantityTypeIdentifier..." startDate="YYYY-MM-DD..." value="..." />)
  const recordRegex = /<Record\s+[^>]*type="([^"]+)"[^>]*startDate="(\d{4}-\d{2}-\d{2})[^"]*"[^>]*value="([^"]+)"[^>]*\/?>/gi;
  let match: RegExpExecArray | null;
  let steps = 0;
  let activeCalories = 0;
  let hrSum = 0;
  let hrCount = 0;
  let weightKg: number | null = null;
  let recordsCount = 0;

  while ((match = recordRegex.exec(trimmed)) !== null) {
    const [, recordType, recordDate, rawVal] = match;
    const numVal = parseFloat(rawVal);
    if (Number.isNaN(numVal)) continue;

    // Match either targetDate or aggregate if single-day snippet
    if (recordDate === targetDate || !trimmed.includes(targetDate)) {
      recordsCount++;
      if (recordType === 'HKQuantityTypeIdentifierStepCount') {
        steps += Math.round(numVal);
      } else if (recordType === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
        activeCalories += Math.round(numVal);
      } else if (
        recordType === 'HKQuantityTypeIdentifierRestingHeartRate' ||
        recordType === 'HKQuantityTypeIdentifierHeartRate'
      ) {
        hrSum += numVal;
        hrCount++;
      } else if (recordType === 'HKQuantityTypeIdentifierBodyMass') {
        weightKg = Number(numVal.toFixed(1));
      }
    }
  }

  if (activeCalories === 0 && steps > 0) {
    activeCalories = calculateStepCalories(steps, userWeightKg);
  }

  return {
    date: targetDate,
    steps: Math.min(200000, steps),
    activeCalories: Math.min(15000, activeCalories),
    restingHeartRate: hrCount > 0 ? Math.round(hrSum / hrCount) : 60,
    sleepHours: 7.5,
    weightKg,
    recordsCount,
  };
}
