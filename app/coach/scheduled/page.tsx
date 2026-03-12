import { getSession } from "@/app/actions/auth";
import { getCalendarSchedules } from "@/lib/data";
import { Calendar, MapPin } from "lucide-react";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";

export default async function CoachScheduledPage() {
  const session = await getSession();
  if (!session || session.role !== "coach") return null;

  const schedules = await getCalendarSchedules(session.email);
  const sorted = [...schedules].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const upcoming = sorted.filter((s) => s.status === "open");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          예정된 교육
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          본인이 참여자로 등록된 기업교육 일정입니다.
        </p>
      </div>

      <ScheduleCalendar events={schedules} />

      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
          예정된 교육 목록
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {upcoming.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-card"
          >
            <h3 className="font-semibold text-[var(--foreground)] mb-4">
              {s.title}
            </h3>
            <dl className="space-y-2 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {s.date} {s.startTime} ~ {s.endTime}
                </span>
              </div>
              {s.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{s.location}</span>
                </div>
              )}
            </dl>
          </div>
        ))}
      </div>

      {upcoming.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted)]">
          참여자로 등록된 예정 교육이 없습니다.
        </div>
      )}
    </div>
  );
}
