import { getSession } from "@/app/actions/auth";
import {
  getAssignmentsByCoachId,
  getSchedules,
  getReviews,
} from "@/lib/data";
import { ReviewForm } from "./ReviewForm";
import { MessageSquare, Check } from "lucide-react";

export default async function CoachReviewsPage() {
  const session = await getSession();
  if (!session || session.role !== "coach") return null;

  const [assignments, schedules, reviews] = await Promise.all([
    getAssignmentsByCoachId(session.id),
    getSchedules(),
    getReviews(),
  ]);

  const confirmed = assignments.filter((a) => a.status === "confirmed");
  const canReview = confirmed
    .map((a) => ({
      ...a,
      schedule: schedules.find((s) => s.id === a.scheduleId),
    }))
    .filter((a) => a.schedule && a.schedule.status === "completed")
    .filter((a) => !reviews.some((r) => r.assignmentId === a.id));

  const alreadyReviewed = confirmed.filter((a) =>
    reviews.some((r) => r.assignmentId === a.id)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          후기 작성
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          교육 종료 후 후기를 작성하세요.
        </p>
      </div>

      {canReview.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            작성 가능한 후기
          </h2>
          {canReview.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-card"
            >
              <h3 className="font-semibold text-[var(--foreground)]">
                {a.schedule!.title}
              </h3>
              <p className="text-sm text-[var(--muted)] mt-1">
                {a.schedule!.date} · 확정된 교육
              </p>
              <ReviewForm
                assignmentId={a.id}
                scheduleId={a.scheduleId}
                coachId={session.id}
              />
            </div>
          ))}
        </div>
      )}

      {alreadyReviewed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            작성 완료한 후기
          </h2>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="flex items-center gap-2 text-emerald-600">
              <Check className="h-5 w-5" />
              <span className="font-medium">
                {alreadyReviewed.length}건의 후기를 제출했습니다.
              </span>
            </div>
          </div>
        </div>
      )}

      {canReview.length === 0 && alreadyReviewed.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-[var(--muted)] opacity-50" />
          <p className="mt-4 text-[var(--muted)]">
            작성 가능한 교육 후기가 없습니다.
          </p>
          <p className="text-sm text-[var(--muted)] mt-1">
            완료된 교육에 대해 EM이 확정하면 후기를 작성할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
