export interface UnifiedEvent {
  id: string;
  kind: 'jogo' | 'treino' | 'club_event';
  title: string;
  opponent?: string;
  date: string;
  time: string;
  venue?: string;
  location?: string;
  tournamentName?: string;
  meetingTime?: string;
  theme?: string;
  durationMinutes?: number;
  attendees?: string;
  clubEventType?: 'reuniao' | 'formacao' | 'estagio' | 'outro';
  notes?: string;
  rawDate: Date;
  isToday: boolean;
  isTomorrow: boolean;
  daysUntil: number;
}
