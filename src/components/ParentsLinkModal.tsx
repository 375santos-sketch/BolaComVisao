import React, { useState } from 'react';
import { workspaceIdOf } from '../lib/deviceCache';
import { AppState } from '../types';
import { newCalendarToken } from '../lib/calendarFeed';
import { livePayloadOf } from '../hooks/useLivePublisher';
import { liveLink, publishLive, unpublishLive } from '../services/publicLive';

interface ParentsLinkModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

/**
 * Mais → 📡 Link do jogo para os pais: one secret link per team (for every game of the season) that shows the game
 * being played, or the last result and the next game, without an account. Never the substitutions, photos,
 * contacts, birth dates or notes; the cards only when the coach turns them on.
 */
const ParentsLinkModal: React.FC<ParentsLinkModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const token = team?.liveToken;
  const showCards = Boolean(team?.liveShowCards);
  const clubId = state.currentUser?.id ? workspaceIdOf(state.currentUser) : undefined;
  const [busy, setBusy] = useState(false);
  const link = token ? liveLink(token) : '';

  const setTeam = (changes: { liveToken?: string; liveShowCards?: boolean }) =>
    onUpdateState({
      teams: (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, ...changes } : t))
    });

  const create = async (replacing?: string) => {
    if (!clubId || !state.activeTeamId) {
      onShowToast('Precisa de ter sessão iniciada na nuvem para criar o link.');
      return;
    }
    setBusy(true);
    const fresh = newCalendarToken();
    try {
      await publishLive(fresh, { clubId, teamId: state.activeTeamId, ...livePayloadOf(state) });
      if (replacing) await unpublishLive(replacing).catch(() => undefined);
      setTeam({ liveToken: fresh });
      onShowToast(replacing ? 'Link novo criado: o antigo deixou de funcionar.' : 'Link para os pais criado ✓');
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
      await unpublishLive(token);
      setTeam({ liveToken: undefined });
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

  const message = `📡 Acompanhem os jogos da equipa em direto (resultado, golos e equipa), sem precisar de conta: ${link}`;
  const shows: Array<[string, boolean]> = [
    ['Resultado, tempo de jogo e intervalo', true],
    ['Golos com o primeiro nome de quem marca', true],
    ['Equipa inicial da 1.ª parte e da 2.ª parte', true],
    ['Remates e cantos', true]
  ];

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Link para os pais"
        className="ui-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">📡 Link do jogo para os pais</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar link para os pais"
            className="text-slate-400 text-lg"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Um link só da equipa. Quem o tiver vê o jogo em direto, sem conta nem app. Serve para <b>todos os jogos</b>:
          mostra o jogo a decorrer; sem jogo, o último resultado e o próximo jogo.
        </p>

        {token ? (
          <>
            <input
              readOnly
              aria-label="Endereço do link"
              value={link}
              className="ui-input w-full text-xs"
              onFocus={(e) => e.target.select()}
            />
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ui-btn ui-btn-success py-2.5 text-xs flex items-center justify-center"
              >
                💬 Enviar aos pais
              </a>
              <button type="button" onClick={copy} className="ui-btn ui-btn-secondary py-2.5 text-xs">
                Copiar link
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => create()}
            className="ui-btn ui-btn-primary w-full py-3 text-sm"
          >
            {busy ? 'A criar…' : 'Criar link para os pais'}
          </button>
        )}

        <section aria-label="O que os pais veem" className="ui-inset p-3 space-y-1.5">
          <div className="text-[11px] font-bold text-cyan-300">O QUE OS PAIS VEEM</div>
          {shows.map(([label]) => (
            <p key={label} className="text-sm text-white">
              ✅ {label}
            </p>
          ))}
          <label className="flex items-center gap-2 text-sm text-white">
            <input type="checkbox" checked={showCards} onChange={(e) => setTeam({ liveShowCards: e.target.checked })} />
            Cartões
          </label>
          <p className="text-sm text-slate-400">🚫 Substituições: nunca aparecem</p>
          <p className="text-[11px] text-slate-400">
            Nunca aparecem fotos, contactos, datas de nascimento nem as tuas notas. Durante o jogo atualiza-se a partir
            do telemóvel de quem o regista no Modo Jogo.
          </p>
        </section>

        {token && (
          <div className="flex justify-between gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => create(token)}
              className="text-xs text-amber-300 underline"
            >
              Mudar o link (o antigo deixa de funcionar)
            </button>
            <button type="button" disabled={busy} onClick={disable} className="text-xs text-rose-300 underline">
              Desligar o link
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentsLinkModal;
