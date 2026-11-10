import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Check,
  CheckCircle2,
  Flame,
  Info,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
  Zap,
} from 'lucide-react';
import { GoalType, MealEntry, MealSlot, UserProfile } from '../types';
import {
  DailyMetabolicSummary,
  MEAL_SLOT_LABELS,
} from '../utils/metabolic';
import { BrandWaveMark } from './WeightEvolutionChart';

interface DietPlannerViewProps {
  profile: UserProfile;
  selectedDate: string;
  metabolicSummary: DailyMetabolicSummary;
  dayMeals: MealEntry[];
  onUpdateGoalAndAdjustment: (
    goalType: GoalType,
    dailyCalorieAdjustment: number
  ) => Promise<void>;
  onAddPlannedMeal: (meal: {
    mealType: MealSlot;
    name: string;
    grams: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }) => Promise<void>;
  onNavigateToMeals: () => void;
}

interface DietTemplateOption {
  id: string;
  title: string;
  description: string;
  baseGrams: number;
  baseKcal: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
}

const SLOT_DISTRIBUTION: Array<{
  slot: MealSlot;
  label: string;
  share: number;
  timeHint: string;
  options: DietTemplateOption[];
}> = [
  {
    slot: 'breakfast',
    label: 'Café da Manhã',
    share: 0.25,
    timeHint: '07:30 - 08:30',
    options: [
      {
        id: 'bf_ovos_pao',
        title: 'Ovos Mexidos + Pão Integral + Fruta',
        description: 'Proteína de alto valor biológico e fibras de liberação lenta',
        baseGrams: 220,
        baseKcal: 420,
        baseProtein: 26,
        baseCarbs: 42,
        baseFat: 15,
      },
      {
        id: 'bf_mingau_whey',
        title: 'Mingau de Aveia + Whey Protein + Banana',
        description: 'Excelente aporte proteico e energia sustentada para manhã',
        baseGrams: 250,
        baseKcal: 430,
        baseProtein: 32,
        baseCarbs: 54,
        baseFat: 8,
      },
      {
        id: 'bf_crepioca_frango',
        title: 'Crepioca Proteica com Queijo + Café',
        description: 'Combinação prática de goma de tapioca, ovos e proteína',
        baseGrams: 200,
        baseKcal: 400,
        baseProtein: 28,
        baseCarbs: 38,
        baseFat: 13,
      },
    ],
  },
  {
    slot: 'lunch',
    label: 'Almoço Principal',
    share: 0.35,
    timeHint: '12:00 - 13:30',
    options: [
      {
        id: 'lc_frango_arroz_feijao',
        title: 'Peito de Frango Grelhado + Arroz Integral + Feijão',
        description: 'Prato brasileiro clássico com aminoácidos completos e baixo teor de gordura',
        baseGrams: 420,
        baseKcal: 610,
        baseProtein: 54,
        baseCarbs: 68,
        baseFat: 11,
      },
      {
        id: 'lc_patinho_batata',
        title: 'Patinho Bovino Moído + Batata Doce + Salada c/ Azeite',
        description: 'Rico em ferro heme, creatina natural e carboidrato de baixo índice glicêmico',
        baseGrams: 400,
        baseKcal: 620,
        baseProtein: 52,
        baseCarbs: 62,
        baseFat: 16,
      },
      {
        id: 'lc_salmao_arroz',
        title: 'Filé de Tilápia / Salmão + Arroz Branco + Brócolis',
        description: 'Fonte de ômega-3 e fácil digestão para manter alta disposição à tarde',
        baseGrams: 390,
        baseKcal: 600,
        baseProtein: 48,
        baseCarbs: 64,
        baseFat: 15,
      },
    ],
  },
  {
    slot: 'snack',
    label: 'Lanche da Tarde / Pré-Treino',
    share: 0.15,
    timeHint: '16:00 - 17:30',
    options: [
      {
        id: 'sn_whey_banana_aveia',
        title: 'Shake de Whey Protein + Banana Prata + Aveia',
        description: 'Absorção rápida para síntese proteica e energia pré/pós-treino',
        baseGrams: 180,
        baseKcal: 280,
        baseProtein: 28,
        baseCarbs: 33,
        baseFat: 4,
      },
      {
        id: 'sn_iogurte_frutas',
        title: 'Iogurte Natural Desnatado + Whey + Morangos',
        description: 'Alto volume e saciedade com excelente densidade proteica',
        baseGrams: 260,
        baseKcal: 260,
        baseProtein: 30,
        baseCarbs: 24,
        baseFat: 4,
      },
      {
        id: 'sn_sanduiche_frango',
        title: 'Sanduíche Natural de Frango Desfiado no Pão Integral',
        description: 'Refeição sólida prática para levar na rotina',
        baseGrams: 170,
        baseKcal: 290,
        baseProtein: 27,
        baseCarbs: 30,
        baseFat: 6,
      },
    ],
  },
  {
    slot: 'dinner',
    label: 'Jantar Metabólico',
    share: 0.25,
    timeHint: '19:30 - 21:00',
    options: [
      {
        id: 'dn_frango_legumes',
        title: 'Frango Grelhado + Purê de Abóbora/Batata + Azeite',
        description: 'Refeição noturna equilibrada que favorece recuperação muscular no sono',
        baseGrams: 350,
        baseKcal: 460,
        baseProtein: 46,
        baseCarbs: 40,
        baseFat: 12,
      },
      {
        id: 'dn_omelete_completo',
        title: 'Omelete de 3 Ovos com Frango Desfiado + Salada Verde',
        description: 'Baixo carboidrato noturno e alta saciedade',
        baseGrams: 280,
        baseKcal: 440,
        baseProtein: 42,
        baseCarbs: 12,
        baseFat: 24,
      },
      {
        id: 'dn_patinho_arroz',
        title: 'Carne Magra (Patinho) + Arroz Integral + Legumes no Vapor',
        description: 'Ideal para reposição de glicogênio após treinos noturnos',
        baseGrams: 360,
        baseKcal: 480,
        baseProtein: 45,
        baseCarbs: 46,
        baseFat: 12,
      },
    ],
  },
];

const summaryCardVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export function DietPlannerView({
  profile,
  selectedDate,
  metabolicSummary,
  dayMeals,
  onUpdateGoalAndAdjustment,
  onAddPlannedMeal,
  onNavigateToMeals,
}: DietPlannerViewProps) {
  const [selectedGoal, setSelectedGoal] = useState<GoalType>(profile.goalType);
  const [calorieAdjustment, setCalorieAdjustment] = useState<number>(
    profile.dailyCalorieAdjustment
  );
  const [savingGoal, setSavingGoal] = useState<boolean>(false);
  const [addingSlot, setAddingSlot] = useState<string | null>(null);
  const [addingFullDay, setAddingFullDay] = useState<boolean>(false);

  // Track which option index (0, 1, or 2) is selected for each of the 4 meal slots
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({
    breakfast: 0,
    lunch: 0,
    snack: 0,
    dinner: 0,
  });

  // Sync local state when profile updates externally
  React.useEffect(() => {
    setSelectedGoal(profile.goalType);
    setCalorieAdjustment(profile.dailyCalorieAdjustment);
  }, [profile.goalType, profile.dailyCalorieAdjustment]);

  // Live preview of target intake based on current selectedGoal & calorieAdjustment
  const liveTargetCalories = useMemo(() => {
    return Math.max(
      1100,
      Math.round(metabolicSummary.totalDailyExpenditure + calorieAdjustment)
    );
  }, [metabolicSummary.totalDailyExpenditure, calorieAdjustment]);

  const liveMacros = useMemo(() => {
    const proteinMult =
      selectedGoal === 'lose' ? 2.1 : selectedGoal === 'gain' ? 2.0 : 1.8;
    const proteinG = Math.round(profile.currentWeightKg * proteinMult);
    const fatG = Math.round(profile.currentWeightKg * 0.9);
    const carbKcal = Math.max(200, liveTargetCalories - proteinG * 4 - fatG * 9);
    const carbsG = Math.round(carbKcal / 4);
    return { proteinG, carbsG, fatG };
  }, [selectedGoal, profile.currentWeightKg, liveTargetCalories]);

  // Compare actual consumption today against the live target
  const calorieDiffFromTarget = liveTargetCalories - metabolicSummary.consumedCalories; // > 0 means still needs to eat, < 0 means exceeded
  const actualDeficitOrSurplus =
    metabolicSummary.consumedCalories - metabolicSummary.totalDailyExpenditure; // < 0 means in deficit, > 0 means in surplus
  const calorieProgressPct = Math.min(
    130,
    Math.round((metabolicSummary.consumedCalories / Math.max(1, liveTargetCalories)) * 100)
  );

  const proteinRemainingG = liveMacros.proteinG - metabolicSummary.consumedProteinG;
  const carbsRemainingG = liveMacros.carbsG - metabolicSummary.consumedCarbsG;
  const fatRemainingG = liveMacros.fatG - metabolicSummary.consumedFatG;

  // Detailed Adherence Evaluation ("Se meu consumo está de acordo, se bati a meta, o que falta")
  const adherenceEvaluation = useMemo(() => {
    const absDiff = Math.abs(calorieDiffFromTarget);
    const proteinHit = metabolicSummary.consumedProteinG >= liveMacros.proteinG * 0.9;

    if (metabolicSummary.consumedCalories === 0) {
      return {
        badge: 'Diário Zerado Hoje',
        tone: 'neutral' as const,
        headline: `Faltam ${liveTargetCalories.toLocaleString('pt-BR')} kcal para cumprir seu plano`,
        detail:
          selectedGoal === 'lose'
            ? `Para atingir seu déficit planejado de ${calorieAdjustment} kcal, consuma até ${liveTargetCalories} kcal priorizando ${liveMacros.proteinG}g de proteína.`
            : selectedGoal === 'gain'
            ? `Para garantir seu superávit de +${calorieAdjustment} kcal e ganhar massa, você precisa ingerir ${liveTargetCalories} kcal hoje.`
            : `Para manter seu peso com equilíbrio, sua meta de ingestão hoje é de ${liveTargetCalories} kcal.`,
      };
    }

    // Goal hit within +/- 90 kcal tolerance
    if (absDiff <= 90) {
      return {
        badge: proteinHit ? 'Meta Batida com Sucesso!' : 'Meta Calórica Batida!',
        tone: 'success' as const,
        headline: `Consumo cravado na meta (${metabolicSummary.consumedCalories} / ${liveTargetCalories} kcal)`,
        detail: proteinHit
          ? `Excelente! Você bateu tanto as calorias quanto a meta de proteínas (${metabolicSummary.consumedProteinG}g). Seu saldo líquido hoje é de ${
              actualDeficitOrSurplus > 0 ? `+${actualDeficitOrSurplus}` : actualDeficitOrSurplus
            } kcal.`
          : `Calorias na faixa exata! Só faltam ${Math.max(0, proteinRemainingG)}g de proteína para blindar sua massa magra hoje.`,
      };
    }

    // Still under target calories (needs to eat more)
    if (calorieDiffFromTarget > 90) {
      return {
        badge: 'Em Andamento — Falta Consumir',
        tone: 'pending' as const,
        headline: `Faltam ${calorieDiffFromTarget.toLocaleString('pt-BR')} kcal para fechar a meta do dia`,
        detail:
          selectedGoal === 'lose'
            ? `Você está em um déficit momentâneo de ${Math.abs(actualDeficitOrSurplus)} kcal. Ainda pode consumir ${calorieDiffFromTarget} kcal (${Math.max(
                0,
                proteinRemainingG
              )}g Prot · ${Math.max(0, carbsRemainingG)}g Carb) e continuará dentro do déficit planejado!`
            : selectedGoal === 'gain'
            ? `Atenção para não ficar abaixo do superávit: ainda faltam ${calorieDiffFromTarget} kcal e ${Math.max(
                0,
                proteinRemainingG
              )}g de proteína hoje para estimular hipertrofia.`
            : `Para atingir sua manutenção energética, consuma mais ${calorieDiffFromTarget} kcal distribuídas nas próximas refeições.`,
      };
    }

    // Exceeded target calories (calorieDiffFromTarget < -90)
    const exceededBy = Math.abs(calorieDiffFromTarget);
    return {
      badge:
        selectedGoal === 'lose'
          ? 'Acima do Teto do Déficit'
          : selectedGoal === 'gain'
          ? 'Superávit Acima da Meta'
          : 'Acima da Manutenção',
      tone: 'warning' as const,
      headline: `Você ultrapassou a meta em +${exceededBy.toLocaleString('pt-BR')} kcal hoje`,
      detail:
        selectedGoal === 'lose'
          ? actualDeficitOrSurplus < 0
            ? `Você passou ${exceededBy} kcal da meta, mas ainda mantém um déficit leve de ${actualDeficitOrSurplus} kcal no dia.`
            : `Seu consumo superou seu gasto total em +${actualDeficitOrSurplus} kcal. Uma caminhada ou treino de ~${Math.ceil(
                exceededBy / 8
              )} min equilibra a meta de hoje.`
          : `Você já bateu e superou a meta calórica do dia em +${exceededBy} kcal (Saldo: ${
              actualDeficitOrSurplus > 0 ? `+${actualDeficitOrSurplus}` : actualDeficitOrSurplus
            } kcal).`,
    };
  }, [
    calorieDiffFromTarget,
    metabolicSummary.consumedCalories,
    metabolicSummary.consumedProteinG,
    liveTargetCalories,
    liveMacros.proteinG,
    selectedGoal,
    calorieAdjustment,
    actualDeficitOrSurplus,
    proteinRemainingG,
    carbsRemainingG,
  ]);

  // Preset Goal Switcher Handler
  const handleSelectGoalPreset = async (goal: GoalType, defaultAdj: number) => {
    setSelectedGoal(goal);
    setCalorieAdjustment(defaultAdj);
    setSavingGoal(true);
    try {
      await onUpdateGoalAndAdjustment(goal, defaultAdj);
    } finally {
      setSavingGoal(false);
    }
  };

  const handleApplyCustomAdjustment = async (adj: number) => {
    const cleanAdj = Math.max(-1500, Math.min(1500, Math.round(adj)));
    setCalorieAdjustment(cleanAdj);
    setSavingGoal(true);
    try {
      await onUpdateGoalAndAdjustment(selectedGoal, cleanAdj);
    } finally {
      setSavingGoal(false);
    }
  };

  // Build scaled meal plan for each slot so that the 4 slots sum to 100% of liveTargetCalories
  const generatedMealPlan = useMemo(() => {
    return SLOT_DISTRIBUTION.map((slotConfig) => {
      const targetSlotKcal = Math.round(liveTargetCalories * slotConfig.share);
      const optionIdx = selectedOptions[slotConfig.slot] ?? 0;
      const chosenOption = slotConfig.options[optionIdx] || slotConfig.options[0];

      const scaleFactor = targetSlotKcal / Math.max(1, chosenOption.baseKcal);
      const scaledGrams = Math.max(
        50,
        Math.round((chosenOption.baseGrams * scaleFactor) / 5) * 5
      );
      const scaledCalories = targetSlotKcal;
      const scaledProtein = Number((chosenOption.baseProtein * scaleFactor).toFixed(1));
      const scaledCarbs = Number((chosenOption.baseCarbs * scaleFactor).toFixed(1));
      const scaledFat = Number((chosenOption.baseFat * scaleFactor).toFixed(1));

      // Check how much the user already logged in this slot today
      const loggedInSlot = dayMeals.filter((m) => m.mealType === slotConfig.slot);
      const loggedSlotKcal = loggedInSlot.reduce((acc, m) => acc + m.calories, 0);

      return {
        ...slotConfig,
        chosenOption,
        optionIdx,
        scaledGrams,
        scaledCalories,
        scaledProtein,
        scaledCarbs,
        scaledFat,
        loggedInSlot,
        loggedSlotKcal,
      };
    });
  }, [liveTargetCalories, selectedOptions, dayMeals]);

  const handleLogSinglePlannedMeal = async (
    item: (typeof generatedMealPlan)[number]
  ) => {
    setAddingSlot(item.slot);
    try {
      await onAddPlannedMeal({
        mealType: item.slot,
        name: `${item.chosenOption.title} (Dieta Planejada)`,
        grams: item.scaledGrams,
        calories: item.scaledCalories,
        proteinG: item.scaledProtein,
        carbsG: item.scaledCarbs,
        fatG: item.scaledFat,
      });
    } finally {
      setAddingSlot(null);
    }
  };

  const handleApplyRemainingDietToday = async () => {
    setAddingFullDay(true);
    try {
      for (const item of generatedMealPlan) {
        if (item.loggedSlotKcal < item.scaledCalories * 0.5) {
          await onAddPlannedMeal({
            mealType: item.slot,
            name: `${item.chosenOption.title} (Plano do Dia)`,
            grams: item.scaledGrams,
            calories: item.scaledCalories,
            proteinG: item.scaledProtein,
            carbsG: item.scaledCarbs,
            fatG: item.scaledFat,
          });
        }
      }
    } finally {
      setAddingFullDay(false);
    }
  };

  const weeklyExpectedKg = Number(((calorieAdjustment * 7) / 7700).toFixed(2));

  return (
    <motion.div
      variants={summaryCardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch my-auto max-w-7xl mx-auto w-full"
    >
      {/* =======================================================================
          LEFT COLUMN (5 COLS): GOAL CONFIGURATOR & DEFICIT / ADHERENCE DIAGNOSTIC
          ======================================================================= */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* CARD A: SKY BLUE (#8AC4F2) — Objetivo & Cálculo de Déficit / Superávit */}
        <div className="bg-[#8AC4F2] text-[#1B1C20] rounded-[34px] p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-full bg-[#0A468E] text-white flex items-center justify-center shadow-xs">
                  <Target className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#0A468E] block">
                    PASSO 1 · OBJETIVO METABÓLICO
                  </span>
                  <h2 className="text-lg font-display font-bold text-[#1B1C20] leading-tight">
                    Necessidade da Dieta
                  </h2>
                </div>
              </div>
              <BrandWaveMark className="w-6 h-6 text-[#0A468E]" />
            </div>

            {/* 3 Goal Mode Buttons: Perder Peso | Manter | Ganhar Massa */}
            <div className="grid grid-cols-3 gap-1.5 mt-4 bg-white/45 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => handleSelectGoalPreset('lose', -500)}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                  selectedGoal === 'lose'
                    ? 'bg-[#0A468E] text-white shadow-sm'
                    : 'text-[#1B1C20]/75 hover:bg-white/50'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Perder Peso</span>
                <span className="text-[10px] font-mono opacity-80">Déficit</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectGoalPreset('maintain', 0)}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                  selectedGoal === 'maintain'
                    ? 'bg-[#1B1C20] text-white shadow-sm'
                    : 'text-[#1B1C20]/75 hover:bg-white/50'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Manter</span>
                <span className="text-[10px] font-mono opacity-80">Isocalórica</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectGoalPreset('gain', 350)}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                  selectedGoal === 'gain'
                    ? 'bg-[#582B5E] text-white shadow-sm'
                    : 'text-[#1B1C20]/75 hover:bg-white/50'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Ganhar Massa</span>
                <span className="text-[10px] font-mono opacity-80">Superávit</span>
              </button>
            </div>

            {/* Intensity Presets & Fine Slider */}
            <div className="mt-3.5 bg-white rounded-[24px] p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1B1C20]">
                  {selectedGoal === 'lose'
                    ? 'Déficit Diário Planejado'
                    : selectedGoal === 'gain'
                    ? 'Superávit Diário Planejado'
                    : 'Ajuste Calórico Fino'}
                </span>
                <span
                  className={`font-mono tabular-nums font-bold px-2.5 py-0.5 rounded-full text-xs ${
                    calorieAdjustment < 0
                      ? 'bg-[#8AC4F2]/30 text-[#0A468E]'
                      : calorieAdjustment > 0
                      ? 'bg-[#DDA3E6]/40 text-[#582B5E]'
                      : 'bg-slate-100 text-[#1B1C20]'
                  }`}
                >
                  {calorieAdjustment > 0 ? `+${calorieAdjustment}` : calorieAdjustment} kcal/dia
                </span>
              </div>

              {/* Quick Intensity Chips */}
              <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                {selectedGoal === 'lose' && (
                  <>
                    {[
                      { label: 'Leve (-300)', val: -300 },
                      { label: 'Ideal (-500)', val: -500 },
                      { label: 'Forte (-750)', val: -750 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleApplyCustomAdjustment(preset.val)}
                        className={`py-1.5 rounded-xl text-[11px] font-mono font-semibold border transition-colors ${
                          calorieAdjustment === preset.val
                            ? 'bg-[#1B1C20] text-white border-[#1B1C20]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </>
                )}

                {selectedGoal === 'maintain' && (
                  <>
                    {[
                      { label: 'Recomp (-150)', val: -150 },
                      { label: 'Exato (0)', val: 0 },
                      { label: 'Ativo (+150)', val: 150 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleApplyCustomAdjustment(preset.val)}
                        className={`py-1.5 rounded-xl text-[11px] font-mono font-semibold border transition-colors ${
                          calorieAdjustment === preset.val
                            ? 'bg-[#1B1C20] text-white border-[#1B1C20]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </>
                )}

                {selectedGoal === 'gain' && (
                  <>
                    {[
                      { label: 'Limpo (+250)', val: 250 },
                      { label: 'Padrão (+400)', val: 400 },
                      { label: 'Intenso (+600)', val: 600 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleApplyCustomAdjustment(preset.val)}
                        className={`py-1.5 rounded-xl text-[11px] font-mono font-semibold border transition-colors ${
                          calorieAdjustment === preset.val
                            ? 'bg-[#1B1C20] text-white border-[#1B1C20]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Mathematical Breakdown Row */}
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-xl p-2">
                  <div className="text-[10px] text-slate-500">Gasto Total</div>
                  <div className="text-xs font-mono font-bold text-[#1B1C20]">
                    {metabolicSummary.totalDailyExpenditure} kcal
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-2">
                  <div className="text-[10px] text-slate-500">
                    {calorieAdjustment < 0
                      ? 'Déficit'
                      : calorieAdjustment > 0
                      ? 'Aumento'
                      : 'Ajuste'}
                  </div>
                  <div className="text-xs font-mono font-bold text-[#0A468E]">
                    {calorieAdjustment > 0 ? `+${calorieAdjustment}` : calorieAdjustment} kcal
                  </div>
                </div>
                <div className="bg-[#1B1C20] text-white rounded-xl p-2">
                  <div className="text-[10px] text-white/60">Meta da Dieta</div>
                  <div className="text-xs font-mono font-bold text-[#8AC4F2]">
                    {liveTargetCalories} kcal
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Impacto estimado na balança:</span>
                <span className="font-bold text-[#1B1C20]">
                  {weeklyExpectedKg > 0 ? `+${weeklyExpectedKg}` : weeklyExpectedKg} kg / semana
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD B: ORCHID LAVENDER (#DDA3E6) — Diagnóstico em Tempo Real: Bati a Meta? O Que Falta? */}
        <div className="bg-[#DDA3E6] text-[#1B1C20] rounded-[34px] p-5 shadow-2xl flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-full bg-[#582B5E] text-white flex items-center justify-center shadow-xs">
                  <Award className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#582B5E] block">
                    STATUS DO CONSUMO · {selectedDate}
                  </span>
                  <h3 className="text-lg font-display font-bold text-[#1B1C20] leading-tight">
                    Diagnóstico da Meta
                  </h3>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-2xs ${
                  adherenceEvaluation.tone === 'success'
                    ? 'bg-emerald-950 text-emerald-300'
                    : adherenceEvaluation.tone === 'warning'
                    ? 'bg-amber-950 text-amber-300'
                    : 'bg-white text-[#582B5E]'
                }`}
              >
                {adherenceEvaluation.badge}
              </span>
            </div>

            {/* White Diagnostic Status Box */}
            <div className="mt-3.5 bg-white rounded-[24px] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#1B1C20]">
                    {adherenceEvaluation.headline}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {adherenceEvaluation.detail}
                  </p>
                </div>
              </div>

              {/* Calorie Progress Bar */}
              <div className="mt-3.5">
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-slate-500">
                    Consumido:{' '}
                    <strong className="text-[#1B1C20]">
                      {metabolicSummary.consumedCalories} kcal
                    </strong>
                  </span>
                  <span className="text-slate-500">
                    Meta:{' '}
                    <strong className="text-[#582B5E]">{liveTargetCalories} kcal</strong> (
                    {calorieProgressPct}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      adherenceEvaluation.tone === 'success'
                        ? 'bg-emerald-500'
                        : adherenceEvaluation.tone === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-[#582B5E]'
                    }`}
                    style={{ width: `${Math.min(100, calorieProgressPct)}%` }}
                  />
                </div>
              </div>

              {/* O QUE FALTA HOJE / SALDO DE MACROS */}
              <div className="mt-3.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#1B1C20] mb-2">
                  <span>O QUE FALTA OU PASSOU HOJE (MACROS &amp; KCAL)</span>
                  <span className="font-mono text-[#582B5E]">
                    Saldo Real: {actualDeficitOrSurplus > 0 ? '+' : ''}
                    {actualDeficitOrSurplus} kcal
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Proteínas */}
                  <div className="rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-bold text-[#1B1C20]">Proteína</span>
                      <span className="font-mono">
                        {metabolicSummary.consumedProteinG}/{liveMacros.proteinG}g
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-xs font-mono font-bold ${
                        proteinRemainingG <= 0 ? 'text-emerald-600' : 'text-[#582B5E]'
                      }`}
                    >
                      {proteinRemainingG > 0
                        ? `Faltam ${proteinRemainingG}g`
                        : `Meta Batida! (+${Math.abs(proteinRemainingG)}g)`}
                    </div>
                  </div>

                  {/* Carboidratos */}
                  <div className="rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-bold text-[#1B1C20]">Carbo</span>
                      <span className="font-mono">
                        {metabolicSummary.consumedCarbsG}/{liveMacros.carbsG}g
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-xs font-mono font-bold ${
                        carbsRemainingG <= 0 ? 'text-emerald-600' : 'text-[#0A468E]'
                      }`}
                    >
                      {carbsRemainingG > 0
                        ? `Faltam ${carbsRemainingG}g`
                        : `Bateu (+${Math.abs(carbsRemainingG)}g)`}
                    </div>
                  </div>

                  {/* Gorduras */}
                  <div className="rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-bold text-[#1B1C20]">Gordura</span>
                      <span className="font-mono">
                        {metabolicSummary.consumedFatG}/{liveMacros.fatG}g
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-xs font-mono font-bold ${
                        fatRemainingG <= 0 ? 'text-emerald-600' : 'text-amber-700'
                      }`}
                    >
                      {fatRemainingG > 0
                        ? `Faltam ${fatRemainingG}g`
                        : `Bateu (+${Math.abs(fatRemainingG)}g)`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =======================================================================
          RIGHT COLUMN (7 COLS): WARM SAND (#F3E3CA) — MONTADOR DE CARDÁPIO & PORÇÕES
          ======================================================================= */}
      <div className="lg:col-span-7 bg-[#F3E3CA] text-[#1B1C20] rounded-[34px] p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#1B1C20]/60 block">
                PASSO 2 · CARDÁPIO CALCULADO PARA SUA META ({liveTargetCalories} KCAL)
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-[#1B1C20] leading-tight">
                Montar Dieta por Refeição
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyRemainingDietToday}
                disabled={addingFullDay}
                className="px-4 py-2 rounded-full bg-[#1B1C20] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F3E3CA]" />
                <span>
                  {addingFullDay
                    ? 'Aplicando...'
                    : 'Aplicar Refeições Faltantes Hoje'}
                </span>
              </button>
            </div>
          </div>

          <p className="text-xs text-[#1B1C20]/70 mt-1">
            As gramagens abaixo são recalculadas automaticamente para atingir{' '}
            <strong className="font-mono">{liveTargetCalories} kcal</strong> (
            <strong className="font-mono">{liveMacros.proteinG}g P</strong> ·{' '}
            <strong className="font-mono">{liveMacros.carbsG}g C</strong> ·{' '}
            <strong className="font-mono">{liveMacros.fatG}g G</strong>). Troque a opção de cada
            refeição ou lance direto no seu diário:
          </p>

          {/* 4 Meal Slots Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {generatedMealPlan.map((item) => {
              const slotDone = item.loggedSlotKcal >= item.scaledCalories * 0.75;
              const slotMissingKcal = Math.max(0, item.scaledCalories - item.loggedSlotKcal);

              return (
                <div
                  key={item.slot}
                  className="bg-white rounded-[26px] p-4 shadow-sm flex flex-col justify-between border border-[#1B1C20]/5"
                >
                  <div>
                    {/* Slot Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#1B1C20]">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3E3CA] text-[#1B1C20] font-semibold">
                            {Math.round(item.share * 100)}%
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Meta da refeição: {item.scaledCalories} kcal
                        </span>
                      </div>

                      {slotDone ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Já registrado ({item.loggedSlotKcal} kcal)
                        </span>
                      ) : item.loggedSlotKcal > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-mono font-bold">
                          Faltam {slotMissingKcal} kcal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-semibold">
                          Pendente hoje
                        </span>
                      )}
                    </div>

                    {/* Option Selector Tabs (Option 1, 2, 3) */}
                    <div className="grid grid-cols-3 gap-1 mt-2.5 bg-slate-100 p-1 rounded-xl">
                      {item.options.map((opt, idx) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [item.slot]: idx,
                            }))
                          }
                          className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                            item.optionIdx === idx
                              ? 'bg-[#1B1C20] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-[#1B1C20]'
                          }`}
                        >
                          Opção {idx + 1}
                        </button>
                      ))}
                    </div>

                    {/* Selected Food Title & Calculated Portion */}
                    <div className="mt-3">
                      <div className="text-xs font-bold text-[#1B1C20] leading-snug">
                        {item.chosenOption.title}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {item.chosenOption.description}
                      </p>
                    </div>

                    {/* Calculated Macros & Grams Pill Bar */}
                    <div className="mt-3 p-2.5 rounded-2xl bg-[#F3E3CA]/45 flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-[#1B1C20]">
                        Porção: {item.scaledGrams}g
                      </span>
                      <span className="text-[#1B1C20]/80">
                        {item.scaledProtein}g P · {item.scaledCarbs}g C · {item.scaledFat}g G
                      </span>
                    </div>
                  </div>

                  {/* Action Button: Log this meal into today's diary */}
                  <button
                    type="button"
                    onClick={() => handleLogSinglePlannedMeal(item)}
                    disabled={addingSlot === item.slot}
                    className="mt-3 w-full py-2 px-3 rounded-xl bg-[#1B1C20] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {addingSlot === item.slot
                        ? 'Registrando...'
                        : `Lançar no ${item.label} (+${item.scaledCalories} kcal)`}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Summary Bar inside Warm Sand Card */}
        <div className="mt-4 bg-white rounded-full px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs">
            <Utensils className="w-4 h-4 text-[#1B1C20]" />
            <span className="font-bold text-[#1B1C20]">
              Resumo Hoje: {dayMeals.length} refeição(ões) registrada(s)
            </span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="font-mono text-xs text-slate-600 hidden sm:inline">
              {calorieDiffFromTarget > 0
                ? `Faltam ${calorieDiffFromTarget} kcal para fechar a dieta`
                : calorieDiffFromTarget === 0
                ? 'Meta calórica 100% atingida!'
                : `Acima da meta em +${Math.abs(calorieDiffFromTarget)} kcal`}
            </span>
          </div>

          <button
            type="button"
            onClick={onNavigateToMeals}
            className="px-3.5 py-1.5 rounded-full bg-[#F3E3CA] hover:bg-[#e7d3b4] text-[#1B1C20] text-xs font-bold transition-colors"
          >
            Ver Diário de Refeições →
          </button>
        </div>
      </div>
    </motion.div>
  );
}
