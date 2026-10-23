import { Player } from '../types';

/**
 * Dictation during the game (Jogo ao vivo → 🎤): what the coach says is turned into an event of the game.
 *   "golo do Rui", "golo do 9 assistência do Tomás", "autogolo"
 *   "golo sofrido", "sofremos golo"
 *   "amarelo para o Rui", "cartão vermelho ao 7"
 *   "sai o Rui entra o André", "entra o André sai o Rui", "substituição Rui por André"
 * Athletes are found by shirt number, nickname, first or last name (accents, case and small slips ignored).
 */

export type VoiceCommand =
  | { kind: 'goal'; scorerId: string; assistId: string | null }
  | { kind: 'conceded' }
  | { kind: 'card'; playerId: string; color: 'Amarelo' | 'Vermelho' }
  | { kind: 'sub'; outId: string; inId: string };

export interface VoiceParse {
  heard: string;
  command?: VoiceCommand;
  error?: string;
}

export const VOICE_EXAMPLES = [
  'golo do Rui assistência do Tomás',
  'golo do 9',
  'golo sofrido',
  'amarelo para o 7',
  'sai o Rui entra o André'
];

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
  dezasseis: 16,
  dezesseis: 16,
  dezassete: 17,
  dezessete: 17,
  dezoito: 18,
  dezanove: 19,
  dezenove: 19,
  vinte: 20,
  trinta: 30
};

/** Lower case, no accents or punctuation, number words as digits ("vinte e um" → "21"). */
export function normalizeSpeech(text: string): string {
  const words = (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w in NUMBER_WORDS) {
      let n = NUMBER_WORDS[w];
      if (
        (n === 20 || n === 30) &&
        words[i + 1] === 'e' &&
        words[i + 2] in NUMBER_WORDS &&
        NUMBER_WORDS[words[i + 2]] < 10
      ) {
        n += NUMBER_WORDS[words[i + 2]];
        i += 2;
      }
      out.push(String(n));
    } else out.push(w);
  }
  return out.join(' ');
}

const FILLER = new Set([
  'o',
  'a',
  'do',
  'da',
  'de',
  'ao',
  'pelo',
  'pela',
  'para',
  'pro',
  'pra',
  'e',
  'numero',
  'n',
  'camisola',
  'jogador',
  'atleta',
  'foi',
  'marcou',
  'golo',
  'golao',
  'golaco'
]);

function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const near = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && levenshtein(a, b) <= 1);

type Found = { player?: Player; error?: string };

/** The athlete named in a piece of speech (number, nickname, first/last name), preferring those in `prefer`. */
export function findPlayer(fragment: string, squad: Player[], prefer: string[] = []): Found {
  const tokens = normalizeSpeech(fragment)
    .split(' ')
    .filter((t) => t && !FILLER.has(t));
  if (tokens.length === 0) return { error: 'Não percebi o atleta.' };

  const number = tokens.find((t) => /^\d{1,2}$/.test(t));
  if (number) {
    const byNumber = squad.filter((p) => p.number !== null && p.number !== undefined && String(p.number) === number);
    if (byNumber.length === 1) return { player: byNumber[0] };
    if (byNumber.length === 0) return { error: `Não há nenhum atleta com o número ${number}.` };
  }

  const words = tokens.filter((t) => !/^\d+$/.test(t));
  if (words.length === 0) return { error: 'Não percebi o atleta.' };
  const scored = squad
    .map((p) => {
      const nameTokens = normalizeSpeech(`${p.name} ${p.nickname || ''}`)
        .split(' ')
        .filter(Boolean);
      const full = normalizeSpeech(p.name);
      let score = 0;
      if (full === words.join(' ') || normalizeSpeech(p.nickname || '') === words.join(' ')) score = 3;
      else if (words.every((w) => nameTokens.includes(w))) score = 2;
      else if (words.every((w) => nameTokens.some((n) => near(w, n)))) score = 1;
      return { p, score };
    })
    .filter((x) => x.score > 0);
  if (scored.length === 0) return { error: `Não encontrei "${words.join(' ')}" no plantel.` };
  const best = Math.max(...scored.map((x) => x.score));
  let top = scored.filter((x) => x.score === best).map((x) => x.p);
  if (top.length > 1) {
    const preferred = top.filter((p) => prefer.includes(p.id));
    if (preferred.length === 1) top = preferred;
  }
  if (top.length > 1) {
    return { error: `Há mais do que um "${words.join(' ')}": diga o número da camisola.` };
  }
  return { player: top[0] };
}

const NOT_UNDERSTOOD = `Não percebi. Diga por exemplo: "${VOICE_EXAMPLES[0]}".`;

/**
 * Turns what was heard into a game event. `onPitch` are the athletes on the pitch (preferred when two have the same
 * name; a substitution needs one on the pitch leaving and one on the bench coming in).
 */
export function parseVoiceCommand(heard: string, squad: Player[], onPitch: string[] = []): VoiceParse {
  const text = normalizeSpeech(heard);
  const bench = squad.filter((p) => !onPitch.includes(p.id)).map((p) => p.id);
  const fail = (error: string): VoiceParse => ({ heard, error });

  // Goal conceded
  if (/\b(golo|golos|gol)\s+(sofrido|deles|do adversario|contra)\b|\bsofremos\b|\bmarcaram\b/.test(text)) {
    return { heard, command: { kind: 'conceded' } };
  }

  // Own goal by the opponent, in our favour
  if (/\bauto ?golo\b|\bgolo na propria\b/.test(text)) {
    return { heard, command: { kind: 'goal', scorerId: 'autogolo', assistId: null } };
  }

  // Cards
  const card = /\b(cartao|amarelo|vermelho)\b/.exec(text);
  if (card) {
    const color = /\bvermelho\b/.test(text) ? 'Vermelho' : 'Amarelo';
    const rest = text.replace(/\b(cartao|amarelo|vermelho)\b/g, ' ');
    const found = findPlayer(rest, squad, onPitch);
    return found.player
      ? { heard, command: { kind: 'card', playerId: found.player.id, color } }
      : fail(found.error || NOT_UNDERSTOOD);
  }

  // Substitutions: "sai X entra Y", "entra Y sai X", "substituicao X por Y", "troca X por Y"
  if (/\b(sai|entra|substituicao|substitui|troca)\b/.test(text)) {
    const saiEntra = /\bsai\b(.*?)\bentra\b(.*)/.exec(text);
    const entraSai = /\bentra\b(.*?)\bsai\b(.*)/.exec(text);
    const por = /\b(?:substituicao|substitui|troca)\b(.*?)\bpor\b(.*)/.exec(text);
    const parts: [string, string] | null = saiEntra
      ? [saiEntra[1], saiEntra[2]]
      : entraSai
        ? [entraSai[2], entraSai[1]]
        : por
          ? [por[1], por[2]]
          : null;
    if (!parts) return fail('Para substituições diga: "sai o Rui entra o André".');
    const outPart = parts[0];
    const inPart = parts[1].replace(/\b(para o lugar|no lugar)\b.*$/, '');
    const out = findPlayer(
      outPart,
      squad.filter((p) => onPitch.length === 0 || onPitch.includes(p.id)),
      onPitch
    );
    if (!out.player) return fail(out.error || NOT_UNDERSTOOD);
    const inn = findPlayer(
      inPart,
      squad.filter((p) => bench.length === 0 || bench.includes(p.id)),
      bench
    );
    if (!inn.player) return fail(inn.error || NOT_UNDERSTOOD);
    if (out.player.id === inn.player.id) return fail('O mesmo atleta não pode sair e entrar.');
    return { heard, command: { kind: 'sub', outId: out.player.id, inId: inn.player.id } };
  }

  // Goals: "golo do X (assistencia|passe) do Y"
  const goal = /\b(golo|golao|golaco|gol)\b(.*)/.exec(text);
  if (goal) {
    const [scorerPart, assistPart] = goal[2].split(/\b(?:assistencia|assistiu|passe|assist)\b/);
    const scorer = findPlayer(scorerPart, squad, onPitch);
    if (!scorer.player) return fail(scorer.error || NOT_UNDERSTOOD);
    let assistId: string | null = null;
    if (assistPart && assistPart.trim()) {
      const assist = findPlayer(assistPart, squad, onPitch);
      if (!assist.player) return fail(assist.error || NOT_UNDERSTOOD);
      if (assist.player.id !== scorer.player.id) assistId = assist.player.id;
    }
    return { heard, command: { kind: 'goal', scorerId: scorer.player.id, assistId } };
  }

  return fail(NOT_UNDERSTOOD);
}

/** "⚽ Golo de Rui Silva (assistência Tomás Gonçalves)" */
export function describeVoiceCommand(c: VoiceCommand, squad: Player[]): string {
  const name = (id: string) => (id === 'autogolo' ? 'autogolo' : squad.find((p) => p.id === id)?.name || '—');
  switch (c.kind) {
    case 'goal':
      return c.scorerId === 'autogolo'
        ? '⚽ Golo (autogolo do adversário)'
        : `⚽ Golo de ${name(c.scorerId)}${c.assistId ? ` (assistência ${name(c.assistId)})` : ''}`;
    case 'conceded':
      return '🛡️ Golo sofrido';
    case 'card':
      return `${c.color === 'Vermelho' ? '🟥' : '🟨'} Cartão ${c.color.toLowerCase()} para ${name(c.playerId)}`;
    case 'sub':
      return `🔄 Sai ${name(c.outId)}, entra ${name(c.inId)}`;
  }
}
