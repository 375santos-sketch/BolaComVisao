import React, { useState } from 'react';
import { AppState, SetPiece, SetPieceType } from '../../../types';
import { compressImageFile } from '../../../lib/imageCompress';
import { newSetPiece, SET_PIECE_TYPES, setPieceTitle, setPieceType } from '../../../lib/setPieces';
import { sortPlayerObjs } from '../../../lib/utils';

interface SetPieceBookProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const input =
  'w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-cyan-400 outline-none';

/** 🎯 Caderno de bolas paradas: the team's rehearsed set pieces with a drawing and who does each job. */
export const SetPieceBook: React.FC<SetPieceBookProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const setPieces = team?.setPieces || [];
  const players = sortPlayerObjs((state.roster || []).filter((p) => p && p.active !== false));
  const [editing, setEditing] = useState<SetPiece | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const save = (next: SetPiece[]) => {
    if (!team) {
      onShowToast('Escolha primeiro uma equipa.');
      return;
    }
    onUpdateState({ teams: (state.teams || []).map((t) => (t.id === team.id ? { ...t, setPieces: next } : t)) });
  };

  const saveEditing = () => {
    if (!editing) return;
    const clean: SetPiece = {
      ...editing,
      name: editing.name.trim(),
      notes: editing.notes?.trim() || '',
      roles: editing.roles.map((r) => ({ ...r, label: r.label.trim() })).filter((r) => r.label || r.playerId)
    };
    const exists = setPieces.some((s) => s.id === clean.id);
    save(exists ? setPieces.map((s) => (s.id === clean.id ? clean : s)) : [...setPieces, clean]);
    onShowToast(`${setPieceTitle(clean)} guardado ✓`);
    setEditing(null);
  };

  const importImage = async (file?: File) => {
    if (!file || !editing) return;
    setLoadingImage(true);
    try {
      const image = await compressImageFile(file, 900, 150_000);
      setEditing((e) => (e ? { ...e, image } : e));
    } catch (err) {
      onShowToast((err as Error).message || 'Não foi possível importar a imagem.');
    } finally {
      setLoadingImage(false);
    }
  };

  const changeType = (type: SetPieceType) => {
    if (!editing) return;
    // Jobs still empty follow the new type; jobs with an athlete are kept
    const kept = editing.roles.filter((r) => r.playerId);
    const fresh = setPieceType(type)
      .roles.filter((label) => !kept.some((r) => r.label === label))
      .map((label) => ({ label, playerId: null }));
    setEditing({ ...editing, type, roles: [...kept, ...fresh] });
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Caderno de bolas paradas"
        className="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white font-['Chakra_Petch'] uppercase">🎯 Bolas paradas</h3>
          <button type="button" onClick={onClose} aria-label="Fechar bolas paradas" className="text-slate-400 text-lg">
            ✕
          </button>
        </div>

        {editing ? (
          <section aria-label="Editar bola parada" className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {SET_PIECE_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={editing.type === t.id}
                  onClick={() => changeType(t.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border ${
                    editing.type === t.id
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'border-slate-700 text-slate-300'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-slate-400">
                Nome (opcional)
                <input
                  className={input}
                  value={editing.name}
                  placeholder="Ex: Canto curto"
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label className="text-[11px] text-slate-400">
                Lado
                <select
                  className={input}
                  value={editing.side || ''}
                  onChange={(e) => setEditing({ ...editing, side: (e.target.value || undefined) as SetPiece['side'] })}
                >
                  <option value="">—</option>
                  <option value="esquerda">Esquerda</option>
                  <option value="direita">Direita</option>
                  <option value="central">Central</option>
                </select>
              </label>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400">Quem faz o quê</div>
              {editing.roles.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.3fr_auto] gap-1.5 items-center">
                  <input
                    aria-label={`Função ${i + 1}`}
                    className={input}
                    value={r.label}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        roles: editing.roles.map((x, k) => (k === i ? { ...x, label: e.target.value } : x))
                      })
                    }
                  />
                  <select
                    aria-label={`Atleta para ${r.label || `função ${i + 1}`}`}
                    className={input}
                    value={r.playerId || ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        roles: editing.roles.map((x, k) => (k === i ? { ...x, playerId: e.target.value || null } : x))
                      })
                    }
                  >
                    <option value="">— ninguém —</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.number !== null && p.number !== undefined && `${p.number}` !== '' ? `${p.number} · ` : ''}
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Tirar função ${r.label || i + 1}`}
                    className="text-rose-300 px-1"
                    onClick={() => setEditing({ ...editing, roles: editing.roles.filter((_, k) => k !== i) })}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] text-cyan-300 font-bold"
                onClick={() => setEditing({ ...editing, roles: [...editing.roles, { label: '', playerId: null }] })}
              >
                ➕ Função
              </button>
            </div>

            <label className="block text-[11px] text-slate-400">
              Notas (sinal, movimentos)
              <textarea
                rows={2}
                className={input}
                value={editing.notes || ''}
                placeholder="Ex: sinal mão no ar = canto curto"
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </label>

            <div className="space-y-2">
              {editing.image && (
                <div className="space-y-1">
                  <img
                    src={editing.image}
                    alt={`Desenho: ${setPieceTitle(editing)}`}
                    className="w-full max-h-60 object-contain rounded-xl bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, image: undefined })}
                    className="text-[11px] text-rose-300 underline"
                  >
                    Remover desenho
                  </button>
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-cyan-500/50 text-cyan-200 text-xs font-bold cursor-pointer">
                📷 {loadingImage ? 'A preparar…' : editing.image ? 'Trocar desenho' : 'Importar desenho ou foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-label="Importar desenho da bola parada"
                  onChange={(e) => {
                    importImage(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div className="flex justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEditing}
                disabled={loadingImage}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </section>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(newSetPiece())}
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase"
            >
              ➕ Nova bola parada
            </button>
            {setPieces.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Ainda sem bolas paradas. Guarde os cantos, livres e lançamentos que treinam, com o desenho e quem faz
                cada função. A Convocatória mostra depois quem marca em cada jogo.
              </p>
            ) : (
              <ul aria-label="Lista de bolas paradas" className="space-y-2">
                {setPieces.map((sp) => (
                  <li key={sp.id} className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex gap-3">
                    {sp.image ? (
                      <img src={sp.image} alt="" className="w-20 h-16 object-contain rounded-lg bg-white shrink-0" />
                    ) : (
                      <div className="w-20 h-16 rounded-lg bg-slate-900 flex items-center justify-center text-2xl shrink-0">
                        {setPieceType(sp.type).icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{setPieceTitle(sp)}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-2">
                        {sp.roles
                          .filter((r) => r.playerId)
                          .map((r) => `${r.label}: ${players.find((p) => p.id === r.playerId)?.name || '—'}`)
                          .join(' · ') || 'Sem atletas atribuídos'}
                      </div>
                      <div className="flex gap-3 mt-1 text-[11px]">
                        <button type="button" className="text-cyan-300 font-bold" onClick={() => setEditing(sp)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-rose-300"
                          onClick={() => {
                            save(setPieces.filter((x) => x.id !== sp.id));
                            onShowToast(`${setPieceTitle(sp)} apagado`);
                          }}
                        >
                          Apagar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};
