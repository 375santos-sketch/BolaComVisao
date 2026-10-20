import React, { useState } from 'react';
import { SmartAlert, SmartRecommendation } from '../../types';
import { TabType } from '../Navbar';
import { SmartAlertCard } from '../ui/SmartAlertCard';
import { RecommendationCard } from '../ui/RecommendationCard';

interface DashboardSmartInsightsProps {
  smartAlerts: SmartAlert[];
  smartRecommendations: SmartRecommendation[];
  onNavigate: (tab: TabType, targetId?: string) => void;
  onShowToast?: (msg: string) => void;
}

export const DashboardSmartInsights: React.FC<DashboardSmartInsightsProps> = ({
  smartAlerts,
  smartRecommendations,
  onNavigate,
  onShowToast
}) => {
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  const activeAlerts = smartAlerts.filter((a) => !dismissedAlertIds.includes(a.id));

  const handleDismiss = (id: string) => {
    setDismissedAlertIds((prev) => [...prev, id]);
    if (onShowToast) onShowToast('Alerta dispensado');
  };

  const handleAlertAction = (alert: SmartAlert) => {
    if (alert.targetTab) {
      onNavigate(alert.targetTab as TabType, alert.targetId);
    }
  };

  const handleRecAction = (rec: SmartRecommendation) => {
    if (rec.targetTab) {
      onNavigate(rec.targetTab as TabType, rec.targetId);
    }
  };

  if (activeAlerts.length === 0 && smartRecommendations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Smart Alerts Section */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Alertas de Gestão & Rendimento ({activeAlerts.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeAlerts.slice(0, 4).map((alert) => (
              <SmartAlertCard key={alert.id} alert={alert} onDismiss={handleDismiss} onAction={handleAlertAction} />
            ))}
          </div>
        </div>
      )}

      {/* Smart Recommendations Section */}
      {smartRecommendations.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Sugestões Táticas & Estratégicas
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {smartRecommendations.slice(0, 2).map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} onAction={handleRecAction} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
