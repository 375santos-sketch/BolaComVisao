import React from 'react';
import { BirthdayPerson, getBirthdayGreetingMessage } from '../../lib/birthdayUtils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface DashboardBirthdaysProps {
  todayBirthdays: BirthdayPerson[];
  upcomingBirthdays: BirthdayPerson[];
  myClubName: string;
}

export const DashboardBirthdays: React.FC<DashboardBirthdaysProps> = ({
  todayBirthdays,
  upcomingBirthdays,
  myClubName
}) => {
  if (todayBirthdays.length === 0 && upcomingBirthdays.length === 0) {
    return null;
  }

  const handleShareBirthdayWhatsApp = (person: BirthdayPerson) => {
    const msg = getBirthdayGreetingMessage(person, myClubName);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Today Birthdays - Highlighted Card */}
      {todayBirthdays.map((person) => (
        <div
          key={`bday-today-${person.id}`}
          className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              🎂
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="amber" size="sm" className="font-mono uppercase font-black tracking-wider text-[10px]">
                  Hoje é dia de festa! 🎉
                </Badge>
                <span className="text-xs text-amber-300/80 font-mono">
                  {person.type === 'jogador'
                    ? `Atleta ${person.jerseyNumber ? `#${person.jerseyNumber}` : ''}`
                    : person.roleOrPosition}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                {person.name}{' '}
                <span className="text-amber-400 font-mono text-sm font-semibold">({person.nextAge} Anos)</span>
              </h3>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShareBirthdayWhatsApp(person)}
            className="self-stretch sm:self-auto bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-mono text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <span>💬</span> Felicitar no WhatsApp
          </Button>
        </div>
      ))}

      {/* Upcoming Birthdays Strip */}
      {todayBirthdays.length === 0 && upcomingBirthdays.length > 0 && (
        <Card className="bg-slate-900/60 border-slate-800 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">🎈</span>
            <div className="text-xs">
              <span className="text-slate-400">Próximos aniversários: </span>
              {upcomingBirthdays.map((b, i) => (
                <span key={b.id} className="text-slate-200 font-medium">
                  {b.name} ({b.formattedDayMonth}){i < upcomingBirthdays.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
