import React, { useState } from 'react';
import { AppState } from '../types';
import { teamSettings, withTeamSettings } from '../lib/teamSettings';
import { CLUB_COLOR_PRESETS, isHexColor } from '../lib/clubColors';

interface ClubSettingsSectionProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast?: (msg: string) => void;
}

const TRAINING_WEEKDAYS: [string, string][] = [
  ['1', 'Segunda'],
  ['2', 'Terça'],
  ['3', 'Quarta'],
  ['4', 'Quinta'],
  ['5', 'Sexta'],
  ['6', 'Sábado'],
  ['0', 'Domingo']
];

/** Definições → Clube: the club's colour, its town (weather forecast) and how many yellow cards make a suspension. */
export const ClubSettingsSection: React.FC<ClubSettingsSectionProps> = ({ state, onUpdateState, onShowToast }) => {
  const settings = teamSettings(state);
  const [town, setTown] = useState(settings.clubTown);

  const save = (changes: Parameters<typeof withTeamSettings>[1]) => {
    const teams = withTeamSettings(state, changes);
    if (!teams) {
      onShowToast?.('Escolha primeiro uma equipa.');
      return;
    }
    onUpdateState({ teams });
  };

  return (
    <section aria-label="Definições do clube" className="ui-inset p-3 mt-4 space-y-3 text-left">
      <div className="text-sm font-bold text-white">🎨 Clube</div>

      <div>
        <div className="text-[11px] text-slate-400 mb-1.5">Cor principal da app</div>
        <div role="group" aria-label="Cor do clube" className="flex flex-wrap gap-2 items-center">
          {CLUB_COLOR_PRESETS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={settings.clubColor.toLowerCase() === c.hex}
              onClick={() => save({ clubColor: c.hex })}
              className={`w-8 h-8 rounded-full border-2 ${settings.clubColor.toLowerCase() === c.hex ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ background: c.hex }}
            />
          ))}
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
            Outra:
            <input
              type="color"
              aria-label="Outra cor"
              value={isHexColor(settings.clubColor) ? settings.clubColor : '#22c3ee'}
              onChange={(e) => save({ clubColor: e.target.value })}
              className="w-9 h-8 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
            />
          </label>
        </div>
      </div>

      <label className="block text-[11px] text-slate-400">
        Localidade do clube (para a previsão do tempo dos treinos e jogos em casa)
        <input
          className="ui-input mt-1 text-xs"
          value={town}
          placeholder="Ex: Abrantes"
          onChange={(e) => setTown(e.target.value)}
          onBlur={() => town.trim() !== settings.clubTown && save({ clubTown: town.trim() })}
        />
      </label>

      <label className="block text-[11px] text-slate-400">
        Amarelos para um jogo de castigo
        <select
          className="ui-input mt-1 text-xs"
          value={settings.yellowsForBan}
          onChange={(e) => save({ yellowsForBan: Number(e.target.value) })}
        >
          {[3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n} amarelos
            </option>
          ))}
        </select>
      </label>

      <div role="group" aria-label="Horário dos treinos">
        <div className="text-[11px] text-slate-400 mb-1.5">
          Treinos: os dias e a hora de início (os treinos novos já vêm assim)
        </div>
        <div className="space-y-1">
          {TRAINING_WEEKDAYS.map(([day, name]) => {
            const time = settings.trainingTimes[day];
            return (
              <div key={day} className="flex items-center gap-2 text-xs">
                <label className="flex w-28 items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={Boolean(time)}
                    onChange={(e) => {
                      const next = { ...settings.trainingTimes };
                      if (e.target.checked) next[day] = '18:15';
                      else delete next[day];
                      save({ trainingTimes: next });
                    }}
                  />
                  {name}
                </label>
                {time && (
                  <input
                    type="time"
                    aria-label={`Hora do treino de ${name.toLowerCase()}`}
                    className="ui-input py-1 text-xs w-36"
                    value={time}
                    onChange={(e) =>
                      e.target.value && save({ trainingTimes: { ...settings.trainingTimes, [day]: e.target.value } })
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <label className="block text-[11px] text-slate-400">
        Duração dos treinos
        <select
          className="ui-input mt-1 text-xs"
          value={settings.trainingMinutes}
          onChange={(e) => save({ trainingMinutes: Number(e.target.value) })}
        >
          {[45, 60, 75, 90, 105, 120].map((n) => (
            <option key={n} value={n}>
              {n} min
            </option>
          ))}
        </select>
      </label>
    </section>
  );
};
