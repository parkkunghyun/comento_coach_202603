import { getCalendarSchedules, getCoachLevelStatus, getAssignments } from "@/lib/data";
import { AssignmentsClient } from "./AssignmentsClient";

export default async function EMAssignmentsPage() {
  const [calendarSchedules, levelStatus, assignmentsRaw] = await Promise.all([
    getCalendarSchedules(),
    getCoachLevelStatus(),
    getAssignments().catch(() => []),
  ]);
  const assignments = Array.isArray(assignmentsRaw) ? assignmentsRaw : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          배정 관리
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          LEVEL·교육 종류·지역·주당 일정 제한을 반영한 자동 배정 후, 실습코치를 수정하고 복사로 필요한 내용을 가져가세요.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6">
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">자동 배정 규칙</h2>
        <ol className="list-decimal list-inside text-sm text-[var(--muted)] space-y-1">
          <li><strong className="text-[var(--foreground)]">LEVEL 기반 배정</strong> — 교육 난이도에 맞는 LEVEL 실습코치 우선 배정</li>
          <li><strong className="text-[var(--foreground)]">교육 종류 필터</strong> — 제목에 &quot;핸즈온&quot; 포함 시 핸즈온 가능 코치만, &quot;Python&quot;/&quot;GAS&quot; 포함 시 해당 기술 가능 코치만</li>
          <li><strong className="text-[var(--foreground)]">지역 분배</strong> — 서울/지방이 적혀 있을 때만 균형 배분. 지역 미기재(기타)는 지역 무관 배정</li>
          <li><strong className="text-[var(--foreground)]">일정 제한</strong> — 실습코치당 주 최대 4회까지 배정</li>
        </ol>
      </div>

      <AssignmentsClient
        calendarSchedules={calendarSchedules}
        levelStatus={levelStatus}
        assignments={assignments}
      />
    </div>
  );
}
