import React, { useState } from 'react';
import { AppState } from '../../../types';
import { newCalendarToken } from '../../../lib/calendarFeed';
import { planPayloadOf } from '../../../hooks/usePlanPublisher';
import { planLink, publishPlan, unpublishPlan } from '../../../services/publicPlan';

interface PlanShareModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/**
 * Treinos → 🔗 Plano para o adjunto: one secret link (for the whole season) that always shows today's or the next
 * training's plan, without an account. Only the plan: no athletes, absences or notes.
 */
export const PlanShareModal: React.FC<PlanShareModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const token = team?.planToken;
  const clubId = state.currentUser?.id ? state.currentUser.clubId || 'main' : undefined;
  const [busy, setBusy] = useState(false);
  const link = token ? planLink(token) : '';
  const payload = planPayloadOf(state);

  const setToken = (planToken: string | undefined) =>
    onUpdateState({ teams: (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, planToken } : t)) });

  const create = async () => {
    if (!clubId || !state.activeTeamId) {
      onShowToast('Precisa de ter sessão iniciada na nuvem para partilhar o plano.');
      return;
    }
    setBusy(true);
    const fresh = newCalendarToken();
    try {
      await publishPlan(fresh, { clubId, teamId: state.activeTeamId, ...payload });
      setToken(fresh);
      onShowToast('Link para o adjunto criado ✓');
    } catch {
      onShowToast('Não foi possível criar o link. Verifique a ligação à internet.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await unpublishPlan(token);
      setToken(undefined);
      onShowToast('Link desligado: deixou de funcionar.');
    } catch {
      onShowToast('Não foi possível desligar o link. Verifique a ligação à internet.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      onShowToast('Link copiado ✓');
    } catch {
      onShowToast('Não foi possível copiar. Selecione o link e copie.');
    }
  };

  const message = `Plano do treino (atualiza-se sozinho): ${link}`;

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Plano para o adjunto"
        className="ui-card w-full max-w-md rounded-b-none sm:rounded-2xl p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">🔗 Plano para o adjunto</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar plano para o adjunto"
            className="text-slate-400 text-lg"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Um link para o adjunto abrir no telemóvel, sem conta. Mostra sempre o plano do treino de hoje (ou do próximo):
          os blocos, os minutos, os desenhos e o texto. Não mostra atletas, faltas nem notas.
        </p>
        {payload.plan ? (
          <p className="text-[11px] text-slate-400">
            Agora mostra: treino de {payload.plan.date.split('-').reverse().join('/')}
            {payload.plan.time ? ` às ${payload.plan.time}` : ''} · {payload.plan.blocks.length} blocos
          </p>
        ) : (
          <p className="text-[11px] text-amber-300">Ainda não há um próximo treino marcado.</p>
        )}
        {token ? (
          <>
            <input
              readOnly
              aria-label="Link do plano"
              value={link}
              className="ui-input w-full text-xs"
              onFocus={(e) => e.target.select()}
            />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={copy} className="ui-btn ui-btn-secondary py-2.5 text-xs">
                Copiar link
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ui-btn ui-btn-success py-2.5 text-xs flex items-center justify-center"
              >
                💬 Enviar por WhatsApp
              </a>
            </div>
            <button type="button" disabled={busy} onClick={disable} className="text-xs text-rose-300 underline">
              Desligar o link
            </button>
          </>
        ) : (
          <button type="button" disabled={busy} onClick={create} className="ui-btn ui-btn-primary w-full py-3 text-sm">
            {busy ? 'A criar…' : 'Criar link para o adjunto'}
          </button>
        )}
      </div>
    </div>
  );
};
