import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Player, AppState } from '../../../types';
import { computeAge } from '../../../lib/utils';
import { calculatePlayerEvolution } from '../../../lib/intelligenceEngine';
import { buildPlayerSeason } from '../../../lib/playerSeason';
import { squadIndicators, pctLabel } from '../../../lib/squadIndicators';
import { averageOf, evaluationsOf, formatScore, strengthsOf } from '../../../lib/playerEvolution';
import { absenceReasonLabel } from '../../../lib/trainingQuick';
import { PlayerSeasonSection } from './PlayerSeasonSection';
import { PlayerTestsSection } from './PlayerTestsSection';
import { PlayerEvolutionSection } from './PlayerEvolutionSection';
import { StatsPanel } from '../../stats/StatsPanel';
import { Avatar } from '../../ui/Avatar';
import { AvailabilityPill } from '../../ui/AvailabilityPill';
import { SectionNav } from '../../ui/SectionNav';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatTile } from '../../ui/StatTile';
import { EmptyState } from '../../ui/EmptyState';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { Portal } from '../../ui/Portal';

const PlayerCardModal = lazy(() => import('./PlayerCardModal'));

/** The sections of the sheet, in the order the coach needs them; the bar at the top jumps to each one. */
const SECTIONS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'avaliacao', label: 'Avaliação' },
  { id: 'objetivos', label: 'Objetivos' },
  { id: 'estatisticas', label: 'Estatísticas' },
  { id: 'historico', label: 'Histórico' },
  { id: 'fisico', label: 'Físico' },
  { id: 'disponibilidade', label: 'Disponibilidade' },
  { id: 'dados', label: 'Dados pessoais' }
];

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

interface AthleteSheetProps {
  player: Player | null;
  stats: { minutos: number } | null;
  state: AppState;
  onClose: () => void;
  onEdit: (player: Player) => void;
  onRemove?: (id: string) => void;
  onShowToast: (msg: string) => void;
  onUpdateState?: (partial: Partial<AppState>) => void;
}

/**
 * Equipa → the athlete's sheet, one page in sections (no tabs, no windows on top of windows). On a computer it sits
 * beside the squad list; on the phone it fills the screen, with "‹ Plantel" to go back.
 */
export const AthleteSheet: React.FC<AthleteSheetProps> = (props) => {
  if (!props.player || !props.stats) return null;
  return <AthleteSheetInner key={props.player.id} {...props} player={props.player} />;
};

const AthleteSheetInner: React.FC<AthleteSheetProps & { player: Player }> = ({
  player,
  stats,
  state,
  onClose,
  onEdit,
  onRemove,
  onShowToast,
  onUpdateState
}) => {
  const [coachNotes, setCoachNotes] = useState<string>(player.coachNotes || player.notes || '');
  const [showPanel, setShowPanel] = useState(false);
  const [showCard, setShowCard] = useState(false);
  // PDF of the athlete: the coach's evaluations and notes are private, only in when turned on (off by default)
  const [pdfOptions, setPdfOptions] = useState<{ includeEvaluations: boolean; includeCoachNotes: boolean } | null>(
    null
  );
  const [evaluateNow, setEvaluateNow] = useState(0);
  const [active, setActive] = useState('resumo');
  const [seasonMessage, setSeasonMessage] = useState<string>(
    (state.season && player.seasonMessages?.[state.season]) || ''
  );
  const root = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);

  const evo = calculatePlayerEvolution(player, state);
  const season = buildPlayerSeason(state, player.id, state.season);
  const indicator = squadIndicators(state).get(player.id) || { callupShare: null, attendance: null };
  const evaluations = evaluationsOf(player);
  const [last, before] = evaluations;
  const age = computeAge(player.birthDate);

  // The section in view is marked in the bar
  useEffect(() => {
    const els = SECTIONS.map((s) => root.current?.querySelector(`#ficha-${s.id}`)).filter(Boolean) as Element[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace('ficha-', ''));
      },
      { root: root.current, rootMargin: `-${(head.current?.offsetHeight || 200) + 8}px 0px -50% 0px` }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  // Only the sheet scrolls (never the page behind), and the section starts just under the sticky header
  const jump = (id: string) => {
    setActive(id);
    const el = root.current?.querySelector<HTMLElement>(`#ficha-${id}`);
    if (!el || !root.current) return;
    const top = el.getBoundingClientRect().top - root.current.getBoundingClientRect().top + root.current.scrollTop;
    root.current.scrollTo({ top: top - (head.current?.offsetHeight || 0) - 8, behavior: 'smooth' });
  };

  const saveRoster = (updatedRoster: Player[]) => {
    if (!onUpdateState) return;
    onUpdateState({
      roster: updatedRoster,
      ...(state.activeTeamId && state.teams
        ? { teams: state.teams.map((t) => (t.id === state.activeTeamId ? { ...t, roster: updatedRoster } : t)) }
        : {})
    });
  };
  const savePlayer = (next: Player) => saveRoster((state.roster || []).map((p) => (p.id === next.id ? next : p)));

  const handleSaveCoachNotes = () => {
    if (!onUpdateState) return onShowToast('Notas atualizadas localmente!');
    saveRoster((state.roster || []).map((p) => (p.id === player.id ? { ...p, coachNotes, notes: coachNotes } : p)));
    onShowToast(`Notas confidenciais de ${player.name} guardadas! 📝`);
  };
  const withSeasonMessage = (p: Player, msg: string): Player => {
    if (!state.season) return p;
    const seasonMessages = { ...(p.seasonMessages || {}) };
    if (msg) seasonMessages[state.season] = msg;
    else delete seasonMessages[state.season];
    return { ...p, seasonMessages };
  };
  const handleSaveSeasonMessage = (): string => {
    const msg = seasonMessage.trim();
    if (!state.season || msg === (player.seasonMessages?.[state.season] || '').trim()) return msg;
    if (!onUpdateState) {
      onShowToast('Mensagem atualizada localmente!');
      return msg;
    }
    saveRoster((state.roster || []).map((p) => (p.id === player.id ? withSeasonMessage(p, msg) : p)));
    onShowToast('Mensagem de fim de época guardada ✓');
    return msg;
  };
  const exportPdf = async (options: { includeEvaluations: boolean; includeCoachNotes: boolean }) => {
    const { generatePlayerProfilePDF } = await import('../../../lib/pdfUtils');
    generatePlayerProfilePDF(player, state, options);
    onShowToast(`Ficha PDF de ${player.name} gerada com sucesso! 📄`);
  };

  const strengths = last ? strengthsOf(last) : null;
  const delta = last && before ? averageOf(last) - averageOf(before) : null;
  const info = [
    player.positions || 'Posição não definida',
    age ? `${age} anos` : '',
    player.dominantFoot ? `Pé ${player.dominantFoot.toLowerCase()}` : ''
  ]
    .filter(Boolean)
    .join(' · ');

  const action =
    'ui-btn ui-btn-secondary flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-ui-caption';

  return (
    <div
      ref={root}
      role="region"
      aria-label={`Ficha de ${player.name}`}
      className="fixed inset-0 z-30 overflow-y-auto bg-ui-bg pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:sticky lg:top-4 lg:z-auto lg:max-h-[calc(100dvh-2rem)] lg:bg-transparent lg:pb-0"
    >
      {/* Header: who, how they are, and the main actions always at hand */}
      <div
        ref={head}
        className="sticky top-0 z-10 border-b border-ui-line bg-ui-bg/95 backdrop-blur lg:top-0 lg:rounded-t-[var(--radius-ui-lg)] lg:border lg:bg-ui-surface/95"
      >
        <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] lg:pt-3">
          <button type="button" onClick={onClose} className="text-ui-caption font-bold text-ui-brand lg:hidden">
            ‹ Plantel
          </button>
          <span className="hidden text-ui-caption font-bold uppercase tracking-[0.12em] text-ui-muted lg:block">
            Ficha do atleta
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar a ficha"
            className="flex h-8 w-8 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 px-4 pb-3 pt-2">
          <Avatar name={player.name} photoUrl={player.photoUrl} number={player.number} size="lg" square />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-['Chakra_Petch'] text-ui-title font-bold text-ui-text sm:text-ui-headline">
              {player.number !== null && player.number !== undefined && `${player.number}` !== '' && (
                <span className="mr-1.5 text-ui-brand">{player.number}</span>
              )}
              {player.name}
            </h2>
            <p className="truncate text-ui-caption text-ui-muted">{info}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <AvailabilityPill player={player} withNote />
              {evo && (evo.consecutiveAbsences || 0) >= 2 && (
                <span className="ui-badge ui-badge-danger">{evo.consecutiveAbsences} faltas seguidas</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {onUpdateState && (
            <button
              type="button"
              onClick={() => {
                jump('avaliacao');
                setEvaluateNow((n) => n + 1);
              }}
              className="ui-btn ui-btn-primary flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-ui-caption"
            >
              <Icon name="plus" className="h-4 w-4" /> Avaliar
            </button>
          )}
          <button type="button" onClick={() => onEdit(player)} className={action}>
            <Icon name="settings" className="h-4 w-4" /> Editar Dados
          </button>
          <button type="button" onClick={() => setShowCard(true)} className={action}>
            <Icon name="trophy" className="h-4 w-4" /> Cromo
          </button>
          <button
            type="button"
            onClick={() => setPdfOptions({ includeEvaluations: false, includeCoachNotes: false })}
            aria-label="PDF Ficha do Atleta"
            className={action}
          >
            <Icon name="clipboard" className="h-4 w-4" /> PDF
          </button>
        </div>
        <SectionNav
          label="Secções da ficha"
          sections={SECTIONS}
          active={active}
          onJump={jump}
          className="border-t border-ui-line px-3"
        />
      </div>

      <div className="space-y-6 px-4 py-4 lg:rounded-b-[var(--radius-ui-lg)] lg:border lg:border-t-0 lg:border-ui-line lg:bg-ui-surface/40">
        {/* Resumo */}
        <section id="ficha-resumo" aria-label="Resumo" className="space-y-2">
          <SectionHeader title={`Resumo · Época ${state.season || ''}`} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile
              label="Jogos"
              value={season.games.played}
              hint={
                season.games.calledUp
                  ? `convocado ${season.games.calledUp} · titular ${season.games.starts}`
                  : 'sem convocatórias'
              }
              icon="ball"
            />
            <StatTile
              label="Minutos"
              value={`${season.games.minutes}'`}
              hint={
                indicator.callupShare === null
                  ? 'sem jogos convocado'
                  : `${pctLabel(indicator.callupShare)} quando convocado`
              }
              icon="whistle"
              tone={indicator.callupShare !== null && indicator.callupShare < 0.5 ? 'warning' : 'brand'}
            />
            <StatTile
              label="Golos / Assist."
              value={`${season.goals} / ${season.assists}`}
              hint="nesta época"
              icon="trophy"
            />
            <StatTile
              label="Treinos"
              value={pctLabel(indicator.attendance)}
              hint={season.trainings.held ? `${season.trainings.present} de ${season.trainings.held}` : 'sem treinos'}
              icon="users"
              tone={indicator.attendance !== null && indicator.attendance < 0.7 ? 'warning' : 'success'}
            />
          </div>
        </section>

        {/* Avaliação: strengths and points to improve of the last evaluation, then the evaluations */}
        <section
          id="ficha-avaliacao"
          aria-label="Avaliação"
          className="space-y-2 [&_svg[role=img]]:mx-auto [&_svg[role=img]]:max-w-sm"
        >
          <SectionHeader title="Avaliação" />
          {last && strengths ? (
            <div className="ui-card space-y-2 p-4" aria-label="Última avaliação">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-ui-caption font-bold text-ui-muted">Última avaliação · {ddmm(last.date)}</span>
                <span className="text-ui-body font-bold text-ui-text">
                  Média {formatScore(averageOf(last))}
                  {delta !== null && Math.abs(delta) >= 0.05 && (
                    <span className={`ml-1.5 text-ui-caption ${delta > 0 ? 'text-ui-success' : 'text-ui-danger'}`}>
                      {delta > 0 ? '▲' : '▼'} {formatScore(Math.abs(delta))} vs {ddmm(before.date)}
                    </span>
                  )}
                </span>
              </div>
              {strengths.strong.length ? (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="w-24 text-ui-caption text-ui-muted">Pontos fortes</span>
                    {strengths.strong.map((s) => (
                      <span key={s.key} className="ui-badge ui-badge-success">
                        {s.label} {s.score}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="w-24 text-ui-caption text-ui-muted">A melhorar</span>
                    {strengths.improve.map((s) => (
                      <span key={s.key} className="ui-badge ui-badge-warning">
                        {s.label} {s.score}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-ui-caption text-ui-muted">Todas as áreas com a mesma nota nesta avaliação.</p>
              )}
            </div>
          ) : null}
          <PlayerEvolutionSection
            key={evaluateNow}
            part="avaliacoes"
            startEvaluating={evaluateNow > 0}
            player={player}
            onSavePlayer={onUpdateState ? savePlayer : undefined}
            onShowToast={onShowToast}
          />
        </section>

        {/* Objetivos */}
        <section id="ficha-objetivos" aria-label="Objetivos" className="space-y-2">
          <SectionHeader title="Objetivos" />
          <PlayerEvolutionSection
            part="objetivos"
            player={player}
            onSavePlayer={onUpdateState ? savePlayer : undefined}
            onShowToast={onShowToast}
          />
        </section>

        {/* Estatísticas: minutes game by game, training months, latest games; the full panel inside the page */}
        <section id="ficha-estatisticas" aria-label="Estatísticas" className="space-y-2">
          <SectionHeader
            title="Estatísticas e evolução"
            action={{
              label: showPanel ? 'Fechar o painel' : 'Painel do atleta',
              onClick: () => setShowPanel((v) => !v)
            }}
          />
          {showPanel ? (
            <StatsPanel
              inline
              state={state}
              initialPlayerId={player.id}
              onClose={() => setShowPanel(false)}
              onShowToast={onShowToast}
            />
          ) : (
            <div className="ui-card p-4">
              <PlayerSeasonSection data={season} hideTiles />
            </div>
          )}
        </section>

        {/* Histórico: the coach's notes and the end-of-season message (the evaluations list is in Avaliação) */}
        <section id="ficha-historico" aria-label="Histórico" className="space-y-2">
          <SectionHeader title="Histórico e notas" />
          <div className="ui-card space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-ui-caption font-bold text-ui-muted">Notas do treinador (confidencial)</span>
              <button
                type="button"
                onClick={handleSaveCoachNotes}
                className="ui-btn ui-btn-soft px-3 py-1 text-ui-caption"
              >
                Guardar
              </button>
            </div>
            <textarea
              rows={2}
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="Ex: Ponto de trabalho no pé fraco, atitude positiva, acordo de horários..."
              className="ui-input w-full resize-none text-ui-caption"
            />
          </div>
          <section aria-label="Relatório de fim de época" className="ui-card space-y-2 p-4">
            <div className="text-ui-caption font-bold text-ui-muted">
              Relatório de fim de época {state.season ? `· ${state.season}` : ''}
            </div>
            <p className="text-ui-caption text-ui-muted">
              PDF para entregar à família: evolução, minutos, golos, assiduidade e a sua mensagem. Não leva contactos
              nem as notas confidenciais.
            </p>
            <textarea
              rows={3}
              aria-label="Mensagem do treinador para a família"
              value={seasonMessage}
              onChange={(e) => setSeasonMessage(e.target.value)}
              placeholder="Ex: Foi uma época de grande evolução. O teu empenho nos treinos fez a diferença…"
              className="ui-input w-full resize-none text-ui-caption"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveSeasonMessage}
                className="ui-btn ui-btn-soft py-2 text-ui-caption"
              >
                Guardar mensagem
              </button>
              <button
                type="button"
                onClick={async () => {
                  const msg = handleSaveSeasonMessage();
                  const { generateSeasonFinalReportPDF } = await import('../../../lib/pdfUtils');
                  await generateSeasonFinalReportPDF([withSeasonMessage(player, msg)], state);
                  onShowToast(`Relatório de fim de época de ${player.name} gerado 🏆`);
                }}
                className="ui-btn ui-btn-secondary py-2 text-ui-caption"
              >
                PDF fim de época
              </button>
            </div>
          </section>
        </section>

        {/* Físico: the fitness tests already recorded (Equipa → Testes), as they are */}
        <section id="ficha-fisico" aria-label="Físico" className="space-y-2">
          <SectionHeader title="Físico · testes" />
          <div className="ui-card p-4">
            <PlayerTestsSection player={player} season={state.season || ''} clubName={state.myClubName || ''} />
          </div>
        </section>

        {/* Disponibilidade */}
        <section id="ficha-disponibilidade" aria-label="Disponibilidade" className="space-y-2">
          <SectionHeader title="Disponibilidade" />
          <div className="ui-card space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <AvailabilityPill player={player} withNote />
              {(player.status || 'disponivel') === 'disponivel' && (
                <span className="text-ui-caption text-ui-muted">Sem lesões nem castigos registados.</span>
              )}
            </div>
            {season.absences.length > 0 ? (
              <p className="text-ui-caption text-ui-muted">
                Faltas aos treinos nesta época: {season.absences.length} (
                {Object.entries(
                  season.absences.reduce<Record<string, number>>((acc, a) => {
                    const k = absenceReasonLabel(a.reason);
                    acc[k] = (acc[k] || 0) + 1;
                    return acc;
                  }, {})
                )
                  .map(([r, n]) => `${r} ${n}`)
                  .join(', ')}
                )
              </p>
            ) : (
              <p className="text-ui-caption text-ui-muted">Sem faltas aos treinos nesta época.</p>
            )}
          </div>
        </section>

        {/* Dados pessoais e contactos (only for the staff, as before) */}
        <section id="ficha-dados" aria-label="Dados pessoais" className="space-y-2">
          <SectionHeader title="Dados pessoais e contactos" />
          <dl className="ui-card grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-ui-caption sm:grid-cols-3">
            {[
              ['Idade / nascimento', age ? `${age} anos${player.birthDate ? ` (${player.birthDate})` : ''}` : 'N/D'],
              ['Pé dominante', player.dominantFoot || 'N/D'],
              ['Altura', player.height || 'N/D'],
              ['Peso', player.weight || 'N/D'],
              ['Telefone', player.phone || 'Não registado'],
              ['Email', player.email || 'Não registado'],
              ['Emergência / Enc.', player.emergencyContact || 'Não registado']
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-ui-muted">{k}</dt>
                <dd className="truncate font-bold text-ui-text">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                const { exportPlayerProfileExcel } = await import('../../../lib/exportUtils');
                exportPlayerProfileExcel(player, stats, state);
                onShowToast(`Ficha Excel de ${player.name} exportada! 📊`);
              }}
              className="ui-btn ui-btn-secondary px-3 py-2 text-ui-caption"
            >
              Excel da ficha
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(player.id)}
                className="ui-btn ui-btn-soft-danger px-3 py-2 text-ui-caption"
              >
                Remover do plantel
              </button>
            )}
          </div>
          {!evaluations.length && !season.games.calledUp && (
            <EmptyState
              compact
              icon="users"
              title="Atleta novo"
              text="Os números aparecem com os primeiros treinos e jogos."
            />
          )}
        </section>
      </div>

      {pdfOptions && (
        <Portal>
          <Sheet
            title={`PDF de ${player.name}`}
            size="sm"
            onClose={() => setPdfOptions(null)}
            footer={
              <button
                type="button"
                onClick={() => {
                  exportPdf(pdfOptions);
                  setPdfOptions(null);
                }}
                className="ui-btn ui-btn-primary w-full py-2.5"
              >
                Gerar PDF
              </button>
            }
          >
            <p className="text-ui-caption text-ui-muted">
              A ficha leva a época do atleta (jogos, minutos e treinos), sem contactos. O que é só do treinador fica de
              fora, a não ser que o ligues aqui.
            </p>
            {(
              [
                ['includeEvaluations', 'Incluir as avaliações do treinador'],
                ['includeCoachNotes', 'Incluir as notas do treinador']
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="ui-inset mt-2 flex items-center gap-3 p-3 text-ui-body text-ui-text">
                <input
                  type="checkbox"
                  checked={pdfOptions[key]}
                  onChange={(e) => setPdfOptions({ ...pdfOptions, [key]: e.target.checked })}
                  className="h-5 w-5"
                />
                {label}
              </label>
            ))}
          </Sheet>
        </Portal>
      )}
      {showCard && (
        <Suspense fallback={null}>
          <PlayerCardModal player={player} state={state} onShowToast={onShowToast} onClose={() => setShowCard(false)} />
        </Suspense>
      )}
    </div>
  );
};
