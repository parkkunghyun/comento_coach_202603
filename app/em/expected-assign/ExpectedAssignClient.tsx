"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CoachLoginProfile } from "@/types";
import {
  assignCoachToAllCompanyEventsAction,
  refreshExpectedDashboardRowsAction,
} from "@/app/actions/expected-dashboard";

/** 캘린더에서 넘어오는 일정 한 건 */
export type ExpectedAssignEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description?: string;
};

export type ExpectedDashboardRowLite = {
  scheduleSheetId: string;
  companyName: string;
  coachName: string;
  courseName: string;
  educationDate: string;
  assignmentStatus: string;
};

/** 전각·각종 괄호 → 반각 [] */
function normalizeBrackets(s: string): string {
  return s
    .replace(/［/g, "[")
    .replace(/］/g, "]")
    .replace(/【/g, "[")
    .replace(/】/g, "]")
    .replace(/〔/g, "[")
    .replace(/〕/g, "]");
}

function normalizeLabel(s: string): string {
  try {
    return s
      .normalize("NFC")
      .replace(/\u00A0/g, " ")
      .replace(/[\uFEFF\u200B-\u200D\u2060]/g, "")
      .trim();
  } catch {
    return s.trim();
  }
}

/** 제목에 `[기업내부이름]` 이 포함되는지 */
function titleHasCompanyTag(title: string, companyInner: string): boolean {
  if (!companyInner || !title) return false;
  const t = normalizeBrackets(title).normalize("NFC");
  const inner = normalizeLabel(companyInner).normalize("NFC");
  if (!inner) return false;
  return t.includes(`[${inner}]`);
}

/**
 * 일정 제목들에서 `[…]` 안 문자열을 모아 기업 후보 (중복 제거, 가나다순)
 * 예: `[현대자동차] 생성형AI` → 목록에는 `현대자동차`만 표시, 매칭은 제목의 `[현대자동차]` 사용
 */
function extractCompanyInnersFromEvents(events: ExpectedAssignEvent[]): string[] {
  const set = new Set<string>();
  for (const ev of events) {
    const t = normalizeBrackets(ev.title);
    const re = /\[([^\]]+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const inner = normalizeLabel(m[1] ?? "");
      if (inner) set.add(inner);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
}

/** 첫 줄 기준 `[기업] 나머지` → 과정명(표시용) */
function courseFromTitle(title: string): string {
  const raw = normalizeBrackets(title).trim();
  const firstLine = raw.split(/\r?\n/)[0]?.trim() ?? raw;
  const m = firstLine.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
  if (m) {
    const rest = (m[2] ?? "").trim();
    return rest || "(과정명 없음)";
  }
  const open = firstLine.indexOf("[");
  const close = open >= 0 ? firstLine.indexOf("]", open + 1) : -1;
  if (open >= 0 && close > open) {
    const rest = firstLine.slice(close + 1).trim();
    return rest || "(과정명 없음)";
  }
  return firstLine || "(제목 없음)";
}

function buildMonthGridCells(ym: string): { dateStr: string; inMonth: boolean }[] {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m || m < 1 || m > 12) return [];
  const first = new Date(y, m - 1, 1);
  const startPad = first.getDay();
  const cells: { dateStr: string; inMonth: boolean }[] = [];
  const cursor = new Date(y, m - 1, 1 - startPad);
  for (let i = 0; i < 42; i++) {
    const yy = cursor.getFullYear();
    const mm = cursor.getMonth() + 1;
    const dd = cursor.getDate();
    const dateStr = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    cells.push({ dateStr, inMonth: cursor.getMonth() === m - 1 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

function ymFromDateStr(dateYmd: string): string {
  const p = dateYmd.split("-");
  if (p.length < 2) return "";
  return `${p[0]}-${p[1]}`;
}

function stripHtmlPreview(html: string, maxLen: number): string {
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen)}…`;
}

export function ExpectedAssignClient({
  events = [],
  coaches = [],
  dashboardRows = [],
  sheetsConnected = false,
}: {
  events?: ExpectedAssignEvent[];
  coaches?: CoachLoginProfile[];
  dashboardRows?: ExpectedDashboardRowLite[];
  /** Google Sheets 3종 env가 모두 있을 때만 true (실제 시트 쓰기) */
  sheetsConnected?: boolean;
}) {
  /** 선택된 기업명(대괄호 없이). 빈 문자열이면 미선택 */
  const [selectedCompanyInner, setSelectedCompanyInner] = useState<string>("");
  /** 선택된 실습코치 userId (코치명은 profile에서 가져옴) */
  const [selectedCoachRowIndex, setSelectedCoachRowIndex] = useState<string>("");

  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  /** 시트와 동기화된 행 (폴링·배정 직후 갱신) */
  const [liveRows, setLiveRows] = useState<ExpectedDashboardRowLite[]>(() => dashboardRows);
  const [sheetSyncing, setSheetSyncing] = useState(false);

  const pullSheetRows = useCallback(async () => {
    const res = await refreshExpectedDashboardRowsAction();
    if (res.ok) setLiveRows(res.rows);
  }, []);

  const pullSheetRowsManual = useCallback(async () => {
    setSheetSyncing(true);
    try {
      await pullSheetRows();
    } finally {
      setSheetSyncing(false);
    }
  }, [pullSheetRows]);

  /** 시트가 바뀌면(다른 탭에서 수정·재배정 등) 캘린더에 반영 */
  useEffect(() => {
    if (!sheetsConnected) return;
    const POLL_MS = 60_000;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void pullSheetRows();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [pullSheetRows, sheetsConnected]);

  const defaultYm = useMemo(() => {
    const sheetDates = liveRows
      .map((r) => (r.educationDate ?? "").trim())
      .filter((d) => d.length >= 7)
      .sort();
    if (sheetDates.length) return ymFromDateStr(sheetDates[0]!);
    const fromEv = events[0]?.date;
    if (fromEv && fromEv.length >= 7) return ymFromDateStr(fromEv);
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [liveRows, events]);

  const [viewYm, setViewYm] = useState<string>(defaultYm);

  const companies = useMemo(() => extractCompanyInnersFromEvents(events), [events]);

  const filteredEvents = useMemo(() => {
    if (!selectedCompanyInner) return [];
    return events
      .filter((ev) => titleHasCompanyTag(ev.title, selectedCompanyInner))
      .map((ev) => ({
        ...ev,
        course: courseFromTitle(ev.title),
        descriptionPreview: ev.description
          ? stripHtmlPreview(ev.description, 200)
          : "",
      }))
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startTime.localeCompare(b.startTime)
      );
  }, [events, selectedCompanyInner]);

  const selectedCoach = useMemo(
    () => coaches.find((c) => String(c.rowIndex) === selectedCoachRowIndex) ?? null,
    [coaches, selectedCoachRowIndex]
  );

  /** 시트 C열(교육일자) 기준 — 캘린더는 구글 시트에 있는 행만 표시 */
  const sheetRowsByDate = useMemo(() => {
    const map = new Map<string, ExpectedDashboardRowLite[]>();
    for (const r of liveRows) {
      const d = (r.educationDate ?? "").trim();
      if (!d) continue;
      const list = map.get(d) ?? [];
      list.push(r);
      map.set(d, list);
    }
    for (const list of Array.from(map.values())) {
      list.sort((a, b) =>
        (a.courseName || "").localeCompare(b.courseName || "", "ko")
      );
    }
    return map;
  }, [liveRows]);

  const monthCells = useMemo(() => buildMonthGridCells(viewYm), [viewYm]);

  const shiftMonth = (delta: number) => {
    const [yStr, mStr] = viewYm.split("-");
    let y = Number(yStr);
    let m = Number(mStr) + delta;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    setViewYm(`${y}-${String(m).padStart(2, "0")}`);
  };

  const handleAssign = async () => {
    if (!selectedCompanyInner || !selectedCoach) return;
    if (!filteredEvents.length) return;

    setAssigning(true);
    setAssignMsg(null);
    try {
      const res = await assignCoachToAllCompanyEventsAction({
        companyName: selectedCompanyInner,
        coachName: selectedCoach.name,
        events: filteredEvents.map((ev) => ({
          calendarEventId: ev.id,
          educationDate: ev.date,
          courseName: ev.course,
        })),
      });

      if (res.ok) {
        const n = res.updatedCount ?? filteredEvents.length;
        setAssignMsg({
          type: "ok",
          text: sheetsConnected
            ? `구글 시트(실습코치_예상대시보드)에 ${n}건 저장했습니다.`
            : `로컬 시뮬레이션에만 ${n}건 반영되었습니다. .env에 GOOGLE_SHEETS_CLIENT_EMAIL / PRIVATE_KEY / SPREADSHEET_ID 를 넣어야 실제 시트에 쌓입니다.`,
        });
        await pullSheetRows();
      } else {
        setAssignMsg({
          type: "err",
          text: res.error ?? "배정 저장 실패",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setAssignMsg({ type: "err", text: message });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {!sheetsConnected && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          <strong className="font-semibold">시트 연동 없음:</strong> 지금은 구글 시트에 쓰지 않고
          서버 메모리(mock)에만 저장됩니다. 실제{" "}
          <code className="rounded bg-black/10 px-1 text-xs dark:bg-white/10">
            실습코치_예상대시보드
          </code>
          에 쌓이게 하려면 <code className="text-xs">GOOGLE_SHEETS_*</code> 3개를 .env에 설정하세요.
          <span className="mt-1 block text-xs opacity-90">
            (코드는 이제 매 요청마다 env를 읽지만, <code className="text-[10px]">npm run dev</code>는 .env
            변경 후 한 번 재시작하는 것이 안전합니다.)
          </span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">예상 배정</h1>
      </div>

      <div className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-card space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 max-w-md">
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              기업 선택
            </label>
            <select
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              value={selectedCompanyInner}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedCompanyInner(v);
                setSelectedCoachRowIndex("");
                setAssignMsg(null);
              }}
            >
              <option value="">기업을 선택하세요</option>
              {companies.map((inner) => (
                <option key={inner} value={inner}>
                  {inner}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[220px] flex-1 max-w-md">
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              실습코치 선택
            </label>
            <select
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              value={selectedCoachRowIndex}
              onChange={(e) => setSelectedCoachRowIndex(e.target.value)}
              disabled={companies.length === 0}
            >
              <option value="">실습코치를 선택하세요</option>
              {coaches.map((c) => (
                <option key={c.rowIndex} value={String(c.rowIndex)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {companies.length === 0 && events.length > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            제목에 <code className="rounded bg-[var(--background)] px-1">[기업명]</code> 패턴이
            없습니다. 캘린더 일정 제목을 위 형식으로 맞춰 주세요.
          </p>
        )}

        {events.length === 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            캘린더에서 불러온 일정이 없습니다.{" "}
            <code className="text-xs">GOOGLE_CALENDAR_ID</code>·서비스 계정 공유·
            <code className="text-xs"> GOOGLE_CALENDAR_SUMMARY_FILTER</code>(비우기)를 확인하세요.
          </p>
        )}
      </div>

      {selectedCompanyInner !== "" && (
        <div className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-card space-y-4">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              {selectedCompanyInner} 포함 일정 · {filteredEvents.length}건
            </h2>

            <div className="flex flex-wrap items-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleAssign}
                disabled={!selectedCoach || assigning || filteredEvents.length === 0}
                className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {assigning ? "저장중..." : "배정"}
              </button>
            </div>

            {assignMsg && (
              <p
                className={
                  assignMsg.type === "ok"
                    ? "text-sm text-emerald-700 dark:text-emerald-400"
                    : "text-sm text-amber-800 dark:text-amber-200"
                }
              >
                {assignMsg.text}
              </p>
            )}

            {filteredEvents.length === 0 && (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                제목에 해당 기업 태그가 들어간 일정이 없습니다.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">예상 배정 캘린더</h2>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              시트 변경은 약 12초마다 자동 반영됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={sheetSyncing}
              onClick={() => void pullSheetRowsManual()}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--background)]/80 disabled:opacity-50"
            >
              {sheetSyncing ? "불러오는 중…" : "시트 지금 새로고침"}
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--background)]/80"
            >
              이전
            </button>
            <span className="min-w-[140px] text-center text-sm font-medium text-[var(--foreground)] tabular-nums">
              {(() => {
                const [yy, mm] = viewYm.split("-");
                return `${yy}년 ${mm}월`;
              })()}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--background)]/80"
            >
              다음
            </button>
          </div>
        </div>
        <p className="mb-2 text-[11px] leading-snug text-[var(--muted)]">
          <strong className="text-[var(--foreground)]">실습코치_예상대시보드</strong> 시트에 있는 행만
          표시합니다. 표시 형식:{" "}
          <strong className="text-[var(--foreground)]">(D열 기업명) F열 실습코치</strong>, 과정명은 E열.
        </p>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)] text-[10px]">
          {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
            <div
              key={w}
              className="bg-[var(--background)] px-0.5 py-1 text-center text-[10px] font-medium text-[var(--muted)]"
            >
              {w}
            </div>
          ))}
          {monthCells.map(({ dateStr, inMonth }) => {
            const dayRows = sheetRowsByDate.get(dateStr) ?? [];
            const dayNum = Number(dateStr.split("-")[2]);
            return (
              <div
                key={dateStr}
                className={`min-h-[58px] bg-[var(--card)] px-0.5 py-0.5 sm:min-h-[68px] ${
                  inMonth ? "" : "opacity-40"
                }`}
              >
                <div
                  className={`mb-0.5 text-[10px] font-medium tabular-nums leading-none ${
                    inMonth ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                  }`}
                >
                  {dayNum}
                </div>
                <div className="flex flex-col gap-px">
                  {dayRows.slice(0, 3).map((r, idx) => {
                    const company = (r.companyName ?? "").trim() || "기업";
                    const coach = (r.coachName ?? "").trim() || "—";
                    const course = (r.courseName ?? "").trim();
                    return (
                      <div
                        key={`${r.scheduleSheetId}-${idx}`}
                        className="truncate rounded bg-[var(--background)]/80 px-0.5 py-px text-[9px] leading-tight text-[var(--foreground)]"
                        title={course ? `${course} · ${r.assignmentStatus}` : r.assignmentStatus}
                      >
                        <span className="font-medium">
                          ({company}) {coach}
                        </span>
                        {course ? (
                          <div className="truncate text-[8px] leading-tight text-[var(--muted)]">
                            {course}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {dayRows.length > 3 && (
                    <div className="text-[9px] text-[var(--muted)]">+{dayRows.length - 3}건</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
