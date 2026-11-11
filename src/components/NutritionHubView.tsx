import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Flame,
  Info,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { MealEntry, MealSlot, UserProfile } from '../types';
import {
  DailyMetabolicSummary,
  FOOD_PRESETS,
  MEAL_SLOT_LABELS,
} from '../utils/metabolic';
import { MacrosDonutChart } from './MacrosDonutChart';
import { BrandWaveMark } from './WeightEvolutionChart';

interface NutritionHubViewProps {
  profile: UserProfile;
  selectedDate: string;
  metabolicSummary: DailyMetabolicSummary;
  dayMeals: MealEntry[];
  focusFoodInputTrigger?: number;
  onAddMeal: (meal: {
    mealType: MealSlot;
    name: string;
    grams: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }) => Promise<void>;
  onDeleteMeal: (meal: MealEntry) => void;
  onNavigateToEvolution: () => void;
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

export const NutritionHubView: React.FC<NutritionHubViewProps> = ({
  profile,
  selectedDate,
  metabolicSummary,
  dayMeals,
  focusFoodInputTrigger,
  onAddMeal,
  onDeleteMeal,
  onNavigateToEvolution,
}) => {
  const [subTab, setSubTab] = useState<'diary' | 'menu'>('diary');
  const [slotFilter, setSlotFilter] = useState<MealSlot | 'all'>('all');
  const foodNameInputRef = useRef<HTMLInputElement | null>(null);

  // Meal Form State (Meu Diário)
  const [mealType, setMealType] = useState<MealSlot>('lunch');
  const [selectedFoodPresetId, setSelectedFoodPresetId] = useState<string>(FOOD_PRESETS[0].id);
  const [mealName, setMealName] = useState<string>(FOOD_PRESETS[0].name);
  const [mealGrams, setMealGrams] = useState<number>(FOOD_PRESETS[0].defaultGrams);
  const [mealCalories, setMealCalories] = useState<number>(
    Math.round((FOOD_PRESETS[0].kcalPer100g * FOOD_PRESETS[0].defaultGrams) / 100)
  );
  const [mealProtein, setMealProtein] = useState<number>(
    Number(((FOOD_PRESETS[0].proteinPer100g * FOOD_PRESETS[0].defaultGrams) / 100).toFixed(1))
  );
  const [mealCarbs, setMealCarbs] = useState<number>(
    Number(((FOOD_PRESETS[0].carbsPer100g * FOOD_PRESETS[0].defaultGrams) / 100).toFixed(1))
  );
  const [mealFat, setMealFat] = useState<number>(
    Number(((FOOD_PRESETS[0].fatPer100g * FOOD_PRESETS[0].defaultGrams) / 100).toFixed(1))
  );

  // Suggested Menu State
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({
    breakfast: 0,
    lunch: 0,
    snack: 0,
    dinner: 0,
  });
  const [addingSlot, setAddingSlot] = useState<string | null>(null);
  const [addingFullDay, setAddingFullDay] = useState<boolean>(false);

  useEffect(() => {
    if (focusFoodInputTrigger && focusFoodInputTrigger > 0) {
      setSubTab('diary');
      setTimeout(() => {
        foodNameInputRef.current?.focus();
      }, 120);
    }
  }, [focusFoodInputTrigger]);

  const handleSelectFoodPreset = (presetId: string) => {
    setSelectedFoodPresetId(presetId);
    if (presetId === 'custom') return;
    const preset = FOOD_PRESETS.find((f) => f.id === presetId);
    if (!preset) return;
    setMealName(preset.name);
    setMealGrams(preset.defaultGrams);
    const factor = preset.defaultGrams / 100;
    setMealCalories(Math.round(preset.kcalPer100g * factor));
    setMealProtein(Number((preset.proteinPer100g * factor).toFixed(1)));
    setMealCarbs(Number((preset.carbsPer100g * factor).toFixed(1)));
    setMealFat(Number((preset.fatPer100g * factor).toFixed(1)));
  };

  const handleMealGramsChange = (grams: number) => {
    setMealGrams(grams);
    if (selectedFoodPresetId !== 'custom') {
      const preset = FOOD_PRESETS.find((f) => f.id === selectedFoodPresetId);
      if (preset) {
        const factor = Math.max(0, grams) / 100;
        setMealCalories(Math.round(preset.kcalPer100g * factor));
        setMealProtein(Number((preset.proteinPer100g * factor).toFixed(1)));
        setMealCarbs(Number((preset.carbsPer100g * factor).toFixed(1)));
        setMealFat(Number((preset.fatPer100g * factor).toFixed(1)));
      }
    }
  };

  const handleSubmitMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    await onAddMeal({
      mealType,
      name: mealName.trim(),
      grams: Math.max(1, mealGrams),
      calories: Math.max(0, mealCalories),
      proteinG: Math.max(0, mealProtein),
      carbsG: Math.max(0, mealCarbs),
      fatG: Math.max(0, mealFat),
    });
  };

  // Real-time Diagnostic Calculations
  const calorieDiff = metabolicSummary.targetIntakeCalories - metabolicSummary.consumedCalories;
  const protDiff = Math.round((metabolicSummary.targetProteinG - metabolicSummary.consumedProteinG) * 10) / 10;
  const carbDiff = Math.round((metabolicSummary.targetCarbsG - metabolicSummary.consumedCarbsG) * 10) / 10;
  const fatDiff = Math.round((metabolicSummary.targetFatG - metabolicSummary.consumedFatG) * 10) / 10;

  const diagnosticBanner = useMemo(() => {
    const absCal = Math.abs(calorieDiff);
    const goalLabel =
      profile.goalType === 'lose'
        ? 'Perda de Peso (Déficit)'
        : profile.goalType === 'gain'
        ? 'Ganho de Massa (Superávit)'
        : 'Manutenção Corporal';

    if (metabolicSummary.consumedCalories === 0) {
      return {
        tone: 'neutral' as const,
        badge: `Meta: ${goalLabel}`,
        headline: `Faltam ${metabolicSummary.targetIntakeCalories.toLocaleString('pt-BR')} kcal para fechar a meta de hoje`,
        detail: `Para bater a meta do dia, faltam ${Math.max(0, protDiff)}g de Proteína, ${Math.max(0, carbDiff)}g de Carboidrato e ${Math.max(0, fatDiff)}g de Gordura.`,
      };
    }

    if (absCal <= 90) {
      return {
        tone: 'success' as const,
        badge: 'Meta Calórica Atingida!',
        headline: `Parabéns! Seu consumo (${metabolicSummary.consumedCalories} kcal) está cravado na meta (${metabolicSummary.targetIntakeCalories} kcal)`,
        detail:
          protDiff <= 0
            ? `Meta de proteínas também batida (${metabolicSummary.consumedProteinG}g / ${metabolicSummary.targetProteinG}g)!`
            : `Faltam apenas ${protDiff}g de proteína para fechar 100% dos macros.`,
      };
    }

    if (calorieDiff > 90) {
      return {
        tone: 'pending' as const,
        badge: `Em Andamento · ${goalLabel}`,
        headline: `Faltam ${calorieDiff.toLocaleString('pt-BR')} kcal para atingir sua meta diária`,
        detail: `Restam consumir: ${Math.max(0, protDiff)}g Proteína · ${Math.max(0, carbDiff)}g Carboidratos · ${Math.max(0, fatDiff)}g Gorduras.`,
      };
    }

    return {
      tone: 'warning' as const,
      badge: 'Acima da Meta Planejada',
      headline: `Consumo ultrapassou a meta em +${absCal.toLocaleString('pt-BR')} kcal hoje`,
      detail: `Saldo metabólico atual: ${metabolicSummary.netCalorieBalance > 0 ? `+${metabolicSummary.netCalorieBalance}` : metabolicSummary.netCalorieBalance} kcal frente ao seu gasto total (${metabolicSummary.totalDailyExpenditure} kcal).`,
    };
  }, [
    calorieDiff,
    protDiff,
    carbDiff,
    fatDiff,
    profile.goalType,
    metabolicSummary,
  ]);

  // Suggested Menu scaled to close either the full target or remaining calories
  const generatedMealPlan = useMemo(() => {
    const targetKcal = metabolicSummary.targetIntakeCalories;
    return SLOT_DISTRIBUTION.map((slotConfig) => {
      const targetSlotKcal = Math.round(targetKcal * slotConfig.share);
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

      const loggedSlotMeals = dayMeals.filter((m) => m.mealType === slotConfig.slot);
      const loggedSlotCalories = loggedSlotMeals.reduce((acc, m) => acc + m.calories, 0);

      return {
        ...slotConfig,
        chosenOption,
        optionIdx,
        scaledGrams,
        scaledCalories,
        scaledProtein,
        scaledCarbs,
        scaledFat,
        loggedSlotCalories,
        isSlotCompleted: loggedSlotCalories >= targetSlotKcal * 0.75,
      };
    });
  }, [metabolicSummary.targetIntakeCalories, selectedOptions, dayMeals]);

  const handleAddSinglePlannedSlot = async (item: (typeof generatedMealPlan)[number]) => {
    setAddingSlot(item.slot);
    try {
      await onAddMeal({
        mealType: item.slot,
        name: item.chosenOption.title,
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

  const handleAddAllPlannedSlots = async () => {
    setAddingFullDay(true);
    try {
      for (const item of generatedMealPlan) {
        if (!item.isSlotCompleted) {
          await onAddMeal({
            mealType: item.slot,
            name: item.chosenOption.title,
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

  const filteredMeals = useMemo(() => {
    if (slotFilter === 'all') return dayMeals;
    return dayMeals.filter((m) => m.mealType === slotFilter);
  }, [dayMeals, slotFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 max-w-7xl mx-auto w-full pb-6"
    >
      {/* =====================================================================
          1. TOPO DA TELA: DIAGNÓSTICO EM TEMPO REAL + GRÁFICO DE ROSCA DUPLO
         ===================================================================== */}
      <div className="bg-white text-[#1B1C20] rounded-[34px] p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-full bg-[#1B1C20] text-white flex items-center justify-center shrink-0">
              <Utensils className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-xl font-display font-bold text-[#1B1C20]">
                Central de Nutrição &amp; Dieta ({selectedDate})
              </h2>
              <p className="text-xs text-slate-500">
                Meta diária: <strong>{metabolicSummary.targetIntakeCalories} kcal</strong> · Gasto
                Total (TDEE): <strong>{metabolicSummary.totalDailyExpenditure} kcal</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToEvolution}
            className="px-3.5 py-1.5 rounded-full bg-[#DDA3E6]/35 hover:bg-[#DDA3E6]/55 text-[#582B5E] text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>
              Objetivo:{' '}
              {profile.goalType === 'lose'
                ? `Perder Peso (${profile.dailyCalorieAdjustment} kcal)`
                : profile.goalType === 'gain'
                ? `Ganhar Massa (+${profile.dailyCalorieAdjustment} kcal)`
                : 'Manter Peso'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recharts Double Donut Chart + Macro Progress Cards */}
        <MacrosDonutChart
          consumedProteinG={metabolicSummary.consumedProteinG}
          targetProteinG={metabolicSummary.targetProteinG}
          consumedCarbsG={metabolicSummary.consumedCarbsG}
          targetCarbsG={metabolicSummary.targetCarbsG}
          consumedFatG={metabolicSummary.consumedFatG}
          targetFatG={metabolicSummary.targetFatG}
          consumedCalories={metabolicSummary.consumedCalories}
          targetCalories={metabolicSummary.targetIntakeCalories}
        />

        {/* Real-Time Diagnostic Banner */}
        <div
          className={`rounded-[24px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
            diagnosticBanner.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : diagnosticBanner.tone === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-[#8AC4F2]/25 border-[#8AC4F2]/50 text-[#1B1C20]'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {diagnosticBanner.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : diagnosticBanner.tone === 'warning' ? (
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-[#0A468E] shrink-0" />
              )}
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold opacity-75">
                {diagnosticBanner.badge}
              </span>
            </div>
            <div className="text-sm font-display font-bold leading-snug">
              {diagnosticBanner.headline}
            </div>
            <p className="text-xs opacity-80 leading-relaxed">{diagnosticBanner.detail}</p>
          </div>

          <div className="flex sm:flex-col items-end justify-between shrink-0 gap-1 font-mono bg-white/80 rounded-2xl px-3.5 py-2.5 border border-black/5">
            <span className="text-[10px] uppercase text-slate-400 font-bold">Saldo Líquido</span>
            <span className="text-base font-bold text-[#1B1C20]">
              {metabolicSummary.netCalorieBalance > 0 ? '+' : ''}
              {metabolicSummary.netCalorieBalance} kcal
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. SUB-NAVEGAÇÃO INTERNA (Segmented Control: Meu Diário | Cardápio Sugerido)
         ===================================================================== */}
      <div className="flex items-center justify-between gap-2 bg-white/10 p-1.5 rounded-full max-w-md mx-auto border border-white/10">
        <button
          type="button"
          onClick={() => setSubTab('diary')}
          className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            subTab === 'diary'
              ? 'bg-[#F3E3CA] text-[#1B1C20] shadow-md'
              : 'text-current opacity-70 hover:opacity-100'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Meu Diário ({dayMeals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('menu')}
          className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            subTab === 'menu'
              ? 'bg-[#DDA3E6] text-[#1B1C20] shadow-md'
              : 'text-current opacity-70 hover:opacity-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cardápio Sugerido</span>
        </button>
      </div>

      {/* =====================================================================
          SUB-ABA 1: MEU DIÁRIO (Calculadora TACO/USDA + Lista por Horário)
         ===================================================================== */}
      {subTab === 'diary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left 5 Cols: Warm Sand Meal Calculator Card */}
          <div className="lg:col-span-5 bg-[#F3E3CA] text-[#1B1C20] rounded-[34px] p-5 sm:p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-full bg-[#1B1C20] text-white flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-lg font-display font-bold text-[#1B1C20]">
                      Lançar Alimento no Diário
                    </h3>
                    <p className="text-xs text-[#1B1C20]/65">
                      Catálogo TACO / USDA ou personalizado por gramas
                    </p>
                  </div>
                </div>
                <BrandWaveMark className="w-6 h-6 text-[#1B1C20]" />
              </div>

              <form onSubmit={handleSubmitMeal} className="mt-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1B1C20]/80 mb-1">
                      Horário / Refeição
                    </label>
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value as MealSlot)}
                      className="w-full rounded-2xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1B1C20] focus:outline-none shadow-2xs"
                    >
                      {(Object.keys(MEAL_SLOT_LABELS) as MealSlot[]).map((slot) => (
                        <option key={slot} value={slot}>
                          {MEAL_SLOT_LABELS[slot]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1B1C20]/80 mb-1">
                      Catálogo TACO / USDA
                    </label>
                    <select
                      value={selectedFoodPresetId}
                      onChange={(e) => handleSelectFoodPreset(e.target.value)}
                      className="w-full rounded-2xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1B1C20] focus:outline-none shadow-2xs"
                    >
                      {FOOD_PRESETS.map((fp) => (
                        <option key={fp.id} value={fp.id}>
                          {fp.name} ({fp.kcalPer100g} kcal/100g)
                        </option>
                      ))}
                      <option value="custom">Personalizado (Digitar)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-[24px] p-4 shadow-2xs space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Descrição do Alimento
                      </label>
                      <input
                        ref={foodNameInputRef}
                        type="text"
                        required
                        maxLength={120}
                        value={mealName}
                        onChange={(e) => setMealName(e.target.value)}
                        className="w-full border-b border-dashed border-slate-300 pb-1 text-xs font-semibold text-[#1B1C20] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Peso (gramas)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        required
                        value={mealGrams}
                        onChange={(e) => handleMealGramsChange(Number(e.target.value))}
                        className="w-full border-b border-dashed border-slate-300 pb-1 text-xs font-mono tabular-nums font-bold text-[#1B1C20] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400">Kcal</label>
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        required
                        value={mealCalories}
                        onChange={(e) => {
                          setSelectedFoodPresetId('custom');
                          setMealCalories(Number(e.target.value));
                        }}
                        className="w-full mt-0.5 rounded-xl bg-[#F3E3CA]/50 px-2 py-1.5 text-xs font-mono tabular-nums font-bold text-[#1B1C20]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">Prot (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={1000}
                        value={mealProtein}
                        onChange={(e) => {
                          setSelectedFoodPresetId('custom');
                          setMealProtein(Number(e.target.value));
                        }}
                        className="w-full mt-0.5 rounded-xl bg-slate-100 px-2 py-1.5 text-xs font-mono tabular-nums text-[#1B1C20]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">Carb (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={1000}
                        value={mealCarbs}
                        onChange={(e) => {
                          setSelectedFoodPresetId('custom');
                          setMealCarbs(Number(e.target.value));
                        }}
                        className="w-full mt-0.5 rounded-xl bg-slate-100 px-2 py-1.5 text-xs font-mono tabular-nums text-[#1B1C20]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">Gord (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={1000}
                        value={mealFat}
                        onChange={(e) => {
                          setSelectedFoodPresetId('custom');
                          setMealFat(Number(e.target.value));
                        }}
                        className="w-full mt-0.5 rounded-xl bg-slate-100 px-2 py-1.5 text-xs font-mono tabular-nums text-[#1B1C20]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#1B1C20] text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar no Diário (+{mealCalories} kcal)</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right 7 Cols: Meal Diary List by Time Slot */}
          <div className="lg:col-span-7 bg-white text-[#1B1C20] rounded-[34px] p-5 sm:p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-display font-bold text-[#1B1C20]">
                    Alimentos Consumidos ({filteredMeals.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Filtre por horário ou veja todas as refeições de {selectedDate}
                  </p>
                </div>
              </div>

              {/* Slot Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-2.5">
                <button
                  type="button"
                  onClick={() => setSlotFilter('all')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                    slotFilter === 'all'
                      ? 'bg-[#1B1C20] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({dayMeals.length})
                </button>
                {(Object.keys(MEAL_SLOT_LABELS) as MealSlot[]).map((slot) => {
                  const count = dayMeals.filter((m) => m.mealType === slot).length;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSlotFilter(slot)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                        slotFilter === slot
                          ? 'bg-[#F3E3CA] text-[#1B1C20] font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {MEAL_SLOT_LABELS[slot]} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {filteredMeals.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Nenhuma refeição registrada neste horário em {selectedDate}.
                  </div>
                ) : (
                  filteredMeals.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-[22px] bg-slate-50 hover:bg-[#F3E3CA]/35 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#1B1C20] text-white flex items-center justify-center shrink-0">
                          <Utensils className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#1B1C20] truncate">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                            {MEAL_SLOT_LABELS[m.mealType]} · {m.grams}g · P:{m.proteinG}g C:
                            {m.carbsG}g G:{m.fatG}g
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold font-mono tabular-nums text-[#1B1C20]">
                          {m.calories} kcal
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteMeal(m)}
                          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200"
                          title="Remover refeição"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Total consumido no dia</span>
              <span className="text-xl font-display font-bold font-mono tabular-nums text-[#1B1C20]">
                {metabolicSummary.consumedCalories.toLocaleString('pt-BR')} /{' '}
                {metabolicSummary.targetIntakeCalories.toLocaleString('pt-BR')} kcal
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-ABA 2: CARDÁPIO SUGERIDO (Porções Calculadas + 1-Click Add)
         ===================================================================== */}
      {subTab === 'menu' && (
        <div className="bg-[#F3E3CA] text-[#1B1C20] rounded-[34px] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1B1C20]/10">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#1B1C20]/60 block">
                CARDÁPIO INTELIGENTE POR REFEIÇÃO
              </span>
              <h3 className="text-xl font-display font-bold text-[#1B1C20]">
                Sugestões Calculadas para {metabolicSummary.targetIntakeCalories} kcal
              </h3>
            </div>

            <button
              type="button"
              disabled={addingFullDay}
              onClick={handleAddAllPlannedSlots}
              className="px-4 py-2.5 rounded-full bg-[#1B1C20] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-[#F3E3CA]" />
              <span>
                {addingFullDay
                  ? 'Adicionando Cardápio...'
                  : 'Adicionar Cardápio Completo ao Diário'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {generatedMealPlan.map((slotItem) => (
              <div
                key={slotItem.slot}
                className="bg-white rounded-[26px] p-4 shadow-sm border border-[#1B1C20]/5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F3E3CA] text-[#1B1C20] font-bold text-xs">
                        {slotItem.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {slotItem.timeHint} · {Math.round(slotItem.share * 100)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {slotItem.options.map((opt, idx) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [slotItem.slot]: idx,
                            }))
                          }
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                            slotItem.optionIdx === idx
                              ? 'bg-[#1B1C20] text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          Opção {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-sm font-bold text-[#1B1C20]">
                      {slotItem.chosenOption.title}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {slotItem.chosenOption.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
                  <div className="text-[11px] font-mono text-slate-600">
                    <strong>{slotItem.scaledGrams}g</strong> ·{' '}
                    <strong className="text-[#1B1C20]">{slotItem.scaledCalories} kcal</strong> (P:
                    {slotItem.scaledProtein}g C:{slotItem.scaledCarbs}g G:{slotItem.scaledFat}g)
                  </div>

                  <button
                    type="button"
                    disabled={addingSlot === slotItem.slot}
                    onClick={() => handleAddSinglePlannedSlot(slotItem)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      slotItem.isSlotCompleted
                        ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                        : 'bg-[#1B1C20] text-white hover:bg-black shadow-xs'
                    }`}
                  >
                    {slotItem.isSlotCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+ Repetir</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar ao Diário</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
