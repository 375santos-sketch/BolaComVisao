import {
  MatchType,
  MatchLocation,
  ClubEventType,
  ScheduledMatch,
  Match,
  Training,
  StaffUnavailability,
  ClubEvent
} from '../../../types';

export type CalendarViewMode = 'dia' | 'semana' | 'mes' | 'anual' | 'lista';
export type EventFilterType = 'all' | 'matches' | 'trainings' | 'unavailability' | 'events';

export interface TournamentGameForm {
  id: string;
  phase: string;
  opp: string;
  date: string;
  time: string;
}

export interface MatchFormData {
  isBatch: boolean;
  opp: string;
  date: string;
  time: string;
  type: MatchType;
  loc: MatchLocation;
  phase: string;
  tournamentName: string;
  venue: string;
  meetingTime: string;
  games: TournamentGameForm[];
}

export interface TrainingFormData {
  date: string;
  time: string;
  location: string;
  type: string;
  notes: string;
  completed: boolean;
  durationMinutes: number;
}

export interface StaffFormData {
  name: string;
  date: string;
  endDate: string;
  reason: string;
}

export interface ClubEventFormData {
  title: string;
  date: string;
  endDate: string;
  time: string;
  endTime: string;
  type: ClubEventType;
  location: string;
  attendees: string;
  notes: string;
  isCompleted: boolean;
}

export interface ScheduleStats {
  matchesCount: number;
  trainingsCount: number;
  clubEventsCount: number;
  staffCount: number;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  title: string;
  category: 'match' | 'training' | 'staff_unavailability' | 'club_event';
  isCompleted?: boolean;
  location?: string;
  matchType?: MatchType;
  tournamentName?: string;
  phase?: string;
  trainingType?: string;
  notes?: string;
  staffName?: string;
  endDate?: string;
  clubEventType?: ClubEventType;
  endTime?: string;
  attendees?: string;
  rawScheduledMatch?: ScheduledMatch;
  rawFinishedMatch?: Match;
  rawTraining?: Training;
  rawStaffUnavailability?: StaffUnavailability;
  rawClubEvent?: ClubEvent;
  callupCount?: number;
  presencesCount?: number;
  absencesCount?: number;
}
