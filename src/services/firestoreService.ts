import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DailyMetric,
  MealEntry,
  TodoItem,
  UserProfile,
  WeightEntry,
  WorkoutEntry,
} from '../types';
import { formatDateISO } from '../utils/metabolic';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || 'id_default';
}

function clamp(val: number, min: number, max: number): number {
  if (Number.isNaN(val)) return min;
  return Math.min(max, Math.max(min, val));
}

export async function ensureUserProfile(
  uid: string,
  displayName: string | null,
  customInitialData?: Partial<UserProfile>
): Promise<UserProfile> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  const userRef = doc(db, 'users', safeUid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }

  if (snap && snap.exists()) {
    return snap.data() as UserProfile;
  }

  const defaultProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
    uid: safeUid,
    displayName: (customInitialData?.displayName || displayName || 'Atleta Metabolix').trim().slice(0, 80) || 'Atleta Metabolix',
    sex: customInitialData?.sex === 'female' ? 'female' : 'male',
    age: clamp(customInitialData?.age ?? 30, 10, 120),
    heightCm: clamp(customInitialData?.heightCm ?? 176, 100, 250),
    currentWeightKg: clamp(customInitialData?.currentWeightKg ?? 82.0, 25, 350),
    targetWeightKg: clamp(customInitialData?.targetWeightKg ?? 76.0, 25, 350),
    activityFactor: clamp(customInitialData?.activityFactor ?? 1.375, 1.1, 2.5),
    goalType: customInitialData?.goalType === 'gain' ? 'gain' : customInitialData?.goalType === 'maintain' ? 'maintain' : 'lose',
    dailyCalorieAdjustment: clamp(customInitialData?.dailyCalorieAdjustment ?? -500, -1500, 1500),
    stepGoal: clamp(customInitialData?.stepGoal ?? 10000, 1000, 50000),
    waterGoalMl: clamp(customInitialData?.waterGoalMl ?? 3000, 500, 10000),
    googleFitConnected: false,
    appleHealthConnected: false,
  };

  try {
    await setDoc(userRef, {
      ...defaultProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  // Seed initial weight record and default daily habits so the user immediately sees a complete workspace
  const today = formatDateISO();
  const initialWeightId = sanitizeId(`${safeUid}_w_${today}`);
  const weightPath = `weights/${initialWeightId}`;
  try {
    await setDoc(doc(db, 'weights', initialWeightId), {
      userId: safeUid,
      date: today,
      weightKg: defaultProfile.currentWeightKg,
      note: 'Peso inicial de configuração do perfil',
      source: 'manual',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Initial weight seed note (can be already created):', err);
  }

  const starterTodos: Array<Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      userId: safeUid,
      title: 'Bater a meta de proteínas do dia (2,0g/kg)',
      category: 'nutrition',
      scope: 'daily',
      targetDate: today,
      completed: false,
      lastCompletedDate: '',
    },
    {
      userId: safeUid,
      title: 'Atingir 10.000 passos sincronizados (Google Fit / Apple Health)',
      category: 'workout',
      scope: 'daily',
      targetDate: today,
      completed: false,
      lastCompletedDate: '',
    },
    {
      userId: safeUid,
      title: 'Ingerir 3.000 ml de água ao longo do dia',
      category: 'hydration',
      scope: 'daily',
      targetDate: today,
      completed: false,
      lastCompletedDate: '',
    },
    {
      userId: safeUid,
      title: 'Registrar pesagem em jejum e revisar previsão semanal',
      category: 'measurement',
      scope: 'date_specific',
      targetDate: today,
      completed: false,
      lastCompletedDate: '',
    },
  ];

  for (let i = 0; i < starterTodos.length; i++) {
    const tId = sanitizeId(`${safeUid}_todo_init_${i + 1}`);
    try {
      await setDoc(doc(db, 'todos', tId), {
        ...starterTodos[i],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Initial todo seed note (can be already created):', err);
    }
  }

  return defaultProfile;
}

export async function updateUserProfileData(
  uid: string,
  updates: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      displayName: updates.displayName.trim().slice(0, 80) || 'Atleta',
      sex: updates.sex === 'female' ? 'female' : 'male',
      age: Math.round(clamp(updates.age, 10, 120)),
      heightCm: Math.round(clamp(updates.heightCm, 100, 250)),
      currentWeightKg: Number(clamp(updates.currentWeightKg, 25, 350).toFixed(1)),
      targetWeightKg: Number(clamp(updates.targetWeightKg, 25, 350).toFixed(1)),
      activityFactor: Number(clamp(updates.activityFactor, 1.1, 2.5).toFixed(3)),
      goalType: updates.goalType,
      dailyCalorieAdjustment: Math.round(clamp(updates.dailyCalorieAdjustment, -1500, 1500)),
      stepGoal: Math.round(clamp(updates.stepGoal, 1000, 50000)),
      waterGoalMl: Math.round(clamp(updates.waterGoalMl, 500, 10000)),
      googleFitConnected: Boolean(updates.googleFitConnected),
      appleHealthConnected: Boolean(updates.appleHealthConnected),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function addMealRecord(
  uid: string,
  meal: Omit<MealEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const mealId = sanitizeId(`${safeUid}_meal_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const path = `meals/${mealId}`;
  try {
    await setDoc(doc(db, 'meals', mealId), {
      userId: safeUid,
      date: meal.date,
      mealType: meal.mealType,
      name: meal.name.trim().slice(0, 120) || 'Refeição',
      grams: Math.round(clamp(meal.grams, 1, 5000)),
      calories: Math.round(clamp(meal.calories, 0, 10000)),
      proteinG: Number(clamp(meal.proteinG, 0, 1000).toFixed(1)),
      carbsG: Number(clamp(meal.carbsG, 0, 1000).toFixed(1)),
      fatG: Number(clamp(meal.fatG, 0, 1000).toFixed(1)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteMealRecord(mealId: string): Promise<void> {
  const safeId = sanitizeId(mealId);
  const path = `meals/${safeId}`;
  try {
    await deleteDoc(doc(db, 'meals', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addWorkoutRecord(
  uid: string,
  workout: Omit<WorkoutEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const workoutId = sanitizeId(`${safeUid}_wk_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const path = `workouts/${workoutId}`;
  try {
    await setDoc(doc(db, 'workouts', workoutId), {
      userId: safeUid,
      date: workout.date,
      activityName: workout.activityName.trim().slice(0, 120) || 'Exercício',
      category: workout.category,
      durationMinutes: Math.round(clamp(workout.durationMinutes, 1, 1440)),
      met: Number(clamp(workout.met, 1, 25).toFixed(1)),
      caloriesBurned: Math.round(clamp(workout.caloriesBurned, 1, 15000)),
      source: workout.source,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteWorkoutRecord(workoutId: string): Promise<void> {
  const safeId = sanitizeId(workoutId);
  const path = `workouts/${safeId}`;
  try {
    await deleteDoc(doc(db, 'workouts', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveWeightRecord(
  uid: string,
  currentProfile: UserProfile,
  entry: Omit<WeightEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const weightId = sanitizeId(`${safeUid}_w_${entry.date}`);
  const path = `weights/${weightId}`;
  const cleanWeight = Number(clamp(entry.weightKg, 25, 350).toFixed(1));
  try {
    const ref = doc(db, 'weights', weightId);
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, {
        date: entry.date,
        weightKg: cleanWeight,
        note: (entry.note || '').trim().slice(0, 200),
        source: entry.source,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: safeUid,
        date: entry.date,
        weightKg: cleanWeight,
        note: (entry.note || '').trim().slice(0, 200),
        source: entry.source,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Also keep currentWeightKg in UserProfile synced with latest check-in
    await updateUserProfileData(safeUid, {
      ...currentProfile,
      currentWeightKg: cleanWeight,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteWeightRecord(weightId: string): Promise<void> {
  const safeId = sanitizeId(weightId);
  const path = `weights/${safeId}`;
  try {
    await deleteDoc(doc(db, 'weights', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addTodoRecord(
  uid: string,
  todo: Omit<TodoItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const todoId = sanitizeId(`${safeUid}_td_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const path = `todos/${todoId}`;
  try {
    await setDoc(doc(db, 'todos', todoId), {
      userId: safeUid,
      title: todo.title.trim().slice(0, 160) || 'Nova Meta',
      category: todo.category,
      scope: todo.scope,
      targetDate: todo.targetDate,
      completed: Boolean(todo.completed),
      lastCompletedDate: todo.lastCompletedDate || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function toggleTodoCompletion(
  todo: TodoItem,
  selectedDate: string
): Promise<void> {
  const safeId = sanitizeId(todo.id);
  const path = `todos/${safeId}`;
  const isCurrentlyDoneOnDate =
    todo.scope === 'daily'
      ? todo.completed && todo.lastCompletedDate === selectedDate
      : todo.completed;

  const nextCompleted = !isCurrentlyDoneOnDate;
  const nextLastCompletedDate = nextCompleted ? selectedDate : '';

  try {
    await updateDoc(doc(db, 'todos', safeId), {
      completed: nextCompleted,
      lastCompletedDate: nextLastCompletedDate,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteTodoRecord(todoId: string): Promise<void> {
  const safeId = sanitizeId(todoId);
  const path = `todos/${safeId}`;
  try {
    await deleteDoc(doc(db, 'todos', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function upsertDailyMetric(
  uid: string,
  date: string,
  metric: Omit<DailyMetric, 'id' | 'userId' | 'date' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const metricId = sanitizeId(`${safeUid}_dm_${date}`);
  const path = `dailyMetrics/${metricId}`;
  const ref = doc(db, 'dailyMetrics', metricId);

  const cleanPayload = {
    steps: Math.round(clamp(metric.steps, 0, 200000)),
    activeCalories: Math.round(clamp(metric.activeCalories, 0, 15000)),
    waterMl: Math.round(clamp(metric.waterMl, 0, 15000)),
    sleepHours: Number(clamp(metric.sleepHours, 0, 24).toFixed(1)),
    restingHeartRate: Math.round(clamp(metric.restingHeartRate, 0, 250)),
    syncSource: metric.syncSource,
  };

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        ...cleanPayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: safeUid,
        date,
        ...cleanPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeUserCollections(
  uid: string,
  callbacks: {
    onProfile: (p: UserProfile) => void;
    onMeals: (m: MealEntry[]) => void;
    onWorkouts: (w: WorkoutEntry[]) => void;
    onWeights: (w: WeightEntry[]) => void;
    onTodos: (t: TodoItem[]) => void;
    onDailyMetrics: (d: DailyMetric[]) => void;
  }
) {
  const safeUid = sanitizeId(uid);

  const unsubProfile = onSnapshot(
    doc(db, 'users', safeUid),
    (snap) => {
      if (snap.exists()) {
        callbacks.onProfile(snap.data() as UserProfile);
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, `users/${safeUid}`)
  );

  const unsubMeals = onSnapshot(
    query(collection(db, 'meals'), where('userId', '==', safeUid)),
    (snap) => {
      const items: MealEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MealEntry, 'id'>),
      }));
      callbacks.onMeals(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'meals')
  );

  const unsubWorkouts = onSnapshot(
    query(collection(db, 'workouts'), where('userId', '==', safeUid)),
    (snap) => {
      const items: WorkoutEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WorkoutEntry, 'id'>),
      }));
      callbacks.onWorkouts(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'workouts')
  );

  const unsubWeights = onSnapshot(
    query(collection(db, 'weights'), where('userId', '==', safeUid)),
    (snap) => {
      const items: WeightEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WeightEntry, 'id'>),
      }));
      callbacks.onWeights(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'weights')
  );

  const unsubTodos = onSnapshot(
    query(collection(db, 'todos'), where('userId', '==', safeUid)),
    (snap) => {
      const items: TodoItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TodoItem, 'id'>),
      }));
      callbacks.onTodos(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'todos')
  );

  const unsubMetrics = onSnapshot(
    query(collection(db, 'dailyMetrics'), where('userId', '==', safeUid)),
    (snap) => {
      const items: DailyMetric[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DailyMetric, 'id'>),
      }));
      callbacks.onDailyMetrics(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'dailyMetrics')
  );

  return () => {
    unsubProfile();
    unsubMeals();
    unsubWorkouts();
    unsubWeights();
    unsubTodos();
    unsubMetrics();
  };
}
