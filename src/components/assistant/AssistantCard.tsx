import React, { useState } from 'react';
import { AppState } from '../../types';
import { answerQuestion, ASSISTANT_EXAMPLES, AssistantAnswer } from '../../lib/coachAssistant';

/** 💬 Pergunte à app: questions about the team answered from the app's data (no internet, no paid AI). */
export const AssistantCard: React.FC<{ state: AppState }> = ({ state }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);

  const ask = (q: string) => {
    if (!q.trim()) return;
    setQuestion(q);
    setAnswer(answerQuestion(q, state));
  };

  return (
    <section aria-label="Pergunte à app" className="card p-3.5 space-y-2.5">
      <h2 className="text-xs font-black text-cyan-300 uppercase tracking-wider">💬 Pergunte à app</h2>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          aria-label="Pergunta"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex: quem jogou menos este mês?"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-cyan-400 outline-none"
        />
        <button type="submit" className="px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black">
          Perguntar
        </button>
      </form>
      {!answer && (
        <div className="flex flex-wrap gap-1.5">
          {ASSISTANT_EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => ask(e)}
              className="px-2.5 py-1 rounded-full border border-slate-700 text-[11px] text-slate-300"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      {answer && (
        <div
          role="status"
          aria-label="Resposta"
          className={`p-3 rounded-xl border text-xs space-y-1 ${
            answer.understood ? 'bg-slate-950/70 border-cyan-500/30' : 'bg-amber-950/60 border-amber-500/40'
          }`}
        >
          <div className="font-bold text-white text-sm">{answer.title}</div>
          {answer.lines.map((l, i) => (
            <div key={i} className="text-slate-300">
              {l}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setAnswer(null);
              setQuestion('');
            }}
            className="text-[11px] text-cyan-300 underline pt-1"
          >
            Outra pergunta
          </button>
        </div>
      )}
    </section>
  );
};
