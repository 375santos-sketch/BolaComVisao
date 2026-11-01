import React, { useRef, useState } from 'react';
import { AppState } from '../types';
import { MAX_SIGNATURE_LENGTH, SIGNATURE_DOCS, SignatureDoc, signatureOf, withSignature } from '../lib/signature';

interface SignatureModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const W = 600;
const H = 200;

/** Mais → ✍️ Assinatura: sign once with the finger and choose the PDFs it goes on. */
const SignatureModal: React.FC<SignatureModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const saved = signatureOf(state);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [drawn, setDrawn] = useState(false);
  const [docs, setDocs] = useState<SignatureDoc[]>(saved?.docs || SIGNATURE_DOCS.map((d) => d.id));

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b1620';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!drawn) setDrawn(true);
  };
  const end = () => {
    drawing.current = false;
  };
  const clear = () => {
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, W, H);
    setDrawn(false);
  };

  const save = () => {
    const image = drawn ? canvasRef.current?.toDataURL('image/png') : saved?.image;
    if (!image) {
      onShowToast('Assine no quadro branco primeiro.');
      return;
    }
    if (image.length > MAX_SIGNATURE_LENGTH) {
      onShowToast('A assinatura ficou demasiado pesada. Limpe e assine outra vez, mais simples.');
      return;
    }
    onUpdateState(withSignature(state, { image, docs }));
    onShowToast('Assinatura guardada ✓');
    onClose();
  };

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Assinatura"
        className="ui-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">✍️ A minha assinatura</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar assinatura"
            className="text-slate-400 text-lg px-1"
          >
            ✕
          </button>
        </div>
        {saved && !drawn && (
          <div className="rounded-xl bg-white p-2">
            <img src={saved.image} alt="Assinatura guardada" className="mx-auto h-16" />
          </div>
        )}
        <p className="text-xs text-slate-300">{saved ? 'Para trocar, assine de novo:' : 'Assine com o dedo:'}</p>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          aria-label="Quadro para assinar"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full rounded-xl bg-white touch-none"
          style={{ aspectRatio: `${W} / ${H}` }}
        />
        <fieldset className="space-y-1">
          <legend className="text-[11px] font-bold text-slate-400 mb-1">VAI NOS PDFS</legend>
          {SIGNATURE_DOCS.map((d) => (
            <label key={d.id} className="flex items-center gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={docs.includes(d.id)}
                onChange={(e) => setDocs(e.target.checked ? [...docs, d.id] : docs.filter((x) => x !== d.id))}
              />
              {d.label}
            </label>
          ))}
        </fieldset>
        <div className="flex gap-2">
          {saved && (
            <button
              type="button"
              onClick={() => {
                onUpdateState(withSignature(state, null));
                onShowToast('Assinatura apagada.');
                onClose();
              }}
              className="ui-btn ui-btn-soft-danger px-3 py-2.5 text-xs"
            >
              Apagar
            </button>
          )}
          <button type="button" onClick={clear} className="ui-btn ui-btn-secondary flex-1 py-2.5 text-xs">
            ↺ Limpar
          </button>
          <button type="button" onClick={save} className="ui-btn ui-btn-primary flex-1 py-2.5 text-xs">
            ✓ Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
