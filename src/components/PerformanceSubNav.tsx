import React, { useEffect, useRef } from 'react';
import { SubNavTabs, type TabItem } from './ui/SubNavTabs';
import type { TabType } from './Navbar';

const TABS: TabItem[] = [
  { id: 'prejogo', label: 'Pré-jogo', icon: '⚡' },
  { id: 'jogo', label: 'Jogo', icon: '⏱️' },
  { id: 'stats', label: 'Estatísticas', icon: '📈' },
  { id: 'analise_jogos', label: 'Análise', icon: '📊' }
];

interface PerformanceSubNavProps {
  currentTab: TabType;
  onNavigate: (tab: TabType) => void;
}

/** Tabs shared by every Performance screen, so Estatísticas (with playing time) is one tap away. */
export const PerformanceSubNav: React.FC<PerformanceSubNavProps> = ({ currentTab, onNavigate }) => {
  const navRef = useRef<HTMLElement>(null);

  // On a phone the tabs scroll sideways: keep the current one in view.
  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [currentTab]);

  return (
    <nav ref={navRef} aria-label="Performance" className="mb-3">
      <SubNavTabs tabs={TABS} activeTab={currentTab} onChange={(id) => onNavigate(id as TabType)} />
    </nav>
  );
};
