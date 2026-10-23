import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CalendarEvent } from '../lib/calendarFeed';
import { toPlainData } from '../lib/recordSync';

/**
 * Publishes the parents' calendar (games and trainings only) to public_calendars/{token}; the app's server turns it
 * into the .ics feed at /cal/{token}.ics. Rules: readable by its exact id, written only by the club's coaches.
 */
export async function publishCalendar(
  token: string,
  data: { clubId: string; teamId: string; teamName: string; events: CalendarEvent[] }
): Promise<void> {
  await setDoc(doc(db, 'public_calendars', token), toPlainData({ ...data, updatedAt: Date.now() }));
}

/** Switches the link off: phones subscribed to it stop receiving the games and trainings. */
export async function unpublishCalendar(token: string): Promise<void> {
  await deleteDoc(doc(db, 'public_calendars', token));
}

/** Link to share (https), and the webcal:// form phones open as a subscription. */
export function calendarLinks(token: string, origin = window.location.origin) {
  const https = `${origin}/cal/${token}.ics`;
  const webcal = https.replace(/^https?:\/\//, 'webcal://');
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`
  };
}
