/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Calculator,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Footprints,
  ListChecks,
  LogOut,
  Moon,
  MoreVertical,
  Plus,
  Scale,
  ScanLine,
  Search,
  Sun,
  Target,
  Trash2,
  Utensils,
  Watch,
} from 'lucide-react';
import {
  subscribeAuth,
  signInWithGoogle,
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
  FOOD_PRESETS,
  formatDateISO,
  formatDisplayDatePt,
  MEAL_SLOT_LABELS,
  TODO_CATEGORY_LABELS,
  WORKOUT_CATEGORY_LABELS,
} from './utils/metabolic';
import { WeightEvolutionChart, BrandWaveMark } from './components/WeightEvolutionChart';
import { BasalCalculatorModal } from './components/BasalCalculatorModal';
import { HealthHubModal } from './components/HealthHubModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AuthModal } from './components/AuthModal';
import { DietPlannerView } from './components/DietPlannerView';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';

type ActiveSection = 'overview' | 'diet' | 'meals' | 'workouts' | 'weight' | 'todos';

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
      completed: true,
      lastCompletedDate: todayISO,
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

  // Modals & Confirmations
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [basalModalOpen, setBasalModalOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'meal' | 'workout' | 'weight' | 'todo';
    id: string;
    label: string;
  } | null>(null);

  // Meal Form State
  const [selectedFoodPresetId, setSelectedFoodPresetId] = useState<string>(FOOD_PRESETS[0].id);
  const [mealType, setMealType] = useState<MealSlot>('lunch');
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

  // Workout Form State
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

  // Weight Check-In Form State
  const [weightInputKg, setWeightInputKg] = useState<number>(profile.currentWeightKg);
  const [weightNote, setWeightNote] = useState<string>('Pesagem em jejum pela manhã');

  // To-Do Form State
  const [todoTitle, setTodoTitle] = useState<string>('');
  const [todoCategory, setTodoCategory] = useState<TodoCategory>('nutrition');
  const [todoScope, setTodoScope] = useState<TodoScope>('daily');
  const [todoFilterScope, setTodoFilterScope] = useState<'all' | 'daily' | 'date_specific'>('all');

  useEffect(() => {
    setWeightInputKg(profile.currentWeightKg);
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

  // Metabolic Summary & Weight Forecast
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

  const totalTodosToday = dailyHabitTodos.length + specificDayTodos.length;
  const completedTodosToday =
    dailyHabitTodos.filter((t) => isTodoCompletedOnSelectedDate(t)).length +
    specificDayTodos.filter((t) => isTodoCompletedOnSelectedDate(t)).length;

  // Handlers for Food Preset Selection & Portion Changes
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

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    const newEntry = {
      date: selectedDate,
      mealType,
      name: mealName.trim(),
      grams: Math.max(1, mealGrams),
      calories: Math.max(0, mealCalories),
      proteinG: Math.max(0, mealProtein),
      carbsG: Math.max(0, mealCarbs),
      fatG: Math.max(0, mealFat),
    };

    if (user) {
      await addMealRecord(user.uid, newEntry);
    } else {
      setMeals((prev) => [
        ...prev,
        { id: `local_m_${Date.now()}`, userId: 'demo_local', ...newEntry },
      ]);
    }
  };

  // Handlers for Exercise Preset & Duration
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

  const handleAddWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutName.trim()) return;
    const newWorkout = {
      date: selectedDate,
      activityName: workoutName.trim(),
      category: workoutCategory,
      durationMinutes: Math.max(1, workoutDuration),
      met: Math.max(1, workoutMet),
      caloriesBurned: Math.max(1, calculatedExerciseCalories),
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

  // Handler for Weight Check-In
  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanW = Number(Math.max(25, Math.min(350, weightInputKg)).toFixed(1));
    const entry = {
      date: selectedDate,
      weightKg: cleanW,
      note: weightNote.trim() || 'Registro manual de peso',
      source: 'manual' as const,
    };

    if (user) {
      await saveWeightRecord(user.uid, profile, entry);
    } else {
      setWeights((prev) => {
        const filtered = prev.filter((w) => w.date !== selectedDate);
        return [
          ...filtered,
          { id: `local_wt_${selectedDate}`, userId: 'demo_local', ...entry },
        ];
      });
      setProfile((prev) => ({ ...prev, currentWeightKg: cleanW }));
    }
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

  const handleGoogleSignInClick = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'seu-usuario.github.io';
        setAuthError(
          `Domínio "${host}" ainda não autorizado no Firebase. No Console Firebase → Authentication → Settings → Domínios autorizados, adicione "${host}".`
        );
      } else {
        setAuthError(`Autenticação cancelada ou bloqueada pelo navegador (${msg}).`);
      }
    }
  };

  // Helper to render the top avatar + plus button cluster seen on all 3 screens in the reference
  const renderAvatarCluster = (
    plusBgClass: string,
    onPlusClick: () => void,
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

  // Staggered Fade-In & Slide-Up Motion Variants (compositor-only opacity + transform y)
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
      className={`min-h-screen lg:h-screen lg:overflow-hidden flex flex-col pb-20 transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-[#19191E] text-white'
          : 'bg-[#F4F5F8] text-[#1B1C20]'
      }`}
    >
      {/* Header Bar - adapts to Dark and Light modes */}
      <header
        className={`flex items-center justify-between gap-3 px-4 sm:px-6 h-14 border-b shrink-0 z-30 transition-colors duration-200 ${
          theme === 'dark'
            ? 'border-white/10 bg-[#19191E] text-white'
            : 'border-slate-200/90 bg-white/95 text-slate-900 shadow-2xs'
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 overflow-y-auto flex flex-col justify-start">
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

        {/* =====================================================================
            TAB 1: PAINEL PRINCIPAL — The 3 Signature Pastel Cards Side-by-Side
            (Sky Blue "Your Cards" | Orchid Lavender "Analytics" | Warm Sand "Transfer")
           ===================================================================== */}
        <AnimatePresence mode="wait">
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
                CARD 1: SKY BLUE PANEL (#8AC4F2) — Taxa Basal & Balanço Resumido
               ----------------------------------------------------------------- */}
            <motion.section
              variants={summaryCardVariants}
              aria-label="Taxa Basal, Saúde e Balanço Diário"
              className="bg-[#8AC4F2] text-[#1B1C20] rounded-[32px] p-5 flex flex-col justify-between shadow-xl min-h-[380px] lg:min-h-[420px]"
            >
              <div>
                {/* Header inside Blue Screen */}
                <div className="flex items-center justify-between">
                  {renderAvatarCluster(
                    'bg-[#0A468E] text-white hover:bg-[#083872]',
                    () => setBasalModalOpen(true),
                    'Configurar Taxa Basal (TMB)'
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold font-mono tracking-wider text-[#0A468E] uppercase px-2 py-0.5 rounded-full bg-white/40">
                      TMB &amp; Balanço
                    </span>
                    <BrandWaveMark className="w-6 h-6 text-[#0A468E]" />
                  </div>
                </div>

                {/* Main Hero: Total Daily Caloric Expenditure */}
                <div className="mt-4">
                  <span className="text-xs font-semibold text-[#0A468E]">
                    Gasto Metabólico Total
                  </span>
                  <div className="text-[32px] xl:text-[36px] font-display font-bold font-mono tabular-nums tracking-tight text-[#0A468E] leading-none mt-1">
                    {metabolicSummary.totalDailyExpenditure.toLocaleString('pt-BR')}{' '}
                    <span className="text-sm font-sans font-medium text-[#1B1C20]">kcal/dia</span>
                  </div>
                </div>

                {/* Compact Charcoal BMR & Diet Adherence Card */}
                <div className="bg-[#1B1C20] text-white rounded-[22px] p-3.5 mt-3 shadow-md space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-display font-bold italic tracking-wider text-[#8AC4F2]">
                      METABOLIX TMB ({metabolicSummary.bmrMifflin} kcal)
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSection('diet')}
                      className="text-[10px] font-semibold text-[#1B1C20] bg-[#8AC4F2] hover:bg-white px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors"
                    >
                      Montar Dieta <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/70">
                      Meta ({profile.dailyCalorieAdjustment > 0 ? `+${profile.dailyCalorieAdjustment}` : profile.dailyCalorieAdjustment} kcal):
                    </span>
                    <span className="font-bold text-white">
                      {metabolicSummary.targetIntakeCalories.toLocaleString('pt-BR')} kcal
                    </span>
                  </div>

                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                    <span className="text-white/60">Status da Meta:</span>
                    <span
                      className={`font-mono tabular-nums font-bold ${
                        Math.abs(metabolicSummary.remainingCaloriesForTarget) <= 90
                          ? 'text-emerald-300'
                          : metabolicSummary.remainingCaloriesForTarget > 90
                          ? 'text-[#8AC4F2]'
                          : 'text-amber-300'
                      }`}
                    >
                      {Math.abs(metabolicSummary.remainingCaloriesForTarget) <= 90
                        ? 'Meta Batida!'
                        : metabolicSummary.remainingCaloriesForTarget > 90
                        ? `Faltam ${metabolicSummary.remainingCaloriesForTarget} kcal`
                        : `Passou +${Math.abs(metabolicSummary.remainingCaloriesForTarget)} kcal`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Twin Action Pills (Consumo vs Gasto Ativo) */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('diet')}
                  className="bg-white rounded-[20px] p-3 text-left hover:scale-[1.01] transition-transform shadow-xs"
                >
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
                    de {metabolicSummary.targetIntakeCalories} kcal
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('workouts')}
                  className="bg-white rounded-[20px] p-3 text-left hover:scale-[1.01] transition-transform shadow-xs"
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
                CARD 2: ORCHID LAVENDER PANEL (#DDA3E6) — Previsões & Peso Resumido
               ----------------------------------------------------------------- */}
            <motion.section
              variants={summaryCardVariants}
              aria-label="Evolução de Peso e Previsões"
              className="bg-[#DDA3E6] text-[#1B1C20] rounded-[32px] p-5 flex flex-col justify-between shadow-xl min-h-[380px] lg:min-h-[420px]"
            >
              <div>
                {/* Header inside Lavender Screen */}
                <div className="flex items-center justify-between">
                  {renderAvatarCluster(
                    'bg-[#582B5E] text-white hover:bg-[#431F48]',
                    () => setActiveSection('weight'),
                    'Registrar novo peso corporal'
                  )}
                  <div className="bg-white rounded-full px-3 py-1 text-[11px] font-mono tabular-nums font-semibold text-[#1B1C20] flex items-center gap-1.5 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-[#582B5E]" />
                    <span>{selectedDate}</span>
                  </div>
                </div>

                {/* Main Hero: 30-Day Weight Projection */}
                <div className="mt-4">
                  <span className="text-xs font-semibold text-[#582B5E]">
                    Projeção em 30 Dias
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

                {/* Compact White Trajectory & Health Card */}
                <div className="bg-white rounded-[22px] p-3.5 mt-3 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#582B5E]" />
                      <span className="text-xs font-bold text-[#1B1C20]">Peso Atual</span>
                    </div>
                    <span className="text-sm font-bold font-mono tabular-nums text-[#1B1C20]">
                      {forecast.latestWeightKg.toFixed(1)} kg
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500">Status Evolução:</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#DDA3E6]/30 text-[#431F48] font-bold text-[10px]">
                      {forecast.statusLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500">Passos &amp; Saúde:</span>
                    <span className="font-mono tabular-nums font-semibold text-[#1B1C20]">
                      {currentDayMetric.steps.toLocaleString('pt-BR')} passos
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick-Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('weight')}
                  className="bg-white hover:bg-slate-50 rounded-[20px] py-2.5 px-3 text-xs font-bold text-[#1B1C20] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Scale className="w-3.5 h-3.5 text-[#582B5E]" />
                  <span>Aba Previsões</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHealthModalOpen(true)}
                  className="bg-[#582B5E] hover:bg-[#431F48] text-white rounded-[20px] py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Sincronizar</span>
                </button>
              </div>
            </motion.section>

            {/* -----------------------------------------------------------------
                CARD 3: WARM SAND PANEL (#F3E3CA) — Metas de Hoje Resumidas
               ----------------------------------------------------------------- */}
            <motion.section
              variants={summaryCardVariants}
              aria-label="Refeições e Lista To-Do de Metas"
              className="bg-[#F3E3CA] text-[#1B1C20] rounded-[32px] p-5 flex flex-col justify-between shadow-xl min-h-[380px] lg:min-h-[420px]"
            >
              <div>
                {/* Header inside Warm Sand Screen */}
                <div className="flex items-center justify-between">
                  {renderAvatarCluster(
                    'bg-[#C4B299] text-white hover:bg-[#b09d82]',
                    () => setActiveSection('todos'),
                    'Ver todas as metas To-Do'
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold font-mono text-[#1B1C20] px-2.5 py-0.5 rounded-full bg-white/70 shadow-2xs">
                      {completedTodosToday}/{totalTodosToday} concluídas
                    </span>
                    <BrandWaveMark className="w-6 h-6 text-[#1B1C20]" />
                  </div>
                </div>

                {/* Main Hero: Metas do Dia */}
                <div className="mt-4">
                  <span className="text-xs font-semibold text-[#1B1C20]/70">
                    Metas &amp; Disciplina Diária
                  </span>
                  <div className="text-[32px] xl:text-[36px] font-display font-bold tracking-tight text-[#1B1C20] leading-none mt-1">
                    Metas de Hoje
                  </div>
                </div>

                {/* Compact Interactive Checklist (Top 3 Todos of Today) */}
                <div className="mt-3 bg-white rounded-[22px] p-3 shadow-md divide-y divide-slate-100">
                  {[...dailyHabitTodos, ...specificDayTodos].slice(0, 3).map((todo) => {
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
                  {[...dailyHabitTodos, ...specificDayTodos].length === 0 && (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Nenhuma meta adicionada para hoje.
                    </div>
                  )}
                </div>
              </div>

              {/* Conjoined Action Bar at the Bottom */}
              <div className="mt-3 bg-white rounded-full p-1 flex items-center justify-between shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveSection('diet')}
                  className="flex-1 py-2 text-xs font-bold text-[#1B1C20] hover:bg-slate-100 rounded-full transition-colors text-center"
                >
                  Montar Dieta
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('meals')}
                  className="flex-1 py-2 text-xs font-bold text-[#1B1C20] hover:bg-slate-100 rounded-full transition-colors text-center"
                >
                  + Refeição
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('todos')}
                  className="w-8 h-8 rounded-full bg-[#1B1C20] text-white flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                  title="Ver todas as metas To-Do"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}

        {/* =====================================================================
            NEW TAB: MONTAR DIETA INTELIGENTE (Déficit / Superávit / Manutenção)
           ===================================================================== */}
        {activeSection === 'diet' && (
          <DietPlannerView
            key={`diet-${selectedDate}`}
            profile={profile}
            selectedDate={selectedDate}
            metabolicSummary={metabolicSummary}
            dayMeals={dayMeals}
            onUpdateGoalAndAdjustment={async (goalType, dailyCalorieAdjustment) => {
              const updatedProfile = {
                ...profile,
                goalType,
                dailyCalorieAdjustment,
              };
              if (user) {
                await updateUserProfileData(user.uid, updatedProfile);
              } else {
                setProfile(updatedProfile);
              }
            }}
            onAddPlannedMeal={async (planned) => {
              const newMeal = {
                date: selectedDate,
                mealType: planned.mealType,
                name: planned.name,
                grams: planned.grams,
                calories: planned.calories,
                proteinG: planned.proteinG,
                carbsG: planned.carbsG,
                fatG: planned.fatG,
              };
              if (user) {
                await addMealRecord(user.uid, newMeal);
              } else {
                setMeals((prev) => [
                  ...prev,
                  {
                    id: `local_meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    userId: 'demo_local',
                    ...newMeal,
                  },
                ]);
              }
            }}
            onNavigateToMeals={() => setActiveSection('meals')}
          />
        )}

        {/* =====================================================================
            TAB 2: REFEIÇÕES (Warm Sand & Crisp White Aesthetic)
           ===================================================================== */}
        {activeSection === 'meals' && (
          <motion.section
            key={`meals-${selectedDate}`}
            variants={tabContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label="Calculadora de Calorias das Refeições"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-auto"
          >
            {/* Left 5 Cols: Warm Sand Meal Calculator Card */}
            <motion.div
              variants={summaryCardVariants}
              className="lg:col-span-5 bg-[#F3E3CA] text-[#1B1C20] rounded-[36px] p-6 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-full bg-[#1B1C20] text-white flex items-center justify-center">
                      <Utensils className="w-4 h-4" />
                    </span>
                    <div>
                      <h2 className="text-xl font-display font-semibold text-[#1B1C20]">
                        Calcular Refeição
                      </h2>
                      <p className="text-xs text-[#1B1C20]/65 font-mono">{selectedDate}</p>
                    </div>
                  </div>
                  <BrandWaveMark className="w-6 h-6 text-[#1B1C20]" />
                </div>

                <form onSubmit={handleAddMeal} className="mt-5 space-y-3.5">
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
                    <span>Registrar Refeição (+{mealCalories} kcal)</span>
                  </button>
                </form>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1B1C20]/15 flex items-center justify-between text-xs">
                <span className="text-[#1B1C20]/70">Meta de Ingestão Diária:</span>
                <span className="font-mono tabular-nums font-bold text-[#1B1C20]">
                  {metabolicSummary.consumedCalories} / {metabolicSummary.targetIntakeCalories} kcal
                </span>
              </div>
            </motion.div>

            {/* Right 7 Cols: White Sheet Meal Ledger */}
            <motion.div
              variants={summaryCardVariants}
              className="lg:col-span-7 bg-white text-[#1B1C20] rounded-[36px] p-6 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-display font-semibold text-[#1B1C20]">
                      Refeições do Dia ({dayMeals.length})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Restam{' '}
                      <span className="font-mono tabular-nums font-semibold text-[#1B1C20]">
                        {metabolicSummary.remainingCaloriesForTarget} kcal
                      </span>{' '}
                      dentro do seu planejamento
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono tabular-nums bg-[#F3E3CA] px-4 py-2 rounded-full font-semibold">
                    <span>
                      P: {metabolicSummary.consumedProteinG}/{metabolicSummary.targetProteinG}g
                    </span>
                    <span>·</span>
                    <span>
                      C: {metabolicSummary.consumedCarbsG}/{metabolicSummary.targetCarbsG}g
                    </span>
                    <span>·</span>
                    <span>
                      G: {metabolicSummary.consumedFatG}/{metabolicSummary.targetFatG}g
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {dayMeals.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Nenhuma refeição lançada em {selectedDate}.
                    </div>
                  ) : (
                    dayMeals.map((m) => (
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
                            onClick={() =>
                              setPendingDelete({
                                type: 'meal',
                                id: m.id,
                                label: `${m.name} (${m.calories} kcal)`,
                              })
                            }
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
                <span className="text-xs text-slate-400">Total calórico das refeições</span>
                <span className="text-2xl font-display font-bold font-mono tabular-nums text-[#1B1C20]">
                  {metabolicSummary.consumedCalories.toLocaleString('pt-BR')} kcal
                </span>
              </div>
            </motion.div>
          </motion.section>
        )}

        {/* =====================================================================
            TAB 3: EXERCÍCIOS (Sky Blue & Matte Charcoal Aesthetic)
           ===================================================================== */}
        {activeSection === 'workouts' && (
          <motion.section
            key={`workouts-${selectedDate}`}
            variants={tabContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label="Calculadora de Calorias em Exercícios"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-auto"
          >
            {/* Left 5 Cols: Sky Blue Exercise MET Calculator */}
            <motion.div
              variants={summaryCardVariants}
              className="lg:col-span-5 bg-[#8AC4F2] text-[#1B1C20] rounded-[36px] p-6 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-full bg-[#0A468E] text-white flex items-center justify-center">
                      <Dumbbell className="w-4 h-4" />
                    </span>
                    <div>
                      <h2 className="text-xl font-display font-semibold text-[#1B1C20]">
                        Calcular Exercício
                      </h2>
                      <p className="text-xs text-[#0A468E] font-mono font-semibold">
                        Base corporal: {profile.currentWeightKg} kg
                      </p>
                    </div>
                  </div>
                  <BrandWaveMark className="w-6 h-6 text-[#0A468E]" />
                </div>

                <form onSubmit={handleAddWorkout} className="mt-5 space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#1B1C20]/80 mb-1">
                      Modalidade (Compêndio Oficial de METs)
                    </label>
                    <select
                      value={selectedExercisePresetId}
                      onChange={(e) => handleSelectExercisePreset(e.target.value)}
                      className="w-full rounded-2xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1B1C20] focus:outline-none shadow-2xs"
                    >
                      {EXERCISE_PRESETS.map((ex) => (
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
                        <label className="block text-[10px] text-slate-400">Intensidade MET</label>
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
                      Adicionar Exercício (-{calculatedExerciseCalories} kcal em {workoutDuration}m)
                    </span>
                  </button>
                </form>
              </div>

              <div className="mt-4 pt-3 border-t border-[#0A468E]/20 flex items-center justify-between text-xs text-[#0A468E] font-medium">
                <span>Equação: MET × Peso × (Min/60)</span>
                <button
                  type="button"
                  onClick={() => setHealthModalOpen(true)}
                  className="underline font-semibold"
                >
                  Sincronizar Passos →
                </button>
              </div>
            </motion.div>

            {/* Right 7 Cols: White Sheet Workouts & Step Expenditure */}
            <motion.div
              variants={summaryCardVariants}
              className="lg:col-span-7 bg-white text-[#1B1C20] rounded-[36px] p-6 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-display font-semibold text-[#1B1C20]">
                      Exercícios &amp; Gasto Ativo ({selectedDate})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Soma de treinos registrados e passos do Google Fit / Apple Health
                    </p>
                  </div>
                  <div className="bg-[#1B1C20] text-white px-4 py-2 rounded-full text-xs font-mono tabular-nums font-bold">
                    Treinos: -{metabolicSummary.workoutCalories} kcal · Passos: -
                    {metabolicSummary.stepCalories} kcal
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {dayWorkouts.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Nenhum treino registrado em {selectedDate}.
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
                              {WORKOUT_CATEGORY_LABELS[wk.category]} · {wk.durationMinutes} min ·
                              MET {wk.met}
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
                  Gasto Energético Total do Dia (Basal + Passos + Treinos)
                </span>
                <span className="text-2xl font-display font-bold font-mono tabular-nums text-[#1B1C20]">
                  {metabolicSummary.totalDailyExpenditure.toLocaleString('pt-BR')} kcal
                </span>
              </div>
            </motion.div>
          </motion.section>
        )}

        {/* =====================================================================
            TAB 4: PESO & META (Orchid Lavender Analytics Aesthetic)
           ===================================================================== */}
        {activeSection === 'weight' && (
          <motion.section
            key={`weight-${selectedDate}`}
            variants={tabContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label="Evolução de Peso e Previsões"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-auto"
          >
            {/* Left 7 Cols: Orchid Lavender Analytics & Block Chart */}
            <motion.div
              variants={summaryCardVariants}
              className="lg:col-span-7 bg-[#DDA3E6] text-[#1B1C20] rounded-[36px] p-6 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-full bg-[#582B5E] text-white flex items-center justify-center">
                      <Scale className="w-4 h-4" />
                    </span>
                    <div>
                      <h2 className="text-xl font-display font-semibold text-[#1B1C20]">
                        Evolução &amp; Previsões
                      </h2>
                      <p className="text-xs text-[#3B1940]/75">{forecast.statusLabel}</p>
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
            </motion.div>

            {/* Right 5 Cols: White Sheet Weight Check-In & History */}
            <motion.div
              variants={summaryCardVariants}
              className="lg:col-span-5 bg-white text-[#1B1C20] rounded-[36px] p-6 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <h3 className="text-xl font-display font-semibold text-[#1B1C20]">
                  Registrar Peso Atual
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atualize seu peso sempre que puder para recalibrar a TMB e as previsões
                </p>

                <form onSubmit={handleSaveWeight} className="mt-4 space-y-3">
                  <div className="bg-[#F3E3CA]/45 rounded-[24px] p-4 space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Peso Corporal em {selectedDate} (kg)
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
                        Observação da Pesagem
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
                    Salvar Peso &amp; Recalcular Previsão
                  </button>
                </form>

                <div className="mt-5">
                  <div className="text-xs font-bold text-[#1B1C20] mb-2">
                    Histórico de Pesagens
                  </div>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
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
                <span className="text-slate-400">Distância até a meta ({profile.targetWeightKg} kg)</span>
                <span className="font-mono tabular-nums font-bold text-[#582B5E]">
                  {Math.abs(profile.targetWeightKg - forecast.latestWeightKg).toFixed(1)} kg
                </span>
              </div>
            </motion.div>
          </motion.section>
        )}

        {/* =====================================================================
            TAB 5: METAS TO-DO (Warm Sand & White Dual-Scope Goals View)
           ===================================================================== */}
        {activeSection === 'todos' && (
          <motion.section
            key={`todos-${selectedDate}`}
            variants={tabContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label="Lista To-Do de Metas Diárias e do Dia Específico"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-auto"
          >
            {/* Left 5 Cols: Warm Sand Goal Creator & Scope Selector */}
            <motion.div
              variants={summaryCardVariants}
              className="lg:col-span-5 bg-[#F3E3CA] text-[#1B1C20] rounded-[36px] p-6 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-full bg-[#1B1C20] text-white flex items-center justify-center">
                      <ListChecks className="w-4 h-4" />
                    </span>
                    <div>
                      <h2 className="text-xl font-display font-semibold text-[#1B1C20]">
                        Metas To-Do
                      </h2>
                      <p className="text-xs text-[#1B1C20]/65">
                        Para todo dia e para {selectedDate}
                      </p>
                    </div>
                  </div>
                  <BrandWaveMark className="w-6 h-6 text-[#1B1C20]" />
                </div>

                {/* Mini Card Scope Selector */}
                <div className="grid grid-cols-2 gap-2.5 mt-5">
                  <button
                    type="button"
                    onClick={() => setTodoScope('daily')}
                    className={`rounded-[22px] p-4 text-left transition-all ${
                      todoScope === 'daily'
                        ? 'bg-[#1B1C20] text-white shadow-md'
                        : 'bg-[#E5D2B5] text-[#1B1C20]'
                    }`}
                  >
                    <div className="text-lg font-bold font-mono tabular-nums">
                      {dailyHabitTodos.filter((t) => isTodoCompletedOnSelectedDate(t)).length}/
                      {dailyHabitTodos.length}
                    </div>
                    <div className="mt-2 text-xs font-semibold">Para Todo Dia</div>
                    <div className="text-[10px] opacity-70">Hábito Recorrente</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTodoScope('date_specific')}
                    className={`rounded-[22px] p-4 text-left transition-all ${
                      todoScope === 'date_specific'
                        ? 'bg-[#1B1C20] text-white shadow-md'
                        : 'bg-[#E5D2B5] text-[#1B1C20]'
                    }`}
                  >
                    <div className="text-lg font-bold font-mono tabular-nums">
                      {specificDayTodos.filter((t) => isTodoCompletedOnSelectedDate(t)).length}/
                      {specificDayTodos.length}
                    </div>
                    <div className="mt-2 text-xs font-semibold">Dia Específico</div>
                    <div className="text-[10px] opacity-70">Exclusiva ({selectedDate})</div>
                  </button>
                </div>

                {/* Dashed Input Card */}
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
                        placeholder="----  ----  Digite sua meta aqui"
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

              {/* Conjoined Dual-Pill Filter Bar */}
              <div className="mt-4 bg-white rounded-full p-1.5 flex items-center justify-between shadow-sm">
                <button
                  type="button"
                  onClick={() => setTodoFilterScope('daily')}
                  className={`flex-1 py-2 text-xs font-bold rounded-full transition-colors ${
                    todoFilterScope === 'daily' ? 'bg-[#F3E3CA] text-[#1B1C20]' : 'text-slate-500'
                  }`}
                >
                  Todo Dia
                </button>
                <button
                  type="button"
                  onClick={() => setTodoFilterScope('all')}
                  className="w-9 h-9 rounded-full bg-[#1B1C20] text-white flex items-center justify-center shrink-0 mx-1 text-[10px] font-bold"
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setTodoFilterScope('date_specific')}
                  className={`flex-1 py-2 text-xs font-bold rounded-full transition-colors ${
                    todoFilterScope === 'date_specific'
                      ? 'bg-[#F3E3CA] text-[#1B1C20]'
                      : 'text-slate-500'
                  }`}
                >
                  Dia {selectedDate.slice(8, 10)}/{selectedDate.slice(5, 7)}
                </button>
              </div>
            </motion.div>

            {/* Right 7 Cols: White Sheet Dual Lists */}
            <motion.div
              variants={summaryCardVariants}
              className="lg:col-span-7 bg-white text-[#1B1C20] rounded-[36px] p-6 flex flex-col justify-between shadow-2xl"
            >
              <div className="space-y-5 overflow-y-auto max-h-[430px] pr-1">
                {/* Section A: Metas para Todo Dia */}
                {(todoFilterScope === 'all' || todoFilterScope === 'daily') && (
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-base font-display font-semibold text-[#1B1C20]">
                        Metas para Todo Dia (Hábitos Diários)
                      </h3>
                      <span className="text-xs font-mono tabular-nums font-bold text-[#1B1C20]">
                        {dailyHabitTodos.filter((t) => isTodoCompletedOnSelectedDate(t)).length}/
                        {dailyHabitTodos.length}
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-2">
                      {dailyHabitTodos.map((todo) => {
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
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
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
                      })}
                    </div>
                  </div>
                )}

                {/* Section B: Metas para Este Dia Específico */}
                {(todoFilterScope === 'all' || todoFilterScope === 'date_specific') && (
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-base font-display font-semibold text-[#1B1C20]">
                        Metas Específicas do Dia ({selectedDate})
                      </h3>
                      <span className="text-xs font-mono tabular-nums font-bold text-[#1B1C20]">
                        {specificDayTodos.filter((t) => isTodoCompletedOnSelectedDate(t)).length}/
                        {specificDayTodos.length}
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-2">
                      {specificDayTodos.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4">
                          Nenhuma meta exclusiva para {selectedDate}.
                        </p>
                      ) : (
                        specificDayTodos.map((todo) => {
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
                                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
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
            </motion.div>
          </motion.section>
        )}
        </AnimatePresence>
      </main>

      {/* =====================================================================
          FIXED BOTTOM NAVIGATION MENU BAR (Pill-Styled Dock on Dark Backdrop)
         ===================================================================== */}
      <nav
        aria-label="Menu Principal Inferior"
        className={`fixed bottom-0 left-0 right-0 z-40 h-16 backdrop-blur-md px-2 transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-[#19191E]/95 border-t border-white/10'
            : 'bg-white/95 border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
        }`}
      >
        <div className="max-w-2xl mx-auto h-full flex items-center justify-between gap-1 overflow-x-auto py-1">
          {(
            [
              {
                id: 'overview',
                label: 'Painel',
                activeBg: 'bg-[#8AC4F2] text-[#1B1C20]',
                icon: Flame,
              },
              {
                id: 'diet',
                label: 'Dieta',
                activeBg: 'bg-[#DDA3E6] text-[#1B1C20]',
                icon: Target,
              },
              {
                id: 'meals',
                label: 'Refeições',
                activeBg: 'bg-[#F3E3CA] text-[#1B1C20]',
                icon: Utensils,
              },
              {
                id: 'workouts',
                label: 'Treinos',
                activeBg: 'bg-[#8AC4F2] text-[#1B1C20]',
                icon: Dumbbell,
              },
              {
                id: 'weight',
                label: 'Previsões',
                activeBg: 'bg-[#DDA3E6] text-[#1B1C20]',
                icon: Scale,
              },
              {
                id: 'todos',
                label: 'Metas',
                activeBg: 'bg-[#F3E3CA] text-[#1B1C20]',
                icon: ListChecks,
              },
            ] as const
          ).map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex-1 min-w-[48px] min-h-[44px] flex flex-col items-center justify-center rounded-2xl transition-all px-1 ${
                  isActive
                    ? `${item.activeBg} font-bold shadow-md`
                    : theme === 'dark'
                    ? 'text-white/60 hover:text-white hover:bg-white/5'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 whitespace-nowrap truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <BasalCalculatorModal
        open={basalModalOpen}
        profile={profile}
        onClose={() => setBasalModalOpen(false)}
        onSave={async (updated) => {
          if (user) {
            await updateUserProfileData(user.uid, updated);
          } else {
            setProfile((prev) => ({ ...prev, ...updated }));
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
          if (user) {
            await updateUserProfileData(user.uid, nextProfile);
          } else {
            setProfile(nextProfile);
          }
        }}
        onWeightSynced={async (weightKg, source) => {
          const entry = {
            date: selectedDate,
            weightKg,
            note: `Sincronizado automaticamente via ${
              source === 'google_fit' ? 'Google Fit' : 'Apple Health'
            }`,
            source,
          };
          if (user) {
            await saveWeightRecord(user.uid, profile, entry);
          } else {
            setWeights((prev) => [
              ...prev.filter((w) => w.date !== selectedDate),
              { id: `local_wt_${selectedDate}`, userId: 'demo_local', ...entry },
            ]);
            setProfile((prev) => ({ ...prev, currentWeightKg: weightKg }));
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
