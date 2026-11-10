import { Timestamp } from 'firebase/firestore';

export type BiologicalSex = 'male' | 'female';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'pre_workout' | 'post_workout';
export type WorkoutCategory = 'cardio' | 'strength' | 'hiit' | 'sports' | 'mobility' | 'sync';
export type DataSource = 'manual' | 'google_fit' | 'apple_health';
export type TodoCategory = 'nutrition' | 'workout' | 'hydration' | 'habit' | 'measurement';
export type TodoScope = 'daily' | 'date_specific';

export interface UserProfile {
  uid: string;
  displayName: string;
  sex: BiologicalSex;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityFactor: number;
  goalType: GoalType;
  dailyCalorieAdjustment: number;
  stepGoal: number;
  waterGoalMl: number;
  googleFitConnected: boolean;
  appleHealthConnected: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MealEntry {
  id: string;
  userId: string;
  date: string;
  mealType: MealSlot;
  name: string;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WorkoutEntry {
  id: string;
  userId: string;
  date: string;
  activityName: string;
  category: WorkoutCategory;
  durationMinutes: number;
  met: number;
  caloriesBurned: number;
  source: DataSource;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WeightEntry {
  id: string;
  userId: string;
  date: string;
  weightKg: number;
  note: string;
  source: DataSource;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TodoItem {
  id: string;
  userId: string;
  title: string;
  category: TodoCategory;
  scope: TodoScope;
  targetDate: string;
  completed: boolean;
  lastCompletedDate: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DailyMetric {
  id: string;
  userId: string;
  date: string;
  steps: number;
  activeCalories: number;
  waterMl: number;
  sleepHours: number;
  restingHeartRate: number;
  syncSource: 'manual' | 'google_fit' | 'apple_health' | 'combined';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FoodPreset {
  id: string;
  name: string;
  category: string;
  defaultGrams: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface ExercisePreset {
  id: string;
  name: string;
  category: WorkoutCategory;
  met: number;
  defaultDuration: number;
}
