import React, { useState, useEffect } from 'react';
import {
  Check,
  Droplets,
  Dumbbell,
  Plus,
  Scale,
  Utensils,
  X,
  ArrowUpRight,
} from 'lucide-react';
import {
  DailyMetric,
  MealSlot,
  UserProfile,
  WorkoutCategory,
} from '../types';
import {
  calculateWorkoutCalories,
  EXERCISE_PRESETS,
  FOOD_PRESETS,
  MEAL_SLOT_LABELS,
} from '../utils/metabolic';

export type QuickLogMode = 'menu' | 'meal' | 'water' | 'workout' | 'weight';

interface QuickLogModalProps {
  open: boolean;
  initialMode?: QuickLogMode;
  selectedDate: string;
  profile: UserProfile;
  currentMetric: DailyMetric;
  onClose: () => void;
  onAddMeal: (meal: {
    mealType: MealSlot;
    name: string;
    grams: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }) => Promise<void>;
  onAddWater: (deltaMl: number) => Promise<void>;
  onAddWorkout: (workout: {
    activityName: string;
    category: WorkoutCategory;
    durationMinutes: number;
    met: number;
    caloriesBurned: number;
  }) => Promise<void>;
  onSaveWeight: (weightKg: number, note: string) => Promise<void>;
  onNavigateToDiaryWithFocus: () => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  open,
  initialMode = 'menu',
  selectedDate,
  profile,
  currentMetric,
  onClose,
  onAddMeal,
  onAddWater,
  onAddWorkout,
  onSaveWeight,
  onNavigateToDiaryWithFocus,
}) => {
  const [mode, setMode] = useState<QuickLogMode>(initialMode);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick Meal State
  const [mealSlot, setMealSlot] = useState<MealSlot>('lunch');
  const [foodPresetId, setFoodPresetId] = useState<string>(FOOD_PRESETS[0].id);
  const [foodName, setFoodName] = useState<string>(FOOD_PRESETS[0].name);
  const [foodGrams, setFoodGrams] = useState<number>(FOOD_PRESETS[0].defaultGrams);
  const [foodKcal, setFoodKcal] = useState<number>(
    Math.round((FOOD_PRESETS[0].kcalPer100g * FOOD_PRESETS[0].defaultGrams) / 100)
  );
  const [foodProt, setFoodProt] = useState<number>(
    Number(((FOOD_PRESETS[0].proteinPer100g * FOOD_PRESETS[0].defaultGrams) / 100).toFixed(1))
  );
  const [foodCarb, setFoodCarb] = useState<number>(
    Number(((FOOD_PRESETS[0].carbsPer100g * FOOD_PRESETS[0].defaultGrams) / 100).toFixed(1))
  );
  const [foodFat, setFoodFat] = useState<number>(
    Number(((FOOD_PRESETS[0].fatPer100g * FOOD_PRESETS[0].defaultGrams) / 100).toFixed(1))
  );

  // Quick Workout State
  const [exPresetId, setExPresetId] = useState<string>(EXERCISE_PRESETS[0].id);
  const [exName, setExName] = useState<string>(EXERCISE_PRESETS[0].name);
  const [exCategory, setExCategory] = useState<WorkoutCategory>(EXERCISE_PRESETS[0].category);
  const [exDuration, setExDuration] = useState<number>(EXERCISE_PRESETS[0].defaultDuration);
  const [exMet, setExMet] = useState<number>(EXERCISE_PRESETS[0].met);

  // Quick Weight State
  const [quickWeightKg, setQuickWeightKg] = useState<number>(profile.currentWeightKg);
  const [quickWeightNote, setQuickWeightNote] = useState<string>('Pesagem rápida');

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setFeedback(null);
      setQuickWeightKg(profile.currentWeightKg);
    }
  }, [open, initialMode, profile.currentWeightKg]);

  if (!open) return null;

  const handleSelectFoodPreset = (id: string) => {
    setFoodPresetId(id);
    if (id === 'custom') return;
    const preset = FOOD_PRESETS.find((f) => f.id === id);
    if (!preset) return;
    setFoodName(preset.name);
    setFoodGrams(preset.defaultGrams);
    const factor = preset.defaultGrams / 100;
    setFoodKcal(Math.round(preset.kcalPer100g * factor));
    setFoodProt(Number((preset.proteinPer100g * factor).toFixed(1)));
    setFoodCarb(Number((preset.carbsPer100g * factor).toFixed(1)));
    setFoodFat(Number((preset.fatPer100g * factor).toFixed(1)));
  };

  const handleGramsChange = (grams: number) => {
    setFoodGrams(grams);
    if (foodPresetId !== 'custom') {
      const preset = FOOD_PRESETS.find((f) => f.id === foodPresetId);
      if (preset) {
        const factor = Math.max(0, grams) / 100;
        setFoodKcal(Math.round(preset.kcalPer100g * factor));
        setFoodProt(Number((preset.proteinPer100g * factor).toFixed(1)));
        setFoodCarb(Number((preset.carbsPer100g * factor).toFixed(1)));
        setFoodFat(Number((preset.fatPer100g * factor).toFixed(1)));
      }
    }
  };

  const handleSelectExPreset = (id: string) => {
    setExPresetId(id);
    if (id === 'custom') return;
    const preset = EXERCISE_PRESETS.find((e) => e.id === id);
    if (!preset) return;
    setExName(preset.name);
    setExCategory(preset.category);
    setExDuration(preset.defaultDuration);
    setExMet(preset.met);
  };

  const quickWorkoutKcal = calculateWorkoutCalories(
    exMet,
    profile.currentWeightKg,
    exDuration
  );

  const showTempFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback(null);
    }, 2200);
  };

  const handleQuickMealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;
    setSubmitting(true);
    try {
      await onAddMeal({
        mealType: mealSlot,
        name: foodName.trim(),
        grams: Math.max(1, foodGrams),
        calories: Math.max(0, foodKcal),
        proteinG: Math.max(0, foodProt),
        carbsG: Math.max(0, foodCarb),
        fatG: Math.max(0, foodFat),
      });
      showTempFeedback(`Refeição adicionada (+${foodKcal} kcal)!`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickWaterClick = async (ml: number) => {
    setSubmitting(true);
    try {
      await onAddWater(ml);
      showTempFeedback(`+${ml} ml de água registrados!`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exName.trim()) return;
    setSubmitting(true);
    try {
      await onAddWorkout({
        activityName: exName.trim(),
        category: exCategory,
        durationMinutes: Math.max(1, exDuration),
        met: Math.max(1, exMet),
        caloriesBurned: Math.max(1, quickWorkoutKcal),
      });
      showTempFeedback(`Treino registrado (-${quickWorkoutKcal} kcal)!`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanW = Number(Math.max(25, Math.min(350, quickWeightKg)).toFixed(1));
      await onSaveWeight(cleanW, quickWeightNote.trim() || 'Registro rápido via menu +');
      showTempFeedback(`Peso atualizado para ${cleanW} kg! TMB e metas recalculadas.`);
    } finally {
      setSubmitting(false);
    }
  };

  const waterProgressPct = Math.min(
    100,
    Math.round((currentMetric.waterMl / Math.max(500, profile.waterGoalMl)) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Ação Rápida"
    >
      <div className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] bg-[#1B1C20] border border-white/10 p-5 sm:p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#8AC4F2] text-[#0A468E] flex items-center justify-center font-bold shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-white">
                Registro Rápido ({selectedDate})
              </h2>
              <p className="text-[11px] text-white/60">
                Lance alimentos, água, treinos ou pesagem em segundos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/75 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Shortcut Pills */}
        <div className="grid grid-cols-4 gap-1.5 mt-4 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setMode('meal')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
              mode === 'meal' || mode === 'menu'
                ? 'bg-[#F3E3CA] text-[#1B1C20] shadow-xs'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Alimento</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('water')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
              mode === 'water'
                ? 'bg-[#8AC4F2] text-[#0A468E] shadow-xs'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>Água</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('workout')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
              mode === 'workout'
                ? 'bg-[#8AC4F2] text-[#0A468E] shadow-xs'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Treino</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('weight')}
            className={`py-2 px-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
              mode === 'weight'
                ? 'bg-[#DDA3E6] text-[#431F48] shadow-xs'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Peso</span>
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Active Shortcut Body */}
        <div className="mt-4">
          {/* 1. LANÇAR ALIMENTO */}
          {(mode === 'menu' || mode === 'meal') && (
            <form onSubmit={handleQuickMealSubmit} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F3E3CA]">
                  1. Lançar Alimento (TACO / USDA)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToDiaryWithFocus();
                  }}
                  className="text-[11px] text-[#8AC4F2] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Ir para Meu Diário</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Refeição</label>
                  <select
                    value={mealSlot}
                    onChange={(e) => setMealSlot(e.target.value as MealSlot)}
                    className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                  >
                    {(Object.keys(MEAL_SLOT_LABELS) as MealSlot[]).map((slot) => (
                      <option key={slot} value={slot} className="bg-[#1B1C20] text-white">
                        {MEAL_SLOT_LABELS[slot]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-white/60 mb-1">
                    Busca Rápida TACO / USDA
                  </label>
                  <select
                    value={foodPresetId}
                    onChange={(e) => handleSelectFoodPreset(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                  >
                    {FOOD_PRESETS.map((fp) => (
                      <option key={fp.id} value={fp.id} className="bg-[#1B1C20] text-white">
                        {fp.name} ({fp.kcalPer100g} kcal/100g)
                      </option>
                    ))}
                    <option value="custom" className="bg-[#1B1C20] text-white">
                      Personalizado
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="col-span-2">
                  <label className="block text-[10px] text-white/50 mb-1">Alimento</label>
                  <input
                    type="text"
                    required
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="w-full bg-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/50 mb-1">Gramas (g)</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    required
                    value={foodGrams}
                    onChange={(e) => handleGramsChange(Number(e.target.value))}
                    className="w-full bg-white/10 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-3 flex items-center justify-between pt-1 text-[11px] font-mono text-white/80">
                  <span>Calorias: <strong>{foodKcal} kcal</strong></span>
                  <span>P: {foodProt}g · C: {foodCarb}g · G: {foodFat}g</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-full bg-[#F3E3CA] hover:bg-white text-[#1B1C20] font-bold text-xs transition-colors shadow-md"
              >
                + Registrar Alimento ({foodKcal} kcal)
              </button>
            </form>
          )}

          {/* 2. REGISTRAR ÁGUA */}
          {mode === 'water' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8AC4F2]">
                  2. Hidratação Rápida do Dia
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {currentMetric.waterMl} / {profile.waterGoalMl} ml ({waterProgressPct}%)
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#8AC4F2] rounded-full transition-all duration-300"
                  style={{ width: `${waterProgressPct}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleQuickWaterClick(250)}
                  className="py-4 rounded-2xl bg-[#8AC4F2]/20 hover:bg-[#8AC4F2]/30 border border-[#8AC4F2]/40 text-[#8AC4F2] font-bold text-sm flex flex-col items-center gap-1 transition-all"
                >
                  <Droplets className="w-5 h-5" />
                  <span>+250 ml</span>
                  <span className="text-[10px] font-normal text-white/60">1 copo padrão</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleQuickWaterClick(500)}
                  className="py-4 rounded-2xl bg-[#8AC4F2] hover:bg-[#9ed0f8] text-[#0A468E] font-bold text-sm flex flex-col items-center gap-1 transition-all shadow-md"
                >
                  <Droplets className="w-5 h-5" />
                  <span>+500 ml</span>
                  <span className="text-[10px] font-normal text-[#0A468E]/80">1 garrafa média</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. REGISTRAR TREINO */}
          {mode === 'workout' && (
            <form onSubmit={handleQuickWorkoutSubmit} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8AC4F2]">
                  3. Registrar Exercício (Cálculo MET)
                </span>
                <span className="text-[11px] font-mono text-white/60">
                  Peso base: {profile.currentWeightKg} kg
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-white/60 mb-1">
                  Selecionar Exercício
                </label>
                <select
                  value={exPresetId}
                  onChange={(e) => handleSelectExPreset(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                >
                  {EXERCISE_PRESETS.map((ex) => (
                    <option key={ex.id} value={ex.id} className="bg-[#1B1C20] text-white">
                      {ex.name} (MET {ex.met})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/10">
                <div>
                  <label className="block text-[10px] text-white/50 mb-1">
                    Duração (minutos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    required
                    value={exDuration}
                    onChange={(e) => setExDuration(Number(e.target.value))}
                    className="w-full bg-white/10 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/50 mb-1">
                    Gasto Estimado (MET {exMet})
                  </label>
                  <div className="w-full bg-[#8AC4F2]/20 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-[#8AC4F2]">
                    -{quickWorkoutKcal} kcal
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-full bg-[#8AC4F2] hover:bg-[#9ed0f8] text-[#0A468E] font-bold text-xs transition-colors shadow-md"
              >
                + Registrar Treino (-{quickWorkoutKcal} kcal)
              </button>
            </form>
          )}

          {/* 4. REGISTRAR PESO */}
          {mode === 'weight' && (
            <form onSubmit={handleQuickWeightSubmit} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#DDA3E6]">
                  4. Registrar Pesagem Corporal
                </span>
                <span className="text-[11px] font-mono text-white/60">
                  Meta: {profile.targetWeightKg} kg
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <div>
                  <label className="block text-[10px] text-white/50 mb-1">
                    Peso Atual em {selectedDate} (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={25}
                    max={350}
                    required
                    value={quickWeightKg}
                    onChange={(e) => setQuickWeightKg(Number(e.target.value))}
                    className="w-full bg-white/10 rounded-xl px-3 py-2 text-base font-mono font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/50 mb-1">
                    Observação (opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={quickWeightNote}
                    onChange={(e) => setQuickWeightNote(e.target.value)}
                    placeholder="Em jejum pela manhã"
                    className="w-full bg-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-full bg-[#DDA3E6] hover:bg-[#e7b8ee] text-[#431F48] font-bold text-xs transition-colors shadow-md"
              >
                Salvar Peso &amp; Recalcular TMB / Macros
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
