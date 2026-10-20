import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  KeyRound,
  MessageCircle,
  Mail,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  Users,
  Trophy,
  Crown
} from 'lucide-react';
import { AppState, ClubSubscription, GeneratedLicenseKey, SubscriptionTierId } from '../types';
import {
  COMMERCIAL_PLANS,
  calculateDaysRemaining,
  validateAndActivateLicense,
  generateOfflineLicenseKey,
  openWhatsAppCommercialInquiry,
  openEmailCommercialInquiry
} from '../lib/licensingEngine';
import { isStrictAdminEmail } from '../lib/constants';

interface CommercialPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateSubscription: (newSub: ClubSubscription) => void;
}

export const CommercialPlansModal: React.FC<CommercialPlansModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateSubscription
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [activeTab, setActiveTab] = useState<'plans' | 'activate' | 'my_plan' | 'admin_generator'>('plans');

  // License activation state
  const [licenseInput, setLicenseInput] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');

  // Admin generator state
  const [genTier, setGenTier] = useState<SubscriptionTierId>('club_standard');
  const [genCustomerName, setGenCustomerName] = useState('');
  const [genCustomerEmail, setGenCustomerEmail] = useState('');
  const [genMonths, setGenMonths] = useState(12);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<GeneratedLicenseKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const currentSub = state.subscription;
  const isMasterAdmin =
    state.currentUser?.email && isStrictAdminEmail(state.currentUser.email);
  const daysRemaining = calculateDaysRemaining(currentSub?.validUntil);

  const handleActivateKey = () => {
    setActivationError('');
    setActivationSuccess('');

    if (!licenseInput.trim()) {
      setActivationError('Por favor introduza a sua chave de licença comercial.');
      return;
    }

    const result = validateAndActivateLicense(
      licenseInput,
      state.currentUser?.name || state.myClubName,
      state.currentUser?.email
    );

    if (result.success && result.subscription) {
      setActivationSuccess(result.message);
      onUpdateSubscription(result.subscription);
      setLicenseInput('');
      setTimeout(() => {
        setActiveTab('my_plan');
      }, 1800);
    } else {
      setActivationError(result.message);
    }
  };

  const handleGenerateAdminKey = () => {
    if (!genCustomerName.trim()) {
      alert('Por favor introduza o nome do cliente ou clube comprador.');
      return;
    }
    const newKey = generateOfflineLicenseKey(genTier, genCustomerName.trim(), genMonths);
    if (genCustomerEmail.trim()) {
      newKey.customerEmail = genCustomerEmail.trim();
    }
    setGeneratedKeyResult(newKey);
    setCopiedKey(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Módulos & Funcionalidades
                </h2>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                  100% Gratuito (Testes & Adaptações)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Acesso total e aberto para Treinadores, Clubes e Escolas de Futebol
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('plans')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'plans'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Módulos Disponíveis</span>
          </button>

          <button
            onClick={() => setActiveTab('activate')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'activate'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Chave de Acesso</span>
          </button>

          <button
            onClick={() => setActiveTab('my_plan')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'my_plan'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Estado da Plataforma</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
              Ativo (Livre)
            </span>
          </button>

          {isMasterAdmin && (
            <button
              onClick={() => setActiveTab('admin_generator')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
                activeTab === 'admin_generator'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-amber-400/70 hover:text-amber-300'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Gerador de Chaves (Admin)</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: PLANS TABLE */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              {/* Beta Test Open Notice */}
              <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 p-4 rounded-2xl border border-emerald-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <span>Plataforma Aberta e 100% Gratuita</span>
                      <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.2 rounded-full font-extrabold uppercase">
                        Testes & Adaptações
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Todas as ferramentas de gestão de plantel, treinos, cronómetro de jogo ao vivo, convocatórias e relatórios PDF estão disponíveis sem qualquer custo para que possa testar e adaptar à sua equipa.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shrink-0 flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>⚽ Utilizar Agora</span>
                  <span>➔</span>
                </button>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {COMMERCIAL_PLANS.map((plan) => {
                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col justify-between rounded-2xl p-5 transition-all border ${
                        plan.recommended
                          ? 'bg-slate-800/90 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {plan.recommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                          Configuração Recomendada
                        </div>
                      )}

                      <div>
                        {/* Plan Header */}
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-base font-bold text-white">{plan.name}</h4>
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {plan.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 min-h-[32px] mb-4">{plan.tagline}</p>

                        {/* Free Price Banner */}
                        <div className="mb-4 pb-4 border-b border-slate-700/60">
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">0€</span>
                            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                              Acesso Gratuito
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium mt-1">
                            Disponível para testes livres e adaptações no seu clube
                          </p>
                        </div>

                        {/* Features List */}
                        <ul className="space-y-2.5 mb-6 text-xs text-slate-300">
                          {plan.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={onClose}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                            plan.recommended
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-600/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                          }`}
                        >
                          <Zap className="w-4 h-4 text-current" />
                          <span>Usar Gratuitamente</span>
                        </button>

                        <button
                          onClick={() =>
                            openWhatsAppCommercialInquiry(
                              plan,
                              'yearly',
                              state.currentUser?.name,
                              state.myClubName
                            )
                          }
                          className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-emerald-300 hover:bg-slate-800/80 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Enviar Feedback / Sugestão</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feedback & Adaptation Support Notice */}
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Quer propor uma funcionalidade personalizada para o seu escalão ou clube? Fale connosco.</span>
                </div>
                <button
                  onClick={() =>
                    openEmailCommercialInquiry(
                      COMMERCIAL_PLANS[1],
                      'yearly',
                      state.currentUser?.name,
                      state.myClubName
                    )
                  }
                  className="text-emerald-400 hover:underline font-semibold flex items-center space-x-1"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Enviar Sugestão por E-mail</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVATE LICENSE KEY */}
          {activeTab === 'activate' && (
            <div className="max-w-xl mx-auto space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Ativar Licença Comercial</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Introduza a Chave de Licença recebida após o pagamento para desbloquear todas as funcionalidades do seu clube.
                </p>
              </div>

              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Chave de Licença Comercial
                  </label>
                  <input
                    type="text"
                    value={licenseInput}
                    onChange={(e) => {
                      setLicenseInput(e.target.value);
                      setActivationError('');
                    }}
                    placeholder="ex: BCV-CLUB-A8B9-11C2"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 tracking-wider"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Formato: BCV-[PRO|CLUB|ELITE]-XXXX-XXXX
                  </p>
                </div>

                {activationError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-2 text-xs text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{activationError}</span>
                  </div>
                )}

                {activationSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{activationSuccess}</span>
                  </div>
                )}

                <button
                  onClick={handleActivateKey}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2"
                >
                  <Zap className="w-4 h-4 text-current" />
                  <span>Validar & Desbloquear Plataforma</span>
                </button>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-500">
                  Ainda não tem chave?{' '}
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="text-emerald-400 hover:underline font-semibold"
                  >
                    Consulte os nossos planos
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: MY ACTIVE PLAN */}
          {activeTab === 'my_plan' && (
            <div className="max-w-xl mx-auto space-y-6 py-2">
              <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Estado da Subscrição
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">
                      {currentSub?.planName || 'Período Experimental'}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      daysRemaining > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}
                  >
                    {daysRemaining > 0 ? '✓ Ativa' : 'Expirada'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Dias Restantes</span>
                    <span className="text-lg font-bold text-white flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span>{daysRemaining} dias</span>
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Limite de Equipas</span>
                    <span className="text-lg font-bold text-white flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-teal-400" />
                      <span>{state.teams.length} / {currentSub?.maxTeams || 10}</span>
                    </span>
                  </div>
                </div>

                {currentSub?.licenseKey && (
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                    <span className="text-slate-400 block mb-1">Chave Registada</span>
                    <span className="font-mono text-emerald-300 text-sm font-semibold">
                      {currentSub.licenseKey}
                    </span>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Renovar ou Fazer Upgrade</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('activate')}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-all border border-slate-700 flex items-center justify-center space-x-1.5"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Inserir Nova Chave</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADMIN LICENSE GENERATOR (MASTER ADMIN ONLY) */}
          {activeTab === 'admin_generator' && isMasterAdmin && (
            <div className="max-w-2xl mx-auto space-y-6 py-2">
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start space-x-3 text-xs text-amber-300">
                <Crown className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-200">Painel de Chaves do Administrador Master</h4>
                  <p className="mt-0.5 text-amber-300/80">
                    Gere chaves de acesso para novos clubes ou treinadores parceiros para ativação direta na aplicação.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Módulo a Ativar
                    </label>
                    <select
                      value={genTier}
                      onChange={(e) => setGenTier(e.target.value as SubscriptionTierId)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="coach_pro">Treinador Individual (Gratuito)</option>
                      <option value="club_standard">Clube & Escola de Futebol (Gratuito)</option>
                      <option value="academy_elite">Academia & Coordenação Total (Gratuito)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Duração
                    </label>
                    <select
                      value={genMonths}
                      onChange={(e) => setGenMonths(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value={12}>12 Meses (1 Ano)</option>
                      <option value={24}>24 Meses (2 Anos)</option>
                      <option value={120}>Acesso Vitalício / Contínuo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome do Cliente / Clube Comprador *
                    </label>
                    <input
                      type="text"
                      value={genCustomerName}
                      onChange={(e) => setGenCustomerName(e.target.value)}
                      placeholder="ex: SC Vianense / Prof. Carlos"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      E-mail do Responsável (Opcional)
                    </label>
                    <input
                      type="email"
                      value={genCustomerEmail}
                      onChange={(e) => setGenCustomerEmail(e.target.value)}
                      placeholder="ex: carlos.treinador@gmail.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerateAdminKey}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-950/50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-current" />
                  <span>Gerar Chave de Acesso</span>
                </button>

                {/* Generated Result Box */}
                {generatedKeyResult && (
                  <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">Chave Gerada com Sucesso:</span>
                      <span className="text-[11px] text-slate-400">
                        Expira em {new Date(generatedKeyResult.expiresAt).toLocaleDateString('pt-PT')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedKeyResult.key}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-emerald-400 tracking-wider"
                      />
                      <button
                        onClick={() => copyToClipboard(generatedKeyResult.key)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition-colors shrink-0"
                      >
                        {copiedKey ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                      <strong>Mensagem pronta para enviar ao cliente:</strong>
                      <div className="mt-1 text-slate-400 font-mono bg-slate-900 p-2 rounded border border-slate-800 select-all">
                        Olá {generatedKeyResult.customerName}! A sua licença BolaComVisão ({generatedKeyResult.planName}) foi ativada. A sua chave é: {generatedKeyResult.key} . Basta abrir a aplicação e clicar em "Ativar Chave". Bom trabalho e bons jogos! ⚽
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
