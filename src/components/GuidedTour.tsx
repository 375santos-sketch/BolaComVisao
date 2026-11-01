import React, { useEffect, useLayoutEffect, useState } from 'react';

/**
 * 🧭 Visita guiada: on the first visit of each account (e.g. a new assistant coach), six steps over the home screen
 * showing where each thing is. Can be seen again in Mais → Visita guiada.
 */

const navButton = (label: string) => () =>
  [...document.querySelectorAll<HTMLElement>('#navbar button')].find((b) => b.textContent?.trim() === label) || null;
const shortcut = (label: RegExp) => () =>
  [...document.querySelectorAll<HTMLElement>('nav[aria-label="Atalhos"] button')].find((b) =>
    label.test(b.textContent || '')
  ) || null;

const STEPS: { title: string; text: string; target?: () => HTMLElement | null }[] = [
  {
    title: 'Bem-vindo à BolaComVisão 👋',
    text: 'Em 1 minuto mostramos-te onde está o que mais vais usar. Podes saltar quando quiseres.'
  },
  {
    title: 'Treino de hoje',
    text: 'No início do treino toca aqui e marca só quem faltou. Demora 30 segundos.',
    target: shortcut(/Treino de hoje/)
  },
  {
    title: 'Convocatória',
    text: 'Escolhe os convocados, a hora de concentração e envia aos pais por WhatsApp ou em imagem.',
    target: shortcut(/Convocatória/)
  },
  {
    title: 'Agenda',
    text: 'Jogos, treinos e resultados. É aqui que planeias os treinos e vês a biblioteca de exercícios.',
    target: navButton('Agenda')
  },
  {
    title: 'Jogo',
    text: 'Pré-jogo, Modo Jogo para registar golos e substituições ao vivo, e as estatísticas da época.',
    target: navButton('Jogo')
  },
  {
    title: 'Mais',
    text: 'Definições do clube, cópias de segurança, a tua carreira e assinatura, e esta visita outra vez.',
    target: navButton('Mais')
  }
];

export const GuidedTour: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const current = STEPS[step];

  useLayoutEffect(() => {
    const measure = () => {
      const el = current.target?.();
      el?.scrollIntoView({ block: 'nearest' });
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const last = step === STEPS.length - 1;
  const pad = 6;
  const below = rect ? rect.bottom + 150 < window.innerHeight : true;
  const boxStyle: React.CSSProperties = rect
    ? below
      ? { top: rect.bottom + pad + 12 }
      : { bottom: window.innerHeight - rect.top + pad + 12 }
    : { top: '35%' };

  return (
    <div role="dialog" aria-label="Visita guiada" className="fixed inset-0 z-[100000]">
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl border-[3px] border-yellow-400"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 4000px rgba(0,0,0,0.65)'
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-black/65" />
      )}
      <div
        className="absolute left-4 right-4 mx-auto max-w-sm rounded-2xl bg-cyan-600 p-4 text-white shadow-2xl"
        style={boxStyle}
      >
        <div className="text-[11px] font-bold opacity-80">
          {step + 1} de {STEPS.length}
        </div>
        <h3 className="text-base font-bold">{current.title}</h3>
        <p className="mt-1 text-sm">{current.text}</p>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={onClose} className="text-sm font-semibold opacity-80">
            {last ? '' : 'Saltar'}
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-bold"
              >
                ←
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? onClose() : setStep(step + 1))}
              className="rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-cyan-700"
            >
              {last ? 'Começar ✓' : 'Seguinte →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
