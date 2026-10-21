import type { MainCategory, TabType } from './Navbar';

export function getActiveCategory(tab: TabType): MainCategory {
  switch (tab) {
    case 'home':
      return 'home';
    case 'plantel':
    case 'convocatoria':
      return 'equipa';
    case 'calendario':
    case 'treinos':
    case 'jogos':
      return 'planeamento';
    case 'jogo':
    case 'stats':
    case 'analise_jogos':
    case 'prejogo':
      return 'performance';
    case 'teams':
      return 'mais';
    default:
      return 'home';
  }
}
