import React, { useState } from 'react';
import { AppState } from '../types';
import { teamSettings, withTeamSettings } from '../lib/teamSettings';
import { CLUB_COLOR_PRESETS, isHexColor } from '../lib/clubColors';
import { DateTimePT } from './ui/DateTimePT';

interface ClubSettingsSectionProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast?: (msg: string) => void;
  /** Which part of Definições do clube: the colour, the games (yellow cards) or the trainings. */
  part: 'clube' | 'jogos' | 'treinos';
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

/**
 * Definições do clube: the settings kept per team (colour, town for the weather, yellow cards for a suspension, the
 * training days, times and length). Each tab of the window shows its own `part`; what is saved is the same as before.
 */
export const ClubSettingsSection: React.FC<ClubSettingsSectionProps> = ({
  state,
  onUpdateState,
  onShowToast,
  part
}) => {
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

  if (part === 'clube') {
    return (
      <div className="space-y-1.5">
        <div className="text-ui-caption font-bold text-ui-muted">Cor principal da app</div>
        <div role="group" aria-label="Cor do clube" className="flex flex-wrap items-center gap-2">
          {CLUB_COLOR_PRESETS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={settings.clubColor.toLowerCase() === c.hex}
              onClick={() => save({ clubColor: c.hex })}
              className={`h-8 w-8 rounded-full border-2 ${
                settings.clubColor.toLowerCase() === c.hex ? 'scale-110 border-ui-text' : 'border-transparent'
              }`}
              style={{ background: c.hex }}
            />
          ))}
          <label className="flex items-center gap-1.5 text-ui-caption text-ui-muted">
            Outra:
            <input
              type="color"
              aria-label="Outra cor"
              value={isHexColor(settings.clubColor) ? settings.clubColor : '#22c3ee'}
              onChange={(e) => save({ clubColor: e.target.value })}
              className="h-8 w-9 cursor-pointer rounded-ui-sm border border-ui-line bg-transparent"
            />
          </label>
        </div>
      </div>
    );
  }

  if (part === 'jogos') {
    return (
      <label className="block text-ui-caption font-bold text-ui-muted">
        Amarelos para um jogo de castigo
        <select
          className="ui-input mt-1"
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
    );
  }

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Horário dos treinos">
        <div className="mb-1.5 text-ui-caption font-bold text-ui-muted">
          Dias e hora de início (os treinos novos já vêm assim)
        </div>
        <div className="space-y-1">
          {TRAINING_WEEKDAYS.map(([day, name]) => {
            const time = settings.trainingTimes[day];
            return (
              <div key={day} className="flex min-h-[38px] items-center gap-2 text-ui-body">
                <label className={`flex w-28 items-center gap-2 ${time ? 'font-bold text-ui-text' : 'text-ui-muted'}`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
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
                  <DateTimePT
                    type="time"
                    label={`Hora do treino de ${name.toLowerCase()}`}
                    className="w-28"
                    inputClassName="ui-input w-full py-1"
                    value={time}
                    onChange={(v) => v && save({ trainingTimes: { ...settings.trainingTimes, [day]: v } })}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <label className="block text-ui-caption font-bold text-ui-muted">
        Duração dos treinos
        <select
          className="ui-input mt-1"
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

      <label className="block text-ui-caption font-bold text-ui-muted">
        Localidade do clube (para a previsão do tempo dos treinos e jogos em casa)
        <input
          className="ui-input mt-1"
          value={town}
          placeholder="Ex.: Abrantes"
          onChange={(e) => setTown(e.target.value)}
          onBlur={() => town.trim() !== settings.clubTown && save({ clubTown: town.trim() })}
        />
      </label>
    </div>
  );
};
