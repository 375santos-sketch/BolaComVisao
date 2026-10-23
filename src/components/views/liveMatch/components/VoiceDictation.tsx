import React, { useEffect, useRef, useState } from 'react';
import { Player } from '../../../../types';
import { describeVoiceCommand, parseVoiceCommand, VOICE_EXAMPLES, VoiceCommand } from '../../../../lib/voiceCommands';

/* The browser's speech recognition (Chrome/Android, Safari/iPhone); not in the TypeScript DOM types. */
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

const recognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

interface VoiceDictationProps {
  squad: Player[];
  onPitch: string[];
  onCommand: (cmd: VoiceCommand) => { id?: string; error?: string };
  onUndo: (id: string) => void;
}

type Feedback = { ok: boolean; text: string; heard: string; undoId?: string };

/**
 * 🎤 Ditar: tap, say the event ("golo do Rui assistência do Tomás") and it is recorded with the clock's minute. A
 * banner shows what was understood, with "Desfazer" for a few seconds.
 */
export const VoiceDictation: React.FC<VoiceDictationProps> = ({ squad, onPitch, onCommand, onUndo }) => {
  const Ctor = recognitionCtor();
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      recRef.current?.stop();
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  if (!Ctor) return null;

  const show = (f: Feedback) => {
    setFeedback(f);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(null), f.ok ? 8000 : 10000);
  };

  const handle = (alternatives: string[]) => {
    // The first alternative the app understands wins (recognition often hears names slightly differently)
    let firstError = '';
    for (const heard of alternatives) {
      const parsed = parseVoiceCommand(heard, squad, onPitch);
      if (parsed.command) {
        const res = onCommand(parsed.command);
        if (res.error) return show({ ok: false, text: res.error, heard });
        return show({ ok: true, text: describeVoiceCommand(parsed.command, squad), heard, undoId: res.id });
      }
      if (!firstError) firstError = parsed.error || '';
    }
    show({ ok: false, text: firstError || 'Não percebi.', heard: alternatives[0] || '' });
  };

  const start = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = 'pt-PT';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.continuous = false;
    rec.onresult = (e) => {
      const result = e.results[0];
      const alts = Array.from({ length: result.length }, (_, i) => result[i].transcript).filter(Boolean);
      handle(alts);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        show({ ok: false, text: 'Dê autorização ao microfone nas definições do telemóvel.', heard: '' });
      } else if (e.error === 'no-speech') {
        show({ ok: false, text: 'Não ouvi nada. Toque e fale logo a seguir.', heard: '' });
      } else if (e.error !== 'aborted') {
        show({ ok: false, text: 'O reconhecimento de voz falhou. Precisa de internet.', heard: '' });
      }
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setFeedback(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <section aria-label="Ditar" className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={start}
          aria-pressed={listening}
          className={`flex-1 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 border ${
            listening
              ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
              : 'bg-slate-900 border-cyan-500/50 text-cyan-200'
          }`}
        >
          🎤 {listening ? 'A ouvir… fale agora' : 'Ditar'}
        </button>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-label="Exemplos do que pode dizer"
          className="px-3 rounded-2xl border border-slate-700 text-slate-300 text-sm"
        >
          ?
        </button>
      </div>
      {showHelp && (
        <ul className="text-[11px] text-slate-400 bg-slate-950/60 rounded-xl p-2.5 space-y-0.5">
          {VOICE_EXAMPLES.map((e) => (
            <li key={e}>«{e}»</li>
          ))}
          <li className="text-slate-500 pt-1">Pode dizer o nome, a alcunha ou o número da camisola.</li>
        </ul>
      )}
      {feedback && (
        <div
          role="status"
          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
            feedback.ok
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100'
              : 'bg-amber-950/80 border-amber-500/50 text-amber-100'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="font-bold">{feedback.ok ? `Registado: ${feedback.text}` : feedback.text}</div>
            {feedback.heard && <div className="text-[10px] opacity-70 truncate">Ouvi: «{feedback.heard}»</div>}
          </div>
          {feedback.ok && feedback.undoId && (
            <button
              type="button"
              onClick={() => {
                onUndo(feedback.undoId!);
                setFeedback({ ok: false, text: 'Desfeito.', heard: '' });
              }}
              className="shrink-0 px-2 py-1 rounded-lg bg-slate-900 text-white font-bold"
            >
              Desfazer
            </button>
          )}
        </div>
      )}
    </section>
  );
};
