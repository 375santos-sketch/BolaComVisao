import { CloudSyncInfo } from './cloudSyncStatus';

const formatSavedTime = (ts: number) =>
  ts > 0
    ? new Date(ts).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

/** Label, colours and explanation of the cloud save status (badge and the message shown when it is tapped). */
export function getSyncView(sync: CloudSyncInfo) {
  const saved = formatSavedTime(sync.lastSavedAt);
  switch (sync.status) {
    case 'saving':
      return {
        label: 'A guardar…',
        shortLabel: 'A guardar…',
        title: 'A guardar as alterações na nuvem…',
        className: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300',
        dotClassName: 'bg-cyan-400 animate-pulse',
        alwaysShowLabel: false
      };
    case 'pending':
      return {
        label: 'Por enviar',
        shortLabel: 'Por enviar',
        title: 'Há alterações guardadas só neste dispositivo. A enviar para a nuvem…',
        className: 'bg-amber-950/60 border-amber-500/50 text-amber-200',
        dotClassName: 'bg-amber-400',
        alwaysShowLabel: true
      };
    case 'offline':
      return {
        label: sync.hasUnsavedChanges ? 'Offline · por enviar' : 'Offline',
        shortLabel: 'Offline',
        title: sync.hasUnsavedChanges
          ? 'Sem internet. As alterações estão guardadas neste dispositivo e serão enviadas quando voltar a ligação.'
          : 'Sem internet.',
        className: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
        dotClassName: 'bg-amber-400 animate-ping',
        alwaysShowLabel: sync.hasUnsavedChanges
      };
    case 'error':
      return {
        label: 'Erro ao guardar',
        shortLabel: 'Erro',
        title: `Não foi possível guardar na nuvem: ${sync.message || 'erro desconhecido'}. Os dados estão neste dispositivo; a app volta a tentar automaticamente.`,
        className: 'bg-rose-950/80 border-rose-500/60 text-rose-300',
        dotClassName: 'bg-rose-400',
        alwaysShowLabel: true
      };
    case 'local':
      return {
        label: 'Só local',
        shortLabel: 'Só local',
        title: 'Sem sessão na nuvem: os dados estão guardados apenas neste dispositivo.',
        className: 'bg-slate-900 border-slate-700 text-slate-400',
        dotClassName: 'bg-slate-500',
        alwaysShowLabel: false
      };
    default:
      return {
        label: 'Guardado',
        shortLabel: 'Guardado',
        title: saved ? `Tudo guardado na nuvem (último envio ${saved}).` : 'Tudo guardado na nuvem.',
        className: 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700',
        dotClassName: 'bg-emerald-400',
        alwaysShowLabel: false
      };
  }
}
