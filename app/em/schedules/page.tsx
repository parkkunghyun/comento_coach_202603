import { getCalendarSchedules, getCoachLevelStatus } from "@/lib/data";
import { SchedulesWithCoachFilter } from "@/components/SchedulesWithCoachFilter";

export default async function EMSchedulesPage() {
  const [schedules, levelStatus] = await Promise.all([
    getCalendarSchedules(),
    getCoachLevelStatus(),
  ]);

  const coaches = levelStatus
    .filter((r) => (r.email ?? "").trim() !== "")
    .map((r) => ({ email: r.email.trim(), name: (r.name ?? "").trim() || r.email }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          교육 일정
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Google 캘린더의 기업교육 일정을 확인하세요. 실습코치를 선택하면 해당 코치가 참석하는 일정만 표시됩니다.
        </p>
      </div>

      <SchedulesWithCoachFilter events={schedules} coaches={coaches} />
    </div>
  );
}
