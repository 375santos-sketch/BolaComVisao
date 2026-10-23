import config from '../../firebase-applet-config.json';

/**
 * Parents' voting page for the "Jogador do jogo" (/votar.html?v=TOKEN). Plain TypeScript (no React, no Firebase
 * SDK) so it opens in a moment on any phone: reads the poll and adds one anonymous ballot through Firestore's REST
 * API. The ballot id is a random id kept on this phone, so the same phone cannot vote twice (the rules never let a
 * ballot change).
 */

interface Poll {
  title: string;
  candidates: { id: string; label: string }[];
  open: boolean;
  closesAt: number;
}

const app = document.getElementById('app')!;
const token = new URLSearchParams(location.search).get('v') || '';
const base =
  import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true'
    ? 'http://127.0.0.1:8080'
    : 'https://firestore.googleapis.com';
const dbId = (config as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)';
const key = config.apiKey ? `key=${encodeURIComponent(config.apiKey)}` : '';
const pollUrl = `${base}/v1/projects/${config.projectId}/databases/${dbId}/documents/public_votes/${token}`;
const storageKey = `bcv_voto_${token}`;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const show = (html: string) => {
  app.innerHTML = html;
};
const message = (text: string) => show(`<h1>⭐ Jogador do jogo</h1><p class="msg">${text}</p>`);

function remembered(): { voterId: string; candidate?: string } {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved.voterId === 'string') return saved;
  } catch {
    /* private mode: a new id each time */
  }
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const voterId = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return { voterId };
}

function remember(v: { voterId: string; candidate?: string }) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function parsePoll(json: any): Poll | null {
  const f = json?.fields;
  if (!f) return null;
  const candidates = (f.candidates?.arrayValue?.values || [])
    .map((v: any) => ({ id: v.mapValue?.fields?.id?.stringValue, label: v.mapValue?.fields?.label?.stringValue }))
    .filter((c: { id?: string; label?: string }) => c.id && c.label);
  return {
    title: f.title?.stringValue || '',
    candidates,
    open: f.open?.booleanValue === true,
    closesAt: Number(f.closesAt?.integerValue ?? f.closesAt?.doubleValue ?? 0)
  };
}

async function start() {
  if (!/^[a-zA-Z0-9]{20,64}$/.test(token)) return message('Este link de votação não é válido.');
  let poll: Poll | null = null;
  try {
    const res = await fetch(`${pollUrl}${key ? `?${key}` : ''}`);
    poll = res.ok ? parsePoll(await res.json()) : null;
  } catch {
    return message('Sem ligação à internet. Tente outra vez daqui a pouco.');
  }
  if (!poll) return message('Esta votação não existe ou foi apagada.');
  if (!poll.open || Date.now() >= poll.closesAt) return message('A votação já fechou. Obrigado!');

  const me = remembered();
  if (me.candidate) {
    const who = poll.candidates.find((c) => c.id === me.candidate)?.label || '';
    return message(`Já votou${who ? ` em <b>${esc(who)}</b>` : ''}. Obrigado! 🙌`);
  }

  let chosen = '';
  show(
    `<h1>⭐ Jogador do jogo</h1><p class="sub">${esc(poll.title)}</p>` +
      `<div class="list" role="group" aria-label="Atletas">` +
      poll.candidates
        .map(
          (c) =>
            `<button class="opt" type="button" data-id="${esc(c.id)}" aria-pressed="false">${esc(c.label)}</button>`
        )
        .join('') +
      `</div><button class="vote" type="button" disabled>Votar</button>` +
      `<p class="note">O voto é anónimo: ninguém sabe em quem votou. Um voto por telemóvel.</p>`
  );
  const voteBtn = app.querySelector<HTMLButtonElement>('.vote')!;
  app.querySelectorAll<HTMLButtonElement>('.opt').forEach((b) =>
    b.addEventListener('click', () => {
      chosen = b.dataset.id || '';
      app.querySelectorAll('.opt').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      voteBtn.disabled = !chosen;
    })
  );
  voteBtn.addEventListener('click', async () => {
    if (!chosen) return;
    voteBtn.disabled = true;
    voteBtn.textContent = 'A votar…';
    try {
      const res = await fetch(`${pollUrl}/ballots?documentId=${me.voterId}${key ? `&${key}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { candidate: { stringValue: chosen } } })
      });
      if (res.ok || res.status === 409) {
        remember({ voterId: me.voterId, candidate: chosen });
        const who = poll!.candidates.find((c) => c.id === chosen)?.label || '';
        return message(`Obrigado! Votou em <b>${esc(who)}</b>. 🙌`);
      }
      message(res.status === 403 ? 'A votação já fechou. Obrigado!' : 'Não foi possível votar. Tente outra vez.');
    } catch {
      voteBtn.disabled = false;
      voteBtn.textContent = 'Votar';
      alert('Sem ligação à internet. Tente outra vez.');
    }
  });
}

start();
