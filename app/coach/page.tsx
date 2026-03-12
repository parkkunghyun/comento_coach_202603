import Link from "next/link";
import { getSession } from "@/app/actions/auth";
import {
  getAssignmentsByCoachId,
  getCalendarSchedules,
} from "@/lib/data";
import { ClipboardList, CalendarCheck, ChevronRight } from "lucide-react";

export default async function CoachDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "coach") return null;

  const [assignments, calendarSchedules] = await Promise.all([
    getAssignmentsByCoachId(session.id),
    getCalendarSchedules(session.email),
  ]);

  const pending = assignments.filter((a) => a.status === "pending");
  const upcoming = calendarSchedules
    .filter((s) => s.status === "open")
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          대시보드
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          배정 요청과 예정된 교육을 확인하세요.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/coach/requests"
          className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-card hover:shadow-card-hover transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">
                배정 요청
              </h2>
              <p className="text-2xl font-semibold text-[var(--foreground)] mt-0.5">
                {pending.length}건 대기
              </p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 text-[var(--muted)] group-hover:text-[var(--brand)]" />
          </div>
        </Link>

        <Link
          href="/coach/scheduled"
          className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-card hover:shadow-card-hover transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">
                예정된 교육
              </h2>
              <p className="text-2xl font-semibold text-[var(--foreground)] mt-0.5">
                {calendarSchedules.filter((s) => s.status === "open").length}건
              </p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 text-[var(--muted)] group-hover:text-[var(--brand)]" />
          </div>
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-card overflow-hidden">
        <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-[var(--foreground)]">
            다가오는 교육
          </h2>
          <Link
            href="/coach/scheduled"
            className="text-sm text-[var(--brand)] hover:underline"
          >
            전체 보기
          </Link>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {upcoming.length === 0 ? (
            <li className="px-6 py-8 text-center text-sm text-[var(--muted)]">
              참여 예정인 교육이 없습니다.
            </li>
          ) : (
            upcoming.map((s) => (
              <li key={s.id}>
                <Link
                  href="/coach/scheduled"
                  className="flex items-center justify-between px-6 py-4 hover:bg-[var(--background)] transition-colors"
                >
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {s.title}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {s.date} {s.startTime} ~ {s.endTime}
                      {s.location ? ` · ${s.location}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-600">
                    예정
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
