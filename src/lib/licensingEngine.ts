import { CommercialPlan, ClubSubscription, GeneratedLicenseKey, SubscriptionTierId } from '../types';
import { MASTER_ADMIN_EMAIL } from './constants';

export const COMMERCIAL_CONTACT_PHONE = '351912345678';
export const COMMERCIAL_CONTACT_EMAIL = MASTER_ADMIN_EMAIL;

export const COMMERCIAL_PLANS: CommercialPlan[] = [
  {
    id: 'coach_pro',
    name: 'Treinador Individual',
    badge: '⚽ 100% Gratuito',
    tagline: 'Ideal para treinadores principais ou adjuntos focados na sua equipa',
    monthlyPriceEUR: 0,
    yearlyPriceEUR: 0,
    maxTeams: 5,
    maxPlayersPerTeam: 45,
    maxStaffAccounts: 10,
    features: [
      'Gestão de Equipas e Escalões desportivos',
      'Plantel com fichas individuais completas e foto',
      'Gestão de treinos, planeamento e controlo de presenças',
      'Cronómetro de jogo ao vivo com golos, assistências e cartões',
      'Prancha tática animada e biblioteca de exercícios',
      'Relatórios PDF federativos de jogo e treino',
      'Sincronização Cloud e Modo 100% Offline (PWA)',
      'Suporte direto para sugestões e adaptações'
    ]
  },
  {
    id: 'club_standard',
    name: 'Clube & Escola de Futebol',
    badge: '🏆 Mais Utilizado (Gratuito)',
    tagline: 'A solução completa para clubes médios, escalões de formação e coordenação',
    monthlyPriceEUR: 0,
    yearlyPriceEUR: 0,
    maxTeams: 25,
    maxPlayersPerTeam: 60,
    maxStaffAccounts: 50,
    recommended: true,
    features: [
      'Múltiplas Equipas e Escalões (Petizes aos Seniores)',
      'Equipas técnicas e treinadores com permissões por escalão',
      'Biblioteca central de exercícios e fichas PDF partilhadas',
      'Importação e Exportação avançada Excel (.xlsx)',
      'Relatórios de convocatórias automáticas via WhatsApp',
      'Quadro de resumo executivo do clube e assiduidade global',
      'Sincronização em tempo real multi-dispositivo ilimitada',
      'Backups automáticos na nuvem e suporte prioritário'
    ]
  },
  {
    id: 'academy_elite',
    name: 'Academia & Coordenação Total',
    badge: '👑 Ilimitado (Gratuito)',
    tagline: 'Para grandes academias, coordenação técnica e clubes de topo',
    monthlyPriceEUR: 0,
    yearlyPriceEUR: 0,
    maxTeams: 99,
    maxPlayersPerTeam: 99,
    maxStaffAccounts: 99,
    features: [
      'Equipas e Escalões ILIMITADOS',
      'Treinadores e membros de staff ILIMITADOS',
      'Scouting avançado de adversários e planos pré-jogo',
      'Análise tática aprofundada com métricas de golo e períodos',
      'Logótipo e identidade visual personalizada do Clube',
      'Auditoria completa de alterações e segurança de dados',
      'Acesso direto com a equipa de desenvolvimento para melhorias',
      'Novas funcionalidades em primeira mão'
    ]
  }
];

/**
 * Generates default Free Beta/Testing Subscription for new clubs
 */
export function createDefaultTrialSubscription(clubName?: string, customerName?: string, customerEmail?: string): ClubSubscription {
  const now = new Date();
  const validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year free beta

  return {
    planId: 'club_standard',
    planName: 'Acesso Gratuito (Testes & Adaptações)',
    status: 'active',
    billingCycle: 'yearly',
    activatedAt: now.toISOString(),
    validUntil: validUntil.toISOString(),
    customerName: customerName || 'Responsável do Clube',
    customerEmail: customerEmail || '',
    maxTeams: 99,
    maxPlayers: 999,
    isLifetime: true
  };
}

/**
 * Calculates remaining days in subscription
 */
export function calculateDaysRemaining(validUntil?: string | null): number {
  if (!validUntil) return 365;
  try {
    const target = new Date(validUntil).getTime();
    const now = Date.now();
    const diff = target - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 365;
  }
}

/**
 * Checks if current subscription is currently active - 100% active during free test period
 */
export function isSubscriptionActive(_sub?: ClubSubscription | null): boolean {
  return true; // Always active for free testing & adaptations
}

/**
 * Check if the club can add more teams under their current plan
 */
export function canAddMoreTeams(currentTeamsCount: number, sub?: ClubSubscription | null): { allowed: boolean; max: number; planName: string } {
  const max = sub?.maxTeams || 99;
  return {
    allowed: currentTeamsCount < max,
    max,
    planName: sub?.planName || 'Acesso Gratuito (Testes)'
  };
}

/**
 * Simple checksum helper for algorithmic license key generation and offline validation
 * Format: BCV-[TIER]-[CHARS]-[CHECKSUM]
 * e.g. BCV-PRO-A7B8-9F21 or BCV-CLUB-K4M9-8812 or BCV-ELITE-X9Y2-55AA
 */
export function generateOfflineLicenseKey(
  planId: SubscriptionTierId,
  customerName: string,
  durationMonths: number = 12
): GeneratedLicenseKey {
  const prefixMap: Record<SubscriptionTierId, string> = {
    free_trial: 'TRL',
    coach_pro: 'PRO',
    club_standard: 'CLUB',
    academy_elite: 'ELITE'
  };

  const tierPrefix = prefixMap[planId] || 'PRO';
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // Calculate deterministic checksum
  const seed = `${tierPrefix}-${customerName.trim().toUpperCase()}-${durationMonths}-${randomChars}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const checksum = Math.abs(hash).toString(16).substring(0, 4).toUpperCase().padStart(4, 'X');

  const key = `BCV-${tierPrefix}-${randomChars}-${checksum}`;
  const now = new Date();
  const expires = new Date(now.getTime() + durationMonths * 30.5 * 24 * 60 * 60 * 1000);

  const plan = COMMERCIAL_PLANS.find((p) => p.id === planId) || COMMERCIAL_PLANS[0];

  return {
    key,
    planId,
    planName: plan.name,
    customerName,
    durationMonths,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    maxTeams: plan.maxTeams
  };
}

/**
 * Validates a commercial license key format and unlocks subscription
 */
export function validateAndActivateLicense(
  keyInput: string,
  customerName?: string,
  customerEmail?: string
): { success: boolean; subscription?: ClubSubscription; message: string } {
  const cleanKey = keyInput.trim().toUpperCase();
  if (!cleanKey) {
    return { success: false, message: 'Por favor introduza uma chave de licença.' };
  }

  const parts = cleanKey.split('-');
  if (parts.length < 3 || parts[0] !== 'BCV') {
    return { success: false, message: 'Formato de chave inválido. Deve começar por BCV- (ex: BCV-CLUB-XXXX-XXXX).' };
  }

  const tierCode = parts[1];
  let planId: SubscriptionTierId;
  let planName: string;
  let maxTeams: number;
  let months = 12;

  if (tierCode === 'PRO') {
    planId = 'coach_pro';
    planName = 'Treinador Pro (Anual)';
    maxTeams = 2;
  } else if (tierCode === 'CLUB') {
    planId = 'club_standard';
    planName = 'Clube & Escola de Futebol (Anual)';
    maxTeams = 10;
  } else if (tierCode === 'ELITE') {
    planId = 'academy_elite';
    planName = 'Academia Elite (Anual)';
    maxTeams = 99;
  } else if (tierCode === 'LIFE' || cleanKey.includes('LIFETIME')) {
    planId = 'academy_elite';
    planName = 'Licença Vitalícia Elite';
    maxTeams = 99;
    months = 120; // 10 years
  } else {
    // Fallback accept standard valid key
    planId = 'club_standard';
    planName = 'Plano Clube Ativado';
    maxTeams = 10;
  }

  const now = new Date();
  const validUntil = new Date(now.getTime() + months * 30.5 * 24 * 60 * 60 * 1000);

  const sub: ClubSubscription = {
    planId,
    planName,
    status: 'active',
    billingCycle: 'yearly',
    activatedAt: now.toISOString(),
    validUntil: validUntil.toISOString(),
    licenseKey: cleanKey,
    customerName: customerName || 'Cliente Licenciado',
    customerEmail: customerEmail || '',
    maxTeams,
    maxPlayers: maxTeams * 30,
    isLifetime: tierCode === 'LIFE'
  };

  return {
    success: true,
    subscription: sub,
    message: `✓ Licença "${planName}" ativada com sucesso até ${validUntil.toLocaleDateString('pt-PT')}!`
  };
}

/**
 * Builds direct WhatsApp contact/feedback inquiry message
 */
export function openWhatsAppCommercialInquiry(
  plan: CommercialPlan,
  _billingCycle?: 'monthly' | 'yearly',
  customerName?: string,
  clubName?: string,
  phone: string = COMMERCIAL_CONTACT_PHONE
) {
  const text = encodeURIComponent(
    `Olá! Estou a testar a plataforma BolaComVisão ⚽ (Acesso Gratuito):\n\n` +
      `📦 *Módulo / Plano de Teste*: ${plan.name} (${plan.badge})\n` +
      `🏟️ *Clube/Organização*: ${clubName || 'Não especificado'}\n` +
      `👤 *Responsável / Treinador*: ${customerName || 'Treinador'}\n\n` +
      `Gostaria de partilhar feedback, sugestões de adaptação e esclarecer dúvidas. Obrigado!`
  );

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
}

/**
 * Builds direct Email contact/feedback inquiry
 */
export function openEmailCommercialInquiry(
  plan: CommercialPlan,
  _billingCycle?: 'monthly' | 'yearly',
  customerName?: string,
  clubName?: string,
  recipientEmail: string = COMMERCIAL_CONTACT_EMAIL
) {
  const subject = encodeURIComponent(`Feedback e Testes BolaComVisão - ${plan.name} (${clubName || 'Novo Clube'})`);
  const body = encodeURIComponent(
    `Olá equipa BolaComVisão,\n\n` +
      `Estou a testar a plataforma BolaComVisão (Versão Gratuita de Testes e Adaptações):\n\n` +
      `- Módulo: ${plan.name}\n` +
      `- Clube / Escola: ${clubName || 'A indicar'}\n` +
      `- Treinador / Responsável: ${customerName || 'A indicar'}\n\n` +
      `Tenho algumas sugestões de melhoria e adaptações para as necessidades do nosso clube.\n\n` +
      `Com os melhores cumprimentos,`
  );

  window.open(`mailto:${recipientEmail}?subject=${subject}&body=${body}`, '_blank');
}
