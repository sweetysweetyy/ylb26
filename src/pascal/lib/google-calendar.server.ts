import { getAccessTokenForUser } from "./google-oauth.server";

const CAL = "https://www.googleapis.com/calendar/v3";

export async function listFreeSlots(userId: string, opts: {
  calendarId?: string;
  timezone: string;
  workStart: string; // "09:00"
  workEnd: string;   // "18:00"
  durationMin: number;
  daysAhead?: number;
  maxSlots?: number;
}): Promise<Array<{ startIso: string; endIso: string; display: string }>> {
  const { accessToken } = await getAccessTokenForUser(userId);
  const calendarId = opts.calendarId ?? "primary";
  const daysAhead = opts.daysAhead ?? 10;
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + daysAhead * 24 * 3600 * 1000).toISOString();

  const r = await fetch(`${CAL}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin, timeMax, timeZone: opts.timezone, items: [{ id: calendarId }] }),
  });
  if (!r.ok) throw new Error(`Calendar freeBusy failed: ${r.status} ${await r.text()}`);
  const j = await r.json() as { calendars: Record<string, { busy: Array<{ start: string; end: string }> }> };
  const busy = j.calendars[calendarId]?.busy ?? [];

  const [sh, sm] = opts.workStart.split(":").map(Number);
  const [eh, em] = opts.workEnd.split(":").map(Number);
  const dur = opts.durationMin * 60 * 1000;
  const slots: Array<{ startIso: string; endIso: string; display: string }> = [];

  for (let d = 0; d < daysAhead && slots.length < (opts.maxSlots ?? 5); d++) {
    const day = new Date(now.getTime() + d * 24 * 3600 * 1000);
    if (day.getDay() === 0 || day.getDay() === 6) continue; // skip weekends
    const dayStart = new Date(day); dayStart.setHours(sh, sm, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(eh, em, 0, 0);
    let t = Math.max(dayStart.getTime(), now.getTime() + 3600 * 1000);
    // round up to :00 or :30
    const mins = new Date(t).getMinutes();
    const bump = mins < 30 ? 30 - mins : 60 - mins;
    t += bump * 60 * 1000;

    while (t + dur <= dayEnd.getTime() && slots.length < (opts.maxSlots ?? 5)) {
      const slotStart = t, slotEnd = t + dur;
      const overlaps = busy.some((b) => {
        const bs = new Date(b.start).getTime(), be = new Date(b.end).getTime();
        return slotStart < be && slotEnd > bs;
      });
      if (!overlaps) {
        const s = new Date(slotStart);
        slots.push({
          startIso: s.toISOString(),
          endIso: new Date(slotEnd).toISOString(),
          display: s.toLocaleString("fr-FR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: opts.timezone }),
        });
      }
      t += 30 * 60 * 1000;
    }
  }
  return slots;
}

export async function createCalendarEvent(userId: string, opts: {
  calendarId?: string;
  timezone: string;
  startIso: string;
  endIso: string;
  summary: string;
  description?: string;
  attendeeEmail: string;
  attendeeName?: string;
}) {
  const { accessToken } = await getAccessTokenForUser(userId);
  const calendarId = opts.calendarId ?? "primary";
  const body = {
    summary: opts.summary,
    description: opts.description ?? "",
    start: { dateTime: opts.startIso, timeZone: opts.timezone },
    end: { dateTime: opts.endIso, timeZone: opts.timezone },
    attendees: [{ email: opts.attendeeEmail, displayName: opts.attendeeName }],
    reminders: { useDefault: true },
  };
  const r = await fetch(`${CAL}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Calendar create failed: ${r.status} ${await r.text()}`);
  return r.json() as Promise<{ id: string; htmlLink: string }>;
}