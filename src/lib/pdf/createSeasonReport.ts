import { AppState, Match } from '../../types';
import { PanelFilter, panelMatches } from '../statsPanel';

/** Games of the dashboard: a panel filter (season by default), or games already chosen elsewhere (Análise de jogos). */
export type DashboardSelection = PanelFilter | { games: Match[]; label: string };

export function selectDashboardGames(
  state: Pick<AppState, 'matches' | 'season'>,
  sel?: DashboardSelection
): { games: Match[]; label: string } {
  if (sel && 'games' in sel) return { games: sel.games.filter((m) => m && m.finished), label: sel.label };
  const f: PanelFilter = (sel as PanelFilter | undefined) || { scope: 'epoca', season: state.season };
  return { games: panelMatches(state.matches || [], f), label: describePanelFilter(f, state) };
}

/** Which games a statistics report covers, in words (for the PDF heading). */
function describePanelFilter(f: PanelFilter, state: Pick<AppState, 'matches'>): string {
  switch (f.scope) {
    case 'jogo': {
      const m = (state.matches || []).find((x) => x.id === f.matchId);
      return m ? `Jogo: ${m.date.split('-').reverse().join('/')} vs ${m.opponent}` : 'Jogo';
    }
    case 'confronto':
      return `Confronto: todos os jogos contra ${f.opponent || ''}`;
    case 'fase':
      return `Fase: ${f.phase || ''} (época ${f.season || ''})`;
    case 'periodo': {
      const d = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '…');
      return `Período: ${d(f.from)} a ${d(f.to)}`;
    }
    default:
      return `Época ${f.season || ''}`;
  }
}
