import React, { useState, useEffect } from 'react';
import { X, Calculator, Check } from 'lucide-react';
import { BiologicalSex, GoalType, UserProfile } from '../types';
import {
  ACTIVITY_FACTORS,
  calculateHarrisBenedict,
  calculateMifflinStJeor,
} from '../utils/metabolic';

interface BasalCalculatorModalProps {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (updated: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const BasalCalculatorModal: React.FC<BasalCalculatorModalProps> = ({
  open,
  profile,
  onClose,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [sex, setSex] = useState<BiologicalSex>(profile.sex);
  const [age, setAge] = useState(profile.age);
  const [heightCm, setHeightCm] = useState(profile.heightCm);
  const [currentWeightKg, setCurrentWeightKg] = useState(profile.currentWeightKg);
  const [targetWeightKg, setTargetWeightKg] = useState(profile.targetWeightKg);
  const [activityFactor, setActivityFactor] = useState(profile.activityFactor);
  const [goalType, setGoalType] = useState<GoalType>(profile.goalType);
  const [dailyCalorieAdjustment, setDailyCalorieAdjustment] = useState(
    profile.dailyCalorieAdjustment
  );
  const [stepGoal, setStepGoal] = useState(profile.stepGoal);
  const [waterGoalMl, setWaterGoalMl] = useState(profile.waterGoalMl);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDisplayName(profile.displayName);
      setSex(profile.sex);
      setAge(profile.age);
      setHeightCm(profile.heightCm);
      setCurrentWeightKg(profile.currentWeightKg);
      setTargetWeightKg(profile.targetWeightKg);
      setActivityFactor(profile.activityFactor);
      setGoalType(profile.goalType);
      setDailyCalorieAdjustment(profile.dailyCalorieAdjustment);
      setStepGoal(profile.stepGoal);
      setWaterGoalMl(profile.waterGoalMl);
    }
  }, [open, profile]);

  if (!open) return null;

  const previewMifflin = calculateMifflinStJeor(currentWeightKg, heightCm, age, sex);
  const previewHarris = calculateHarrisBenedict(currentWeightKg, heightCm, age, sex);
  const previewTdee = Math.round(previewMifflin * activityFactor);
  const previewIntakeGoal = Math.max(1100, previewTdee + dailyCalorieAdjustment);

  const handleGoalPresetChange = (newGoal: GoalType) => {
    setGoalType(newGoal);
    if (newGoal === 'lose') setDailyCalorieAdjustment(-500);
    else if (newGoal === 'maintain') setDailyCalorieAdjustment(0);
    else if (newGoal === 'gain') setDailyCalorieAdjustment(350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        displayName,
        sex,
        age,
        heightCm,
        currentWeightKg,
        targetWeightKg,
        activityFactor,
        goalType,
        dailyCalorieAdjustment,
        stepGoal,
        waterGoalMl,
        googleFitConnected: profile.googleFitConnected,
        appleHealthConnected: profile.appleHealthConnected,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Calculadora de Taxa Metabólica Basal (TMB) &amp; Metas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Live Basal Equations Preview Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                TMB Mifflin-St Jeor
              </div>
              <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {previewMifflin.toLocaleString('pt-BR')} kcal
              </div>
              <div className="text-[11px] text-slate-500">Repouso absoluto (24h)</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                TMB Harris-Benedict
              </div>
              <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {previewHarris.toLocaleString('pt-BR')} kcal
              </div>
              <div className="text-[11px] text-slate-500">Equação clássica revisada</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Meta Calórica Diária
              </div>
              <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {previewIntakeGoal.toLocaleString('pt-BR')} kcal
              </div>
              <div className="text-[11px] text-slate-500">
                GET Estimado: {previewTdee} kcal
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sexo Biológico (Equação TMB)
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSex('male')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    sex === 'male'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Masculino (+5)
                </button>
                <button
                  type="button"
                  onClick={() => setSex('female')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    sex === 'female'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Feminino (-161)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Idade (anos)
              </label>
              <input
                type="number"
                min={10}
                max={120}
                required
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Altura (cm)
              </label>
              <input
                type="number"
                min={100}
                max={250}
                required
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Peso Atual (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min={25}
                max={350}
                required
                value={currentWeightKg}
                onChange={(e) => setCurrentWeightKg(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Peso Meta (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min={25}
                max={350}
                required
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Fator de Atividade Basal (Multiplicador)
              </label>
              <select
                value={activityFactor}
                onChange={(e) => setActivityFactor(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                {ACTIVITY_FACTORS.map((af) => (
                  <option key={af.value} value={af.value}>
                    {af.label} — {af.desc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Objetivo &amp; Ajuste Calórico Diário (kcal)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={goalType}
                  onChange={(e) => handleGoalPresetChange(e.target.value as GoalType)}
                  className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="lose">Perder Peso (Déficit)</option>
                  <option value="maintain">Manter Peso</option>
                  <option value="gain">Ganhar Massa (Superávit)</option>
                </select>
                <input
                  type="number"
                  step={50}
                  min={-1500}
                  max={1500}
                  value={dailyCalorieAdjustment}
                  onChange={(e) => setDailyCalorieAdjustment(Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Meta de Passos Diários (Google Fit / Apple Health)
              </label>
              <input
                type="number"
                step={500}
                min={1000}
                max={50000}
                value={stepGoal}
                onChange={(e) => setStepGoal(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Meta de Hidratação Diária (ml)
              </label>
              <input
                type="number"
                step={250}
                min={500}
                max={10000}
                value={waterGoalMl}
                onChange={(e) => setWaterGoalMl(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Parâmetros Metabólicos'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
