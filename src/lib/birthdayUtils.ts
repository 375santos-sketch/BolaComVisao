import { Player, StaffMember } from '../types';

export interface BirthdayPerson {
  id: string;
  name: string;
  type: 'jogador' | 'equipa_tecnica';
  roleOrPosition: string; // e.g. "Médio Centro (MC)" or "Treinador Principal"
  jerseyNumber?: number | null;
  photoUrl?: string;
  birthDate: string; // ISO / YYYY-MM-DD string
  birthDay: number;
  birthMonth: number; // 1-12
  birthYear: number;
  formattedBirthDate: string; // e.g. "25/08/2005"
  formattedDayMonth: string; // e.g. "25 de agosto"
  nextAge: number; // Age on their next birthday (or age turning today)
  currentAge: number;
  isToday: boolean;
  daysUntil: number; // 0 = today, 1 = tomorrow, etc.
  nextBirthdayDate: Date;
  phone?: string;
  email?: string;
  rawPlayer?: Player;
  rawStaff?: StaffMember;
}

const MONTH_NAMES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
];

/**
 * Parses a birthDate string (YYYY-MM-DD or YYYY/MM/DD) and builds a BirthdayPerson object.
 * Returns null if birthDate is invalid or empty.
 */
export function parseBirthday(
  person: {
    id: string;
    name: string;
    birthDate?: string | null;
    photoUrl?: string;
    phone?: string;
    email?: string;
  },
  type: 'jogador' | 'equipa_tecnica',
  roleOrPosition: string,
  jerseyNumber?: number | null,
  rawPlayer?: Player,
  rawStaff?: StaffMember,
  referenceDate: Date = new Date()
): BirthdayPerson | null {
  if (!person.birthDate || typeof person.birthDate !== 'string') {
    return null;
  }

  const cleanStr = person.birthDate.trim().replace(/\//g, '-');
  const parts = cleanStr.split('-');

  if (parts.length < 3) {
    return null;
  }

  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let day = parseInt(parts[2], 10);

  // Handle cases where format might be DD-MM-YYYY
  if (parts[0].length <= 2 && parts[2].length === 4) {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const todayYear = referenceDate.getFullYear();
  const todayMonth = referenceDate.getMonth(); // 0-indexed
  const todayDate = referenceDate.getDate(); // 1-31

  const birthMonthIndex = month - 1; // 0-indexed

  // Today start of day (midnight)
  const todayMidnight = new Date(todayYear, todayMonth, todayDate, 0, 0, 0, 0);

  // Check if today is birthday
  const isToday = todayMonth === birthMonthIndex && todayDate === day;

  // Determine next occurrence of birthday
  let safeDay = day;
  if (month === 2 && day === 29) {
    const isLeapThisYear = (todayYear % 4 === 0 && todayYear % 100 !== 0) || todayYear % 400 === 0;
    if (!isLeapThisYear) safeDay = 28;
  }

  const thisYearBday = new Date(todayYear, birthMonthIndex, safeDay, 0, 0, 0, 0);

  let nextBirthdayDate: Date;
  let nextAge: number;
  let nextBdayYear = todayYear;

  if (thisYearBday.getTime() >= todayMidnight.getTime()) {
    // Next birthday is still this year (or is today)
    nextBirthdayDate = thisYearBday;
    nextAge = nextBdayYear - year;
  } else {
    // Birthday has already passed this year, next one is next year
    nextBdayYear = todayYear + 1;
    let safeDayNext = day;
    if (month === 2 && day === 29) {
      const isLeapNextYear = (nextBdayYear % 4 === 0 && nextBdayYear % 100 !== 0) || nextBdayYear % 400 === 0;
      if (!isLeapNextYear) safeDayNext = 28;
    }
    nextBirthdayDate = new Date(nextBdayYear, birthMonthIndex, safeDayNext, 0, 0, 0, 0);
    nextAge = nextBdayYear - year;
  }

  // Calculate days until next birthday
  const diffMs = nextBirthdayDate.getTime() - todayMidnight.getTime();
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Calculate current age
  let currentAge = todayYear - year;
  if (todayMonth < birthMonthIndex || (todayMonth === birthMonthIndex && todayDate < day)) {
    currentAge -= 1;
  }

  const formattedDayMonth = `${day} de ${MONTH_NAMES_PT[birthMonthIndex] || ''}`;
  const padDay = day.toString().padStart(2, '0');
  const padMonth = month.toString().padStart(2, '0');
  const formattedBirthDate = `${padDay}/${padMonth}/${year}`;

  return {
    id: person.id,
    name: person.name,
    type,
    roleOrPosition: roleOrPosition || (type === 'jogador' ? 'Jogador' : 'Equipa Técnica'),
    jerseyNumber,
    photoUrl: person.photoUrl,
    birthDate: `${year}-${padMonth}-${padDay}`,
    birthDay: day,
    birthMonth: month,
    birthYear: year,
    formattedBirthDate,
    formattedDayMonth,
    nextAge: Math.max(0, nextAge),
    currentAge: Math.max(0, currentAge),
    isToday,
    daysUntil: Math.max(0, daysUntil),
    nextBirthdayDate,
    phone: person.phone,
    email: person.email,
    rawPlayer,
    rawStaff
  };
}

/**
 * Extracts and calculates birthdays for all players and staff members in the club state.
 * Returns a sorted list ordered by proximity of their next birthday.
 */
export function getAllBirthdays(
  roster: Player[] = [],
  staffMembers: StaffMember[] = [],
  referenceDate: Date = new Date()
): BirthdayPerson[] {
  const list: BirthdayPerson[] = [];

  // Parse Players - only active players currently in the squad
  const activeRoster = (roster || []).filter((p) => p && p.active !== false);
  activeRoster.forEach((player) => {
    if (!player.birthDate) return;
    const bday = parseBirthday(
      player,
      'jogador',
      player.positions || 'Jogador',
      player.number,
      player,
      undefined,
      referenceDate
    );
    if (bday) list.push(bday);
  });

  // Parse Staff Members
  staffMembers.forEach((staff) => {
    if (!staff.birthDate) return;
    const bday = parseBirthday(
      staff,
      'equipa_tecnica',
      staff.role || 'Equipa Técnica',
      undefined,
      undefined,
      staff,
      referenceDate
    );
    if (bday) list.push(bday);
  });

  // Sort ascending by daysUntil (0 for today, then 1, 2, ...)
  list.sort((a, b) => a.daysUntil - b.daysUntil);

  return list;
}

export type BirthdayTypeFilter = 'todos' | 'jogadores' | 'equipa_tecnica';
export type BirthdayPeriodFilter = 'hoje' | '7dias' | '30dias' | 'todos';

/**
 * Filters the birthday list according to the selected type and period
 */
export function filterBirthdays(
  list: BirthdayPerson[],
  typeFilter: BirthdayTypeFilter,
  periodFilter: BirthdayPeriodFilter
): BirthdayPerson[] {
  return list.filter((item) => {
    // Type filter
    if (typeFilter === 'jogadores' && item.type !== 'jogador') return false;
    if (typeFilter === 'equipa_tecnica' && item.type !== 'equipa_tecnica') return false;

    // Period filter
    if (periodFilter === 'hoje') {
      return item.isToday;
    }
    if (periodFilter === '7dias') {
      return item.daysUntil <= 7;
    }
    if (periodFilter === '30dias') {
      return item.daysUntil <= 30;
    }

    return true; // 'todos'
  });
}

/**
 * Generates a celebratory WhatsApp congratulation message
 */
export function getBirthdayGreetingMessage(person: BirthdayPerson, clubName?: string): string {
  const club = clubName || 'o nosso Clube';
  const roleLabel = person.type === 'jogador' ? 'atleta' : person.roleOrPosition;
  return `🎂🎉 *PARABÉNS, ${person.name.toUpperCase()}!*\n\nEm nome de toda a equipa e de ${club}, desejamos-te um fantástico dia de aniversário pelos teus *${person.nextAge} anos*!\n\nMuitas felicidades, saúde, sucesso desportivo e muitas conquistas connosco dentro e fora de campo! ⚽🏆✨`;
}
