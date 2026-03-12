"use server";

import { getCalendarSchedules, getCoachLevelStatus, getAssignments, createAssignment, updateAssignmentCoach } from "@/lib/data";
import { runAutoAssign, type AssignResultItem } from "@/lib/auto-assign";

/** 선택한 월에 대해 자동 배정 실행 (저장하지 않음) */
export async function runAutoAssignAction(yearMonth: string): Promise<{
  ok: boolean;
  assignments: AssignResultItem[];
  skipped: { scheduleId: string; title: string; date: string; reason: string }[];
  error?: string;
}> {
  try {
    const [events, coaches] = await Promise.all([
      getCalendarSchedules(),
      getCoachLevelStatus(),
    ]);
    const prefix = yearMonth.length === 7 ? yearMonth : `${yearMonth}-`;
    const monthEvents = events.filter((e) => e.date.startsWith(prefix));
    const result = runAutoAssign(monthEvents, coaches, yearMonth);
    return { ok: true, ...result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      assignments: [],
      skipped: [],
      error: message,
    };
  }
}

/** 자동 배정 결과를 시트에 반영 (기존 같은 scheduleId 있으면 재배정으로 수정, 없으면 생성) */
export async function applyAssignmentsAction(
  yearMonth: string,
  items: AssignResultItem[]
): Promise<{ ok: boolean; created: number; updated: number; error?: string }> {
  try {
    const existing = await getAssignments();
    const prefix = yearMonth.length === 7 ? yearMonth : `${yearMonth}-`;
    let created = 0;
    let updated = 0;
    for (const item of items) {
      const bySchedule = existing.find((a) => a.scheduleId === item.scheduleId);
      if (bySchedule) {
        const ok = await updateAssignmentCoach(bySchedule.id, item.coachId, item.coachName);
        if (ok) updated++;
      } else {
        const id = await createAssignment({
          scheduleId: item.scheduleId,
          coachId: item.coachId,
          coachName: item.coachName,
          status: "pending",
        });
        if (id) created++;
      }
    }
    return { ok: true, created, updated };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, created: 0, updated: 0, error: message };
  }
}
