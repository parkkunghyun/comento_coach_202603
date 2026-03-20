/** 실습코치_예상대시보드 시트 이름 */
export const EXPECTED_DASHBOARD_SHEET = "실습코치_예상대시보드";

/** 캘린더 이벤트 id + 교육일자로 안정적인 일정ID (동일 일정은 항상 동일 값) */
export function stableScheduleSheetIdFromCalendar(
  calendarEventId: string,
  dateYmd: string
): string {
  const compact = dateYmd.replace(/-/g, "");
  let h = 0;
  for (let i = 0; i < calendarEventId.length; i++) {
    h = (Math.imul(31, h) + calendarEventId.charCodeAt(i)) | 0;
  }
  const n = Math.abs(h) % 997 + 1;
  return `SCH-${compact}-${String(n).padStart(3, "0")}`;
}

/** 수기 일정용 일정ID */
export function stableScheduleSheetIdManual(
  dateYmd: string,
  companyName: string,
  courseName: string
): string {
  const compact = dateYmd.replace(/-/g, "");
  const key = `${companyName}|${courseName}|${dateYmd}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  const n = Math.abs(h) % 997 + 1;
  return `SCH-MAN-${compact}-${String(n).padStart(3, "0")}`;
}

/** KST 기준 YYYY-MM-DD (assign id 날짜 접두용) */
export function getKstYmdCompact(d = new Date()): string {
  const s = d.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" });
  const date = s.split(" ")[0] ?? "";
  return date.replace(/-/g, "");
}

/** 시트용 최종수정일시 예: 2026-03-20 09:30 */
export function formatKstYmdHm(d = new Date()): string {
  const s = d.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" });
  const [date, time] = s.split(" ");
  const hm = (time ?? "00:00:00").slice(0, 5);
  return `${date} ${hm}`;
}

/** 당일 기준 다음 ASSIGN-YYYYMMDD-NNN */
export function nextAssignIdForToday(colAValues: string[]): string {
  const prefix = `ASSIGN-${getKstYmdCompact()}-`;
  let max = 0;
  for (const id of colAValues) {
    if (!id || !id.startsWith(prefix)) continue;
    const part = id.slice(prefix.length);
    const n = parseInt(part, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
