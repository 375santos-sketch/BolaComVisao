import { AppState, Training } from '../types';
import { fromRest } from './calendarFeed';

/**
 * Treinos → 🔗 Link para o adjunto: one secret link per team that always shows the plan of today's training (or of
 * the next one): the blocks with their minutes, category, drawing and text. Published to public_plans/{token} and
 * served by the app's server at /plano/{token}. Only the plan: no athletes, absences or private notes.
 */

export interface SharedBlock {
  title: string;
  category?: string;
  durationMinutes: number;
  notes?: string;
  image?: string;
}

export interface SharedPlan {
  date: string;
  time?: string;
  durationMinutes?: number;
  location?: string;
  number?: number;
  objective?: string;
  blocks: SharedBlock[];
}

/** Images go in while the document stays well below Firestore's 1 MB. */
const IMAGES_BUDGET = 650_000;
const IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/** Today's training, or the next one. */
export function nextTraining(trainings: Training[], today: string): Training | undefined {
  const dated = (trainings || []).filter((t) => t && /^\d{4}-\d{2}-\d{2}/.test(t.date || ''));
  return (
    dated.find((t) => t.date.slice(0, 10) === today) ||
    dated
      .filter((t) => t.date.slice(0, 10) > today)
      .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))[0]
  );
}

export function sharedPlanOf(state: Pick<AppState, 'trainings' | 'exerciseLibrary'>, today: string): SharedPlan | null {
  const t = nextTraining(state.trainings || [], today);
  if (!t) return null;
  let budget = IMAGES_BUDGET;
  const blocks = (t.sessionPlan?.blocks || []).map((b) => {
    const ex = b.exerciseId ? (state.exerciseLibrary || []).find((e) => e.id === b.exerciseId) : undefined;
    const notes = [
      b.notes?.trim(),
      ex?.description?.trim() && ex.description.trim() !== b.notes?.trim() ? ex.description.trim() : ''
    ]
      .filter(Boolean)
      .join('\n');
    const image = ex?.image && IMAGE.test(ex.image) && ex.image.length <= budget ? ex.image : undefined;
    if (image) budget -= image.length;
    return {
      title: b.title || 'Bloco',
      ...(b.category ? { category: b.category } : {}),
      durationMinutes: b.durationMinutes || 0,
      ...(notes ? { notes } : {}),
      ...(image ? { image } : {})
    };
  });
  return {
    date: t.date.slice(0, 10),
    ...(t.time ? { time: t.time } : {}),
    ...(t.durationMinutes ? { durationMinutes: t.durationMinutes } : {}),
    ...(t.location ? { location: t.location } : {}),
    ...(t.trainingNumber ? { number: t.trainingNumber } : {}),
    ...(t.sessionPlan?.objective?.trim() ? { objective: t.sessionPlan.objective.trim() } : {}),
    blocks
  };
}

// ---------- The page the assistant opens (served by the app's server) ----------

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

const CATEGORIES: Record<string, [string, string]> = {
  aquecimento: ['Aquecimento', '#f59e0b'],
  tecnica: ['Técnico', '#0ea5e9'],
  tatica: ['Tático', '#8b5cf6'],
  fisico: ['Físico', '#ef4444'],
  jogo: ['Jogo', '#10b981'],
  bolas_paradas: ['Bolas paradas', '#64748b']
};
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface PlanPage {
  teamName: string;
  color: string;
  plan: SharedPlan | null;
}

/** The published document read through Firestore's REST API (null when it is not a plan). */
export function planFromRestDocument(doc: { fields?: Record<string, any> } | null | undefined): PlanPage | null {
  const data = fromRest({ mapValue: { fields: doc?.fields } }) as Record<string, any> | null;
  if (!data || typeof data.teamName !== 'string') return null;
  const p = data.plan && typeof data.plan === 'object' ? data.plan : null;
  const plan: SharedPlan | null =
    p && /^\d{4}-\d{2}-\d{2}$/.test(p.date)
      ? {
          date: p.date,
          time: /^\d{2}:\d{2}$/.test(p.time) ? p.time : undefined,
          durationMinutes: Number(p.durationMinutes) || undefined,
          location: typeof p.location === 'string' ? p.location : undefined,
          number: Number(p.number) || undefined,
          objective: typeof p.objective === 'string' ? p.objective : undefined,
          blocks: (Array.isArray(p.blocks) ? p.blocks : []).slice(0, 30).map((b: any) => ({
            title: String(b?.title || 'Bloco'),
            category: typeof b?.category === 'string' ? b.category : undefined,
            durationMinutes: Math.max(0, Math.min(240, Number(b?.durationMinutes) || 0)),
            notes: typeof b?.notes === 'string' ? b.notes : undefined,
            image: typeof b?.image === 'string' && IMAGE.test(b.image) ? b.image : undefined
          }))
        }
      : null;
  return { teamName: data.teamName, color: /^#[0-9a-f]{6}$/i.test(data.color) ? data.color : '#0e8fb0', plan };
}

/** The whole page (no outside files): the plan, and the block that is on now while the training lasts. */
export function renderPlanPage(
  { teamName, color, plan }: PlanPage,
  today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' })
): string {
  const head = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Treino · ${esc(teamName)}</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#f5f7fa;color:#14202e;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:15px;padding-bottom:90px}
.hd{background:#fff;padding:14px 16px;border-bottom:3px solid ${color};display:flex;gap:10px;align-items:center}.c{width:38px;height:38px;border-radius:50%;background:${color};color:#fff;display:grid;place-items:center;font-weight:800;font-size:18px;flex:none}
.hd b{display:block;font-size:18px}.hd span{color:#5f6f80;font-size:12px}.w{padding:12px 14px;max-width:640px;margin:0 auto}
.facts{display:flex;gap:6px}.f{flex:1;background:#fff;border-radius:10px;padding:8px}.f span{display:block;font-size:10px;color:#5f6f80;font-weight:800;letter-spacing:.04em}.f b{font-size:16px}
.obj{margin-top:10px;background:#fff;border-left:4px solid ${color};border-radius:8px;padding:10px;font-weight:700}
.bar{display:flex;height:20px;border-radius:6px;overflow:hidden;margin:12px 0 4px}.bar div{color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center;overflow:hidden}
.b{background:#fff;border-radius:12px;padding:10px;margin-top:8px}.h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.m{font-weight:800;min-width:52px}.tag{font-size:9px;font-weight:800;color:#fff;padding:2px 7px;border-radius:9px;text-transform:uppercase}
.b p{color:#3b4a5a;font-size:14px;margin-top:6px;line-height:1.45;white-space:pre-wrap}.b img{width:100%;border-radius:8px;margin-top:8px;background:#fff}.now{outline:2px solid #10b981}
.timer{position:fixed;left:12px;right:12px;bottom:12px;max-width:616px;margin:0 auto;background:#14202e;color:#fff;border-radius:14px;padding:12px 14px;display:none;justify-content:space-between;align-items:center;gap:10px}.timer b{font-size:22px}
.empty{background:#fff;border-radius:12px;padding:24px;text-align:center;color:#5f6f80;margin-top:12px}
</style></head><body>`;
  const header = (title: string) =>
    `<div class="hd"><div class="c">${esc((teamName.trim()[0] || 'T').toUpperCase())}</div><div><b>${esc(title)}</b><span>${esc(teamName)} · plano partilhado pelo treinador</span></div></div>`;
  if (!plan) {
    return `${head}${header('Plano de treino')}<div class="w"><div class="empty">Ainda não há um próximo treino marcado.</div></div></body></html>`;
  }
  const d = new Date(`${plan.date}T12:00:00`);
  const day = `${WEEKDAYS[d.getDay()].slice(0, 3)} ${plan.date.slice(8, 10)}/${plan.date.slice(5, 7)}`;
  const planned = plan.blocks.reduce((s, b) => s + b.durationMinutes, 0);
  // The coach's app moves the link to the next training when it opens; until then, say this one is over
  const past =
    plan.date < today
      ? `<div class="empty" style="margin:0 0 10px">Este treino já passou. O próximo aparece aqui quando o treinador abrir a app.</div>`
      : '';
  let minute = 0;
  const blocks = plan.blocks
    .map((b, i) => {
      const from = minute;
      minute += b.durationMinutes;
      const [label, tagColor] = CATEGORIES[b.category || ''] || ['', '#475569'];
      return `<div class="b" id="b${i}" data-from="${from}" data-to="${minute}"><div class="h"><span class="m">${b.durationMinutes ? `${from}–${minute}'` : `${i + 1}.`}</span>${label ? `<span class="tag" style="background:${tagColor}">${esc(label)}</span>` : ''}<b>${esc(b.title)}</b></div>${b.image ? `<img src="${b.image}" alt="Desenho: ${esc(b.title)}">` : ''}${b.notes ? `<p>${esc(b.notes)}</p>` : ''}</div>`;
    })
    .join('');
  const bar = planned
    ? `<div class="bar">${plan.blocks
        .filter((b) => b.durationMinutes > 0)
        .map(
          (b) =>
            `<div style="flex:${b.durationMinutes};background:${(CATEGORIES[b.category || ''] || ['', '#475569'])[1]}">${b.durationMinutes}'</div>`
        )
        .join('')}</div>`
    : '';
  const facts = [
    ['DIA', day],
    ['HORA', plan.time || '—'],
    ['DURAÇÃO', plan.durationMinutes ? `${plan.durationMinutes} min` : planned ? `${planned} min` : '—']
  ]
    .map(([k, v]) => `<div class="f"><span>${k}</span><b>${esc(v)}</b></div>`)
    .join('');
  // While the training is on: the block of the moment and the time left in it (from the start time)
  const live = plan.time
    ? `<div class="timer" id="t"><span>⏱ Agora: <b id="tn" style="font-size:15px"></b></span><b id="tl"></b></div><script>
(function(){var s=new Date(${JSON.stringify(`${plan.date}T${plan.time}:00`)}).getTime();var bs=[].slice.call(document.querySelectorAll('.b'));
function tick(){var m=(Date.now()-s)/60000,cur=null;bs.forEach(function(b){var on=m>=+b.dataset.from&&m<+b.dataset.to;b.classList.toggle('now',on);if(on)cur=b;});
var t=document.getElementById('t');if(!cur){t.style.display='none';return;}t.style.display='flex';document.getElementById('tn').textContent=cur.querySelector('b').textContent;
var left=Math.max(0,Math.round((+cur.dataset.to-m)*60));document.getElementById('tl').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');}
tick();setInterval(tick,1000);})();</script>`
    : '';
  return `${head}${header(`Treino${plan.number ? ` nº ${plan.number}` : ''}`)}<div class="w">${past}<div class="facts">${facts}</div>${plan.location ? `<div style="margin-top:8px;color:#5f6f80;font-size:13px">📍 ${esc(plan.location)}</div>` : ''}${plan.objective ? `<div class="obj">🎯 ${esc(plan.objective)}</div>` : ''}${bar}${blocks || '<div class="empty">O plano deste treino ainda não tem blocos.</div>'}</div>${live}</body></html>`;
}
