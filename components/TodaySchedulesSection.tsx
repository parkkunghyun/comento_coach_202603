"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CalendarSchedule } from "@/lib/calendar";

export function TodaySchedulesSection({
  schedules,
}: {
  schedules: CalendarSchedule[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-card overflow-hidden">
      <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 font-semibold text-[var(--foreground)] hover:opacity-80"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="h-5 w-5 text-[var(--muted)]" />
          ) : (
            <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
          )}
          오늘 교육 일정
        </button>
        <Link
          href="/em/schedules"
          className="text-sm text-[var(--brand)] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          전체 보기
        </Link>
      </div>
      {open && (
        <ul className="divide-y divide-[var(--border)]">
          {schedules.length === 0 ? (
            <li className="px-6 py-8 text-center text-sm text-[var(--muted)]">
              오늘 예정된 교육이 없습니다.
            </li>
          ) : (
            schedules.map((s) => (
              <li key={s.id}>
                <Link
                  href="/em/schedules"
                  className="flex items-center justify-between px-6 py-4 hover:bg-[var(--background)] transition-colors"
                >
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {s.title}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {s.date} {s.startTime} ~ {s.endTime} · {s.location}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.status === "open"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {s.status === "open" ? "예정" : "완료"}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
