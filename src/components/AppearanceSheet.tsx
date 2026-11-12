import React, { useState } from 'react';
import { AppState } from '../types';
import { applyCompact, loadCompact } from '../lib/clubBrand';
import { applySunMode, useSunMode } from '../lib/sunMode';
import { Sheet } from './ui/Sheet';
import { t } from '../i18n/dict';

/**
 * Mais → A minha conta → Aparência: the theme (with modo sol), the language and the compact mode. They were at the
 * end of Definições do Clube; they work exactly as before, only their place changed.
 */
export const AppearanceSheet: React.FC<{
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onClose: () => void;
}> = ({ state, onUpdateState, onClose }) => {
  const [compact, setCompact] = useState(loadCompact);
  const sunMode = useSunMode();
  const choice = (on: boolean) =>
    `ui-btn flex-1 px-2 py-2 text-ui-caption ${on ? 'ui-btn-primary' : 'ui-btn-secondary'}`;

  return (
    <Sheet title="Aparência" onClose={onClose} size="sm">
      <div className="space-y-5">
        <section role="group" aria-label="Tema" className="space-y-1.5">
          <h3 className="text-ui-caption font-bold text-ui-muted">Tema</h3>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={!sunMode && state.theme !== 'oceanonoturno'}
              className={choice(!sunMode && state.theme !== 'oceanonoturno')}
              onClick={() => {
                applySunMode(false);
                onUpdateState({ theme: 'original' });
              }}
            >
              {t(state.lang, 'set_theme_orig')}
            </button>
            <button type="button" aria-pressed={sunMode} className={choice(sunMode)} onClick={() => applySunMode(true)}>
              {t(state.lang, 'set_theme_sun')}
            </button>
            <button
              type="button"
              aria-pressed={!sunMode && state.theme === 'oceanonoturno'}
              className={choice(!sunMode && state.theme === 'oceanonoturno')}
              onClick={() => {
                applySunMode(false);
                onUpdateState({ theme: 'oceanonoturno' });
              }}
            >
              {t(state.lang, 'set_theme_ocean')}
            </button>
          </div>
          <p className="text-ui-caption text-ui-muted">O modo sol é mais claro, para ler ao sol no campo.</p>
        </section>

        <section role="group" aria-label="Idioma" className="space-y-1.5">
          <h3 className="text-ui-caption font-bold text-ui-muted">Idioma / Language</h3>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={state.lang !== 'en'}
              className={choice(state.lang !== 'en')}
              onClick={() => onUpdateState({ lang: 'pt' })}
            >
              Português
            </button>
            <button
              type="button"
              aria-pressed={state.lang === 'en'}
              className={choice(state.lang === 'en')}
              onClick={() => onUpdateState({ lang: 'en' })}
            >
              English
            </button>
          </div>
        </section>

        <label className="flex cursor-pointer items-start gap-3 rounded-ui-sm border border-ui-line p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={compact}
            onChange={(e) => {
              setCompact(e.target.checked);
              applyCompact(e.target.checked);
            }}
          />
          <span className="text-ui-caption text-ui-muted">
            <strong className="block text-ui-body text-ui-text">Modo compacto (só neste telemóvel)</strong>
            Listas mais apertadas e letra mais pequena, para ver mais coisas sem andar para baixo.
          </span>
        </label>
      </div>
    </Sheet>
  );
};
