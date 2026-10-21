import type { MainCategory, TabType } from './Navbar';

export function getActiveCategory(tab: TabType): MainCategory {
  switch (tab) {
    case 'home':
      return 'home';
    case 'plantel':
    case 'chat_staff':
    case 'convocatoria':
      return 'equipa';
    case 'calendario':
    case 'treinos':
    case 'biblioteca':
    case 'jogos':
      return 'planeamento';
    case 'jogo':
    case 'stats':
    case 'analise_jogos':
    case 'prejogo':
    case 'relatorios':
      return 'performance';
    case 'teams':
      return 'mais';
    default:
      return 'home';
  }
}
