/**
 * 🧒 Explicar às crianças: Gemini rewrites an exercise in 3 short sentences for children (with an emoji each), to read
 * out before the exercise; "Mais simples" asks for an even easier version.
 */

export interface KidsRequest {
  name: string;
  objective?: string;
  description?: string;
  ageGroup?: string;
  simpler?: boolean;
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** The request checked on the server. Null when there is nothing to explain. */
export function cleanKidsRequest(raw: unknown): KidsRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = text(r.name, 80);
  const description = text(r.description, 3000);
  if (!name && !description) return null;
  return {
    name,
    ...(text(r.objective, 300) ? { objective: text(r.objective, 300) } : {}),
    ...(description ? { description } : {}),
    ...(text(r.ageGroup, 20) ? { ageGroup: text(r.ageGroup, 20) } : {}),
    ...(r.simpler === true ? { simpler: true } : {})
  };
}

export function kidsPrompt(r: KidsRequest): string {
  return `És treinador de futebol de formação. Explica este exercício a crianças do escalão ${r.ageGroup || 'de formação'}, em português de Portugal, para o treinador ler em voz alta antes de começar.
Exercício: ${r.name}
${r.objective ? `Objetivo: ${r.objective}\n` : ''}${r.description ? `Como se faz: ${r.description}\n` : ''}Regras: exatamente 3 frases curtas, cada uma numa linha e a começar por um emoji (⚽, 🎯, 🏃 ou parecido); diz o que fazem, como se ganha um ponto e uma regra importante; palavras simples, sem termos técnicos${r.simpler ? ', ainda mais simples, como para crianças de 6 anos' : ''}; trata-os por "vocês". Sem títulos nem markdown.`;
}

/** The model's answer: at most 4 short lines of plain text (null when empty). */
export function cleanKidsText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const lines = raw
    .replace(/\*\*?|__|^#+\s*/gm, '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-•\d.)]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 4);
  const out = lines.join('\n').slice(0, 600);
  return out.length >= 15 ? out : null;
}
