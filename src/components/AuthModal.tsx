import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Flame,
  Lock,
  Mail,
  Scale,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
} from '../firebase';
import { ensureUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types';
import { BrandWaveMark } from './WeightEvolutionChart';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');

  // Personalization fields for Signup
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<number>(28);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [currentWeightKg, setCurrentWeightKg] = useState<number>(78.5);
  const [targetWeightKg, setTargetWeightKg] = useState<number>(72.0);
  const [goalType, setGoalType] = useState<'lose' | 'maintain' | 'gain'>('lose');

  if (!open) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessNotice(null);
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      // Ensure isolated profile is loaded/created in Firestore
      const userProfile = await ensureUserProfile(user.uid, user.displayName);
      onSuccess(userProfile);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setError('Login cancelado: janela de autenticação foi fechada.');
      } else if (msg.includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'seu-usuario.github.io';
        setError(
          `Domínio não autorizado no Firebase (${host}). No Console do Firebase, acesse Authentication → Settings → Domínios autorizados e adicione "${host}".`
        );
      } else {
        setError(`Erro ao autenticar com o Google: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await signInWithEmail(email, password);
        const userProfile = await ensureUserProfile(user.uid, user.displayName);
        onSuccess(userProfile);
        onClose();
      } else {
        // Mode === 'signup'
        const cleanName = displayName.trim() || 'Atleta Metabolix';
        const user = await signUpWithEmail(email, password, cleanName);

        // Compute daily adjustment based on goal
        const dailyCalorieAdjustment =
          goalType === 'lose' ? -500 : goalType === 'gain' ? 350 : 0;

        // Custom personalized profile configuration
        const customProfile: Partial<UserProfile> = {
          displayName: cleanName,
          sex,
          age,
          heightCm,
          currentWeightKg,
          targetWeightKg,
          goalType,
          dailyCalorieAdjustment,
          stepGoal: 10000,
          waterGoalMl: 3000,
        };

        const userProfile = await ensureUserProfile(
          user.uid,
          cleanName,
          customProfile
        );
        onSuccess(userProfile);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('invalid-credential')) {
        setError('E-mail ou senha incorretos.');
      } else if (msg.includes('email-already-in-use')) {
        setError('Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha.');
      } else if (msg.includes('weak-password')) {
        setError('A senha informada é fraca. Use pelo menos 6 caracteres combinando letras e números.');
      } else if (msg.includes('operation-not-allowed')) {
        setError('O provedor de e-mail e senha precisa estar ativo no Console Firebase. Recomendamos utilizar o botão "Entrar com Google" que já está configurado e pronto!');
      } else {
        setError(`Não foi possível concluir: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Digite seu e-mail no campo acima antes de solicitar a redefinição.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setSuccessNotice(`Link de redefinição enviado com sucesso para ${email}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erro ao enviar redefinição de senha: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#1B1C20] border border-white/10 rounded-[34px] w-full max-w-lg text-white shadow-2xl overflow-hidden my-auto">
        {/* Top Header Card */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-white/5 to-transparent border-b border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8AC4F2] flex items-center justify-center text-[#0A468E] shadow-sm">
              <BrandWaveMark className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                Metabolix
                <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-[#8AC4F2]/20 text-[#8AC4F2]">
                  Perfil &amp; Nuvem
                </span>
              </h2>
              <p className="text-xs text-white/60">
                Seus cálculos metabólicos, refeições e metas salvos no seu perfil
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 mt-5 p-1 rounded-2xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#1B1C20] shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-[#8AC4F2] text-[#0A468E] shadow-sm font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Criar Perfil Personalizado
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* 1-Click Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-[#1B1C20] text-sm font-bold font-sans transition-all active:scale-[0.99] shadow-md disabled:opacity-50"
          >
            {/* Google Colorful G Icon */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {mode === 'login'
                ? 'Entrar com Google'
                : 'Criar Perfil com Google (Recomendado)'}
            </span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] text-white/40 font-medium">
              ou com e-mail e senha
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Seu Nome
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-white/40" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Rafael Nelli"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#8AC4F2]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#8AC4F2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#8AC4F2]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-white/40 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Custom Personalized Physical Metrics in Signup Mode */}
            {mode === 'signup' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 mt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#8AC4F2]">
                  <Sparkles className="w-4 h-4" />
                  <span>Personalização Metabólica do Seu Perfil</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-white/60 block mb-1">
                      Sexo Biológico
                    </span>
                    <div className="grid grid-cols-2 gap-1 bg-black/30 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSex('male')}
                        className={`py-1 rounded-lg font-medium text-center ${
                          sex === 'male'
                            ? 'bg-[#8AC4F2] text-[#0A468E] font-bold'
                            : 'text-white/60'
                        }`}
                      >
                        Masc
                      </button>
                      <button
                        type="button"
                        onClick={() => setSex('female')}
                        className={`py-1 rounded-lg font-medium text-center ${
                          sex === 'female'
                            ? 'bg-[#DDA3E6] text-[#3B1940] font-bold'
                            : 'text-white/60'
                        }`}
                      >
                        Fem
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-white/60 block mb-1">
                      Idade (anos)
                    </label>
                    <input
                      type="number"
                      min={12}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/10 text-white text-xs font-mono tabular-nums text-center focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-white/60 block mb-1">
                      Altura (cm)
                    </label>
                    <input
                      type="number"
                      min={120}
                      max={230}
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-black/30 border border-white/10 text-white text-xs font-mono tabular-nums text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/60 block mb-1">
                      Peso Atual (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={30}
                      max={250}
                      value={currentWeightKg}
                      onChange={(e) => setCurrentWeightKg(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-black/30 border border-white/10 text-white text-xs font-mono tabular-nums text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/60 block mb-1">
                      Meta (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={30}
                      max={250}
                      value={targetWeightKg}
                      onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-black/30 border border-white/10 text-white text-xs font-mono tabular-nums text-center focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-white/60 block mb-1">
                    Objetivo Principal
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-black/30 p-1 rounded-xl text-[11px]">
                    <button
                      type="button"
                      onClick={() => setGoalType('lose')}
                      className={`py-1 rounded-lg text-center ${
                        goalType === 'lose'
                          ? 'bg-[#8AC4F2] text-[#0A468E] font-bold'
                          : 'text-white/60'
                      }`}
                    >
                      Emagrecer (-500)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalType('maintain')}
                      className={`py-1 rounded-lg text-center ${
                        goalType === 'maintain'
                          ? 'bg-[#F3E3CA] text-[#1B1C20] font-bold'
                          : 'text-white/60'
                      }`}
                    >
                      Manter
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalType('gain')}
                      className={`py-1 rounded-lg text-center ${
                        goalType === 'gain'
                          ? 'bg-[#DDA3E6] text-[#3B1940] font-bold'
                          : 'text-white/60'
                      }`}
                    >
                      Ganho (+350)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-[#8AC4F2] hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all active:scale-[0.99] shadow-md disabled:opacity-50 ${
                mode === 'signup'
                  ? 'bg-[#8AC4F2] hover:bg-[#9ed0f8] text-[#0A468E]'
                  : 'bg-white hover:bg-slate-100 text-[#1B1C20]'
              }`}
            >
              {loading
                ? 'Conectando...'
                : mode === 'signup'
                ? 'Salvar Perfil e Começar'
                : 'Acessar Meu Painel'}
            </button>
          </form>

          {/* Continue as Demo button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-white/50 hover:text-white transition-colors underline"
            >
              Continuar explorando no Modo Teste (Demo)
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 py-3.5 bg-black/40 border-t border-white/5 text-[11px] text-white/40 flex items-center justify-between">
          <span>Metabolix Cloud · Firestore Security Hardened</span>
          <span className="flex items-center gap-1 text-[#8AC4F2]">
            <Flame className="w-3 h-3" />
            Dados 100% isolados
          </span>
        </div>
      </div>
    </div>
  );
}
