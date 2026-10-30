import React, { useEffect, useRef, useState } from 'react';
import { AppState, Match } from '../../../types';
import { ChronicleAudience, chronicleFacts, chronicleFallback } from '../../../lib/matchChronicle';
import { writeChronicle } from '../../../services/chronicle';
import { ShareMessageModal } from '../../ShareMessageModal';

interface ChronicleModalProps {
  match: Match;
  state: AppState;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

/** 📰 Crónica do jogo: a short text written from the game's facts, for the club's page or the parents' group. */
const ChronicleModal: React.FC<ChronicleModalProps> = ({ match, state, onClose, onShowToast }) => {
  const [audience, setAudience] = useState<ChronicleAudience>('clube');
  const [withScorers, setWithScorers] = useState(true);
  const [text, setText] = useState('');
  const [writing, setWriting] = useState(true);
  const [note, setNote] = useState('');
  const run = useRef(0);

  /** The text written by Gemini, or the app's own plain text with a note saying why. */
  const produce = async (a: ChronicleAudience, scorers: boolean) => {
    const facts = chronicleFacts(match, state, scorers);
    try {
      return { text: await writeChronicle(facts, a), note: '' };
    } catch (err) {
      return {
        text: chronicleFallback(facts, a),
        note: `${(err as Error).message || 'Sem ligação.'} Ficou um texto mais simples, feito pela app.`
      };
    }
  };

  const show = (id: number, result: { text: string; note: string }) => {
    if (id !== run.current) return;
    setText(result.text);
    setNote(result.note);
    setWriting(false);
  };

  const write = async (a = audience, scorers = withScorers) => {
    const id = ++run.current;
    setWriting(true);
    setNote('');
    show(id, await produce(a, scorers));
  };

  useEffect(() => {
    const id = ++run.current;
    produce('clube', true).then((result) => show(id, result));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scored = (match.goals || []).filter((g) => g.type === 'scored').length;
  const conceded = (match.goals || []).length - scored;

  return (
    <ShareMessageModal
      title="Crónica do jogo"
      icon="📰"
      text={writing ? 'A escrever a crónica…' : text}
      onTextChange={setText}
      onClose={onClose}
      onShowToast={onShowToast}
      rows={12}
    >
      <p className="text-xs text-slate-400">
        {state.myClubName || 'Nós'} {scored}-{conceded} {match.opponent} ·{' '}
        {match.date.slice(0, 10).split('-').reverse().join('/')}
      </p>
      <div role="group" aria-label="Para onde" className="grid grid-cols-2 gap-2">
        {(
          [
            ['clube', '📘 Página do clube'],
            ['pais', '💬 Grupo dos pais']
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={audience === id}
            disabled={writing}
            onClick={() => {
              setAudience(id);
              write(id, withScorers);
            }}
            className={`ui-btn ${audience === id ? 'ui-btn-primary' : 'ui-btn-secondary'} py-2 text-xs`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={withScorers}
            disabled={writing}
            onChange={(e) => {
              setWithScorers(e.target.checked);
              write(audience, e.target.checked);
            }}
          />
          Dizer quem marcou
        </label>
        <button
          type="button"
          disabled={writing}
          onClick={() => write()}
          className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
        >
          🔄 Escrever outra
        </button>
      </div>
      {note && (
        <p role="note" className="text-[11px] text-amber-300">
          {note}
        </p>
      )}
      <p className="text-[11px] text-slate-500">
        Escrita a partir dos dados do jogo, sem notas individuais. Pode mudar o texto antes de enviar.
      </p>
    </ShareMessageModal>
  );
};

export default ChronicleModal;
