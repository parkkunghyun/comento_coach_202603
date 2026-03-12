"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarEventAttendee {
  displayName?: string;
  email?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: "open" | "completed";
  description?: string;
  organizerName?: string;
  organizerEmail?: string;
  attendees?: CalendarEventAttendee[];
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 캘린더 셀에 표시할 짧은 제목 */
function shortEventTitle(title: string): string {
  const t = title.trim();
  const idx = t.indexOf("]");
  if (idx !== -1) return t.slice(0, idx + 1).trim();
  return t;
}

/** HTML 메모를 읽기 쉬운 텍스트로 변환 */
function htmlToPlainText(html: string): string {
  if (!html?.trim()) return "";
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/** "09:00", "17:00" → "AM 9:00~PM 5:00" */
function formatTimeRange(start: string, end: string): string {
  const toDisplay = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    if (h === 0) return `AM 12:${String(m).padStart(2, "0")}`;
    if (h < 12) return `AM ${h}:${String(m || 0).padStart(2, "0")}`;
    if (h === 12) return `PM 12:${String(m || 0).padStart(2, "0")}`;
    return `PM ${h - 12}:${String(m || 0).padStart(2, "0")}`;
  };
  return `${toDisplay(start)}~${toDisplay(end)}`;
}

/** "2025-03-11" → "3월 11일 (수요일)" */
function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const dayName = weekdays[date.getDay()];
  return `${m}월 ${d}일 (${dayName})`;
}

export function ScheduleCalendar({ events }: { events: CalendarEvent[] }) {
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedEvent = events.find((e) => e.id === selectedId);

  const { firstDay, daysInMonth, startOffset } = useMemo(() => {
    const d = new Date(current.year, current.month, 1);
    const firstDay = d.getDay();
    const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
    return { firstDay, daysInMonth, startOffset: firstDay };
  }, [current.year, current.month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const d = e.date.trim();
      if (!d) continue;
      const normalized = d.includes("T")
        ? d.slice(0, 10)
        : d.length >= 10
          ? d.slice(0, 10)
          : d;
      if (!map[normalized]) map[normalized] = [];
      map[normalized].push(e);
    }
    for (const k of Object.keys(map)) {
      map[k].sort(
        (a, b) =>
          a.startTime.localeCompare(b.startTime) ||
          a.title.localeCompare(b.title)
      );
    }
    return map;
  }, [events]);

  const prevMonth = () => {
    setCurrent((c) =>
      c.month === 0
        ? { year: c.year - 1, month: 11 }
        : { year: c.year, month: c.month - 1 }
    );
  };

  const nextMonth = () => {
    setCurrent((c) =>
      c.month === 11
        ? { year: c.year + 1, month: 0 }
        : { year: c.year, month: c.month + 1 }
    );
  };

  const monthLabel = `${current.year}년 ${current.month + 1}월`;

  const dayCells = useMemo(() => {
    const cells: { date: number | null; key: string; dateStr: string | null }[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, key: `empty-${i}`, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: d, key: dateStr, dateStr });
    }
    const total = cells.length;
    const remainder = total % 7;
    const pad = remainder === 0 ? 0 : 7 - remainder;
    for (let i = 0; i < pad; i++) {
      cells.push({ date: null, key: `pad-${i}`, dateStr: null });
    }
    return cells;
  }, [current.year, current.month, daysInMonth, startOffset]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 bg-[var(--background)]">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg p-2 hover:bg-[var(--border)]/50 transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-semibold text-[var(--foreground)]">{monthLabel}</h2>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg p-2 hover:bg-[var(--border)]/50 transition-colors"
          aria-label="다음 달"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-sm">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-b border-r border-[var(--border)] py-2 text-center font-medium text-[var(--muted)] last:border-r-0"
          >
            {day}
          </div>
        ))}
        {dayCells.map((cell) => {
          if (cell.date === null) {
            return (
              <div
                key={cell.key}
                className="min-h-[80px] sm:min-h-[100px] border-b border-r border-[var(--border)] bg-[var(--background)]/30 last:border-r-0"
              />
            );
          }
          const dayEvents: CalendarEvent[] =
            (cell.dateStr ? eventsByDate[cell.dateStr] : undefined) ?? [];
          return (
            <div
              key={cell.key}
              className="min-h-[80px] sm:min-h-[100px] border-b border-r border-[var(--border)] p-1.5 last:border-r-0 flex flex-col"
            >
              <span className="text-xs font-medium text-[var(--muted)] mb-1">
                {cell.date}
              </span>
              <div className="flex-1 overflow-y-auto space-y-1">
                {dayEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedId(ev.id === selectedId ? null : ev.id)}
                    className={`w-full text-left rounded px-1.5 py-1 text-xs truncate ${
                      ev.status === "completed"
                        ? "bg-[var(--border)]/50 text-[var(--muted)]"
                        : "bg-[var(--brand)]/10 text-[var(--brand)]"
                    } ${selectedId === ev.id ? "ring-2 ring-[var(--brand)] ring-inset" : ""}`}
                    title={`${ev.title} ${ev.startTime}~${ev.endTime}${ev.location ? ` · ${ev.location}` : ""}`}
                  >
                    <span className="font-medium truncate block">
                      {shortEventTitle(ev.title)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {selectedEvent && (
        <div className="border-t border-[var(--border)] p-4 bg-[var(--background)]/30">
          <h3 className="text-sm font-semibold text-[var(--muted)] mb-3">
            상세 보기
          </h3>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-[var(--foreground)]">
              {selectedEvent.title}
            </p>
            <p className="text-[var(--muted)]">
              {formatDateLabel(selectedEvent.date)} ⋅ {formatTimeRange(selectedEvent.startTime, selectedEvent.endTime)}
            </p>
            {(selectedEvent.organizerName || selectedEvent.organizerEmail) && (
              <p className="text-[var(--foreground)]">
                {selectedEvent.organizerName && <span>{selectedEvent.organizerName} </span>}
                {selectedEvent.organizerEmail && (
                  <a
                    href={`mailto:${selectedEvent.organizerEmail}`}
                    className="text-[var(--brand)] hover:underline"
                  >
                    {selectedEvent.organizerEmail}
                  </a>
                )}
              </p>
            )}
            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--muted)] mb-1">참석자</p>
                <ul className="text-[var(--foreground)] space-y-1">
                  {selectedEvent.attendees.map((a, i) => (
                    <li key={i}>
                      {a.displayName && <span>{a.displayName}</span>}
                      {a.displayName && a.email && " "}
                      {a.email && (
                        <a
                          href={`mailto:${a.email}`}
                          className="text-[var(--brand)] hover:underline text-xs"
                        >
                          {a.email}
                        </a>
                      )}
                      {!a.displayName && !a.email && "-"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedEvent.description && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-[var(--muted)] whitespace-pre-wrap">
                  {htmlToPlainText(selectedEvent.description)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
