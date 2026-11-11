import React, { useEffect, useRef } from 'react';
import { SubNavTabs, type TabItem } from './ui/SubNavTabs';
import type { TabType } from './Navbar';

const TABS: TabItem[] = [
  { id: 'prejogo', label: 'Pré-jogo' },
  { id: 'jogo', label: 'Ao vivo' },
  { id: 'jogos', label: 'Resultados' },
  { id: 'analise_jogos', label: 'Análise' }
];

interface PerformanceSubNavProps {
  currentTab: TabType;
  onNavigate: (tab: TabType) => void;
}

/** Tabs shared by every Performance screen, so Resultados and Estatísticas (with playing time) are one tap away. */
export const PerformanceSubNav: React.FC<PerformanceSubNavProps> = ({ currentTab, onNavigate }) => {
  const navRef = useRef<HTMLElement>(null);

  // On a phone the tabs scroll sideways: keep the current one in view.
  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [currentTab]);

  return (
    <nav ref={navRef} aria-label="Performance" className="mb-3 lg:hidden">
      <SubNavTabs
        tabs={TABS}
        activeTab={currentTab === 'stats' ? 'analise_jogos' : currentTab}
        onChange={(id) => onNavigate(id as TabType)}
      />
    </nav>
  );
};
