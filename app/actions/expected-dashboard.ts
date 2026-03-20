"use server";

import { revalidatePath } from "next/cache";
import { getExpectedDashboardRows, upsertExpectedDashboardRow } from "@/lib/data";
import {
  stableScheduleSheetIdFromCalendar,
  stableScheduleSheetIdManual,
} from "@/lib/expected-dashboard";

export type UpsertExpectedPreviewInput = {
  source: "calendar" | "manual";
  /** 캘린더 일정 선택 시 Google 이벤트 id */
  calendarEventId?: string;
  educationDate: string;
  companyName: string;
  courseName: string;
  coachName: string;
  assignmentStatus: "예상배정" | "확정배정";
  notes: string;
};

export async function upsertExpectedPreviewAction(
  input: UpsertExpectedPreviewInput
): Promise<{ ok: boolean; error?: string; assignId?: string }> {
  try {
    const company = input.companyName.trim();
    const course = input.courseName.trim();
    const coach = input.coachName.trim();
    const date = input.educationDate.trim();

    if (!date || !company || !course || !coach) {
      return { ok: false, error: "교육일자, 기업명, 과정명, 실습코치명을 모두 입력해 주세요." };
    }

    let scheduleSheetId: string;
    if (input.source === "calendar" && input.calendarEventId?.trim()) {
      scheduleSheetId = stableScheduleSheetIdFromCalendar(
        input.calendarEventId.trim(),
        date
      );
    } else {
      scheduleSheetId = stableScheduleSheetIdManual(date, company, course);
    }

    const res = await upsertExpectedDashboardRow({
      scheduleSheetId,
      educationDate: date,
      companyName: company,
      courseName: course,
      coachName: coach,
      assignmentStatus: input.assignmentStatus,
      notes: input.notes.trim(),
    });

    if (res.ok) {
      invalidateExpectedDashboardCache();
      revalidatePath("/em/expected-assign");
    }
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** 선택 기업의 모든 캘린더 일정에 동일 실습코치 예상 배정(일정별 시트 행 upsert) */
export async function assignCoachToAllCompanyEventsAction(input: {
  companyName: string;
  coachName: string;
  events: { calendarEventId: string; educationDate: string; courseName: string }[];
}): Promise<{ ok: boolean; error?: string; updatedCount?: number }> {
  try {
    const company = input.companyName.trim();
    const coach = input.coachName.trim();
    if (!company || !coach) {
      return { ok: false, error: "기업명과 실습코치를 확인해 주세요." };
    }
    if (!input.events.length) {
      return { ok: false, error: "해당 기업에 배정할 캘린더 일정이 없습니다." };
    }

    let updatedCount = 0;
    for (const ev of input.events) {
      const date = ev.educationDate.trim();
      const course = ev.courseName.trim();
      const cid = ev.calendarEventId.trim();
      if (!date || !course || !cid) continue;

      const res = await upsertExpectedDashboardRow({
        scheduleSheetId: stableScheduleSheetIdFromCalendar(cid, date),
        educationDate: date,
        companyName: company,
        courseName: course,
        coachName: coach,
        assignmentStatus: "예상배정",
        notes: "",
      });
      if (!res.ok) {
        return { ok: false, error: res.error ?? `저장 실패 (일정 ${date})`, updatedCount };
      }
      updatedCount += 1;
    }

    invalidateExpectedDashboardCache();
    revalidatePath("/em/expected-assign");
    return { ok: true, updatedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** 예상대시보드 시트 전체를 다시 읽어 캘린더 등 클라이언트 상태 갱신용 */
export type ExpectedDashboardRowDTO = {
  scheduleSheetId: string;
  companyName: string;
  coachName: string;
  courseName: string;
  educationDate: string;
  assignmentStatus: string;
};

// 짧은 시간 동안은 읽기 요청을 줄이기 위한 캐시 (쿼터 초과 방지)
let expectedDashboardCacheRows: ExpectedDashboardRowDTO[] | null = null;
let expectedDashboardCacheAt = 0;
const EXPECTED_DASHBOARD_CACHE_TTL_MS = 30_000;

function invalidateExpectedDashboardCache() {
  expectedDashboardCacheRows = null;
  expectedDashboardCacheAt = 0;
}

export async function refreshExpectedDashboardRowsAction(): Promise<
  { ok: true; rows: ExpectedDashboardRowDTO[] } | { ok: false; error: string }
> {
  try {
    const now = Date.now();
    if (
      expectedDashboardCacheRows &&
      now - expectedDashboardCacheAt < EXPECTED_DASHBOARD_CACHE_TTL_MS
    ) {
      return { ok: true, rows: expectedDashboardCacheRows };
    }

    const rows = await getExpectedDashboardRows();
    const dtoRows = rows.map((r) => ({
      scheduleSheetId: r.scheduleSheetId,
      companyName: r.companyName,
      coachName: r.coachName,
      courseName: r.courseName,
      educationDate: r.educationDate,
      assignmentStatus: r.assignmentStatus,
    }));
    expectedDashboardCacheRows = dtoRows;
    expectedDashboardCacheAt = now;

    return {
      ok: true,
      rows: dtoRows,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
