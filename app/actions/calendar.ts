"use server";

import { updateCalendarEvent as updateEvent } from "@/lib/data";
import type { CalendarEventPatch } from "@/lib/calendar";

export async function updateCalendarEventAction(
  eventId: string,
  patch: CalendarEventPatch
): Promise<{ ok: boolean; error?: string }> {
  return updateEvent(eventId, patch);
}
