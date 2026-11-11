/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  ListChecks,
  LogOut,
  Moon,
  Plus,
  Scale,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  Watch,
} from 'lucide-react';
import {
  subscribeAuth,
  signOutUser,
} from './firebase';
import {
  addMealRecord,
  addTodoRecord,
  addWorkoutRecord,
  deleteMealRecord,
  deleteTodoRecord,
  deleteWeightRecord,
  deleteWorkoutRecord,
  ensureUserProfile,
  saveWeightRecord,
  subscribeUserCollections,
  toggleTodoCompletion,
  updateUserProfileData,
  upsertDailyMetric,
} from './services/firestoreService';
import {
  DailyMetric,
  GoalType,
  MealEntry,
  MealSlot,
  TodoCategory,
  TodoItem,
  TodoScope,
  UserProfile,
  WeightEntry,
  WorkoutCategory,
  WorkoutEntry,
} from './types';
import {
  addDaysISO,
  analyzeWeightEvolutionAndForecast,
  calculateStepCalories,
  calculateWorkoutCalories,
  computeDailyMetabolicSummary,
  EXERCISE_PRESETS,
  formatDateISO,
  formatDisplayDatePt,
  TODO_CATEGORY_LABELS,
  WORKOUT_CATEGORY_LABELS,
} from './utils/metabolic';
import { WeightEvolutionChart, BrandWaveMark } from './components/WeightEvolutionChart';
import { BasalCalculatorModal } from './components/BasalCalculatorModal';
import { HealthHubModal } from './components/HealthHubModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AuthModal } from './components/AuthModal';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import { NutritionHubView } from './components/NutritionHubView';
import { QuickLogModal, QuickLogMode } from './components/QuickLogModal';

type ActiveSection = 'overview' | 'nutrition' | 'routine' | 'evolution';

const INITIAL_DEMO_PROFILE: UserProfile = {
  uid: 'demo_local',
  displayName: 'Rafael',
  sex: 'male',
  age: 30,
  heightCm: 177,
  currentWeightKg: 81.4,
  targetWeightKg: 75.0,
  activityFactor: 1.375,
  goalType: 'lose',
  dailyCalorieAdjustment: -500,
  stepGoal: 10000,
  waterGoalMl: 3000,
  googleFitConnected: true,
  appleHealthConnected: true,
};

export default function App() {
  const todayISO = useMemo(() => formatDateISO(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');

  // Theme State: 'dark' | 'light' (persisted in localStorage)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('metabolix_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('metabolix_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth & Cloud State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Domain Data State
  const [profile, setProfile] = useState<UserProfile>(INITIAL_DEMO_PROFILE);
  const [meals, setMeals] = useState<MealEntry[]>(() => [
    {
      id: 'demo_m1',
      userId: 'demo_local',
      date: todayISO,
      mealType: 'breakfast',
      name: 'Ovos Mexidos + Pão Integral + Café',
      grams: 160,
      calories: 295,
      proteinG: 18.5,
      carbsG: 24.0,
      fatG: 13.2,
    },
    {
      id: 'demo_m2',
      userId: 'demo_local',
      date: todayISO,
      mealType: 'lunch',
      name: 'Frango Grelhado + Arroz Integral + Feijão',
      grams: 390,
      calories: 488,
      proteinG: 56.4,
      carbsG: 49.7,
      fatG: 5.6,
    },
    {
      id: 'demo_m3',
      userId: 'demo_local',
      date: todayISO,
      mealType: 'snack',
      name: 'Whey Protein + Banana Prata',
      grams: 120,
      calories: 208,
      proteinG: 25.2,
      carbsG: 25.8,
      fatG: 1.6,
    },
  ]);

  const [workouts, setWorkouts] = useState<WorkoutEntry[]>(() => [
    {
      id: 'demo_w1',
      userId: 'demo_local',
      date: todayISO,
      activityName: 'Musculação Intensa (Hipertrofia)',
      category: 'strength',
      durationMinutes: 55,
      met: 6.0,
      caloriesBurned: 448,
      source: 'manual',
    },
  ]);

  const [weights, setWeights] = useState<WeightEntry[]>(() => [
    {
      id: 'demo_wt1',
      userId: 'demo_local',
      date: addDaysISO(todayISO, -14),
      weightKg: 82.8,
      note: 'Início do protocolo metabólico',
      source: 'manual',
    },
    {
      id: 'demo_wt2',
      userId: 'demo_local',
      date: addDaysISO(todayISO, -7),
      weightKg: 82.1,
      note: 'Pesagem em jejum — Semana 1',
      source: 'google_fit',
    },
    {
      id: 'demo_wt3',
      userId: 'demo_local',
      date: todayISO,
      weightKg: 81.4,
      note: 'Pesagem oficial em jejum — Semana 2',
      source: 'apple_health',
    },
  ]);

  const [todos, setTodos] = useState<TodoItem[]>(() => [
    {
      id: 'demo_td1',
      userId: 'demo_local',
      title: 'Bater 2,0g/kg de proteína no dia',
      category: 'nutrition',
      scope: 'daily',
      targetDate: todayISO,
      completed: true,
      lastCompletedDate: todayISO,
    },
    {
      id: 'demo_td2',
      userId: 'demo_local',
      title: 'Sincronizar 10.000 passos (Google Fit / Watch)',
      category: 'workout',
      scope: 'daily',
      targetDate: todayISO,
      completed: false,
      lastCompletedDate: '',
    },
    {
      id: 'demo_td3',
      userId: 'demo_local',
      title: 'Beber 3.000 ml de água mineral',
      category: 'hydration',
      scope: 'daily',
      targetDate: todayISO,
      completed: false,
      lastCompletedDate: '',
    },
    {
      id: 'demo_td4',
      userId: 'demo_local',
      title: 'Treino A: Superior + 20 min Cardio',
      category: 'workout',
      scope: 'date_specific',
      targetDate: todayISO,
      completed: true,
      lastCompletedDate: todayISO,
    },
    {
      id: 'demo_td5',
      userId: 'demo_local',
      title: 'Pesagem em jejum e conferir previsão 30d',
      category: 'measurement',
      scope: 'date_specific',
      targetDate: todayISO,
      completed: false,
      lastCompletedDate: '',
    },
  ]);

  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>(() => [
    {
      id: 'demo_dm1',
      userId: 'demo_local',
      date: todayISO,
      steps: 8640,
      activeCalories: calculateStepCalories(8640, 81.4),
      waterMl: 2250,
      sleepHours: 7.6,
      restingHeartRate: 59,
      syncSource: 'combined',
    },
  ]);

  // Modals & Quick Log State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [basalModalOpen, setBasalModalOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickLogInitialMode, setQuickLogInitialMode] = useState<QuickLogMode>('menu');
  const [focusFoodTrigger, setFocusFoodTrigger] = useState(0);

  const [pendingDelete, setPendingDelete] = useState<{
    type: 'meal' | 'workout' | 'weight' | 'todo';
    id: string;
    label: string;
  } | null>(null);

  // Workout Form State (Rotina)
  const [workoutCategoryFilter, setWorkoutCategoryFilter] = useState<WorkoutCategory | 'all'>('all');
  const [selectedExercisePresetId, setSelectedExercisePresetId] = useState<string>(
    EXERCISE_PRESETS[0].id
  );
  const [workoutName, setWorkoutName] = useState<string>(EXERCISE_PRESETS[0].name);
  const [workoutCategory, setWorkoutCategory] = useState<WorkoutCategory>(
    EXERCISE_PRESETS[0].category
  );
  const [workoutDuration, setWorkoutDuration] = useState<number>(
    EXERCISE_PRESETS[0].defaultDuration
  );
  const [workoutMet, setWorkoutMet] = useState<number>(EXERCISE_PRESETS[0].met);
  const [workoutCustomCalories, setWorkoutCustomCalories] = useState<number | null>(null);

  // Weight Check-In Form State (Evolução + Gatilho Matinal Home)
  const [weightInputKg, setWeightInputKg] = useState<number>(profile.currentWeightKg);
  const [weightNote, setWeightNote] = useState<string>('Pesagem em jejum pela manhã');
  const [inlineMorningWeightKg, setInlineMorningWeightKg] = useState<number>(profile.currentWeightKg);
  const [morningSavedFeedback, setMorningSavedFeedback] = useState<boolean>(false);

  // To-Do Form & Filter State (Rotina)
  const [todoTitle, setTodoTitle] = useState<string>('');
  const [todoCategory, setTodoCategory] = useState<TodoCategory>('nutrition');
  const [todoScope, setTodoScope] = useState<TodoScope>('daily');
  const [todoFilterScope, setTodoFilterScope] = useState<'all' | 'daily' | 'date_specific'>('all');
  const [todoCategoryFilter, setTodoCategoryFilter] = useState<TodoCategory | 'all'>('all');

  useEffect(() => {
    setWeightInputKg(profile.currentWeightKg);
    setInlineMorningWeightKg(profile.currentWeightKg);
  }, [profile.currentWeightKg]);

  // Firebase Auth & Firestore Real-Time Subscription
  useEffect(() => {
    const unsubAuth = subscribeAuth(async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        try {
          await ensureUserProfile(currentUser.uid, currentUser.displayName);
        } catch (err) {
          console.error('Erro ao inicializar perfil:', err);
        }
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    const unsubData = subscribeUserCollections(user.uid, {
      onProfile: setProfile,
      onMeals: setMeals,
      onWorkouts: setWorkouts,
      onWeights: setWeights,
      onTodos: setTodos,
      onDailyMetrics: setDailyMetrics,
    });
    return () => unsubData();
  }, [authReady, user]);

  // Filtered records for selectedDate
  const dayMeals = useMemo(
    () => meals.filter((m) => m.date === selectedDate),
    [meals, selectedDate]
  );

  const dayWorkouts = useMemo(
    () => workouts.filter((w) => w.date === selectedDate),
    [workouts, selectedDate]
  );

  const weightForSelectedDate = useMemo(
    () => weights.find((w) => w.date === selectedDate),
    [weights, selectedDate]
  );

  const currentDayMetric: DailyMetric = useMemo(() => {
    const found = dailyMetrics.find((dm) => dm.date === selectedDate);
    if (found) return found;
    return {
      id: `metric_${selectedDate}`,
      userId: user?.uid || 'demo_local',
      date: selectedDate,
      steps: 0,
      activeCalories: 0,
      waterMl: 0,
      sleepHours: 7.5,
      restingHeartRate: 60,
      syncSource: 'manual',
    };
  }, [dailyMetrics, selectedDate, user]);

  // Metabolic Summary & Weight Forecast (Reactively recalculated whenever profile.currentWeightKg changes)
  const metabolicSummary = useMemo(
    () =>
      computeDailyMetabolicSummary(
        profile,
        dayMeals,
        dayWorkouts,
        currentDayMetric.steps
      ),
    [profile, dayMeals, dayWorkouts, currentDayMetric.steps]
  );

  const forecast = useMemo(
    () =>
      analyzeWeightEvolutionAndForecast(
        profile,
        weights,
        metabolicSummary.netCalorieBalance
      ),
    [profile, weights, metabolicSummary.netCalorieBalance]
  );

  // Todos for selected date
  const dailyHabitTodos = useMemo(
    () => todos.filter((t) => t.scope === 'daily'),
    [todos]
  );

  const specificDayTodos = useMemo(
    () => todos.filter((t) => t.scope === 'date_specific' && t.targetDate === selectedDate),
    [todos, selectedDate]
  );

  const isTodoCompletedOnSelectedDate = (t: TodoItem): boolean => {
    if (t.scope === 'daily') {
      return t.completed && t.lastCompletedDate === selectedDate;
    }
    return t.completed;
  };

  const allTodosForSelectedDate = useMemo(
    () => [...dailyHabitTodos, ...specificDayTodos],
    [dailyHabitTodos, specificDayTodos]
  );

  // Prioritize pending habits on Home Sand Card (up to 3 items)
  const homeCardHabits = useMemo(() => {
    const pending = allTodosForSelectedDate.filter((t) => !isTodoCompletedOnSelectedDate(t));
    const completed = allTodosForSelectedDate.filter((t) => isTodoCompletedOnSelectedDate(t));
    return [...pending, ...completed].slice(0, 3);
  }, [allTodosForSelectedDate, selectedDate]);

  const totalTodosToday = allTodosForSelectedDate.length;
  const completedTodosToday = allTodosForSelectedDate.filter((t) =>
    isTodoCompletedOnSelectedDate(t)
  ).length;

  // Goal-aware Calorie Balance Badge on Home Blue Card
  const calorieGoalStatus = useMemo(() => {
    const net = metabolicSummary.netCalorieBalance;
    const rem = metabolicSummary.remainingCaloriesForTarget;

    if (profile.goalType === 'gain') {
      // Goal: Gain Mass (+surplus desired)
      if (net < 0) {
        return {
          tone: 'warning' as const,
          label: `Alerta: Em Déficit (${net} kcal) p/ Ganho`,
          subtext: `Faltam ${Math.max(0, rem)} kcal para atingir o superávit planejado`,
        };
      }
      if (Math.abs(rem) <= 120 || net > 0) {
        return {
          tone: 'success' as const,
          label: `Superávit Ativo (+${net} kcal) · Ganho`,
          subtext: 'Saldo positivo alinhado com hipertrofia',
        };
      }
      return {
        tone: 'neutral' as const,
        label: `Faltam ${rem} kcal p/ Meta`,
        subtext: 'Continue lançando suas refeições do dia',
      };
    }

    if (profile.goalType === 'lose') {
      // Goal: Lose Weight (deficit desired)
      if (net > 50) {
        return {
          tone: 'warning' as const,
          label: `Alerta: Superávit (+${net} kcal) em Corte`,
          subtext: `Consumo acima do gasto total diário`,
        };
      }
      if (rem < -100) {
        return {
          tone: 'warning' as const,
          label: `Acima da Meta (+${Math.abs(rem)} kcal)`,
          subtext: `Ainda em déficit líquido de ${net} kcal`,
        };
      }
      return {
        tone: 'success' as const,
        label: `Déficit Ativo (${net} kcal) · Perda de Peso`,
        subtext:
          Math.abs(rem) <= 90
            ? 'Meta calórica do dia atingida com precisão!'
            : `Restam ${Math.max(0, rem)} kcal dentro do limite diário`,
      };
    }

    // Goal: Maintain Weight
    if (Math.abs(net) <= 200) {
      return {
        tone: 'success' as const,
        label: `Equilíbrio Calórico (${net > 0 ? `+${net}` : net} kcal)`,
        subtext: 'Dentro da faixa de manutenção corporal',
      };
    }
    return {
      tone: 'warning' as const,
      label: `Desvio de Manutenção (${net > 0 ? `+${net}` : net} kcal)`,
      subtext: `Ajuste refeições ou treino para equilibrar`,
    };
  }, [
    metabolicSummary.netCalorieBalance,
    metabolicSummary.remainingCaloriesForTarget,
    profile.goalType,
  ]);

  // =========================================================================
  // CORE REACTIVE HANDLERS (Meals, Water, Workouts, Cascade Weight, Goal)
  // =========================================================================

  const handleAddMealObject = async (mealInput: {
    mealType: MealSlot;
    name: string;
    grams: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }) => {
    const newEntry = {
      date: selectedDate,
      ...mealInput,
    };
    if (user) {
      await addMealRecord(user.uid, newEntry);
    } else {
      setMeals((prev) => [
        ...prev,
        {
          id: `local_m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: 'demo_local',
          ...newEntry,
        },
      ]);
    }
  };

  const handleQuickAddWater = async (deltaMl: number) => {
    const nextWater = Math.max(0, Math.min(12000, currentDayMetric.waterMl + deltaMl));
    const metricPayload = {
      steps: currentDayMetric.steps,
      activeCalories: currentDayMetric.activeCalories,
      waterMl: nextWater,
      sleepHours: currentDayMetric.sleepHours,
      restingHeartRate: currentDayMetric.restingHeartRate,
      syncSource: currentDayMetric.syncSource,
    };

    if (user) {
      await upsertDailyMetric(user.uid, selectedDate, metricPayload);
    } else {
      setDailyMetrics((prev) => [
        ...prev.filter((d) => d.date !== selectedDate),
        {
          id: `local_dm_${selectedDate}`,
          userId: 'demo_local',
          date: selectedDate,
          ...metricPayload,
        },
      ]);
    }
  };

  // Cascade Weight Save: updates weight log AND profile.currentWeightKg -> recalculates BMR, Macros & METs
  const handleSaveWeightCascade = async (rawWeightKg: number, noteText: string) => {
    const cleanW = Number(Math.max(25, Math.min(350, rawWeightKg)).toFixed(1));
    const entry = {
      date: selectedDate,
      weightKg: cleanW,
      note: noteText.trim() || 'Registro manual de peso',
      source: 'manual' as const,
    };

    // Immediately update local profile state for instant reactive cascade on BMR, Macros & METs
    setProfile((prev) => ({ ...prev, currentWeightKg: cleanW }));

    if (user) {
      await saveWeightRecord(user.uid, { ...profile, currentWeightKg: cleanW }, entry);
    } else {
      setWeights((prev) => {
        const filtered = prev.filter((w) => w.date !== selectedDate);
        return [
          ...filtered,
          { id: `local_wt_${selectedDate}`, userId: 'demo_local', ...entry },
        ];
      });
    }
  };

  const handleSaveWeightForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveWeightCascade(weightInputKg, weightNote);
  };

  const handleInlineMorningWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await handleSaveWeightCascade(inlineMorningWeightKg, 'Pesagem matinal rápida (Painel Hoje)');
    setMorningSavedFeedback(true);
    setTimeout(() => setMorningSavedFeedback(false), 2500);
  };

  const handleUpdateGoalAndAdjustment = async (
    goalType: GoalType,
    dailyCalorieAdjustment: number
  ) => {
    const updatedProfile: UserProfile = {
      ...profile,
      goalType,
      dailyCalorieAdjustment,
    };
    setProfile(updatedProfile);
    if (user) {
      await updateUserProfileData(user.uid, updatedProfile);
    }
  };

  // Handlers for Exercise Preset & Duration
  const filteredExercisePresets = useMemo(() => {
    if (workoutCategoryFilter === 'all') return EXERCISE_PRESETS;
    return EXERCISE_PRESETS.filter((ex) => ex.category === workoutCategoryFilter);
  }, [workoutCategoryFilter]);

  const handleSelectExercisePreset = (presetId: string) => {
    setSelectedExercisePresetId(presetId);
    setWorkoutCustomCalories(null);
    if (presetId === 'custom') return;
    const preset = EXERCISE_PRESETS.find((ex) => ex.id === presetId);
    if (!preset) return;
    setWorkoutName(preset.name);
    setWorkoutCategory(preset.category);
    setWorkoutDuration(preset.defaultDuration);
    setWorkoutMet(preset.met);
  };

  const calculatedExerciseCalories = useMemo(
    () =>
      workoutCustomCalories !== null
        ? workoutCustomCalories
        : calculateWorkoutCalories(workoutMet, profile.currentWeightKg, workoutDuration),
    [workoutCustomCalories, workoutMet, profile.currentWeightKg, workoutDuration]
  );

  const handleAddWorkoutObject = async (workoutInput: {
    activityName: string;
    category: WorkoutCategory;
    durationMinutes: number;
    met: number;
    caloriesBurned: number;
  }) => {
    const newWorkout = {
      date: selectedDate,
      ...workoutInput,
      source: 'manual' as const,
    };
    if (user) {
      await addWorkoutRecord(user.uid, newWorkout);
    } else {
      setWorkouts((prev) => [
        ...prev,
        { id: `local_wk_${Date.now()}`, userId: 'demo_local', ...newWorkout },
      ]);
    }
  };

  const handleAddWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutName.trim()) return;
    await handleAddWorkoutObject({
      activityName: workoutName.trim(),
      category: workoutCategory,
      durationMinutes: Math.max(1, workoutDuration),
      met: Math.max(1, workoutMet),
      caloriesBurned: Math.max(1, calculatedExerciseCalories),
    });
  };

  // Handler for To-Do Creation & Toggling
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoTitle.trim()) return;
    const newTodo = {
      title: todoTitle.trim(),
      category: todoCategory,
      scope: todoScope,
      targetDate: selectedDate,
      completed: false,
      lastCompletedDate: '',
    };

    if (user) {
      await addTodoRecord(user.uid, newTodo);
    } else {
      setTodos((prev) => [
        ...prev,
        { id: `local_td_${Date.now()}`, userId: 'demo_local', ...newTodo },
      ]);
    }
    setTodoTitle('');
  };

  const handleToggleTodo = async (todo: TodoItem) => {
    if (user) {
      await toggleTodoCompletion(todo, selectedDate);
    } else {
      setTodos((prev) =>
        prev.map((item) => {
          if (item.id !== todo.id) return item;
          const currentlyDone = isTodoCompletedOnSelectedDate(item);
          return {
            ...item,
            completed: !currentlyDone,
            lastCompletedDate: !currentlyDone ? selectedDate : '',
          };
        })
      );
    }
  };

  // Filtered Todos for Rotina tab (by category pill + scope)
  const filteredDailyTodos = useMemo(() => {
    if (todoCategoryFilter === 'all') return dailyHabitTodos;
    return dailyHabitTodos.filter((t) => t.category === todoCategoryFilter);
  }, [dailyHabitTodos, todoCategoryFilter]);

  const filteredSpecificTodos = useMemo(() => {
    if (todoCategoryFilter === 'all') return specificDayTodos;
    return specificDayTodos.filter((t) => t.category === todoCategoryFilter);
  }, [specificDayTodos, todoCategoryFilter]);

  // Handler for Confirming Delete
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    setPendingDelete(null);

    if (user) {
      if (type === 'meal') await deleteMealRecord(id);
      else if (type === 'workout') await deleteWorkoutRecord(id);
      else if (type === 'weight') await deleteWeightRecord(id);
      else if (type === 'todo') await deleteTodoRecord(id);
    } else {
      if (type === 'meal') setMeals((p) => p.filter((x) => x.id !== id));
      else if (type === 'workout') setWorkouts((p) => p.filter((x) => x.id !== id));
      else if (type === 'weight') setWeights((p) => p.filter((x) => x.id !== id));
      else if (type === 'todo') setTodos((p) => p.filter((x) => x.id !== id));
    }
  };

  // Helper to render the top avatar + plus button cluster
  const renderAvatarCluster = (
    plusBgClass: string,
    onPlusClick: (e: React.MouseEvent) => void,
    plusTitle: string
  ) => (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-10 rounded-full bg-[#1B1C20] text-white flex items-center justify-center font-display font-bold text-sm overflow-hidden border-2 border-white/60 shadow-xs shrink-0">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={profile.displayName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{(profile.displayName || 'R').slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onPlusClick}
        title={plusTitle}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-xs shrink-0 ${plusBgClass}`}
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );

  // Staggered Fade-In & Slide-Up Motion Variants
  const tabContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.075,
        delayChildren: 0.02,
      },
    },
    exit: {
      opacity: 0,
      y: 8,
      transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

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

  return (
    <div
      className={`min-h-screen flex flex-col pb-24 transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-[#19191E] text-white'
          : 'bg-[#F4F5F8] text-[#1B1C20]'
      }`}
    >
      {/* Header Bar - adapts to Dark and Light modes */}
      <header
        className={`sticky top-0 flex items-center justify-between gap-3 px-4 sm:px-6 h-14 border-b shrink-0 z-30 transition-colors duration-200 ${
          theme === 'dark'
            ? 'border-white/10 bg-[#19191E]/95 backdrop-blur-md text-white'
            : 'border-slate-200/90 bg-white/95 backdrop-blur-md text-slate-900 shadow-2xs'
        }`}
      >
        {/* Brand Wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('overview');
          }}
          className="flex items-center gap-2.5 text-base font-bold tracking-tight font-display whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        >
          <BrandWaveMark className="w-6 h-6 text-[#8AC4F2]" />
          <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
            Mais Saudável
          </span>
        </a>

        {/* User Account, Theme Mode Toggle, PWA Install & Wearable Sync */}
        <div className="flex items-center gap-2 shrink-0">
          {/* PWA In-App Install Button */}
          <PWAInstallButton theme={theme} />

          {/* Theme Toggle Button (Claro / Escuro) */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              theme === 'dark'
                ? 'bg-white/10 hover:bg-white/20 text-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-2xs'
            }`}
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            aria-label={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBasalModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
                  theme === 'dark'
                    ? 'text-white bg-white/10 hover:bg-white/15'
                    : 'text-slate-800 bg-slate-100 hover:bg-slate-200'
                }`}
                title="Ver e Editar Perfil"
              >
                <div className="w-4 h-4 rounded-full bg-[#8AC4F2] text-[#0A468E] flex items-center justify-center font-bold text-[9px] shrink-0">
                  {(user.displayName || profile.displayName || 'U').slice(0, 1).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate hidden sm:inline">
                  {user.displayName || profile.displayName}
                </span>
              </button>
              <button
                type="button"
                onClick={signOutUser}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                  theme === 'dark'
                    ? 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
                title="Desconectar do Perfil"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#0A468E] bg-[#8AC4F2] hover:bg-[#9ed0f8] rounded-full transition-colors whitespace-nowrap shadow-xs"
            >
              <span>Entrar / Cadastrar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setHealthModalOpen(true)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 ${
              theme === 'dark'
                ? 'text-[#1B1C20] bg-white hover:bg-white/90'
                : 'text-[#0A468E] bg-[#8AC4F2] hover:bg-[#9ed0f8]'
            }`}
          >
            <span className="hidden sm:inline">Google Fit &amp; </span>Health
          </button>
        </div>
      </header>

      {/* Offline Mode Indicator */}
      <OfflineIndicator />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 flex flex-col justify-start">
        {/* On-Page Date Filter Toolbar */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2.5 mb-3 rounded-2xl px-3.5 py-2 shrink-0 transition-colors duration-200 ${
            theme === 'dark'
              ? 'bg-white/5 border border-white/10 text-white'
              : 'bg-white border border-slate-200/90 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider hidden sm:inline ${
                theme === 'dark' ? 'text-white/50' : 'text-slate-400'
              }`}
            >
              Data:
            </span>
            <div className="flex items-center rounded-full bg-white text-[#1B1C20] px-2 py-1 shadow-xs border border-slate-200/60">
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))}
                className="p-1 text-[#1B1C20]/70 hover:text-[#1B1C20] rounded-full transition-colors"
                title="Dia anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="w-3.5 h-3.5 text-[#582B5E]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-mono tabular-nums font-bold text-[#1B1C20] focus:outline-none cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))}
                className="p-1 text-[#1B1C20]/70 hover:text-[#1B1C20] rounded-full transition-colors"
                title="Próximo dia"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedDate !== todayISO && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayISO)}
                className="px-3 py-1 text-xs font-bold text-[#1B1C20] bg-[#F3E3CA] hover:bg-white rounded-full transition-colors whitespace-nowrap shadow-xs"
              >
                Ir para hoje
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`text-[11px] font-medium ${
                theme === 'dark' ? 'text-white/60' : 'text-slate-600'
              }`}
            >
              {formatDisplayDatePt(selectedDate)}
            </span>
            {selectedDate === todayISO && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-300 text-[10px] font-bold">
                Dia Atual
              </span>
            )}
          </div>
        </div>

        {authError && (
          <div className="mb-3 p-3 rounded-2xl bg-[#F3E3CA] text-[#1B1C20] text-xs font-medium flex items-center justify-between shrink-0">
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="underline ml-4 whitespace-nowrap shrink-0"
            >
              Fechar
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* =====================================================================
              ABA 1: "HOJE" (Overview Interativo — 3 Cards com Drill-Down)
             ===================================================================== */}
          {activeSection === 'overview' && (
            <motion.div
              key={`overview-${selectedDate}`}
              variants={tabContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch my-auto max-w-6xl mx-auto w-full"
            >
              {/* -----------------------------------------------------------------
                  CARD 1: SKY BLUE PANEL (#8AC4F2) — Balanço Calórico (Drill-down -> Nutrição)
                 ----------------------------------------------------------------- */}
              <motion.section
                variants={summaryCardVariants}
                onClick={() => setActiveSection('nutrition')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveSection('nutrition');
                  }
                }}
                aria-label="Balanço Calórico — Clique para abrir Nutrição"
                className="bg-[#8AC4F2] text-[#1B1C20] rounded-[32px] p-5 flex flex-col justify-between shadow-xl min-h-[395px] lg:min-h-[430px] cursor-pointer hover:scale-[1.008] transition-transform text-left"
              >
                <div>
                  {/* Header inside Blue Screen */}
                  <div className="flex items-center justify-between">
                    {renderAvatarCluster(
                      'bg-[#0A468E] text-white hover:bg-[#083872]',
                      (e) => {
                        e.stopPropagation();
                        setBasalModalOpen(true);
                      },
                      'Configurar Taxa Basal (TMB)'
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold font-mono tracking-wider text-[#0A468E] uppercase px-2.5 py-0.5 rounded-full bg-white/50 flex items-center gap-1">
                        <span>Ir p/ Nutrição</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                      <BrandWaveMark className="w-6 h-6 text-[#0A468E]" />
                    </div>
                  </div>

                  {/* Main Hero: Total Daily Caloric Expenditure */}
                  <div className="mt-4">
                    <span className="text-xs font-semibold text-[#0A468E]">
                      Gasto Metabólico Total (TDEE)
                    </span>
                    <div className="text-[32px] xl:text-[36px] font-display font-bold font-mono tabular-nums tracking-tight text-[#0A468E] leading-none mt-1">
                      {metabolicSummary.totalDailyExpenditure.toLocaleString('pt-BR')}{' '}
                      <span className="text-sm font-sans font-medium text-[#1B1C20]">kcal/dia</span>
                    </div>
                  </div>

                  {/* Compact Charcoal BMR & Goal-Aware Status Badge */}
                  <div className="bg-[#1B1C20] text-white rounded-[22px] p-3.5 mt-3 shadow-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-display font-bold italic tracking-wider text-[#8AC4F2]">
                        TMB {metabolicSummary.bmrMifflin} kcal · Peso {profile.currentWeightKg} kg
                      </span>
                      <span className="text-[10px] font-semibold text-[#1B1C20] bg-[#8AC4F2] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        Nutrição <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/70">
                        Meta (
                        {profile.goalType === 'lose'
                          ? 'Perder Peso'
                          : profile.goalType === 'gain'
                          ? 'Ganhar Massa'
                          : 'Manter'}
                        ):
                      </span>
                      <span className="font-bold text-white">
                        {metabolicSummary.targetIntakeCalories.toLocaleString('pt-BR')} kcal
                      </span>
                    </div>

                    {/* Goal-Aware Calorie Status Badge */}
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                          Status do Objetivo:
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                            calorieGoalStatus.tone === 'success'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                              : calorieGoalStatus.tone === 'warning'
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : 'bg-[#8AC4F2]/20 text-[#8AC4F2]'
                          }`}
                        >
                          {calorieGoalStatus.tone === 'warning' ? (
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                          )}
                          <span>{calorieGoalStatus.label}</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-white/60">{calorieGoalStatus.subtext}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Twin Action Pills (Consumo vs Gasto Ativo) */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
                  <div className="bg-white rounded-[20px] p-3 text-left shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-[#E8F2FC] text-[#1B1C20] flex items-center justify-center">
                        <ArrowDown className="w-3 h-3" />
                      </span>
                      <span className="text-[10px] text-[#0A468E] font-bold">
                        {metabolicSummary.consumedProteinG}/{metabolicSummary.targetProteinG}g P
                      </span>
                    </div>
                    <div className="mt-2 text-base font-bold font-mono tabular-nums text-[#1B1C20]">
                      {metabolicSummary.consumedCalories.toLocaleString('pt-BR')} kcal
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Meta: {metabolicSummary.targetIntakeCalories} kcal
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSection('routine');
                    }}
                    className="bg-white rounded-[20px] p-3 text-left hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-[#E8F2FC] text-[#1B1C20] flex items-center justify-center">
                        <ArrowUp className="w-3 h-3" />
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {dayWorkouts.length} treino(s)
                      </span>
                    </div>
                    <div className="mt-2 text-base font-bold font-mono tabular-nums text-[#1B1C20]">
                      +{metabolicSummary.workoutCalories + metabolicSummary.stepCalories} kcal
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Saldo: {metabolicSummary.netCalorieBalance > 0 ? '+' : ''}
                      {metabolicSummary.netCalorieBalance} kcal
                    </div>
                  </button>
                </div>
              </motion.section>

              {/* -----------------------------------------------------------------
                  CARD 2: ORCHID LAVENDER PANEL (#DDA3E6) — Previsão & Gatilho Matinal (Drill-down -> Evolução)
                 ----------------------------------------------------------------- */}
              <motion.section
                variants={summaryCardVariants}
                onClick={() => setActiveSection('evolution')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveSection('evolution');
                  }
                }}
                aria-label="Previsão Corporal e Pesagem — Clique para abrir Evolução"
                className="bg-[#DDA3E6] text-[#1B1C20] rounded-[32px] p-5 flex flex-col justify-between shadow-xl min-h-[395px] lg:min-h-[430px] cursor-pointer hover:scale-[1.008] transition-transform text-left"
              >
                <div>
                  {/* Header inside Lavender Screen */}
                  <div className="flex items-center justify-between">
                    {renderAvatarCluster(
                      'bg-[#582B5E] text-white hover:bg-[#431F48]',
                      (e) => {
                        e.stopPropagation();
                        setActiveSection('evolution');
                      },
                      'Ver Evolução Corporal'
                    )}
                    <div className="bg-white rounded-full px-3 py-1 text-[11px] font-mono tabular-nums font-semibold text-[#1B1C20] flex items-center gap-1.5 shadow-2xs">
                      <span>Ir p/ Evolução</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#582B5E]" />
                    </div>
                  </div>

                  {/* Main Hero: 30-Day Weight Projection */}
                  <div className="mt-4">
                    <span className="text-xs font-semibold text-[#582B5E]">
                      Projeção Wishnofsky em 30 Dias
                    </span>
                    <div className="text-[32px] xl:text-[36px] font-display font-bold font-mono tabular-nums tracking-tight text-[#1B1C20] leading-none mt-1">
                      {forecast.projected30DaysPlannedKg.toFixed(1)}{' '}
                      <span className="text-sm font-sans font-medium">kg</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-mono text-[#3B1940]/80">
                      <span>Ritmo:</span>
                      <span className="font-bold">{forecast.plannedWeeklyRateKg} kg/sem</span>
                      <span>· Meta: {profile.targetWeightKg.toFixed(1)} kg</span>
                    </div>
                  </div>

                  {/* GATILHO MATINAL: Se não houver pesagem na data selecionada, exibe input compacto direto */}
                  {!weightForSelectedDate ? (
                    <form
                      onSubmit={handleInlineMorningWeightSubmit}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#1B1C20] text-white rounded-[22px] p-3.5 mt-3 shadow-md space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#DDA3E6] flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5" />
                          <span>Gatilho Matinal · Registrar peso de hoje:</span>
                        </span>
                        <span className="text-[10px] font-mono text-white/50">{selectedDate}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="0.1"
                            min={25}
                            max={350}
                            required
                            value={inlineMorningWeightKg}
                            onChange={(e) => setInlineMorningWeightKg(Number(e.target.value))}
                            className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#DDA3E6]"
                            aria-label="Peso de hoje em kg"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50 font-mono">
                            kg
                          </span>
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl bg-[#DDA3E6] hover:bg-white text-[#1B1C20] font-bold text-xs transition-colors shrink-0 shadow-xs"
                        >
                          Salvar
                        </button>
                      </div>
                      <p className="text-[10px] text-white/60">
                        Atualiza automaticamente sua TMB, macros e gasto MET
                      </p>
                    </form>
                  ) : (
                    /* Compact White Trajectory Card when weight is already logged for selectedDate */
                    <div className="bg-white rounded-[22px] p-3.5 mt-3 shadow-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-[#582B5E]" />
                          <span className="text-xs font-bold text-[#1B1C20]">
                            Peso Registrado Hoje
                          </span>
                        </div>
                        <span className="text-sm font-bold font-mono tabular-nums text-[#582B5E]">
                          {weightForSelectedDate.weightKg.toFixed(1)} kg
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Status Evolução:</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#DDA3E6]/30 text-[#431F48] font-bold text-[10px]">
                          {forecast.statusLabel}
                        </span>
                      </div>

                      {morningSavedFeedback && (
                        <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Peso salvo! TMB e macros recalculados.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Quick-Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
                  <div className="bg-white rounded-[20px] py-2.5 px-3 text-xs font-bold text-[#1B1C20] flex items-center justify-center gap-1.5 shadow-xs">
                    <Scale className="w-3.5 h-3.5 text-[#582B5E]" />
                    <span>Curva 30/60/90d</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHealthModalOpen(true);
                    }}
                    className="bg-[#582B5E] hover:bg-[#431F48] text-white rounded-[20px] py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Footprints className="w-3.5 h-3.5" />
                    <span>Sincronizar</span>
                  </button>
                </div>
              </motion.section>

              {/* -----------------------------------------------------------------
                  CARD 3: WARM SAND PANEL (#F3E3CA) — Resumo Nutricional & Hábitos
                 ----------------------------------------------------------------- */}
              <motion.section
                variants={summaryCardVariants}
                aria-label="Resumo Nutricional e Hábitos Pendentes do Dia"
                className="bg-[#F3E3CA] text-[#1B1C20] rounded-[32px] p-5 flex flex-col justify-between shadow-xl min-h-[395px] lg:min-h-[430px]"
              >
                <div>
                  {/* Header inside Warm Sand Screen */}
                  <div className="flex items-center justify-between">
                    {renderAvatarCluster(
                      'bg-[#C4B299] text-white hover:bg-[#b09d82]',
                      () => setActiveSection('routine'),
                      'Ver todos os hábitos na aba Rotina'
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold font-mono text-[#1B1C20] px-2.5 py-0.5 rounded-full bg-white/70 shadow-2xs">
                        {completedTodosToday}/{totalTodosToday} concluídas
                      </span>
                      <BrandWaveMark className="w-6 h-6 text-[#1B1C20]" />
                    </div>
                  </div>

                  {/* Main Hero: Resumo Nutricional & Hábitos */}
                  <div className="mt-4">
                    <span className="text-xs font-semibold text-[#1B1C20]/70">
                      Resumo Nutricional &amp; Hábitos
                    </span>
                    <div className="text-[28px] xl:text-[32px] font-display font-bold tracking-tight text-[#1B1C20] leading-none mt-1">
                      Rotina de Hoje
                    </div>
                  </div>

                  {/* Compact Macro Pill Bar */}
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 bg-white/75 rounded-2xl p-2 text-center font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                        Proteínas
                      </span>
                      <strong className="text-[#0A468E]">
                        {metabolicSummary.consumedProteinG}/{metabolicSummary.targetProteinG}g
                      </strong>
                    </div>
                    <div className="border-x border-[#1B1C20]/10">
                      <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                        Carbos
                      </span>
                      <strong className="text-[#582B5E]">
                        {metabolicSummary.consumedCarbsG}/{metabolicSummary.targetCarbsG}g
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                        Gorduras
                      </span>
                      <strong className="text-amber-700">
                        {metabolicSummary.consumedFatG}/{metabolicSummary.targetFatG}g
                      </strong>
                    </div>
                  </div>

                  {/* Interactive Checklist (Up to 3 habits directly inside the card) */}
                  <div className="mt-2.5 bg-white rounded-[22px] p-3 shadow-md divide-y divide-slate-100">
                    {homeCardHabits.map((todo) => {
                      const done = isTodoCompletedOnSelectedDate(todo);
                      return (
                        <button
                          key={todo.id}
                          type="button"
                          onClick={() => handleToggleTodo(todo)}
                          className="w-full py-2 flex items-center gap-2.5 text-left transition-opacity hover:opacity-85"
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs transition-colors ${
                              done
                                ? 'bg-[#1B1C20] text-white'
                                : 'bg-slate-100 text-[#1B1C20] border border-slate-300'
                            }`}
                          >
                            {done && <Check className="w-3.5 h-3.5" />}
                          </span>
                          <span
                            className={`text-xs font-medium truncate flex-1 ${
                              done ? 'line-through text-slate-400' : 'text-[#1B1C20]'
                            }`}
                          >
                            {todo.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {todo.scope === 'daily' ? 'Diária' : 'Hoje'}
                          </span>
                        </button>
                      );
                    })}
                    {homeCardHabits.length === 0 && (
                      <div className="py-4 text-center text-xs text-slate-400">
                        Nenhuma meta cadastrada para hoje.
                      </div>
                    )}
                  </div>
                </div>

                {/* Conjoined Action Bar at the Bottom with "Ver todos" -> Rotina */}
                <div className="mt-3 bg-white rounded-full p-1 flex items-center justify-between shadow-xs">
                  <button
                    type="button"
                    onClick={() => setActiveSection('nutrition')}
                    className="flex-1 py-2 text-xs font-bold text-[#1B1C20] hover:bg-slate-100 rounded-full transition-colors text-center"
                  >
                    + Alimento
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('routine')}
                    className="flex-1 py-2 text-xs font-bold text-[#1B1C20] hover:bg-slate-100 rounded-full transition-colors text-center"
                  >
                    Ver todos ({totalTodosToday})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('routine')}
                    className="w-8 h-8 rounded-full bg-[#1B1C20] text-white flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                    title="Ir para aba Rotina"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.section>
            </motion.div>
          )}

          {/* =====================================================================
              ABA 2: "NUTRIÇÃO" (Unificação de Dieta Inteligente + Refeições)
             ===================================================================== */}
          {activeSection === 'nutrition' && (
            <NutritionHubView
              key={`nutrition-${selectedDate}`}
              profile={profile}
              selectedDate={selectedDate}
              metabolicSummary={metabolicSummary}
              dayMeals={dayMeals}
              focusFoodInputTrigger={focusFoodTrigger}
              onAddMeal={handleAddMealObject}
              onDeleteMeal={(meal) =>
                setPendingDelete({
                  type: 'meal',
                  id: meal.id,
                  label: `${meal.name} (${meal.calories} kcal)`,
                })
              }
              onNavigateToEvolution={() => setActiveSection('evolution')}
            />
          )}

          {/* =====================================================================
              ABA 3: "ROTINA" (Unificação de Central Health + Treinos MET + Metas)
             ===================================================================== */}
          {activeSection === 'routine' && (
            <motion.div
              key={`routine-${selectedDate}`}
              variants={tabContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-5 max-w-7xl mx-auto w-full pb-6"
            >
              {/* TOPO: Barra/Cards Compactos da Central Google Fit & Apple Health */}
              <motion.section
                variants={summaryCardVariants}
                aria-label="Central Google Fit, Apple Health e Hidratação"
                className="bg-[#1B1C20] text-white rounded-[32px] p-4 sm:p-5 shadow-xl border border-white/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#8AC4F2] text-[#0A468E] flex items-center justify-center shrink-0">
                      <Watch className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-display font-bold text-white">
                        Central Google Fit &amp; Apple Health ({selectedDate})
                      </h2>
                      <p className="text-[11px] text-white/60">
                        Monitoramento diário de Passos (NEAT), Sono e Hidratação
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setHealthModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Footprints className="w-3.5 h-3.5 text-[#8AC4F2]" />
                    <span>Sincronizar / Editar Métricas</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3.5">
                  {/* Card 1: Passos / NEAT */}
                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                        Passos / NEAT Diário
                      </span>
                      <div className="text-lg font-display font-bold font-mono tabular-nums text-white mt-0.5">
                        {currentDayMetric.steps.toLocaleString('pt-BR')}{' '}
                        <span className="text-xs font-normal text-white/50">
                          / {profile.stepGoal.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8AC4F2] font-mono font-semibold">
                        Gasto NEAT: -{metabolicSummary.stepCalories} kcal
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHealthModalOpen(true)}
                      className="w-9 h-9 rounded-full bg-[#8AC4F2]/20 text-[#8AC4F2] hover:bg-[#8AC4F2]/30 flex items-center justify-center shrink-0 transition-colors"
                      title="Atualizar passos"
                    >
                      <Footprints className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Card 2: Sono & Recuperação */}
                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                        Sono &amp; FC Repouso
                      </span>
                      <div className="text-lg font-display font-bold font-mono tabular-nums text-white mt-0.5">
                        {currentDayMetric.sleepHours.toFixed(1)}h{' '}
                        <span className="text-xs font-normal text-white/50">sono</span>
                      </div>
                      <span className="text-[11px] text-[#DDA3E6] font-mono font-semibold">
                        FC Repouso: {currentDayMetric.restingHeartRate} bpm
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHealthModalOpen(true)}
                      className="w-9 h-9 rounded-full bg-[#DDA3E6]/20 text-[#DDA3E6] hover:bg-[#DDA3E6]/30 flex items-center justify-center shrink-0 transition-colors"
                      title="Editar sono e FC"
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Card 3: Hidratação + Botão Rápido +250ml */}
                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                        Hidratação do Dia
                      </span>
                      <div className="text-lg font-display font-bold font-mono tabular-nums text-white mt-0.5">
                        {currentDayMetric.waterMl}{' '}
                        <span className="text-xs font-normal text-white/50">
                          / {profile.waterGoalMl} ml
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-300 font-mono font-semibold">
                        {Math.min(
                          100,
                          Math.round(
                            (currentDayMetric.waterMl / Math.max(500, profile.waterGoalMl)) * 100
                          )
                        )}
                        % da meta hídrica
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickAddWater(250)}
                      className="px-3 py-2 rounded-xl bg-[#8AC4F2] hover:bg-white text-[#0A468E] font-bold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-sm cursor-pointer"
                      title="Adicionar 250ml de água com 1 clique"
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      <span>+250ml</span>
                    </button>
                  </div>
                </div>
              </motion.section>

              {/* SEÇÃO 1: TREINOS DO DIA (MET) */}
              <motion.section
                variants={summaryCardVariants}
                aria-label="Treinos do Dia e Cálculo MET"
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
              >
                {/* Left 5 Cols: Sky Blue Exercise MET Calculator */}
                <div className="lg:col-span-5 bg-[#8AC4F2] text-[#1B1C20] rounded-[34px] p-5 sm:p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-full bg-[#0A468E] text-white flex items-center justify-center">
                          <Dumbbell className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-lg font-display font-bold text-[#1B1C20]">
                            Treinos do Dia (MET)
                          </h3>
                          <p className="text-xs text-[#0A468E] font-mono font-semibold">
                            Peso atual: {profile.currentWeightKg} kg
                          </p>
                        </div>
                      </div>
                      <BrandWaveMark className="w-6 h-6 text-[#0A468E]" />
                    </div>

                    {/* Category Filter Pills for Exercise Presets */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-3">
                      <button
                        type="button"
                        onClick={() => setWorkoutCategoryFilter('all')}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
                          workoutCategoryFilter === 'all'
                            ? 'bg-[#0A468E] text-white'
                            : 'bg-white/60 text-[#1B1C20] hover:bg-white'
                        }`}
                      >
                        Todas
                      </button>
                      {(Object.keys(WORKOUT_CATEGORY_LABELS) as WorkoutCategory[]).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setWorkoutCategoryFilter(cat);
                            const firstInCat = EXERCISE_PRESETS.find((e) => e.category === cat);
                            if (firstInCat) handleSelectExercisePreset(firstInCat.id);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
                            workoutCategoryFilter === cat
                              ? 'bg-[#0A468E] text-white'
                              : 'bg-white/60 text-[#1B1C20] hover:bg-white'
                          }`}
                        >
                          {WORKOUT_CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleAddWorkout} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#1B1C20]/80 mb-1">
                          Modalidade (Compêndio Oficial de METs)
                        </label>
                        <select
                          value={selectedExercisePresetId}
                          onChange={(e) => handleSelectExercisePreset(e.target.value)}
                          className="w-full rounded-2xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1B1C20] focus:outline-none shadow-2xs"
                        >
                          {filteredExercisePresets.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name} (MET {ex.met})
                            </option>
                          ))}
                          <option value="custom">Exercício Personalizado</option>
                        </select>
                      </div>

                      <div className="bg-white rounded-[24px] p-4 shadow-2xs space-y-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Nome do Treino / Sessão
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={120}
                            value={workoutName}
                            onChange={(e) => setWorkoutName(e.target.value)}
                            className="w-full border-b border-dashed border-slate-300 pb-1 text-xs font-semibold text-[#1B1C20] focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                          <div>
                            <label className="block text-[10px] text-slate-400">Tempo (min)</label>
                            <input
                              type="number"
                              min={1}
                              max={1440}
                              required
                              value={workoutDuration}
                              onChange={(e) => {
                                setWorkoutDuration(Number(e.target.value));
                                setWorkoutCustomCalories(null);
                              }}
                              className="w-full mt-0.5 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-mono tabular-nums font-bold text-[#1B1C20]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400">
                              Intensidade MET
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min={1}
                              max={25}
                              required
                              value={workoutMet}
                              onChange={(e) => {
                                setSelectedExercisePresetId('custom');
                                setWorkoutMet(Number(e.target.value));
                                setWorkoutCustomCalories(null);
                              }}
                              className="w-full mt-0.5 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-mono tabular-nums text-[#1B1C20]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400">Gasto (kcal)</label>
                            <input
                              type="number"
                              min={1}
                              max={15000}
                              required
                              value={calculatedExerciseCalories}
                              onChange={(e) => setWorkoutCustomCalories(Number(e.target.value))}
                              className="w-full mt-0.5 rounded-xl bg-[#8AC4F2]/35 px-2.5 py-1.5 text-xs font-mono tabular-nums font-bold text-[#0A468E]"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-full bg-[#1B1C20] text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          Registrar Exercício (-{calculatedExerciseCalories} kcal em{' '}
                          {workoutDuration}m)
                        </span>
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#0A468E]/20 flex items-center justify-between text-xs text-[#0A468E] font-medium">
                    <span>Fórmula: MET × {profile.currentWeightKg}kg × (Min/60)</span>
                  </div>
                </div>

                {/* Right 7 Cols: Feed de Treinos do Dia + Impacto no TDEE */}
                <div className="lg:col-span-7 bg-white text-[#1B1C20] rounded-[34px] p-5 sm:p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-lg font-display font-bold text-[#1B1C20]">
                          Feed de Treinos do Dia ({dayWorkouts.length})
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Impacto direto no seu Gasto Energético Total Diário (TDEE)
                        </p>
                      </div>
                      <div className="bg-[#1B1C20] text-white px-3.5 py-1.5 rounded-full text-xs font-mono tabular-nums font-bold">
                        Treinos: -{metabolicSummary.workoutCalories} kcal · Passos: -
                        {metabolicSummary.stepCalories} kcal
                      </div>
                    </div>

                    <div className="mt-4 space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {dayWorkouts.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400">
                          Nenhum treino registrado em {selectedDate}. Use o formulário ao lado para
                          calcular via MET.
                        </div>
                      ) : (
                        dayWorkouts.map((wk) => (
                          <div
                            key={wk.id}
                            className="p-3.5 rounded-[22px] bg-slate-50 hover:bg-[#8AC4F2]/20 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-[#1B1C20] text-white flex items-center justify-center shrink-0">
                                <Dumbbell className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#1B1C20] truncate">
                                  {wk.activityName}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                                  {WORKOUT_CATEGORY_LABELS[wk.category]} · {wk.durationMinutes} min
                                  · MET {wk.met}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-sm font-bold font-mono tabular-nums text-[#0A468E]">
                                -{wk.caloriesBurned} kcal
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingDelete({
                                    type: 'workout',
                                    id: wk.id,
                                    label: `${wk.activityName} (${wk.caloriesBurned} kcal)`,
                                  })
                                }
                                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600"
                                title="Remover exercício"
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
                    <span className="text-xs text-slate-400">
                      Gasto Energético Total do Dia (TDEE = Basal + NEAT + Treinos)
                    </span>
                    <span className="text-xl font-display font-bold font-mono tabular-nums text-[#1B1C20]">
                      {metabolicSummary.totalDailyExpenditure.toLocaleString('pt-BR')} kcal
                    </span>
                  </div>
                </div>
              </motion.section>

              {/* SEÇÃO 2: METAS & HÁBITOS (Com Filtros Rápidos em Pílulas) */}
              <motion.section
                variants={summaryCardVariants}
                aria-label="Metas e Hábitos Diários"
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
              >
                {/* Left 5 Cols: Warm Sand Goal Creator */}
                <div className="lg:col-span-5 bg-[#F3E3CA] text-[#1B1C20] rounded-[34px] p-5 sm:p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-full bg-[#1B1C20] text-white flex items-center justify-center">
                          <ListChecks className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-lg font-display font-bold text-[#1B1C20]">
                            Metas &amp; Hábitos
                          </h3>
                          <p className="text-xs text-[#1B1C20]/65">
                            Hábitos recorrentes e metas para {selectedDate}
                          </p>
                        </div>
                      </div>
                      <BrandWaveMark className="w-6 h-6 text-[#1B1C20]" />
                    </div>

                    {/* Mini Card Scope Selector */}
                    <div className="grid grid-cols-2 gap-2.5 mt-4">
                      <button
                        type="button"
                        onClick={() => setTodoScope('daily')}
                        className={`rounded-[22px] p-3.5 text-left transition-all ${
                          todoScope === 'daily'
                            ? 'bg-[#1B1C20] text-white shadow-md'
                            : 'bg-[#E5D2B5] text-[#1B1C20]'
                        }`}
                      >
                        <div className="text-base font-bold font-mono tabular-nums">
                          {dailyHabitTodos.filter((t) => isTodoCompletedOnSelectedDate(t)).length}/
                          {dailyHabitTodos.length}
                        </div>
                        <div className="mt-1 text-xs font-semibold">Para Todo Dia</div>
                        <div className="text-[10px] opacity-70">Hábito Recorrente</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTodoScope('date_specific')}
                        className={`rounded-[22px] p-3.5 text-left transition-all ${
                          todoScope === 'date_specific'
                            ? 'bg-[#1B1C20] text-white shadow-md'
                            : 'bg-[#E5D2B5] text-[#1B1C20]'
                        }`}
                      >
                        <div className="text-base font-bold font-mono tabular-nums">
                          {specificDayTodos.filter((t) => isTodoCompletedOnSelectedDate(t)).length}/
                          {specificDayTodos.length}
                        </div>
                        <div className="mt-1 text-xs font-semibold">Dia Específico</div>
                        <div className="text-[10px] opacity-70">Exclusiva ({selectedDate})</div>
                      </button>
                    </div>

                    <form onSubmit={handleAddTodo} className="mt-4 space-y-3">
                      <div className="bg-white rounded-[24px] p-4 shadow-2xs space-y-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Descrição da Meta ({todoScope === 'daily' ? 'Todo Dia' : selectedDate})
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={160}
                            value={todoTitle}
                            onChange={(e) => setTodoTitle(e.target.value)}
                            placeholder="Digite sua meta ou hábito diário"
                            className="w-full border-b border-dashed border-slate-300 pb-1.5 text-xs font-semibold text-[#1B1C20] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Categoria</label>
                          <select
                            value={todoCategory}
                            onChange={(e) => setTodoCategory(e.target.value as TodoCategory)}
                            className="w-full rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-[#1B1C20] focus:outline-none"
                          >
                            {(Object.keys(TODO_CATEGORY_LABELS) as TodoCategory[]).map((cat) => (
                              <option key={cat} value={cat}>
                                {TODO_CATEGORY_LABELS[cat]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-full bg-[#1B1C20] text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          Adicionar Meta ({todoScope === 'daily' ? 'Todo Dia' : selectedDate})
                        </span>
                      </button>
                    </form>
                  </div>

                  {/* Scope Filter Bar */}
                  <div className="mt-4 bg-white rounded-full p-1.5 flex items-center justify-between shadow-sm">
                    <button
                      type="button"
                      onClick={() => setTodoFilterScope('daily')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-colors ${
                        todoFilterScope === 'daily'
                          ? 'bg-[#F3E3CA] text-[#1B1C20]'
                          : 'text-slate-500'
                      }`}
                    >
                      Todo Dia
                    </button>
                    <button
                      type="button"
                      onClick={() => setTodoFilterScope('all')}
                      className="w-8 h-8 rounded-full bg-[#1B1C20] text-white flex items-center justify-center shrink-0 mx-1 text-[10px] font-bold"
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setTodoFilterScope('date_specific')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-colors ${
                        todoFilterScope === 'date_specific'
                          ? 'bg-[#F3E3CA] text-[#1B1C20]'
                          : 'text-slate-500'
                      }`}
                    >
                      Dia {selectedDate.slice(8, 10)}/{selectedDate.slice(5, 7)}
                    </button>
                  </div>
                </div>

                {/* Right 7 Cols: Category Filter Pills + Dual Lists */}
                <div className="lg:col-span-7 bg-white text-[#1B1C20] rounded-[34px] p-5 sm:p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    {/* Category Filter Pills (Todos, Nutrição, Treino, Hidratação, Hábitos, Pesagem) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-3 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => setTodoCategoryFilter('all')}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                          todoCategoryFilter === 'all'
                            ? 'bg-[#1B1C20] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Todos ({allTodosForSelectedDate.length})
                      </button>
                      {(Object.keys(TODO_CATEGORY_LABELS) as TodoCategory[]).map((cat) => {
                        const count = allTodosForSelectedDate.filter(
                          (t) => t.category === cat
                        ).length;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setTodoCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                              todoCategoryFilter === cat
                                ? 'bg-[#F3E3CA] text-[#1B1C20] font-bold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {TODO_CATEGORY_LABELS[cat]} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 space-y-5 overflow-y-auto max-h-[360px] pr-1">
                      {/* Section A: Metas para Todo Dia */}
                      {(todoFilterScope === 'all' || todoFilterScope === 'daily') && (
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h4 className="text-sm font-display font-bold text-[#1B1C20]">
                              Hábitos Diários Recorrentes
                            </h4>
                            <span className="text-xs font-mono tabular-nums font-bold text-[#1B1C20]">
                              {
                                filteredDailyTodos.filter((t) =>
                                  isTodoCompletedOnSelectedDate(t)
                                ).length
                              }
                              /{filteredDailyTodos.length}
                            </span>
                          </div>
                          <div className="mt-2.5 space-y-2">
                            {filteredDailyTodos.length === 0 ? (
                              <p className="text-xs text-slate-400 py-2">
                                Nenhum hábito recorrente nesta categoria.
                              </p>
                            ) : (
                              filteredDailyTodos.map((todo) => {
                                const done = isTodoCompletedOnSelectedDate(todo);
                                return (
                                  <div
                                    key={todo.id}
                                    className="p-3 rounded-[20px] bg-slate-50 hover:bg-[#F3E3CA]/35 transition-colors flex items-center justify-between gap-3"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTodo(todo)}
                                      className="flex items-center gap-3 text-left flex-1 min-w-0"
                                    >
                                      <span
                                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                          done
                                            ? 'bg-[#1B1C20] text-white'
                                            : 'bg-white border border-slate-300 text-transparent'
                                        }`}
                                      >
                                        <Check className="w-4 h-4" />
                                      </span>
                                      <div className="min-w-0">
                                        <div
                                          className={`text-xs font-bold truncate ${
                                            done ? 'line-through text-slate-400' : 'text-[#1B1C20]'
                                          }`}
                                        >
                                          {todo.title}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                          Todo dia · {TODO_CATEGORY_LABELS[todo.category]}
                                        </div>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPendingDelete({
                                          type: 'todo',
                                          id: todo.id,
                                          label: todo.title,
                                        })
                                      }
                                      className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600"
                                      title="Remover meta"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {/* Section B: Metas para Este Dia Específico */}
                      {(todoFilterScope === 'all' || todoFilterScope === 'date_specific') && (
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h4 className="text-sm font-display font-bold text-[#1B1C20]">
                              Metas Específicas ({selectedDate})
                            </h4>
                            <span className="text-xs font-mono tabular-nums font-bold text-[#1B1C20]">
                              {
                                filteredSpecificTodos.filter((t) =>
                                  isTodoCompletedOnSelectedDate(t)
                                ).length
                              }
                              /{filteredSpecificTodos.length}
                            </span>
                          </div>
                          <div className="mt-2.5 space-y-2">
                            {filteredSpecificTodos.length === 0 ? (
                              <p className="text-xs text-slate-400 py-2">
                                Nenhuma meta exclusiva para {selectedDate} nesta categoria.
                              </p>
                            ) : (
                              filteredSpecificTodos.map((todo) => {
                                const done = isTodoCompletedOnSelectedDate(todo);
                                return (
                                  <div
                                    key={todo.id}
                                    className="p-3 rounded-[20px] bg-slate-50 hover:bg-[#DDA3E6]/20 transition-colors flex items-center justify-between gap-3"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTodo(todo)}
                                      className="flex items-center gap-3 text-left flex-1 min-w-0"
                                    >
                                      <span
                                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                          done
                                            ? 'bg-[#582B5E] text-white'
                                            : 'bg-white border border-slate-300 text-transparent'
                                        }`}
                                      >
                                        <Check className="w-4 h-4" />
                                      </span>
                                      <div className="min-w-0">
                                        <div
                                          className={`text-xs font-bold truncate ${
                                            done ? 'line-through text-slate-400' : 'text-[#1B1C20]'
                                          }`}
                                        >
                                          {todo.title}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                          Exclusiva de {todo.targetDate} ·{' '}
                                          {TODO_CATEGORY_LABELS[todo.category]}
                                        </div>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPendingDelete({
                                          type: 'todo',
                                          id: todo.id,
                                          label: todo.title,
                                        })
                                      }
                                      className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600"
                                      title="Remover meta"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Progresso consolidado de {selectedDate}</span>
                    <span className="font-mono tabular-nums font-bold text-[#1B1C20]">
                      {completedTodosToday}/{totalTodosToday} concluídas (
                      {totalTodosToday > 0
                        ? Math.round((completedTodosToday / totalTodosToday) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}

          {/* =====================================================================
              ABA 4: "EVOLUÇÃO" (Estratégia Metabólica + Curva Wishnofsky + Pesagem)
             ===================================================================== */}
          {activeSection === 'evolution' && (
            <motion.div
              key={`evolution-${selectedDate}`}
              variants={tabContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-5 max-w-7xl mx-auto w-full pb-6"
            >
              {/* TOPO: Estratégia Metabólica (Seletor de Objetivo + Resumo TMB) */}
              <motion.section
                variants={summaryCardVariants}
                aria-label="Estratégia Metabólica e Seletor de Objetivo"
                className="bg-[#1B1C20] text-white rounded-[34px] p-5 sm:p-6 shadow-2xl border border-white/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#DDA3E6] text-[#431F48] flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#DDA3E6] block">
                        ESTRATÉGIA METABÓLICA &amp; TMB
                      </span>
                      <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                        Objetivo Corporal &amp; Taxa Metabólica Basal
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBasalModalOpen(true)}
                    className="px-4 py-2 rounded-full bg-[#8AC4F2] hover:bg-white text-[#0A468E] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Configurar Parâmetros da TMB</span>
                  </button>
                </div>

                {/* BMR & TDEE Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] font-mono uppercase text-white/50 block">
                      TMB Mifflin-St Jeor
                    </span>
                    <div className="text-lg font-display font-bold font-mono text-[#8AC4F2] mt-0.5">
                      {metabolicSummary.bmrMifflin} kcal
                    </div>
                    <span className="text-[10px] text-white/40">
                      Harris-Benedict: {metabolicSummary.bmrHarris} kcal
                    </span>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] font-mono uppercase text-white/50 block">
                      Gasto Total (TDEE)
                    </span>
                    <div className="text-lg font-display font-bold font-mono text-white mt-0.5">
                      {metabolicSummary.totalDailyExpenditure} kcal
                    </div>
                    <span className="text-[10px] text-white/40">
                      Basal Ativo + Passos + Treinos
                    </span>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] font-mono uppercase text-white/50 block">
                      Meta Calórica Diária
                    </span>
                    <div className="text-lg font-display font-bold font-mono text-[#F3E3CA] mt-0.5">
                      {metabolicSummary.targetIntakeCalories} kcal
                    </div>
                    <span className="text-[10px] text-white/40">
                      Ajuste:{' '}
                      {profile.dailyCalorieAdjustment > 0
                        ? `+${profile.dailyCalorieAdjustment}`
                        : profile.dailyCalorieAdjustment}{' '}
                      kcal/dia
                    </span>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
                    <span className="text-[10px] font-mono uppercase text-white/50 block">
                      Peso Atual vs Meta
                    </span>
                    <div className="text-lg font-display font-bold font-mono text-[#DDA3E6] mt-0.5">
                      {profile.currentWeightKg.toFixed(1)} → {profile.targetWeightKg.toFixed(1)} kg
                    </div>
                    <span className="text-[10px] text-white/40">
                      Ritmo: {forecast.plannedWeeklyRateKg} kg/semana
                    </span>
                  </div>
                </div>

                {/* 3 Goal Cards Selector: Perder Peso (-500 kcal) | Manter Peso (0 kcal) | Ganhar Massa (+350 kcal) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => handleUpdateGoalAndAdjustment('lose', -500)}
                    className={`rounded-2xl p-4 text-left border transition-all cursor-pointer ${
                      profile.goalType === 'lose'
                        ? 'bg-[#8AC4F2] text-[#1B1C20] border-[#8AC4F2] shadow-lg'
                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4" />
                        <span>Perder Peso (Cutting)</span>
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black/15">
                        -500 kcal
                      </span>
                    </div>
                    <p className="text-[11px] mt-1.5 opacity-80">
                      Déficit calórico controlado para redução de gordura preservando massa magra
                      (~0,45 kg/sem).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateGoalAndAdjustment('maintain', 0)}
                    className={`rounded-2xl p-4 text-left border transition-all cursor-pointer ${
                      profile.goalType === 'maintain'
                        ? 'bg-[#F3E3CA] text-[#1B1C20] border-[#F3E3CA] shadow-lg'
                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span>Manter Peso (Normo)</span>
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black/15">
                        0 kcal
                      </span>
                    </div>
                    <p className="text-[11px] mt-1.5 opacity-80">
                      Equilíbrio energético (ingestão igual ao gasto total) para recomposição e
                      estabilidade.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateGoalAndAdjustment('gain', 350)}
                    className={`rounded-2xl p-4 text-left border transition-all cursor-pointer ${
                      profile.goalType === 'gain'
                        ? 'bg-[#DDA3E6] text-[#1B1C20] border-[#DDA3E6] shadow-lg'
                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" />
                        <span>Ganhar Massa (Bulking)</span>
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black/15">
                        +350 kcal
                      </span>
                    </div>
                    <p className="text-[11px] mt-1.5 opacity-80">
                      Superávit limpo para hipertrofia muscular com mínimo acúmulo de gordura
                      (~0,32 kg/sem).
                    </p>
                  </button>
                </div>
              </motion.section>

              {/* MEIO + BASE: Gráfico de Evolução 30/60/90d (Wishnofsky) + Registro de Pesagem */}
              <motion.section
                variants={summaryCardVariants}
                aria-label="Gráfico de Evolução Corporal e Registro de Pesagem"
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
              >
                {/* Left 7 Cols: Orchid Lavender Analytics & Wishnofsky Chart (30/60/90d) */}
                <div className="lg:col-span-7 bg-[#DDA3E6] text-[#1B1C20] rounded-[34px] p-5 sm:p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-full bg-[#582B5E] text-white flex items-center justify-center">
                          <Scale className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-lg font-display font-bold text-[#1B1C20]">
                            Curva de Evolução &amp; Projeção Wishnofsky
                          </h3>
                          <p className="text-xs text-[#3B1940]/75">
                            Regra científica de 7.700 kcal/kg · {forecast.statusLabel}
                          </p>
                        </div>
                      </div>
                      <BrandWaveMark className="w-6 h-6 text-[#582B5E]" />
                    </div>

                    <div className="mt-4">
                      <WeightEvolutionChart
                        weights={weights}
                        targetWeightKg={profile.targetWeightKg}
                        forecast={forecast}
                      />
                    </div>

                    <div className="mt-3 p-3.5 rounded-2xl bg-white/60 text-xs text-[#1B1C20] leading-relaxed">
                      {forecast.diagnosticMessage}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 mt-4">
                    <div className="bg-white rounded-[22px] p-3.5">
                      <div className="text-[10px] text-slate-400 font-semibold">+30 DIAS</div>
                      <div className="mt-1 text-lg font-bold font-mono tabular-nums text-[#1B1C20]">
                        {forecast.projected30DaysPlannedKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div className="bg-white rounded-[22px] p-3.5">
                      <div className="text-[10px] text-slate-400 font-semibold">+60 DIAS</div>
                      <div className="mt-1 text-lg font-bold font-mono tabular-nums text-[#1B1C20]">
                        {forecast.projected60DaysPlannedKg.toFixed(1)} kg
                      </div>
                    </div>
                    <div className="bg-[#582B5E] text-white rounded-[22px] p-3.5">
                      <div className="text-[10px] text-white/70 font-semibold">+90 DIAS</div>
                      <div className="mt-1 text-lg font-bold font-mono tabular-nums">
                        {forecast.projected90DaysPlannedKg.toFixed(1)} kg
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 5 Cols: White Sheet Weight Check-In & History */}
                <div className="lg:col-span-5 bg-white text-[#1B1C20] rounded-[34px] p-5 sm:p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <h3 className="text-lg font-display font-bold text-[#1B1C20]">
                      Registro de Pesagem Corporal
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ao salvar novo peso, sua TMB, metas de macros e gasto MET são recalculados
                      automaticamente em cascata
                    </p>

                    <form onSubmit={handleSaveWeightForm} className="mt-4 space-y-3">
                      <div className="bg-[#F3E3CA]/45 rounded-[24px] p-4 space-y-3">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">
                            Peso em Jejum em {selectedDate} (kg)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min={25}
                            max={350}
                            required
                            value={weightInputKg}
                            onChange={(e) => setWeightInputKg(Number(e.target.value))}
                            className="w-full text-2xl font-display font-bold font-mono tabular-nums text-[#1B1C20] bg-transparent border-b border-dashed border-[#1B1C20]/30 pb-1 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">
                            Notas de Contexto
                          </label>
                          <input
                            type="text"
                            maxLength={200}
                            value={weightNote}
                            onChange={(e) => setWeightNote(e.target.value)}
                            placeholder="Ex: Em jejum pela manhã"
                            className="w-full text-xs text-[#1B1C20] bg-transparent border-b border-dashed border-[#1B1C20]/30 pb-1 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-full bg-[#1B1C20] text-white text-xs font-semibold hover:bg-black transition-colors shadow-md"
                      >
                        Salvar Peso &amp; Recalcular TMB / Macros
                      </button>
                    </form>

                    <div className="mt-5">
                      <div className="text-xs font-bold text-[#1B1C20] mb-2">
                        Histórico de Pesagens ({weights.length})
                      </div>
                      <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                        {[...weights]
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((w) => (
                            <div
                              key={w.id}
                              className="py-2.5 flex items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <div className="font-mono tabular-nums font-bold text-[#1B1C20]">
                                  {w.weightKg.toFixed(1)} kg ·{' '}
                                  <span className="font-normal text-slate-400">{w.date}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">{w.note}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingDelete({
                                    type: 'weight',
                                    id: w.id,
                                    label: `Pesagem de ${w.weightKg.toFixed(1)} kg (${w.date})`,
                                  })
                                }
                                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600"
                                title="Remover pesagem"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Distância até a meta ({profile.targetWeightKg} kg)
                    </span>
                    <span className="font-mono tabular-nums font-bold text-[#582B5E]">
                      {Math.abs(profile.targetWeightKg - forecast.latestWeightKg).toFixed(1)} kg
                    </span>
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* =====================================================================
          NOVA BARRA DE NAVEGAÇÃO INFERIOR: 4 Abas + 1 Botão Central [ + ] (FAB)
          1. Hoje | 2. Nutrição | [ + ] QuickLogFAB | 3. Rotina | 4. Evolução
         ===================================================================== */}
      <nav
        aria-label="Menu Principal Inferior"
        className={`fixed bottom-0 left-0 right-0 z-40 h-16 backdrop-blur-md px-2 sm:px-4 transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-[#19191E]/95 border-t border-white/10'
            : 'bg-white/95 border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
        }`}
      >
        <div className="max-w-xl mx-auto h-full grid grid-cols-5 items-center gap-1">
          {/* 1. Hoje (Overview) */}
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`h-12 flex flex-col items-center justify-center rounded-2xl transition-all ${
              activeSection === 'overview'
                ? 'bg-[#8AC4F2] text-[#1B1C20] font-bold shadow-md'
                : theme === 'dark'
                ? 'text-white/60 hover:text-white hover:bg-white/5'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Flame className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5">Hoje</span>
          </button>

          {/* 2. Nutrição (NutritionHub) */}
          <button
            type="button"
            onClick={() => setActiveSection('nutrition')}
            className={`h-12 flex flex-col items-center justify-center rounded-2xl transition-all ${
              activeSection === 'nutrition'
                ? 'bg-[#F3E3CA] text-[#1B1C20] font-bold shadow-md'
                : theme === 'dark'
                ? 'text-white/60 hover:text-white hover:bg-white/5'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Utensils className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5">Nutrição</span>
          </button>

          {/* 3. [ + ] Botão Central Destacado (QuickLogFAB) */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setQuickLogInitialMode('menu');
                setQuickLogOpen(true);
              }}
              aria-label="Ação Rápida: Lançar Alimento, Água, Treino ou Peso"
              title="Ação Rápida (+)"
              className="w-13 h-13 -mt-4 rounded-full bg-gradient-to-tr from-[#8AC4F2] via-[#DDA3E6] to-[#F3E3CA] text-[#1B1C20] flex items-center justify-center shadow-xl border-4 border-[#19191E] dark:border-[#19191E] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-6 h-6 stroke-[2.75]" />
            </button>
          </div>

          {/* 4. Rotina (RoutineHub) */}
          <button
            type="button"
            onClick={() => setActiveSection('routine')}
            className={`h-12 flex flex-col items-center justify-center rounded-2xl transition-all ${
              activeSection === 'routine'
                ? 'bg-[#8AC4F2] text-[#1B1C20] font-bold shadow-md'
                : theme === 'dark'
                ? 'text-white/60 hover:text-white hover:bg-white/5'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Dumbbell className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5">Rotina</span>
          </button>

          {/* 5. Evolução (BodyEvolution) */}
          <button
            type="button"
            onClick={() => setActiveSection('evolution')}
            className={`h-12 flex flex-col items-center justify-center rounded-2xl transition-all ${
              activeSection === 'evolution'
                ? 'bg-[#DDA3E6] text-[#1B1C20] font-bold shadow-md'
                : theme === 'dark'
                ? 'text-white/60 hover:text-white hover:bg-white/5'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5">Evolução</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <QuickLogModal
        open={quickLogOpen}
        initialMode={quickLogInitialMode}
        selectedDate={selectedDate}
        profile={profile}
        currentMetric={currentDayMetric}
        onClose={() => setQuickLogOpen(false)}
        onAddMeal={handleAddMealObject}
        onAddWater={handleQuickAddWater}
        onAddWorkout={handleAddWorkoutObject}
        onSaveWeight={handleSaveWeightCascade}
        onNavigateToDiaryWithFocus={() => {
          setActiveSection('nutrition');
          setFocusFoodTrigger((prev) => prev + 1);
        }}
      />

      <BasalCalculatorModal
        open={basalModalOpen}
        profile={profile}
        onClose={() => setBasalModalOpen(false)}
        onSave={async (updated) => {
          setProfile((prev) => ({ ...prev, ...updated }));
          if (user) {
            await updateUserProfileData(user.uid, updated);
          }
        }}
      />

      <HealthHubModal
        open={healthModalOpen}
        selectedDate={selectedDate}
        profile={profile}
        currentMetric={currentDayMetric}
        onClose={() => setHealthModalOpen(false)}
        onUpdateMetric={async (metricData) => {
          if (user) {
            await upsertDailyMetric(user.uid, selectedDate, metricData);
          } else {
            setDailyMetrics((prev) => [
              ...prev.filter((d) => d.date !== selectedDate),
              {
                id: `local_dm_${selectedDate}`,
                userId: 'demo_local',
                date: selectedDate,
                ...metricData,
              },
            ]);
          }
        }}
        onUpdateConnectionFlags={async (gFit, aHealth) => {
          const nextProfile = {
            ...profile,
            googleFitConnected: gFit,
            appleHealthConnected: aHealth,
          };
          setProfile(nextProfile);
          if (user) {
            await updateUserProfileData(user.uid, nextProfile);
          }
        }}
        onWeightSynced={async (weightKg, source) => {
          const cleanW = Number(Math.max(25, Math.min(350, weightKg)).toFixed(1));
          const entry = {
            date: selectedDate,
            weightKg: cleanW,
            note: `Sincronizado automaticamente via ${
              source === 'google_fit' ? 'Google Fit' : 'Apple Health'
            }`,
            source,
          };
          setProfile((prev) => ({ ...prev, currentWeightKg: cleanW }));
          if (user) {
            await saveWeightRecord(user.uid, { ...profile, currentWeightKg: cleanW }, entry);
          } else {
            setWeights((prev) => [
              ...prev.filter((w) => w.date !== selectedDate),
              { id: `local_wt_${selectedDate}`, userId: 'demo_local', ...entry },
            ]);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Confirmar Exclusão de Registro"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir "${pendingDelete.label}"? O cálculo calórico e as previsões do dia serão atualizados imediatamente.`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(userProfile) => {
          setProfile(userProfile);
          setAuthModalOpen(false);
        }}
      />
    </div>
  );
}
