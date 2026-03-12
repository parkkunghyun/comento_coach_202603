"use client";

import { useState, useMemo } from "react";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import type { CalendarSchedule } from "@/lib/calendar";

export interface CoachOption {
  email: string;
  name: string;
}

export function SchedulesWithCoachFilter({
  events,
  coaches,
}: {
  events: CalendarSchedule[];
  coaches: CoachOption[];
}) {
  const [selectedEmail, setSelectedEmail] = useState<string>("");

  const filteredEvents = useMemo(() => {
    if (!selectedEmail.trim()) return events;
    const emailLower = selectedEmail.trim().toLowerCase();
    return events.filter((ev) =>
      (ev.attendees ?? []).some(
        (a) => (a.email ?? "").trim().toLowerCase() === emailLower
      )
    );
  }, [events, selectedEmail]);

  const coachOptions = useMemo(() => {
    const seen = new Set<string>();
    return coaches.filter((c) => {
      const e = (c.email ?? "").trim().toLowerCase();
      if (!e || seen.has(e)) return false;
      seen.add(e);
      return true;
    });
  }, [coaches]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="coach-filter" className="text-sm font-medium text-[var(--foreground)]">
          실습코치 필터
        </label>
        <select
          id="coach-filter"
          value={selectedEmail}
          onChange={(e) => setSelectedEmail(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        >
          <option value="">전체 일정</option>
          {coachOptions.map((c) => (
            <option key={c.email} value={c.email}>
              {c.name || c.email}
            </option>
          ))}
        </select>
        {selectedEmail && (
          <span className="text-sm text-[var(--muted)]">
            해당 코치 참석 일정 {filteredEvents.length}건
          </span>
        )}
      </div>
      <ScheduleCalendar events={filteredEvents} />
    </div>
  );
}
