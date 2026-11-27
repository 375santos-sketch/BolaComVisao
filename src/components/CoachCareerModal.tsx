import React, { useState } from 'react';
import { DateTimePT } from './ui/DateTimePT';
import { Icon } from './ui/Icon';
import { AppState, CoachCareer, CoachClub, CoachCourse } from '../types';
import { careerOf, careerStatus, clubDetail, dateLabel, sortClubs, sortCourses, withCareer } from '../lib/coachCareer';
import { uid } from '../lib/utils';
import { compressImageFile } from '../lib/imageCompress';

interface CoachCareerModalProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const blankCourse = (): CoachCourse => ({ id: uid(), name: '', date: today(), credits: 1 });
const blankClub = (): CoachClub => ({ id: uid(), club: '', period: String(new Date().getFullYear()) });

/** Clubes por onde passei: club, year or season, age group and role. */
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
      <div className="text-ui-caption font-semibold text-ui-muted">Clubes por onde passei</div>
      {clubs.length > 0 && (
        <ul aria-label="Clubes" className="divide-y divide-ui-line">
          {sortClubs(clubs).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setClub(c)}
                className="flex w-full items-center gap-2 py-2 text-left"
              >
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm text-ui-text">{c.club}</b>
                  {clubDetail(c) && <span className="text-ui-caption text-ui-muted">{clubDetail(c)}</span>}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-ui-text">{c.period}</span>
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
          <Icon name="plus" className="h-4 w-4 shrink-0" />
          Clube
        </button>
      )}
    </section>
  );
};

/** Mais → A minha carreira: the coach's title, its expiry and the courses for its renewal. */
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
          <h3 className="text-base font-bold text-ui-text">A minha carreira</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar carreira"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
          >
            <Icon name="x" className="h-5 w-5 shrink-0" />
          </button>
        </div>

        {status.warnings.map((w) => (
          <p
            key={w}
            role="alert"
            className="flex items-start gap-2 rounded-ui-sm bg-ui-warning-soft px-3 py-2 text-xs font-semibold text-ui-warning"
          >
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            {w}
          </p>
        ))}

        <section aria-label="A minha foto" className="flex items-center gap-3">
          {career.photo ? (
            <img
              src={career.photo}
              alt="A minha foto"
              className="h-20 w-16 shrink-0 rounded-ui-sm object-cover bg-ui-surface-2"
            />
          ) : (
            <div className="grid h-20 w-16 shrink-0 place-items-center rounded-ui-sm border-2 border-dashed border-ui-line-strong text-ui-muted">
              <Icon name="user" className="h-7 w-7" />
            </div>
          )}
          <div className="flex-1 space-y-1.5">
            <p className="text-ui-caption text-ui-muted">A tua foto aparece no topo do currículo em PDF.</p>
            <div className="flex flex-wrap gap-2">
              <label className="ui-btn ui-btn-secondary min-h-10 cursor-pointer px-3 text-xs">
                <Icon name="image" className="h-4 w-4 shrink-0" />
                {career.photo ? 'Trocar foto' : 'Pôr a minha foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-label="Foto do treinador"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    try {
                      save({ ...career, photo: await compressImageFile(file, 500, 70_000) });
                      onShowToast('Foto guardada ✓');
                    } catch (err) {
                      onShowToast((err as Error).message || 'Não foi possível usar esta foto.');
                    }
                  }}
                />
              </label>
              {career.photo && (
                <button
                  type="button"
                  onClick={() => {
                    const rest = { ...career };
                    delete rest.photo;
                    save(rest);
                  }}
                  className="ui-btn ui-btn-soft-danger min-h-10 px-3 text-xs"
                >
                  Tirar foto
                </button>
              )}
            </div>
          </div>
        </section>

        <section aria-label="Título de treinador" className="ui-inset p-3 space-y-2">
          <div className="text-ui-caption font-semibold text-ui-muted">Título de treinador</div>
          <input
            className="ui-input w-full text-base font-bold"
            aria-label="Título"
            placeholder="Ex: Grau I · UEFA C"
            defaultValue={career.title || ''}
            onBlur={(e) => e.target.value.trim() !== (career.title || '') && field('title', e.target.value.trim())}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-ui-caption text-ui-muted">
              Válido até
              <DateTimePT
                type="date"
                label="Válido até"
                className="mt-0.5"
                inputClassName="ui-input w-full text-sm"
                value={career.validUntil || ''}
                onChange={(v) => field('validUntil', v)}
              />
            </label>
            <label className="text-ui-caption text-ui-muted">
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
            <p className="text-xs text-ui-success font-semibold">
              Faltam {status.monthsLeft} {status.monthsLeft === 1 ? 'mês' : 'meses'}
            </p>
          )}
        </section>

        <ClubsSection career={career} onSave={save} />

        <section aria-label="Formação contínua" className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div className="text-ui-caption font-semibold text-ui-muted">Formação contínua para renovar</div>
            <label className="flex items-center gap-1 text-ui-caption text-ui-muted">
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
            <b className="text-ui-text">
              {status.credits}
              {career.creditsNeeded ? ` de ${career.creditsNeeded}` : ''}{' '}
              {status.credits === 1 ? 'crédito' : 'créditos'}
            </b>
            {status.missing > 0 && <span className="text-ui-muted">faltam {status.missing}</span>}
          </div>
          {career.creditsNeeded ? (
            <div className="h-2 overflow-hidden rounded bg-ui-surface-2">
              <div className="h-full bg-ui-brand" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          <ul aria-label="Formações" className="divide-y divide-ui-line">
            {sortCourses(career.courses).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setCourse(c)}
                  className="flex w-full items-center gap-2 py-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-ui-text">{c.name}</b>
                    <span className="text-ui-caption text-ui-muted">
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
                  <span className="shrink-0 font-bold tabular-nums text-ui-brand">+{c.credits}</span>
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
              <DateTimePT
                type="date"
                label="Data da formação"
                inputClassName="ui-input w-full text-sm"
                value={course.date}
                onChange={(v) => setCourse({ ...course, date: v })}
              />
              <label className="text-ui-caption text-ui-muted">
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
              <label className="text-ui-caption text-ui-muted">
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
            <label className="flex min-h-10 items-center gap-2 text-xs text-ui-text">
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
              <Icon name="plus" className="h-4 w-4 shrink-0" />
              Formação
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
              <Icon name="file" className="h-4 w-4 shrink-0" />
              Currículo em PDF
            </button>
          </div>
        )}
        <p className="text-ui-caption text-ui-muted">
          Os créditos precisos para renovar escreve-os o treinador, porque as regras podem mudar. A app avisa 6 meses
          antes de o título caducar.
        </p>
      </div>
    </div>
  );
};

export default CoachCareerModal;
