"use client";

import { useState, useCallback } from "react";
import { runAutoAssignAction } from "@/app/actions/assignments";
import type { AssignResultItem } from "@/lib/auto-assign";
import type { CalendarSchedule } from "@/lib/calendar";
import type { CoachLevelRow } from "@/types";
import type { Assignment } from "@/types";
import { Calendar, List, Copy, User, ChevronDown } from "lucide-react";

const VIEW_LIST = "list";
const VIEW_CALENDAR = "calendar";

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const day = new Date(y, m - 1, d).getDay();
  return `${m}/${d} (${weekdays[day]})`;
}

function assignmentToCopyText(item: AssignResultItem): string {
  return [
    `[교육] ${item.scheduleTitle}`,
    `날짜: ${item.date} ${item.startTime} ~ ${item.endTime}`,
    `장소: ${item.location || "-"}`,
    `실습코치: ${item.coachName} (${item.coachId})`,
    item.assignReasons?.length ? `\n[배정 사유]\n${item.assignReasons.join("\n")}` : "",
  ].join("\n");
}

export function AssignmentsClient({
  calendarSchedules,
  levelStatus,
  assignments,
}: {
  calendarSchedules: CalendarSchedule[];
  levelStatus: CoachLevelRow[];
  assignments: Assignment[];
}) {
  const now = new Date();
  const [yearMonth, setYearMonth] = useState(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [draft, setDraft] = useState<{
    assignments: AssignResultItem[];
    skipped: { scheduleId: string; title: string; date: string; reason: string }[];
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editCoach, setEditCoach] = useState<Record<string, { coachId: string; coachName: string }>>({});
  const [selectedCalendarScheduleId, setSelectedCalendarScheduleId] = useState<string | null>(null);

  const prefix = yearMonth.length === 7 ? yearMonth : `${yearMonth}-`;
  const monthEvents = calendarSchedules.filter((e) => e.date.startsWith(prefix));
  const savedForMonth = assignments.filter((a) =>
    monthEvents.some((e) => e.id === a.scheduleId)
  );

  const displayItems: AssignResultItem[] = draft
    ? draft.assignments.map((a) => {
        const over = editCoach[a.scheduleId];
        return over ? { ...a, coachId: over.coachId, coachName: over.coachName } : a;
      })
    : savedForMonth.map((a) => {
        const ev = monthEvents.find((e) => e.id === a.scheduleId);
        return {
          scheduleId: a.scheduleId,
          scheduleTitle: ev?.title ?? a.scheduleId,
          date: ev?.date ?? "",
          startTime: ev?.startTime ?? "",
          endTime: ev?.endTime ?? "",
          location: ev?.location ?? "",
          coachId: a.coachId,
          coachName: a.coachName ?? a.coachId,
          assignReasons: [],
        };
      });

  const skipped = draft?.skipped ?? [];
  const activeCoaches = levelStatus.filter(
    (c) => String(c.status).trim().toUpperCase() === "ACTIVE" && (c.email ?? "").trim()
  );

  const handleRunAutoAssign = useCallback(async () => {
    setRunning(true);
    try {
      const res = await runAutoAssignAction(yearMonth);
      if (res.ok) {
        setDraft({ assignments: res.assignments, skipped: res.skipped });
        setEditCoach({});
      } else {
        alert(res.error ?? "자동 배정 실행에 실패했습니다.");
      }
    } finally {
      setRunning(false);
    }
  }, [yearMonth]);

  const handleCopy = useCallback((item: AssignResultItem) => {
    const text = assignmentToCopyText(item);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(item.scheduleId);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  const handleReassign = useCallback((scheduleId: string, coachId: string, coachName: string) => {
    setEditCoach((prev) => ({ ...prev, [scheduleId]: { coachId, coachName } }));
  }, []);

  const byDate = displayItems.reduce<Record<string, AssignResultItem[]>>((acc, a) => {
    const d = a.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {});

  const monthOpts: string[] = [];
  for (let i = -2; i <= 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthOpts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-medium text-[var(--foreground)]">월 선택</label>
        <select
          value={yearMonth}
          onChange={(e) => {
            setYearMonth(e.target.value);
            setDraft(null);
            setEditCoach({});
          }}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        >
          {monthOpts.map((m) => {
            const [y, mo] = m.split("-");
            return (
              <option key={m} value={m}>
                {y}년 {mo}월
              </option>
            );
          })}
        </select>
        <button
          type="button"
          onClick={handleRunAutoAssign}
          disabled={running || !monthEvents.length}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {running ? "배정 계산 중..." : "자동 배정하기"}
        </button>
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${viewMode === "list" ? "bg-[var(--brand)] text-white" : "bg-[var(--card)] text-[var(--muted)]"}`}
          >
            <List className="h-4 w-4" /> 리스트
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${viewMode === "calendar" ? "bg-[var(--brand)] text-white" : "bg-[var(--card)] text-[var(--muted)]"}`}
          >
            <Calendar className="h-4 w-4" /> 캘린더
          </button>
        </div>
      </div>

      {draft && (
        <p className="text-sm text-amber-600">
          자동 배정 결과입니다. 실습코치를 변경할 수 있으며, 필요 시 각 카드에서 &quot;복사&quot;로 내용을 가져가세요.
        </p>
      )}

      {/* 배정 리스트 / 캘린더 — 항상 먼저 표시 */}
      <div className="min-h-[280px]">
        {viewMode === "list" && (
          <div className="space-y-3">
            {displayItems.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted)]">
                {monthEvents.length === 0
                  ? "해당 월에 캘린더 일정이 없습니다."
                  : "자동 배정하기를 실행하거나, 저장된 배정이 없습니다."}
              </div>
            ) : (
              displayItems
                .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                .map((item) => (
                  <AssignmentCard
                    key={item.scheduleId}
                    item={item}
                    coaches={activeCoaches}
                    onCopy={handleCopy}
                    onReassign={handleReassign}
                    copied={copiedId === item.scheduleId}
                  />
                ))
            )}
          </div>
        )}

        {viewMode === "calendar" && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            {selectedCalendarScheduleId && (() => {
              const item = displayItems.find((i) => i.scheduleId === selectedCalendarScheduleId);
              if (!item) return null;
              return (
                <AssignmentDetailPanel
                  item={item}
                  coaches={activeCoaches}
                  onReassign={(scheduleId, coachId, coachName) => {
                    handleReassign(scheduleId, coachId, coachName);
                  }}
                  onCopy={() => handleCopy(item)}
                  onClose={() => setSelectedCalendarScheduleId(null)}
                  copied={copiedId === item.scheduleId}
                />
              );
            })()}
            {Object.keys(byDate).length === 0 ? (
              <div className="p-12 text-center text-[var(--muted)]">
                표시할 배정이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 p-4">
                {Object.entries(byDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, items]) => (
                    <div
                      key={date}
                      className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
                    >
                      <p className="text-xs font-medium text-[var(--muted)] mb-2">
                        {formatDateLabel(date)}
                      </p>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.scheduleId}
                            className="rounded border border-[var(--border)] p-2 text-xs cursor-pointer hover:bg-[var(--card)] hover:ring-2 hover:ring-[var(--brand)]/30"
                            onClick={() => setSelectedCalendarScheduleId(item.scheduleId)}
                            title="클릭하면 상세 보기 · 수정"
                          >
                            <p className="font-medium text-[var(--foreground)] truncate">
                              {item.scheduleTitle}
                            </p>
                            <p className="text-[var(--muted)]">{item.coachName}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 배정 제외된 일정 — 맨 아래, 접어두기 */}
      {skipped.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 overflow-hidden group">
          <summary className="list-none cursor-pointer p-4 text-sm font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 [&::-webkit-details-marker]:hidden">
            배정 제외된 일정 ({skipped.length}건) — 클릭하여 펼치기
          </summary>
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300 px-4 pb-4 pt-0 border-t border-amber-200/50 dark:border-amber-700/50">
            {skipped.map((s) => (
              <li key={s.scheduleId}>
                {s.date} {s.title} — {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** 배정 캘린더 뷰에서 클릭 시 캘린더 위에 보이는 상세 · 수정 패널 */
function AssignmentDetailPanel({
  item,
  coaches,
  onReassign,
  onCopy,
  onClose,
  copied,
}: {
  item: AssignResultItem;
  coaches: CoachLevelRow[];
  onReassign: (scheduleId: string, coachId: string, coachName: string) => void;
  onCopy: () => void;
  onClose: () => void;
  copied: boolean;
}) {
  const [showReasons, setShowReasons] = useState(false);
  return (
    <div className="border-b border-[var(--border)] p-4 bg-[var(--background)]/50">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">배정 상세 · 수정</h3>
      <div className="space-y-2 text-sm">
        <p className="font-semibold text-[var(--foreground)]">{item.scheduleTitle}</p>
        <p className="text-[var(--muted)]">
          {item.date} {item.startTime} ~ {item.endTime}
          {item.location ? ` · ${item.location}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] px-2.5 py-0.5">
            <User className="h-3.5 w-3.5" />
            <span className="font-medium">{item.coachName}</span>
          </div>
          <select
            value={item.coachId}
            onChange={(e) => {
              const coach = coaches.find((c) => (c.email ?? "").trim() === e.target.value);
              const coachName = coach ? (coach.name || coach.email || "").trim() : e.target.value;
              onReassign(item.scheduleId, e.target.value, coachName);
            }}
            className="rounded border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)]"
          >
            {coaches.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name || c.email}
              </option>
            ))}
          </select>
        </div>
        {item.assignReasons && item.assignReasons.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowReasons(!showReasons)}
              className="text-xs text-[var(--brand)] flex items-center gap-1"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showReasons ? "rotate-180" : ""}`} />
              배정 규칙 보기
            </button>
            {showReasons && (
              <ul className="mt-1 pl-4 list-disc text-xs text-[var(--muted)] space-y-0.5">
                {item.assignReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
        >
          <Copy className="h-4 w-4" />
          {copied ? "복사됨" : "복사"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function AssignmentCard({
  item,
  coaches,
  onCopy,
  onReassign,
  copied,
}: {
  item: AssignResultItem;
  coaches: CoachLevelRow[];
  onCopy: (item: AssignResultItem) => void;
  onReassign: (scheduleId: string, coachId: string, coachName: string) => void;
  copied: boolean;
}) {
  const [showReasons, setShowReasons] = useState(false);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--foreground)] truncate">{item.scheduleTitle}</h3>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {item.date} {item.startTime} ~ {item.endTime}
            {item.location && ` · ${item.location}`}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] px-2.5 py-0.5">
              <User className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">{item.coachName}</span>
            </div>
            <select
              value={item.coachId}
              onChange={(e) => {
                const coach = coaches.find((c) => (c.email ?? "").trim() === e.target.value);
                const coachName = coach ? (coach.name || coach.email || "").trim() : e.target.value;
                onReassign(item.scheduleId, e.target.value, coachName);
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded border border-[var(--border)] bg-[var(--card)] text-sm py-1 pr-6"
            >
              {coaches.map((c) => (
                <option key={c.email} value={c.email}>
                  {c.name || c.email}
                </option>
              ))}
            </select>
          </div>
          {item.assignReasons && item.assignReasons.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowReasons(!showReasons)}
                className="text-xs text-[var(--brand)] flex items-center gap-1"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showReasons ? "rotate-180" : ""}`}
                />
                배정 규칙 보기
              </button>
              {showReasons && (
                <ul className="mt-1 pl-4 list-disc text-xs text-[var(--muted)] space-y-0.5">
                  {item.assignReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onCopy(item)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
        >
          <Copy className="h-4 w-4" />
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
    </div>
  );
}
