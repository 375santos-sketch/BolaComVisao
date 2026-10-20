import { useState, useMemo } from 'react';
import { AppState, Player } from '../../../../types';
import { CalendarViewMode, EventFilterType, CalendarEvent } from '../types';
import { computeUnifiedEvents, filterEvents, WEEKDAY_SHORT_PT } from '../services/scheduleService';
import { sortPlayerObjs } from '../../../../lib/utils';

export function useScheduleEvents(state: AppState) {
  // Navigation & View Filters
  const [viewMode, setViewMode] = useState<CalendarViewMode>('mes');
  const [eventTypeFilter, setEventTypeFilter] = useState<EventFilterType>('all');

  // Date State
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr); // YYYY-MM-DD
  const [activeYear, setActiveYear] = useState<number>(() => new Date().getFullYear());
  const [activeMonth, setActiveMonth] = useState<number>(() => new Date().getMonth()); // 0 - 11

  // Expanded items / drawers
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const eligiblePlayers: Player[] = useMemo(
    () => sortPlayerObjs((state.roster || []).filter((p) => p.active !== false)),
    [state.roster]
  );

  // Unified Events Computation
  const allEvents: CalendarEvent[] = useMemo(() => {
    return computeUnifiedEvents(state, todayStr, eligiblePlayers);
  }, [
    state.schedule,
    state.matches,
    state.trainings,
    state.staffUnavailability,
    state.clubEvents,
    eligiblePlayers,
    todayStr
  ]);

  // Filtered Events by Type
  const filteredEvents = useMemo(() => {
    return filterEvents(allEvents, eventTypeFilter);
  }, [allEvents, eventTypeFilter]);

  // Map of events grouped by date ("YYYY-MM-DD" -> CalendarEvent[])
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((ev) => {
      const arr = map.get(ev.date) || [];
      arr.push(ev);
      map.set(ev.date, arr);
    });
    return map;
  }, [filteredEvents]);

  // Month View Matrix
  const monthMatrix = useMemo(() => {
    const firstDay = new Date(activeYear, activeMonth, 1);
    const lastDay = new Date(activeYear, activeMonth + 1, 0);
    const totalDays = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [activeYear, activeMonth]);

  // Week View Days
  const weekDays = useMemo(() => {
    const cur = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = (cur.getDay() + 6) % 7;
    const monday = new Date(cur);
    monday.setDate(cur.getDate() - dayOfWeek);

    const days: { dateStr: string; dayName: string; dayNum: number; isToday: boolean; isSelected: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const str = d.toISOString().slice(0, 10);
      days.push({
        dateStr: str,
        dayName: WEEKDAY_SHORT_PT[i],
        dayNum: d.getDate(),
        isToday: str === todayStr,
        isSelected: str === selectedDate
      });
    }
    return days;
  }, [selectedDate, todayStr]);

  const handlePrevMonth = () => {
    if (activeMonth === 0) {
      setActiveMonth(11);
      setActiveYear((prev) => prev - 1);
    } else {
      setActiveMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonth === 11) {
      setActiveMonth(0);
      setActiveYear((prev) => prev + 1);
    } else {
      setActiveMonth((prev) => prev + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setActiveYear(now.getFullYear());
    setActiveMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  return {
    viewMode,
    setViewMode,
    eventTypeFilter,
    setEventTypeFilter,
    todayStr,
    selectedDate,
    setSelectedDate,
    activeYear,
    setActiveYear,
    activeMonth,
    setActiveMonth,
    expandedEventId,
    setExpandedEventId,
    eligiblePlayers,
    allEvents,
    filteredEvents,
    eventsByDate,
    monthMatrix,
    weekDays,
    handlePrevMonth,
    handleNextMonth,
    handleToday
  };
}
