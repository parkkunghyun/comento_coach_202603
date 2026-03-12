import { getSession } from "@/app/actions/auth";
import { getAssignmentsByCoachId, getSchedules } from "@/lib/data";
import { AcceptRejectButtons } from "./AcceptRejectButtons";
import { Calendar, MapPin } from "lucide-react";

export default async function CoachRequestsPage() {
  const session = await getSession();
  if (!session || session.role !== "coach") return null;

  const [assignments, schedules] = await Promise.all([
    getAssignmentsByCoachId(session.id),
    getSchedules(),
  ]);

  const pending = assignments
    .filter((a) => a.status === "pending")
    .map((a) => ({
      ...a,
      schedule: schedules.find((s) => s.id === a.scheduleId),
    }))
    .filter((a) => a.schedule);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          배정 요청
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          수락 또는 거절할 배정 요청을 확인하세요.
        </p>
      </div>

      <div className="space-y-4">
        {pending.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted)]">
            대기 중인 배정 요청이 없습니다.
          </div>
        ) : (
          pending.map(({ id, schedule }) => (
            <div
              key={id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-card"
            >
              <h3 className="font-semibold text-[var(--foreground)]">
                {schedule!.title}
              </h3>
              <dl className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {schedule!.date} {schedule!.startTime} ~ {schedule!.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{schedule!.location}</span>
                </div>
              </dl>
              <AcceptRejectButtons assignmentId={id} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
