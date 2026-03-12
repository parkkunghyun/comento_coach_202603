import type { CoachLevelRow } from "@/types";
import type { CalendarSchedule } from "./calendar";
import { getEventRegion } from "./region";

const WEEKLY_MAX = 4;

/** 교육 제목에서 필요 조건 파싱 */
function parseEventRequirements(title: string): {
  needsHandson: boolean;
  needsPython: boolean;
  needsGAS: boolean;
  suggestedLevel: string;
} {
  const t = title.toUpperCase();
  const needsHandson = /핸즈온|HANDSON|HANDS-ON/.test(t);
  const needsPython = /PYTHON/.test(t);
  const needsGAS = /GAS\b|APPS\s*SCRIPT/.test(t);
  let suggestedLevel = "LEVEL2";
  if (t.includes("LEVEL3") || t.includes("LEVEL 3") || /심화|고급/.test(title)) suggestedLevel = "LEVEL3";
  else if (t.includes("LEVEL1") || t.includes("LEVEL 1") || /기초|입문/.test(title)) suggestedLevel = "LEVEL1";
  return { needsHandson, needsPython, needsGAS, suggestedLevel };
}

function toBool(val: string): boolean {
  const v = String(val).toUpperCase();
  return v === "TRUE" || v === "1";
}

/** 이벤트 지역을 서울/지방 두 그룹으로 (균형 배분용). 경기도·기타는 서울 쪽으로 취급 */
function regionBucket(region: string): "서울" | "지방" {
  return region === "지방" ? "지방" : "서울";
}

/** 실제 지방(울산·부산 등) 일정인지. 여기만 지방가능/LEVEL3 제한 적용 */
function isStrictRegional(region: string): boolean {
  return region === "지방";
}

/** 지역이 적혀 있으면 서울/지방 균형 고려, 기타(미기재)면 지역 무시하고 배정 */
function regionMatters(region: string): boolean {
  return region === "서울" || region === "지방";
}

/** 해당 주의 월요일 00:00 기준 ISO 날짜 (YYYY-MM-DD) */
function weekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(date);
  mon.setDate(diff);
  return mon.toISOString().slice(0, 10);
}

/**
 * 조건에 맞는 실습코치만 필터 (실습코치 등급 시트 기준).
 * - ACTIVE, 핸즈온/Python/GAS·LEVEL 조건
 * - 실제 지방(울산·부산 등) 일정만: 지방가능여부 TRUE 또는 LEVEL3만 배정. 서울/경기/기타는 제한 없음.
 */
function filterEligible(
  coaches: CoachLevelRow[],
  requirements: ReturnType<typeof parseEventRequirements>,
  eventRegion: string
): CoachLevelRow[] {
  return coaches.filter((c) => {
    if (String(c.status).trim().toUpperCase() !== "ACTIVE") return false;
    const email = (c.email ?? "").trim();
    if (!email) return false;
    const level = String(c.level ?? "").trim().toUpperCase();
    if (!level) return false;
    const isLevel3 = level === "LEVEL3";

    if (requirements.needsHandson && !toBool(c.handsonAvailable)) return false;
    if (requirements.needsPython && !toBool(c.pythonAvailable)) return false;
    if (requirements.needsGAS) {
      const hasGAS = /GAS|APPS\s*SCRIPT|앱스\s*스크립트/i.test(String(c.genAiAvailable + c.pythonAvailable));
      if (!hasGAS && !toBool(c.pythonAvailable)) return false;
    }
    const order = { LEVEL1: 1, LEVEL2: 2, LEVEL3: 3 };
    const coachOrder = order[level as keyof typeof order] ?? 2;
    const suggestedOrder = order[requirements.suggestedLevel as keyof typeof order] ?? 2;
    // 지방 일정은 LEVEL 상관없이 모두 배정 가능. 그 외는 교육 난이도에 맞는 LEVEL만
    if (!isStrictRegional(eventRegion) && coachOrder < suggestedOrder) return false;

    // 실제 지방(울산·부산 등) 일정만 지방가능/LEVEL3 제한. 서울·경기·기타는 모든 조건 맞는 코치 배정 가능
    if (isStrictRegional(eventRegion)) {
      if (!isLevel3 && !toBool(c.regionalAvailable)) return false;
    }
    return true;
  });
}

/** 배정 후보 점수: 주 배정 수·지역 균형(지역 있을 때만) 반영 */
function scoreCandidate(
  email: string,
  weekKeyStr: string,
  eventRegion: string,
  assignCountByCoachWeek: Map<string, number>,
  assignCountByCoachRegion: Map<string, { 서울: number; 지방: number }>
): number {
  const weekAssigns = assignCountByCoachWeek.get(weekKeyStr) ?? 0;
  const regionCounts = assignCountByCoachRegion.get(email) ?? { 서울: 0, 지방: 0 };
  if (weekAssigns >= WEEKLY_MAX) return -1;
  const totalCount = regionCounts.서울 + regionCounts.지방;
  if (!regionMatters(eventRegion)) {
    return 1000 - weekAssigns * 100 - totalCount;
  }
  const bucket = regionBucket(eventRegion);
  const regionCount = bucket === "서울" ? regionCounts.서울 : regionCounts.지방;
  return 1000 - weekAssigns * 100 - regionCount * 10 - totalCount;
}

export interface AssignResultItem {
  scheduleId: string;
  scheduleTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  coachId: string;
  coachName: string;
  assignReasons: string[];
}

export interface AutoAssignResult {
  assignments: AssignResultItem[];
  skipped: { scheduleId: string; title: string; date: string; reason: string }[];
}

/**
 * 한 달 치 캘린더 이벤트와 실습코치 목록으로 자동 배정 실행.
 * 규칙: LEVEL 기반, 제목(핸즈온/Python/GAS) 필터, 서울/지방 균형(지역 있을 때), 주당 최대 4회.
 */
export function runAutoAssign(
  events: CalendarSchedule[],
  coaches: CoachLevelRow[],
  yearMonth: string
): AutoAssignResult {
  const prefix = yearMonth.length === 7 ? yearMonth : `${yearMonth}-`;
  const monthEvents = events
    .filter((e) => e.date.startsWith(prefix))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const assignments: AssignResultItem[] = [];
  const skipped: AutoAssignResult["skipped"] = [];
  const assignCountByCoachWeek = new Map<string, number>();
  const assignCountByCoachRegion = new Map<string, { 서울: number; 지방: number }>();

  const activeCoaches = coaches.filter(
    (c) => String(c.status).trim().toUpperCase() === "ACTIVE" && (c.email ?? "").trim()
  );
  if (!activeCoaches.length) {
    monthEvents.forEach((e) =>
      skipped.push({ scheduleId: e.id, title: e.title, date: e.date, reason: "활성 실습코치가 없습니다." })
    );
    return { assignments, skipped };
  }

  for (const ev of monthEvents) {
    const requirements = parseEventRequirements(ev.title);
    const eventRegion = getEventRegion(ev.location, ev.description);
    const bucket = regionBucket(eventRegion);

    const eligible = filterEligible(activeCoaches, requirements, eventRegion);
    if (!eligible.length) {
      skipped.push({
        scheduleId: ev.id,
        title: ev.title,
        date: ev.date,
        reason: "조건(LEVEL/핸즈온/Python·GAS·지역)에 맞는 실습코치가 없습니다. (실제 지방 일정은 지방가능여부 TRUE 또는 LEVEL3만 가능)",
      });
      continue;
    }

    const week = weekKey(ev.date);
    const scored = eligible
      .map((c) => {
        const email = (c.email ?? "").trim();
        const weekKeyStr = `${email}|${week}`;
        const regionCounts = assignCountByCoachRegion.get(email) ?? { 서울: 0, 지방: 0 };
        const score = scoreCandidate(email, weekKeyStr, eventRegion, assignCountByCoachWeek, assignCountByCoachRegion);
        return { coach: c, score, regionCounts };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score);

    if (!scored.length) {
      skipped.push({
        scheduleId: ev.id,
        title: ev.title,
        date: ev.date,
        reason: `주당 최대 ${WEEKLY_MAX}회 제한 또는 조건(LEVEL/지역)에 맞는 실습코치가 없습니다.`,
      });
      continue;
    }

    const chosen = scored[0].coach;
    const coachEmail = (chosen.email ?? "").trim();
    const coachName = (chosen.name ?? "").trim() || coachEmail;
    const isLevel3 = String(chosen.level ?? "").trim().toUpperCase() === "LEVEL3";

    const weekKeyStr = `${coachEmail}|${week}`;
    assignCountByCoachWeek.set(weekKeyStr, (assignCountByCoachWeek.get(weekKeyStr) ?? 0) + 1);
    if (regionMatters(eventRegion)) {
      const rc = assignCountByCoachRegion.get(coachEmail) ?? { 서울: 0, 지방: 0 };
      if (bucket === "서울") rc.서울 += 1;
      else rc.지방 += 1;
      assignCountByCoachRegion.set(coachEmail, rc);
    }

    const reasons: string[] = [];
    if (isStrictRegional(eventRegion)) {
      reasons.push("지방 일정은 LEVEL 상관없이 배정 가능하여 해당 코치 배정");
    } else {
      reasons.push(`LEVEL: 교육 난이도에 맞는 ${chosen.level} 실습코치로 배정 (실습코치 등급 시트 기준)`);
    }
    if (isLevel3 && isStrictRegional(eventRegion)) reasons.push("LEVEL3(핸즈온 가능)는 어디든 배정 가능");
    if (requirements.needsHandson) reasons.push("교육 제목에 '핸즈온' 포함 → 핸즈온 가능 실습코치로 한정");
    if (requirements.needsPython) reasons.push("교육 제목에 'Python' 포함 → Python 가능 실습코치로 한정");
    if (requirements.needsGAS) reasons.push("교육 제목에 'GAS' 포함 → 해당 기술 가능 실습코치로 한정");
    if (bucket === "지방" && !isLevel3) reasons.push("지방 일정 → 지방가능여부 TRUE인 실습코치로 한정");
    if (regionMatters(eventRegion)) {
      reasons.push(`지역: ${eventRegion} 일정 → 서울/지방 균형 고려하여 배정`);
    } else {
      reasons.push("지역 미기재(기타) → 지역 무관 배정");
    }
    reasons.push(`주당 최대 ${WEEKLY_MAX}회 제한 내에서 해당 주 배정 수가 적은 코치 우선`);

    assignments.push({
      scheduleId: ev.id,
      scheduleTitle: ev.title,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      location: ev.location,
      coachId: coachEmail,
      coachName,
      assignReasons: reasons,
    });
  }

  return { assignments, skipped };
}
