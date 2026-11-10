import {
  BiologicalSex,
  ExercisePreset,
  FoodPreset,
  MealEntry,
  MealSlot,
  TodoCategory,
  UserProfile,
  WeightEntry,
  WorkoutCategory,
  WorkoutEntry,
} from '../types';

/**
 * Format date as YYYY-MM-DD in local timezone
 */
export function formatDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatDateISO(dt);
}

export function formatDisplayDatePt(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * 1. Mifflin-St Jeor Equation (Clinical Gold Standard)
 * Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
 * Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
 */
export function calculateMifflinStJeor(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: BiologicalSex
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

/**
 * 2. Revised Harris-Benedict Equation (Roza & Shizgal, 1984)
 * Men: 88.362 + (13.397 × weight in kg) + (4.799 × height in cm) - (5.677 × age in years)
 * Women: 447.593 + (9.247 × weight in kg) + (3.098 × height in cm) - (4.330 × age in years)
 */
export function calculateHarrisBenedict(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: BiologicalSex
): number {
  if (sex === 'male') {
    return Math.round(88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age);
  }
  return Math.round(447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age);
}

/**
 * Calculate calories burned from steps (NEAT) adjusted for body weight
 * Standard biomechanical approximation: ~0.0005 kcal per step per kg of body mass
 */
export function calculateStepCalories(steps: number, weightKg: number): number {
  return Math.round(Math.max(0, steps) * weightKg * 0.0005);
}

/**
 * Calculate exercise expenditure using Compendium of Physical Activities MET formula:
 * Calories = MET × weight (kg) × (duration (minutes) / 60)
 */
export function calculateWorkoutCalories(
  met: number,
  weightKg: number,
  durationMinutes: number
): number {
  return Math.max(1, Math.round(met * weightKg * (durationMinutes / 60)));
}

export interface DailyMetabolicSummary {
  bmrMifflin: number;
  bmrHarris: number;
  baselineTdee: number;
  stepCalories: number;
  workoutCalories: number;
  totalDailyExpenditure: number;
  targetIntakeCalories: number;
  consumedCalories: number;
  consumedProteinG: number;
  consumedCarbsG: number;
  consumedFatG: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  netCalorieBalance: number; // consumed - totalDailyExpenditure
  remainingCaloriesForTarget: number; // targetIntakeCalories - consumedCalories
}

export function computeDailyMetabolicSummary(
  profile: UserProfile,
  meals: MealEntry[],
  workouts: WorkoutEntry[],
  steps: number
): DailyMetabolicSummary {
  const bmrMifflin = calculateMifflinStJeor(
    profile.currentWeightKg,
    profile.heightCm,
    profile.age,
    profile.sex
  );
  const bmrHarris = calculateHarrisBenedict(
    profile.currentWeightKg,
    profile.heightCm,
    profile.age,
    profile.sex
  );

  // Baseline TDEE from activity factor
  const baselineTdee = Math.round(bmrMifflin * profile.activityFactor);
  const stepCalories = calculateStepCalories(steps, profile.currentWeightKg);
  const workoutCalories = workouts.reduce((acc, w) => acc + w.caloriesBurned, 0);

  // Real dynamic expenditure combines Basal + Thermic/Baseline NEAT + Steps + Logged Exercises
  // We use BMR * 1.15 (resting + thermic effect of food) + stepCalories + workoutCalories
  const dynamicExpenditure = Math.round(bmrMifflin * 1.15 + stepCalories + workoutCalories);
  const totalDailyExpenditure = Math.max(bmrMifflin, dynamicExpenditure);

  const targetIntakeCalories = Math.max(
    1100,
    Math.round(totalDailyExpenditure + profile.dailyCalorieAdjustment)
  );

  const consumedCalories = Math.round(meals.reduce((acc, m) => acc + m.calories, 0));
  const consumedProteinG = Math.round(meals.reduce((acc, m) => acc + m.proteinG, 0));
  const consumedCarbsG = Math.round(meals.reduce((acc, m) => acc + m.carbsG, 0));
  const consumedFatG = Math.round(meals.reduce((acc, m) => acc + m.fatG, 0));

  // Macro targets based on body weight and target calories
  const proteinMultiplier = profile.goalType === 'lose' ? 2.1 : profile.goalType === 'gain' ? 2.0 : 1.8;
  const targetProteinG = Math.round(profile.currentWeightKg * proteinMultiplier);
  const targetFatG = Math.round(profile.currentWeightKg * 0.9);
  const remainingKcalForCarbs = Math.max(
    200,
    targetIntakeCalories - targetProteinG * 4 - targetFatG * 9
  );
  const targetCarbsG = Math.round(remainingKcalForCarbs / 4);

  const netCalorieBalance = consumedCalories - totalDailyExpenditure;
  const remainingCaloriesForTarget = targetIntakeCalories - consumedCalories;

  return {
    bmrMifflin,
    bmrHarris,
    baselineTdee,
    stepCalories,
    workoutCalories,
    totalDailyExpenditure,
    targetIntakeCalories,
    consumedCalories,
    consumedProteinG,
    consumedCarbsG,
    consumedFatG,
    targetProteinG,
    targetCarbsG,
    targetFatG,
    netCalorieBalance,
    remainingCaloriesForTarget,
  };
}

export interface WeightForecastAnalysis {
  startingWeightKg: number;
  latestWeightKg: number;
  totalWeightDeltaKg: number;
  daysTracked: number;
  actualWeeklyRateKg: number;
  plannedWeeklyRateKg: number;
  expectedWeightTodayKg: number;
  adherenceDeviationKg: number;
  status: 'on_track' | 'ahead' | 'behind' | 'needs_more_data';
  statusLabel: string;
  diagnosticMessage: string;
  projected30DaysPlannedKg: number;
  projected60DaysPlannedKg: number;
  projected90DaysPlannedKg: number;
  projected30DaysRealKg: number;
  estimatedDaysToGoal: number | null;
  estimatedGoalDateISO: string | null;
}

/**
 * 1 kg of body tissue energy equivalent ~ 7,700 kcal
 */
const KCAL_PER_KG = 7700;

export function analyzeWeightEvolutionAndForecast(
  profile: UserProfile,
  weights: WeightEntry[],
  currentDayNetBalance: number
): WeightForecastAnalysis {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const plannedDailyKgDelta = profile.dailyCalorieAdjustment / KCAL_PER_KG;
  const plannedWeeklyRateKg = Number((plannedDailyKgDelta * 7).toFixed(2));

  const latestWeightKg =
    sorted.length > 0 ? sorted[sorted.length - 1].weightKg : profile.currentWeightKg;
  const startingWeightKg = sorted.length > 0 ? sorted[0].weightKg : profile.currentWeightKg;
  const totalWeightDeltaKg = Number((latestWeightKg - startingWeightKg).toFixed(2));

  let daysTracked = 0;
  if (sorted.length >= 2) {
    const first = new Date(sorted[0].date + 'T00:00:00');
    const last = new Date(sorted[sorted.length - 1].date + 'T00:00:00');
    daysTracked = Math.max(1, Math.round((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const expectedWeightTodayKg = Number(
    (startingWeightKg + plannedDailyKgDelta * daysTracked).toFixed(2)
  );
  const adherenceDeviationKg = Number((latestWeightKg - expectedWeightTodayKg).toFixed(2));

  const actualWeeklyRateKg =
    daysTracked >= 1
      ? Number(((totalWeightDeltaKg / daysTracked) * 7).toFixed(2))
      : Number(((currentDayNetBalance / KCAL_PER_KG) * 7).toFixed(2));

  // Projections
  const projected30DaysPlannedKg = Number(
    Math.max(30, latestWeightKg + plannedDailyKgDelta * 30).toFixed(1)
  );
  const projected60DaysPlannedKg = Number(
    Math.max(30, latestWeightKg + plannedDailyKgDelta * 60).toFixed(1)
  );
  const projected90DaysPlannedKg = Number(
    Math.max(30, latestWeightKg + plannedDailyKgDelta * 90).toFixed(1)
  );

  const realDailyKgDelta =
    daysTracked >= 3
      ? totalWeightDeltaKg / daysTracked
      : currentDayNetBalance / KCAL_PER_KG;
  const projected30DaysRealKg = Number(
    Math.max(30, latestWeightKg + realDailyKgDelta * 30).toFixed(1)
  );

  // Estimate days to reach targetWeightKg
  const weightRemainingKg = profile.targetWeightKg - latestWeightKg;
  let estimatedDaysToGoal: number | null = null;
  let estimatedGoalDateISO: string | null = null;

  const effectiveDailyDelta =
    Math.abs(plannedDailyKgDelta) > 0.01 ? plannedDailyKgDelta : realDailyKgDelta;

  if (Math.abs(weightRemainingKg) < 0.2) {
    estimatedDaysToGoal = 0;
    estimatedGoalDateISO = formatDateISO();
  } else if (
    (weightRemainingKg < 0 && effectiveDailyDelta < -0.005) ||
    (weightRemainingKg > 0 && effectiveDailyDelta > 0.005)
  ) {
    estimatedDaysToGoal = Math.min(730, Math.max(1, Math.round(weightRemainingKg / effectiveDailyDelta)));
    estimatedGoalDateISO = addDaysISO(formatDateISO(), estimatedDaysToGoal);
  }

  // Diagnostic logic
  let status: WeightForecastAnalysis['status'] = 'on_track';
  let statusLabel = 'Evolução Alinhada à Meta';
  let diagnosticMessage =
    'Sua curva de peso acompanha o saldo metabólico projetado pela sua Taxa Basal e nível de atividade.';

  if (sorted.length < 2) {
    status = 'needs_more_data';
    statusLabel = 'Aguardando 2+ Pesagens';
    diagnosticMessage =
      'Insira pelo menos dois registros de peso em dias diferentes para comparar sua resposta metabólica real com a curva teórica.';
  } else if (profile.goalType === 'lose') {
    if (adherenceDeviationKg <= -0.35) {
      status = 'ahead';
      statusLabel = 'Ritmo Acima da Previsão';
      diagnosticMessage = `Você reduziu ${Math.abs(adherenceDeviationKg).toFixed(1)} kg a mais do que o previsto pelo déficit planejado. Monitore a ingestão proteica para preservar massa magra.`;
    } else if (adherenceDeviationKg >= 0.45) {
      status = 'behind';
      statusLabel = 'Abaixo do Déficit Esperado';
      diagnosticMessage = `Seu peso está ${adherenceDeviationKg.toFixed(1)} kg acima da curva projetada. Verifique possíveis subestimações nas porções ou aumente em +2.000 passos/dia.`;
    } else {
      status = 'on_track';
      statusLabel = 'Evolução Dentro da Previsão';
      diagnosticMessage = `Desvio de apenas ${Math.abs(adherenceDeviationKg).toFixed(2)} kg frente ao modelo matemático de 7.700 kcal/kg. Continue mantendo a consistência.`;
    }
  } else if (profile.goalType === 'gain') {
    if (adherenceDeviationKg >= 0.35) {
      status = 'ahead';
      statusLabel = 'Ganho Acima do Projetado';
      diagnosticMessage = `Seu peso subiu ${adherenceDeviationKg.toFixed(1)} kg além da curva planejada. Controle o superávit para minimizar acúmulo adiposo.`;
    } else if (adherenceDeviationKg <= -0.45) {
      status = 'behind';
      statusLabel = 'Abaixo do Superávit Planejado';
      diagnosticMessage = `Seu ganho está ${Math.abs(adherenceDeviationKg).toFixed(1)} kg abaixo do esperado. Adicione cerca de +250 kcal/dia para compensar seu gasto ativo.`;
    }
  }

  return {
    startingWeightKg,
    latestWeightKg,
    totalWeightDeltaKg,
    daysTracked,
    actualWeeklyRateKg,
    plannedWeeklyRateKg,
    expectedWeightTodayKg,
    adherenceDeviationKg,
    status,
    statusLabel,
    diagnosticMessage,
    projected30DaysPlannedKg,
    projected60DaysPlannedKg,
    projected90DaysPlannedKg,
    projected30DaysRealKg,
    estimatedDaysToGoal,
    estimatedGoalDateISO,
  };
}

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Café da Manhã',
  lunch: 'Almoço',
  snack: 'Lanche da Tarde',
  pre_workout: 'Pré-Treino',
  post_workout: 'Pós-Treino',
  dinner: 'Jantar',
};

export const WORKOUT_CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  strength: 'Musculação & Força',
  cardio: 'Cardio & Endurance',
  hiit: 'HIIT & Funcional',
  sports: 'Esportes & Lutas',
  mobility: 'Mobilidade & Yoga',
  sync: 'Sincronizado (Wearable)',
};

export const TODO_CATEGORY_LABELS: Record<TodoCategory, string> = {
  nutrition: 'Nutrição',
  workout: 'Treino',
  hydration: 'Hidratação',
  habit: 'Hábito & Sono',
  measurement: 'Pesagem & Bio',
};

export const ACTIVITY_FACTORS = [
  { value: 1.2, label: 'Sedentário (1.2x)', desc: 'Trabalho de escritório, pouco movimento diário' },
  { value: 1.375, label: 'Levemente Ativo (1.375x)', desc: 'Exercício leve 1 a 3 dias/semana' },
  { value: 1.55, label: 'Moderadamente Ativo (1.55x)', desc: 'Treino moderado 3 a 5 dias/semana' },
  { value: 1.725, label: 'Muito Ativo (1.725x)', desc: 'Treino intenso 6 a 7 dias/semana' },
  { value: 1.9, label: 'Atleta / Intenso (1.9x)', desc: 'Treinos duplos ou trabalho físico pesado' },
];

/**
 * TACO / USDA Nutritional Reference Database (per 100g)
 */
export const FOOD_PRESETS: FoodPreset[] = [
  {
    id: 'frango_grelhado',
    name: 'Peito de Frango Grelhado',
    category: 'Proteínas',
    defaultGrams: 150,
    kcalPer100g: 159,
    proteinPer100g: 32.0,
    carbsPer100g: 0.0,
    fatPer100g: 2.5,
  },
  {
    id: 'arroz_branco',
    name: 'Arroz Branco Cozido',
    category: 'Carboidratos',
    defaultGrams: 140,
    kcalPer100g: 128,
    proteinPer100g: 2.5,
    carbsPer100g: 28.1,
    fatPer100g: 0.2,
  },
  {
    id: 'arroz_integral',
    name: 'Arroz Integral Cozido',
    category: 'Carboidratos',
    defaultGrams: 140,
    kcalPer100g: 124,
    proteinPer100g: 2.6,
    carbsPer100g: 25.8,
    fatPer100g: 1.0,
  },
  {
    id: 'feijao_carioca',
    name: 'Feijão Carioca Cozido',
    category: 'Leguminosas',
    defaultGrams: 100,
    kcalPer100g: 76,
    proteinPer100g: 4.8,
    carbsPer100g: 13.6,
    fatPer100g: 0.5,
  },
  {
    id: 'patinho_moido',
    name: 'Carne Bovina (Patinho Grelhado)',
    category: 'Proteínas',
    defaultGrams: 150,
    kcalPer100g: 219,
    proteinPer100g: 35.9,
    carbsPer100g: 0.0,
    fatPer100g: 7.3,
  },
  {
    id: 'ovo_inteiro',
    name: 'Ovos Cozidos / Mexidos (2 un ~100g)',
    category: 'Proteínas',
    defaultGrams: 100,
    kcalPer100g: 146,
    proteinPer100g: 13.3,
    carbsPer100g: 0.6,
    fatPer100g: 9.5,
  },
  {
    id: 'batata_doce',
    name: 'Batata Doce Cozida',
    category: 'Carboidratos',
    defaultGrams: 150,
    kcalPer100g: 77,
    proteinPer100g: 0.6,
    carbsPer100g: 18.4,
    fatPer100g: 0.1,
  },
  {
    id: 'aveia_flocos',
    name: 'Aveia em Flocos',
    category: 'Carboidratos',
    defaultGrams: 40,
    kcalPer100g: 394,
    proteinPer100g: 13.9,
    carbsPer100g: 66.6,
    fatPer100g: 8.5,
  },
  {
    id: 'whey_protein',
    name: 'Whey Protein Concentrado (Dose)',
    category: 'Suplementos',
    defaultGrams: 30,
    kcalPer100g: 400,
    proteinPer100g: 80.0,
    carbsPer100g: 8.0,
    fatPer100g: 5.0,
  },
  {
    id: 'banana_prata',
    name: 'Banana Prata',
    category: 'Frutas',
    defaultGrams: 90,
    kcalPer100g: 98,
    proteinPer100g: 1.3,
    carbsPer100g: 26.0,
    fatPer100g: 0.1,
  },
  {
    id: 'tapioca_goma',
    name: 'Tapioca (Goma Hidratada)',
    category: 'Carboidratos',
    defaultGrams: 80,
    kcalPer100g: 240,
    proteinPer100g: 0.0,
    carbsPer100g: 60.0,
    fatPer100g: 0.0,
  },
  {
    id: 'salmao_grelhado',
    name: 'Salmão Grelhado',
    category: 'Proteínas',
    defaultGrams: 150,
    kcalPer100g: 243,
    proteinPer100g: 23.8,
    carbsPer100g: 0.0,
    fatPer100g: 15.6,
  },
  {
    id: 'pao_integral',
    name: 'Pão de Forma Integral (2 fatias)',
    category: 'Carboidratos',
    defaultGrams: 50,
    kcalPer100g: 253,
    proteinPer100g: 9.4,
    carbsPer100g: 49.9,
    fatPer100g: 3.7,
  },
  {
    id: 'azeite_oliva',
    name: 'Azeite de Oliva Extra Virgem',
    category: 'Gorduras Boas',
    defaultGrams: 12,
    kcalPer100g: 884,
    proteinPer100g: 0.0,
    carbsPer100g: 0.0,
    fatPer100g: 100.0,
  },
  {
    id: 'iogurte_natural',
    name: 'Iogurte Natural Desnatado',
    category: 'Laticínios',
    defaultGrams: 170,
    kcalPer100g: 56,
    proteinPer100g: 5.8,
    carbsPer100g: 7.8,
    fatPer100g: 0.3,
  },
];

/**
 * Compendium of Physical Activities (MET values)
 */
export const EXERCISE_PRESETS: ExercisePreset[] = [
  {
    id: 'musculacao_intensa',
    name: 'Musculação Intensa (Hipertrofia / Força)',
    category: 'strength',
    met: 6.0,
    defaultDuration: 55,
  },
  {
    id: 'musculacao_moderada',
    name: 'Musculação Moderada / Circuito',
    category: 'strength',
    met: 4.5,
    defaultDuration: 50,
  },
  {
    id: 'corrida_10kmh',
    name: 'Corrida (10 km/h — Pace 6:00/km)',
    category: 'cardio',
    met: 9.8,
    defaultDuration: 40,
  },
  {
    id: 'corrida_8kmh',
    name: 'Corrida Leve / Trote (8 km/h — Pace 7:30/km)',
    category: 'cardio',
    met: 8.3,
    defaultDuration: 35,
  },
  {
    id: 'caminhada_rapida',
    name: 'Caminhada Rápida na Esteira / Rua (6 km/h)',
    category: 'cardio',
    met: 4.3,
    defaultDuration: 45,
  },
  {
    id: 'hiit_cross',
    name: 'HIIT / Cross Training / Funcional',
    category: 'hiit',
    met: 8.5,
    defaultDuration: 30,
  },
  {
    id: 'ciclismo_moderado',
    name: 'Ciclismo / Spinning Moderado-Forte',
    category: 'cardio',
    met: 7.5,
    defaultDuration: 45,
  },
  {
    id: 'natacao',
    name: 'Natação (Crawl Moderado)',
    category: 'sports',
    met: 8.0,
    defaultDuration: 45,
  },
  {
    id: 'jiu_jitsu_lutas',
    name: 'Jiu-Jitsu / Muay Thai / Boxe',
    category: 'sports',
    met: 10.3,
    defaultDuration: 60,
  },
  {
    id: 'futebol',
    name: 'Futebol / Beach Tennis',
    category: 'sports',
    met: 7.0,
    defaultDuration: 60,
  },
  {
    id: 'mobilidade_yoga',
    name: 'Mobilidade Articular / Pilates / Yoga',
    category: 'mobility',
    met: 3.0,
    defaultDuration: 30,
  },
];
