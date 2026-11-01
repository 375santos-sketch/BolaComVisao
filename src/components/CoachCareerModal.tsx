import React, { useState } from 'react';
import { AppState, CoachCareer, CoachClub, CoachCourse } from '../types';
import { careerOf, careerStatus, clubDetail, dateLabel, sortClubs, sortCourses, withCareer } from '../lib/coachCareer';
import { uid } from '../lib/utils';

interface CoachCareerModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const blankCourse = (): CoachCourse => ({ id: uid(), name: '', date: today(), credits: 1 });
const blankClub = (): CoachClub => ({ id: uid(), club: '', period: String(new Date().getFullYear()) });

/** 🏟️ Clubes por onde passei: club, year or season, age group and role. */
const ClubsSection: React.FC<{ career: CoachCareer; onSave: (career: CoachCareer) => void }> = ({ career, onSave }) => {
  const [club, setClub] = useState<CoachClub | null>(null);
  const clubs = career.clubs || [];
  const exists = club ? clubs.some((c) => c.id === club.id) : false;
  const saveClub = () => {
    if (!club || !club.club.trim() || !club.period.trim()) return;
    const clean: CoachClub = {
      id: club.id,
      club: club.club.trim(),
      period: club.period.trim(),
      ...(club.category?.trim() ? { category: club.category.trim() } : {}),
      ...(club.role?.trim() ? { role: club.role.trim() } : {})
    };
    onSave({ ...career, clubs: exists ? clubs.map((c) => (c.id === clean.id ? clean : c)) : [...clubs, clean] });
    setClub(null);
  };
  return (
    <section aria-label="Clubes por onde passei" className="space-y-2">
      <div className="text-[11px] font-bold text-slate-400">CLUBES POR ONDE PASSEI</div>
      {clubs.length > 0 && (
        <ul aria-label="Clubes" className="divide-y divide-slate-800">
          {sortClubs(clubs).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setClub(c)}
                className="flex w-full items-center gap-2 py-2 text-left"
              >
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm text-white">{c.club}</b>
                  {clubDetail(c) && <span className="text-[11px] text-slate-400">{clubDetail(c)}</span>}
                </span>
                <span className="shrink-0 text-sm font-bold text-cyan-300 font-['Chakra_Petch']">{c.period}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {club ? (
        <div className="ui-inset space-y-2 p-3">
          <input
            className="ui-input w-full text-sm"
            aria-label="Clube"
            placeholder="Ex: GD Os Dragões"
            value={club.club}
            onChange={(e) => setClub({ ...club, club: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="ui-input text-sm"
              aria-label="Ano ou época"
              placeholder="Ex: 2023/2024"
              value={club.period}
              onChange={(e) => setClub({ ...club, period: e.target.value })}
            />
            <input
              className="ui-input text-sm"
              aria-label="Escalão"
              placeholder="Escalão (ex: Sub-11)"
              value={club.category || ''}
              onChange={(e) => setClub({ ...club, category: e.target.value })}
            />
          </div>
          <input
            className="ui-input w-full text-sm"
            aria-label="Função"
            placeholder="Função (ex: Treinador principal, Adjunto)"
            value={club.role || ''}
            onChange={(e) => setClub({ ...club, role: e.target.value })}
          />
          <div className="flex gap-2">
            {exists && (
              <button
                type="button"
                onClick={() => {
                  onSave({ ...career, clubs: clubs.filter((c) => c.id !== club.id) });
                  setClub(null);
                }}
                className="ui-btn ui-btn-soft-danger px-3 py-2 text-xs"
              >
                Apagar
              </button>
            )}
            <button type="button" onClick={() => setClub(null)} className="ui-btn ui-btn-secondary flex-1 py-2 text-xs">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!club.club.trim() || !club.period.trim()}
              onClick={saveClub}
              className="ui-btn ui-btn-primary flex-1 py-2 text-xs"
            >
              Guardar clube
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setClub(blankClub())}
          className="ui-btn ui-btn-secondary w-full py-2 text-xs"
        >
          ＋ Clube
        </button>
      )}
    </section>
  );
};

/** Mais → 🎓 A minha carreira: the coach's title, its expiry and the courses for its renewal. */
const CoachCareerModal: React.FC<CoachCareerModalProps> = ({ state, onUpdateState, onShowToast, onClose }) => {
  const career = careerOf(state);
  const [course, setCourse] = useState<CoachCourse | null>(null);
  const status = careerStatus(career, today());
  const save = (next: CoachCareer) => onUpdateState(withCareer(state, next));
  const field = (key: keyof CoachCareer, value: string | number | undefined) =>
    save({ ...career, [key]: value === '' ? undefined : value });
  const progress = career.creditsNeeded ? Math.min(100, Math.round((status.credits / career.creditsNeeded) * 100)) : 0;

  const saveCourse = () => {
    if (!course) return;
    if (!course.name.trim()) {
      onShowToast('Escreva o nome da formação.');
      return;
    }
    const clean = { ...course, name: course.name.trim(), entity: course.entity?.trim() || undefined };
    const exists = career.courses.some((c) => c.id === clean.id);
    save({
      ...career,
      courses: exists ? career.courses.map((c) => (c.id === clean.id ? clean : c)) : [...career.courses, clean]
    });
    setCourse(null);
    onShowToast(exists ? 'Formação atualizada ✓' : 'Formação registada ✓');
  };

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="A minha carreira"
        className="ui-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">🎓 A minha carreira</h3>
          <button type="button" onClick={onClose} aria-label="Fechar carreira" className="text-slate-400 text-lg px-1">
            ✕
          </button>
        </div>

        {status.warnings.map((w) => (
          <p key={w} role="alert" className="rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200">
            🔔 {w}
          </p>
        ))}

        <section
          aria-label="Título de treinador"
          className="rounded-2xl bg-gradient-to-br from-cyan-700 to-slate-900 p-3 space-y-2"
        >
          <div className="text-[11px] font-bold text-cyan-100">TÍTULO DE TREINADOR</div>
          <input
            className="ui-input w-full text-base font-bold"
            aria-label="Título"
            placeholder="Ex: Grau I · UEFA C"
            defaultValue={career.title || ''}
            onBlur={(e) => e.target.value.trim() !== (career.title || '') && field('title', e.target.value.trim())}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-cyan-100">
              Válido até
              <input
                type="date"
                className="ui-input mt-0.5 w-full text-sm"
                value={career.validUntil || ''}
                onChange={(e) => field('validUntil', e.target.value)}
              />
            </label>
            <label className="text-[11px] text-cyan-100">
              N.º (opcional)
              <input
                className="ui-input mt-0.5 w-full text-sm"
                defaultValue={career.titleNumber || ''}
                onBlur={(e) =>
                  e.target.value.trim() !== (career.titleNumber || '') && field('titleNumber', e.target.value.trim())
                }
              />
            </label>
          </div>
          {career.validUntil && !status.expired && status.monthsLeft !== null && (
            <p className="text-xs text-emerald-300 font-semibold">
              Faltam {status.monthsLeft} {status.monthsLeft === 1 ? 'mês' : 'meses'}
            </p>
          )}
        </section>

        <ClubsSection career={career} onSave={save} />

        <section aria-label="Formação contínua" className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div className="text-[11px] font-bold text-slate-400">FORMAÇÃO CONTÍNUA PARA RENOVAR</div>
            <label className="flex items-center gap-1 text-[11px] text-slate-400">
              Créditos precisos
              <input
                type="number"
                min={0}
                max={200}
                aria-label="Créditos precisos para renovar"
                className="ui-input w-16 !py-1 text-center text-sm"
                value={career.creditsNeeded ?? ''}
                onChange={(e) =>
                  field('creditsNeeded', e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))
                }
              />
            </label>
          </div>
          <div className="flex justify-between text-sm">
            <b className="text-white">
              {status.credits}
              {career.creditsNeeded ? ` de ${career.creditsNeeded}` : ''}{' '}
              {status.credits === 1 ? 'crédito' : 'créditos'}
            </b>
            {status.missing > 0 && <span className="text-slate-400">faltam {status.missing}</span>}
          </div>
          {career.creditsNeeded ? (
            <div className="h-2 overflow-hidden rounded bg-slate-800">
              <div className="h-full bg-emerald-400" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          <ul aria-label="Formações" className="divide-y divide-slate-800">
            {sortCourses(career.courses).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setCourse(c)}
                  className="flex w-full items-center gap-2 py-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-white">{c.name}</b>
                    <span className="text-[11px] text-slate-400">
                      {[
                        c.entity,
                        dateLabel(c.date),
                        c.hours ? `${c.hours} h` : '',
                        c.certificate ? 'certificado ✓' : ''
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold text-cyan-300 font-['Chakra_Petch']">+{c.credits}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {course ? (
          <section aria-label="Formação" className="ui-inset space-y-2 p-3">
            <input
              className="ui-input w-full text-sm"
              aria-label="Nome da formação"
              placeholder="Ex: Ação de formação – Futebol de 7"
              value={course.name}
              onChange={(e) => setCourse({ ...course, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="ui-input text-sm"
                aria-label="Entidade"
                placeholder="Entidade (ex: AF)"
                value={course.entity || ''}
                onChange={(e) => setCourse({ ...course, entity: e.target.value })}
              />
              <input
                type="date"
                className="ui-input text-sm"
                aria-label="Data da formação"
                value={course.date}
                onChange={(e) => setCourse({ ...course, date: e.target.value })}
              />
              <label className="text-[11px] text-slate-400">
                Créditos
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  aria-label="Créditos da formação"
                  className="ui-input mt-0.5 w-full text-sm"
                  value={course.credits}
                  onChange={(e) => setCourse({ ...course, credits: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <label className="text-[11px] text-slate-400">
                Horas (opcional)
                <input
                  type="number"
                  min={0}
                  className="ui-input mt-0.5 w-full text-sm"
                  value={course.hours ?? ''}
                  onChange={(e) =>
                    setCourse({
                      ...course,
                      hours: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value))
                    })
                  }
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(course.certificate)}
                onChange={(e) => setCourse({ ...course, certificate: e.target.checked || undefined })}
              />
              Tenho o certificado
            </label>
            <div className="flex gap-2">
              {career.courses.some((c) => c.id === course.id) && (
                <button
                  type="button"
                  onClick={() => {
                    save({ ...career, courses: career.courses.filter((c) => c.id !== course.id) });
                    setCourse(null);
                  }}
                  className="ui-btn ui-btn-soft-danger px-3 py-2 text-xs"
                >
                  Apagar
                </button>
              )}
              <button
                type="button"
                onClick={() => setCourse(null)}
                className="ui-btn ui-btn-secondary flex-1 py-2 text-xs"
              >
                Cancelar
              </button>
              <button type="button" onClick={saveCourse} className="ui-btn ui-btn-primary flex-1 py-2 text-xs">
                Guardar formação
              </button>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCourse(blankCourse())}
              className="ui-btn ui-btn-secondary py-2.5 text-xs"
            >
              ＋ Formação
            </button>
            <button
              type="button"
              onClick={async () => {
                const { generateCoachCvPDF } = await import('../lib/pdfUtils');
                await generateCoachCvPDF(state);
                onShowToast('Currículo em PDF pronto 📄');
              }}
              className="ui-btn ui-btn-secondary py-2.5 text-xs"
            >
              📄 Currículo em PDF
            </button>
          </div>
        )}
        <p className="text-[10px] text-slate-500">
          Os créditos precisos para renovar escreve-os o treinador, porque as regras podem mudar. A app avisa 6 meses
          antes de o título caducar.
        </p>
      </div>
    </div>
  );
};

export default CoachCareerModal;
