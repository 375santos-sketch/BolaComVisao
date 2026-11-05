import React, { useState } from 'react';
import { AppState } from '../types';
import { DEFAULT_PUSH_PREFS, PushPrefs, cleanPrefs } from '../lib/pushEvents';
import { disablePush, enablePush, pushSupport, savedSubscriptionId, sendNotice } from '../services/push';

interface PushSettingsModalProps {
  state: AppState;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const PREFS_KEY = 'bcv_push_prefs_v1';
const loadPrefs = (): PushPrefs => {
  try {
    return cleanPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) || 'null') || DEFAULT_PUSH_PREFS);
  } catch {
    return DEFAULT_PUSH_PREFS;
  }
};

const OPTIONS: Array<[keyof PushPrefs, string, string]> = [
  ['inicio', '⚽ Início do jogo', 'Quando quem regista o jogo carrega em "Iniciar 1.ª parte"'],
  ['golo', '🥅 Golos', 'Cada golo marcado ou sofrido, com o resultado'],
  ['fim', '🏁 Fim do jogo', 'O resultado final']
];

/**
 * Mais → 🔔 Avisos do jogo: this phone gets the start of the team's games, every goal and the final score, even with
 * the app closed. Each coach chooses on their own phone.
 */
const PushSettingsModal: React.FC<PushSettingsModalProps> = ({ state, onShowToast, onClose }) => {
  const support = pushSupport();
  const clubId = state.currentUser?.clubId || 'main';
  const teamIds = state.activeTeamId ? [state.activeTeamId] : [];
  const [on, setOn] = useState(() => Boolean(savedSubscriptionId()) && support.permission === 'granted');
  const [prefs, setPrefs] = useState<PushPrefs>(loadPrefs);
  const [busy, setBusy] = useState(false);
  const needsInstall = support.ios && !support.standalone;

  const keepPrefs = (next: PushPrefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* kept for this time only */
    }
  };

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    try {
      await job();
    } catch (err) {
      onShowToast((err as Error).message || 'Não foi possível.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = () =>
    run(async () => {
      if (on) {
        await disablePush(clubId);
        setOn(false);
        onShowToast('Avisos desligados neste telemóvel.');
      } else {
        await enablePush(clubId, teamIds, prefs);
        setOn(true);
        onShowToast('Avisos ligados neste telemóvel ✓');
      }
    });

  const changePref = (key: keyof PushPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    keepPrefs(next);
    if (on) run(() => enablePush(clubId, teamIds, next));
  };

  const test = () =>
    run(async () => {
      const r = await sendNotice(clubId, state.activeTeamId || 'equipa', {
        kind: 'teste',
        title: '🔔 Aviso de teste',
        body: 'Os avisos do jogo estão a chegar a este telemóvel ✓',
        tag: 'teste'
      });
      onShowToast(
        r.sent
          ? 'Aviso de teste enviado: deve aparecer dentro de segundos.'
          : 'Este telemóvel ainda não está registado.'
      );
    });

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Avisos do jogo"
        className="ui-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">🔔 Avisos do jogo</h3>
          <button type="button" onClick={onClose} aria-label="Fechar avisos" className="text-slate-400 text-lg">
            ✕
          </button>
        </div>
        <p className="text-xs text-slate-300">
          Quando outra pessoa regista um jogo da equipa no Modo Jogo, recebes neste telemóvel, mesmo com a app fechada,
          o início do jogo, cada golo e o resultado final. Tocar no aviso abre o 📡 Ao vivo.
        </p>

        {needsInstall ? (
          <section
            aria-label="Instalar no iPhone"
            className="rounded-2xl bg-amber-500/10 p-3 space-y-1.5 text-xs text-amber-100"
          >
            <p className="font-bold">No iPhone, os avisos só funcionam com a app instalada:</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                Abre a app no <b>Safari</b> e toca em <b>Partilhar</b> (o quadrado com a seta para cima).
              </li>
              <li>
                Escolhe <b>Adicionar ao ecrã principal</b> e confirma.
              </li>
              <li>
                Abre a app pelo <b>ícone novo</b> no ecrã e volta aqui (Mais → Avisos do jogo).
              </li>
            </ol>
          </section>
        ) : !support.supported ? (
          <p className="rounded-2xl bg-rose-500/10 p-3 text-xs text-rose-200">
            Este navegador não recebe avisos. No Android usa o Chrome; no iPhone, a app instalada no ecrã principal.
          </p>
        ) : (
          <>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              disabled={busy}
              onClick={toggle}
              className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left ${
                on ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900'
              }`}
            >
              <span>
                <b className="block text-sm text-white">Receber avisos neste telemóvel</b>
                <span className="text-[11px] text-slate-400">
                  {busy ? 'Um momento…' : on ? 'Ligado' : 'Desligado'}
                  {support.permission === 'denied' && ' · as notificações estão bloqueadas nas definições do telemóvel'}
                </span>
              </span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-600'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? 'left-[22px]' : 'left-0.5'}`}
                />
              </span>
            </button>

            <fieldset className="space-y-1.5" disabled={busy}>
              <legend className="mb-1 text-[11px] font-bold text-slate-400">QUERO SER AVISADO DE</legend>
              {OPTIONS.map(([key, label, hint]) => (
                <label key={key} className="flex items-start gap-2.5 rounded-xl bg-slate-900 p-2.5 text-sm text-white">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={prefs[key]}
                    onChange={(e) => changePref(key, e.target.checked)}
                  />
                  <span>
                    {label}
                    <span className="block text-[11px] text-slate-400">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {on && (
              <button
                type="button"
                disabled={busy}
                onClick={test}
                className="ui-btn ui-btn-secondary w-full py-2.5 text-xs"
              >
                Enviar aviso de teste para este telemóvel
              </button>
            )}
          </>
        )}
        <p className="text-[10px] text-slate-500">
          Quem está a registar o jogo não recebe os seus próprios avisos. Cada treinador escolhe no seu telemóvel.
        </p>
      </div>
    </div>
  );
};

export default PushSettingsModal;
