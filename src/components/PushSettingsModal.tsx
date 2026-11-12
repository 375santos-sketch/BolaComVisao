import React, { useState } from 'react';
import { AppState } from '../types';
import { DEFAULT_PUSH_PREFS, PushPrefs, cleanPrefs, testResult } from '../lib/pushEvents';
import {
  disablePush,
  enablePush,
  loadAlsoMine,
  pushSupport,
  saveAlsoMine,
  savedSubscriptionId,
  sendNotice
} from '../services/push';
import { calendarLinks } from '../services/publicCalendar';
import { createTeamCalendar } from '../hooks/useCalendarPublisher';
import { Sheet } from './ui/Sheet';

interface PushSettingsModalProps {
  state: AppState;
  /** To create the team's calendar when it does not exist yet (lembretes da agenda). */
  onUpdateState?: (updates: Partial<AppState>) => void;
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
 * Mais → A minha conta → 🔔 Avisos no telemóvel:
 * - Jogos ao vivo: this phone gets the start of the team's games, every goal and the final score, even with the app
 *   closed. Each coach chooses on their own phone; "Também dos jogos que eu registo" sends them to the coach's other
 *   phones and tablets too.
 * - Agenda: reminders of the games and trainings in the iPhone's own calendar (the team's calendar link with alerts).
 */
const PushSettingsModal: React.FC<PushSettingsModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const support = pushSupport();
  const clubId = state.currentUser?.clubId || 'main';
  const teamIds = state.activeTeamId ? [state.activeTeamId] : [];
  const [on, setOn] = useState(() => Boolean(savedSubscriptionId()) && support.permission === 'granted');
  const [prefs, setPrefs] = useState<PushPrefs>(loadPrefs);
  const [busy, setBusy] = useState(false);
  const [alsoMine, setAlsoMine] = useState(loadAlsoMine);
  const calendarToken = (state.teams || []).find((t) => t.id === state.activeTeamId)?.calendarToken;
  const reminderLink = calendarToken ? calendarLinks(calendarToken).reminders : null;
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

  // The notice of a test: with the app open the iPhone may not ring, so it goes out after a few seconds (time to
  // lock the screen), and the result says exactly what happened.
  const test = () =>
    run(async () => {
      onShowToast('Bloqueia já o ecrã: o aviso de teste chega dentro de 10 segundos.');
      await new Promise((r) => setTimeout(r, 10000));
      const r = await sendNotice(clubId, state.activeTeamId || 'equipa', {
        kind: 'teste',
        title: '🔔 Aviso de teste',
        body: 'Os avisos estão a chegar a este telemóvel ✓',
        tag: 'teste'
      });
      onShowToast(testResult(r));
    });

  const createCalendar = () =>
    run(async () => {
      if (!onUpdateState) return;
      onUpdateState({ teams: await createTeamCalendar(state) });
      onShowToast('Calendário da equipa criado ✓');
    });

  const sw = (checked: boolean) => (
    <span
      aria-hidden
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-ui-success' : 'bg-ui-line-strong'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-ui-surface shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`}
      />
    </span>
  );
  const heading = 'mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ui-muted';

  return (
    <Sheet title="Avisos no telemóvel" onClose={onClose} size="sm">
      <div className="space-y-5">
        <section aria-label="Jogos ao vivo" className="space-y-3">
          <h3 className={heading}>Jogos ao vivo</h3>
          <p className="text-ui-caption text-ui-muted">
            Quando um jogo da equipa é registado no Modo Jogo, recebes neste telemóvel, mesmo com a app fechada, o
            início do jogo, cada golo e o resultado final. Tocar no aviso abre o 📡 Ao vivo.
          </p>

          {needsInstall ? (
            <section
              aria-label="Instalar no iPhone"
              className="space-y-1.5 rounded-ui-sm border border-ui-warning bg-ui-warning-soft p-3 text-ui-caption text-ui-text"
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
                  Abre a app pelo <b>ícone novo</b> no ecrã e volta aqui (Mais → Avisos no telemóvel).
                </li>
              </ol>
            </section>
          ) : !support.supported ? (
            <p className="rounded-ui-sm border border-ui-danger bg-ui-danger-soft p-3 text-ui-caption text-ui-text">
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
                className={`flex w-full items-center justify-between gap-3 rounded-ui-sm border p-3 text-left ${
                  on ? 'border-ui-success bg-ui-success-soft' : 'border-ui-line bg-ui-surface-2'
                }`}
              >
                <span>
                  <b className="block text-ui-body text-ui-text">Receber avisos neste telemóvel</b>
                  <span className="text-ui-caption text-ui-muted">
                    {busy ? 'Um momento…' : on ? 'Ligado' : 'Desligado'}
                    {support.permission === 'denied' &&
                      ' · as notificações estão bloqueadas nas definições do telemóvel'}
                  </span>
                </span>
                {sw(on)}
              </button>

              <fieldset className="space-y-1.5" disabled={busy}>
                <legend className="mb-1 text-ui-caption font-bold text-ui-muted">Quero ser avisado de</legend>
                {OPTIONS.map(([key, label, hint]) => (
                  <label
                    key={key}
                    className="flex items-start gap-2.5 rounded-ui-sm bg-ui-surface-2 p-2.5 text-ui-body text-ui-text"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={prefs[key]}
                      onChange={(e) => changePref(key, e.target.checked)}
                    />
                    <span>
                      {label}
                      <span className="block text-ui-caption text-ui-muted">{hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <button
                type="button"
                role="switch"
                aria-checked={alsoMine}
                onClick={() => {
                  setAlsoMine(!alsoMine);
                  saveAlsoMine(!alsoMine);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-ui-sm border border-ui-line bg-ui-surface-2 p-3 text-left"
              >
                <span>
                  <b className="block text-ui-body text-ui-text">Também dos jogos que eu registo</b>
                  <span className="text-ui-caption text-ui-muted">
                    Quando registas um jogo neste aparelho, os teus outros aparelhos com avisos ligados (tablet, 2.º
                    telemóvel) também recebem. Este aparelho não toca.
                  </span>
                </span>
                {sw(alsoMine)}
              </button>
            </>
          )}
        </section>

        <section aria-label="Lembretes da agenda" className="space-y-2">
          <h3 className={heading}>Agenda</h3>
          <p className="text-ui-caption text-ui-muted">
            Os <b className="text-ui-text">treinos e jogos</b> da equipa no calendário do iPhone, com lembrete na
            véspera e 2 horas antes, mesmo com a app fechada. Atualiza-se sozinho quando muda a Agenda.
          </p>
          {reminderLink ? (
            <>
              <a href={reminderLink} className="ui-btn ui-btn-primary w-full py-2.5 text-ui-caption">
                📅 Ligar ao calendário do iPhone
              </a>
              <ol className="list-decimal space-y-1 pl-4 text-ui-caption text-ui-muted">
                <li>
                  Toca no botão e escolhe <b className="text-ui-text">Assinar</b>.
                </li>
                <li>
                  No ecrã seguinte <b className="text-ui-text">desliga «Remover alertas»</b> (senão o iPhone apaga os
                  lembretes) e toca em <b className="text-ui-text">Adicionar</b>.
                </li>
              </ol>
              <p className="text-ui-caption text-ui-muted">
                O link dos pais continua sem lembretes. As convocatórias não vão para o calendário.
              </p>
            </>
          ) : (
            <button
              type="button"
              disabled={busy || !onUpdateState}
              onClick={createCalendar}
              className="ui-btn ui-btn-secondary w-full py-2.5 text-ui-caption"
            >
              Criar o calendário da equipa
            </button>
          )}
        </section>

        {on && support.supported && !needsInstall && (
          <section aria-label="Verificar" className="space-y-1.5">
            <h3 className={heading}>Verificar</h3>
            <button
              type="button"
              disabled={busy}
              onClick={test}
              className="ui-btn ui-btn-secondary w-full py-2.5 text-ui-caption"
            >
              Enviar aviso de teste para este telemóvel
            </button>
            <p className="text-ui-caption text-ui-muted">Se não chegar, a app diz porquê.</p>
          </section>
        )}

        <p className="text-ui-caption text-ui-muted">Cada treinador escolhe no seu telemóvel.</p>
      </div>
    </Sheet>
  );
};

export default PushSettingsModal;
