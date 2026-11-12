/** Fields, scales and states of the monthly report (prototype). */

/** The coach's own words: never filled in by the app. */
export interface Qualitative {
  evolucao: string;
  positivos: string;
  dificuldades: string;
  consolidados: string;
  melhorar: string;
  acompanhamento: string;
  observacoes: string;
  dims: Record<string, number | null>;
  dimNotes: Record<string, string>;
  next: Record<string, string>;
  coordinatorNotes: string;
}

export type ReportStatus = 'rascunho' | 'validado' | 'entregue';

export const STATUS_LABEL: Record<ReportStatus, string> = {
  rascunho: 'Rascunho',
  validado: 'Validado pelo treinador',
  entregue: 'Entregue ao coordenador'
};

export const DIMENSIONS = [
  'Organização ofensiva',
  'Organização defensiva',
  'Transições',
  'Reação à perda',
  'Tomada de decisão',
  'Técnica individual',
  'Espírito de equipa',
  'Disciplina e compromisso'
];

export const LEVELS = ['Em desenvolvimento', 'Satisfatório', 'Bom', 'Muito bom'];

export const NEXT_FIELDS: [string, string][] = [
  ['tecnicos', 'Objetivos técnicos'],
  ['taticos', 'Objetivos táticos'],
  ['fisicos', 'Objetivos físicos'],
  ['comportamentais', 'Objetivos comportamentais'],
  ['prioritarios', 'Aspetos prioritários'],
  ['coordenacao', 'Observações para a coordenação']
];

export const QUAL_FIELDS: [keyof Qualitative, string][] = [
  ['evolucao', 'Evolução geral da equipa'],
  ['positivos', 'Aspetos positivos'],
  ['dificuldades', 'Dificuldades identificadas'],
  ['consolidados', 'Comportamentos consolidados'],
  ['melhorar', 'Aspetos a melhorar'],
  ['acompanhamento', 'Atletas que necessitam de acompanhamento individual'],
  ['observacoes', 'Observações relevantes']
];
