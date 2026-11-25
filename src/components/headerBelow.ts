import { createContext } from 'react';

/**
 * What goes right under the title bar (Header) of a screen: the tabs of Jogo (Pré-jogo · Ao vivo · Resultados ·
 * Análise), so they sit in the same place as the tabs of Plantel and Planeamento.
 */
export const HeaderBelowContext = createContext<React.ReactNode>(null);
