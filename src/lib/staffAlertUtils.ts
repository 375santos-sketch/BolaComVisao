import { StaffChatMessage, StaffMeetingDetails, AppState, ClubEvent } from '../types';
import { uid } from './utils';

/**
 * Format a human-readable date string (DD/MM/YYYY)
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Format a simple and direct WhatsApp text for a staff message or scheduled meeting
 * Format:
 * Alerta BolaComVisao
 * Título: ...
 * Assunto: ...
 */
export function formatStaffAlertForWhatsApp(
  message: StaffChatMessage,
  _state?: AppState,
  _targetStaffName?: string
): string {
  const isMeeting = message.type === 'reuniao' || Boolean(message.meetingDetails);
  const defaultTitle = isMeeting
    ? 'Reunião da Equipa Técnica'
    : message.type === 'urgente' || message.priority === 'urgente'
    ? 'Alerta Urgente da Equipa Técnica'
    : 'Recado da Equipa Técnica';

  const title = message.title && message.title.trim() ? message.title.trim() : defaultTitle;

  const assuntoParts: string[] = [];

  if (message.content && message.content.trim()) {
    assuntoParts.push(message.content.trim());
  }

  if (isMeeting && message.meetingDetails) {
    const meet = message.meetingDetails;
    const meetInfo: string[] = [];
    if (meet.date) meetInfo.push(`Data: ${formatDisplayDate(meet.date)}`);
    if (meet.time) meetInfo.push(`Hora: ${meet.time}${meet.endTime ? ' às ' + meet.endTime : ''}`);
    if (meet.location) meetInfo.push(`Local: ${meet.location}`);
    if (meet.agenda && meet.agenda.trim()) meetInfo.push(`Ordem de Trabalhos: ${meet.agenda.trim()}`);

    if (meetInfo.length > 0) {
      assuntoParts.push(meetInfo.join('\n'));
    }
  }

  const assunto = assuntoParts.length > 0 ? assuntoParts.join('\n\n') : 'Sem descrição adicional.';

  const lines: string[] = [
    'Alerta BolaComVisao',
    `Título: ${title}`,
    `Assunto:\n${assunto}`
  ];

  return lines.join('\n');
}

/**
 * Open WhatsApp with a pre-filled alert message
 */
export function openWhatsAppAlert(
  message: StaffChatMessage,
  state: AppState,
  phoneNumber?: string
): void {
  const formattedText = formatStaffAlertForWhatsApp(message, state);
  const encodedText = encodeURIComponent(formattedText);

  if (phoneNumber && phoneNumber.trim()) {
    let cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
        cleanPhone = '351' + cleanPhone;
      }
    } else {
      cleanPhone = cleanPhone.replace('+', '');
    }
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
  } else {
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  }
}

/**
 * Trigger native mobile sharing dialog (iOS / Android Web Share API)
 */
export async function shareNativeMobileAlert(
  message: StaffChatMessage,
  state: AppState
): Promise<boolean> {
  const formattedText = formatStaffAlertForWhatsApp(message, state);
  const title = message.title || (message.type === 'reuniao' ? 'Reunião Equipa Técnica' : 'Recado Equipa Técnica');

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text: formattedText
      });
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share failed:', err);
      }
      return false;
    }
  }
  return false;
}

/**
 * Open native SMS application on mobile phone
 */
export function openSmsAlert(message: StaffChatMessage, state: AppState, phoneNumber?: string): void {
  const formattedText = formatStaffAlertForWhatsApp(message, state);
  const encodedText = encodeURIComponent(formattedText);
  const cleanPhone = (phoneNumber || '').replace(/[^0-9+]/g, '');
  window.location.href = `sms:${cleanPhone}?body=${encodedText}`;
}

/**
 * Dispatch a Browser/PWA Web Push Notification to mobile or desktop
 */
export async function sendStaffPushNotification(
  message: StaffChatMessage,
  state: AppState
): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const title =
          message.type === 'reuniao'
            ? `📅 Reunião Marcada: ${message.title || 'Equipa Técnica'}`
            : message.priority === 'urgente'
            ? `🚨 Alerta Urgente: ${message.title || 'Equipa Técnica'}`
            : `💬 Recado: ${message.senderName} (${message.senderRole})`;

        const body = message.content ? message.content.slice(0, 140) : (message.meetingDetails?.location || '');

        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `staff-msg-${message.id}`
        });
        return true;
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          return sendStaffPushNotification(message, state);
        }
      }
    }
  } catch (e) {
    console.warn('Browser push notification error:', e);
  }
  return false;
}

/**
 * Generate a Google Calendar Add-Event Web URL
 */
export function getGoogleCalendarUrl(meeting: StaffMeetingDetails, state: AppState): string {
  const clubName = state.myClubName || 'BolaComVisão';
  const title = encodeURIComponent(`[${clubName}] Reunião Equipa Técnica: ${meeting.title}`);
  const details = encodeURIComponent(
    `Ordem de Trabalhos:\n${meeting.agenda || 'Sem agenda definida'}\n\nLocal: ${meeting.location || 'Gabinete Técnico'}`
  );
  const location = encodeURIComponent(meeting.location || 'Gabinete Técnico');

  // Format date: YYYYMMDDTHHMMSSZ
  const dateClean = meeting.date.replace(/-/g, '');
  const timeStart = (meeting.time || '19:00').replace(':', '') + '00';
  const timeEnd = (meeting.endTime || '20:30').replace(':', '') + '00';

  const dates = `${dateClean}T${timeStart}/${dateClean}T${timeEnd}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

/**
 * Generate and download an .ics iCalendar file for Apple Calendar, Outlook or Android
 */
export function downloadMeetingIcs(meeting: StaffMeetingDetails, state: AppState): void {
  const clubName = state.myClubName || 'BolaComVisão';
  const dateClean = meeting.date.replace(/-/g, '');
  const timeStart = (meeting.time || '19:00').replace(':', '') + '00';
  const timeEnd = (meeting.endTime || '20:30').replace(':', '') + '00';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BolaComVisão//Equipa Técnica//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:[${clubName}] ${meeting.title || 'Reunião da Equipa Técnica'}`,
    `DESCRIPTION:${(meeting.agenda || 'Reunião técnica').replace(/\n/g, '\\n')}`,
    `LOCATION:${meeting.location || 'Gabinete Técnico'}`,
    `DTSTART:${dateClean}T${timeStart}`,
    `DTEND:${dateClean}T${timeEnd}`,
    `UID:meeting-${uid()}@bolacomvisao.app`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Reuniao_Equipa_Tecnica_${meeting.date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Automatically sync a scheduled staff meeting into Club Events (`state.clubEvents`)
 */
export function syncStaffMeetingToClubEvents(
  meeting: StaffMeetingDetails,
  state: AppState,
  onUpdateState: (updates: Partial<AppState>) => void
): string {
  const existingEvents = state.clubEvents || [];
  const eventId = meeting.clubEventId || `event_meeting_${uid()}`;

  const clubEvent: ClubEvent = {
    id: eventId,
    type: 'reuniao',
    title: meeting.title || 'Reunião da Equipa Técnica',
    date: meeting.date,
    time: meeting.time,
    location: meeting.location || 'Gabinete Técnico',
    attendees: 'Equipa Técnica',
    notes: meeting.agenda,
    isCompleted: false,
    createdAt: new Date().toISOString()
  };

  const updatedEvents = existingEvents.some((e) => e.id === eventId)
    ? existingEvents.map((e) => (e.id === eventId ? clubEvent : e))
    : [...existingEvents, clubEvent];

  onUpdateState({ clubEvents: updatedEvents });
  return eventId;
}
