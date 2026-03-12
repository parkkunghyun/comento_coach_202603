import Link from "next/link";
import {
  getCalendarSchedules,
  getAssignments,
  getCoachProfiles,
  getCoachLevelStatus,
} from "@/lib/data";
import {
  Calendar,
  UserCheck,
  MessageSquare,
  Users,
  ChevronRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import { TodaySchedulesSection } from "@/components/TodaySchedulesSection";
import { LevelStatusTable } from "@/components/LevelStatusTable";
import { getEventRegion } from "@/lib/region";
import { updateCoachLevelAvailabilityAction } from "@/app/actions/coach-level";

const EducationAttendanceSection = dynamic(
  () => import("@/components/EducationAttendanceSection").then((m) => ({ default: m.EducationAttendanceSection })),
  { ssr: false, loading: () => <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 flex items-center justify-center text-[var(--muted)]">참석 현황 로딩 중...</div> }
);

export default async function EMDashboardPage() {
  const [schedules, assignments, coaches, levelStatus] = await Promise.all([
    getCalendarSchedules(),
    getAssignments(),
    getCoachProfiles(),
    getCoachLevelStatus(),
  ]);

  const yearForStats = 2026;
  const schedules2026 = schedules.filter((s) => s.date.startsWith(String(yearForStats)));
  const totalSchedules2026 = schedules2026.length;
  const coachEmails = new Set(
    levelStatus
      .map((r) => (r.email ?? "").trim().toLowerCase())
      .filter(Boolean)
  );
  const coachParticipated2026 = schedules2026.filter((s) =>
    (s.attendees ?? []).some((a) => coachEmails.has((a.email ?? "").trim().toLowerCase()))
  ).length;

  const pendingAssignments = assignments.filter((a) => a.status === "pending").length;
  const activeCoachCount = levelStatus.filter((r) => String(r.status).trim().toUpperCase() === "ACTIVE").length;
  const avgRating =
    coaches.length > 0
      ? coaches.reduce((acc, c) => acc + c.rating, 0) / coaches.length
      : 0;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todaySchedules = schedules
    .filter((s) => s.date === todayStr)
    .sort(
      (a, b) =>
        a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title)
    );

  // 기간별 참석 데이터 (이번 달 / 3개월 / 올해)
  const thisYear = today.getFullYear();
  const thisMonth = String(today.getMonth() + 1).padStart(2, "0");
  const thisMonthPrefix = `${thisYear}-${thisMonth}`;
  const schedulesThisMonth = schedules.filter((s) => s.date.startsWith(thisMonthPrefix));

  // 달력 월 기준 3개월 (이번 달 포함 직전 2개월) 예: 3월이면 1월·2월·3월
  const threeMonthsStart = new Date(thisYear, today.getMonth() - 2, 1);
  const threeMonthsEnd = new Date(thisYear, today.getMonth() + 1, 0); // 이번 달 마지막 날
  const threeMonthsStartStr = `${threeMonthsStart.getFullYear()}-${String(threeMonthsStart.getMonth() + 1).padStart(2, "0")}-01`;
  const threeMonthsEndStr = `${threeMonthsEnd.getFullYear()}-${String(threeMonthsEnd.getMonth() + 1).padStart(2, "0")}-${String(threeMonthsEnd.getDate()).padStart(2, "0")}`;
  const schedules3Months = schedules.filter(
    (s) => s.date >= threeMonthsStartStr && s.date <= threeMonthsEndStr
  );

  type RegionKey = "서울" | "경기도 지역" | "지방" | "기타";
  const initialCounts = (): Record<RegionKey, number> => ({ 서울: 0, "경기도 지역": 0, 지방: 0, 기타: 0 });

  function buildAttendanceData(schedulesInPeriod: typeof schedules) {
    return levelStatus
      .map((row) => {
        const emailLower = (row.email ?? "").trim().toLowerCase();
        const name = row.name || row.email || "(이름 없음)";
        if (!emailLower) {
          return { name, ...initialCounts(), total: 0, email: row.email };
        }
        const byRegion = { ...initialCounts() };
        for (const ev of schedulesInPeriod) {
          const isAttendee = (ev.attendees ?? []).some(
            (a) => (a.email ?? "").trim().toLowerCase() === emailLower
          );
          if (!isAttendee) continue;
          const region = getEventRegion(ev.location, ev.description);
          byRegion[region] += 1;
        }
        const total = (byRegion.서울 + byRegion["경기도 지역"] + byRegion.지방 + byRegion.기타) as number;
        return { name, ...byRegion, total, email: row.email };
      })
      .filter((d) => d.name)
      .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  }

  const attendanceByMonth = buildAttendanceData(schedulesThisMonth);
  const attendanceBy3Months = buildAttendanceData(schedules3Months);
  const attendanceByYear = buildAttendanceData(schedules2026);

  const participatedCount = (list: typeof schedules) =>
    list.filter((s) =>
      (s.attendees ?? []).some((a) => coachEmails.has((a.email ?? "").trim().toLowerCase()))
    ).length;

  const statsMonth = {
    total: schedulesThisMonth.length,
    participated: participatedCount(schedulesThisMonth),
  };
  const stats3Months = {
    total: schedules3Months.length,
    participated: participatedCount(schedules3Months),
  };
  const statsYear = {
    total: totalSchedules2026,
    participated: coachParticipated2026,
  };

  const stats = [
    {
      label: "전체 교육 일정",
      value: totalSchedules2026,
      sub: `건 (${yearForStats} 기업교육)`,
      href: "/em/schedules",
      icon: Calendar,
      color: "bg-blue-500/10 text-blue-600",
      showViewLink: false,
    },
    {
      label: "실습코치가 참여한 교육",
      value: coachParticipated2026,
      sub: `건 (${yearForStats} 캘린더 기준)`,
      href: "/em/schedules",
      icon: Calendar,
      color: "bg-emerald-500/10 text-emerald-600",
      showViewLink: false,
    },
    {
      label: "대기 중 배정",
      value: pendingAssignments,
      sub: "건",
      href: "/em/assignments",
      icon: UserCheck,
      color: "bg-amber-500/10 text-amber-600",
      showViewLink: true,
    },
    {
      label: "실습코치 수",
      value: activeCoachCount,
      sub: "명",
      href: "/em/coaches",
      icon: Users,
      color: "bg-violet-500/10 text-violet-600",
      showViewLink: true,
    },
    {
      label: "평균 평점",
      value: avgRating.toFixed(1),
      sub: "점",
      href: "/em/reviews",
      icon: MessageSquare,
      color: "bg-rose-500/10 text-rose-600",
      showViewLink: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          2026 실습코치 대시보드
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          교육 운영 통계와 다가오는 일정을 한눈에 확인하세요.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--muted)]">
                    {s.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                    {s.value}
                    <span className="text-sm font-normal text-[var(--muted)]">
                      {s.sub}
                    </span>
                  </p>
                </div>
                <div
                  className={`rounded-lg p-2 ${s.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              {s.showViewLink !== false && (
                <div className="mt-3 flex items-center text-xs text-[var(--brand)] opacity-0 group-hover:opacity-100 transition-opacity">
                  보기
                  <ChevronRight className="ml-0.5 h-3 w-3" />
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <EducationAttendanceSection
        attendanceByMonth={attendanceByMonth}
        attendanceBy3Months={attendanceBy3Months}
        attendanceByYear={attendanceByYear}
        statsMonth={statsMonth}
        stats3Months={stats3Months}
        statsYear={statsYear}
        periodLabels={{
          month: "이번 달",
          threeMonths: "3개월",
          year: "올해",
        }}
        descriptionByPeriod={{
          month: `실습코치 등급 시트 기준, 구글 캘린더 참석자로 집계한 이번 달(${thisYear}년 ${thisMonth}월) 총 참여 횟수입니다. 지역별 상세는 아래 표에서 확인할 수 있습니다.`,
          threeMonths: "최근 3개월 구글 캘린더 참석자 기준 참여 횟수입니다. 지역별 상세는 아래 표에서 확인할 수 있습니다.",
          year: `${yearForStats}년 구글 캘린더 참석자 기준 참여 횟수입니다. 지역별 상세는 아래 표에서 확인할 수 있습니다.`,
        }}
      />

      <TodaySchedulesSection schedules={todaySchedules} />

      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
          인원들 LEVEL 현황
        </h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          스프레드시트 &quot;실습코치 등급&quot; 시트 기준입니다. 상세보기 버튼으로 상세 정보를 보고 수정할 수 있습니다.
        </p>
        <LevelStatusTable
          rows={levelStatus}
          onUpdateAvailability={updateCoachLevelAvailabilityAction}
        />
      </div>
    </div>
  );
}
