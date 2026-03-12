import { getReviews, getSchedules, getAssignments } from "@/lib/data";
import { MessageSquare, Star } from "lucide-react";

export default async function EMReviewsPage() {
  const [reviews, schedules, assignments] = await Promise.all([
    getReviews(),
    getSchedules(),
    getAssignments(),
  ]);

  const scheduleMap = Object.fromEntries(schedules.map((s) => [s.id, s]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          교육 후기
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          실습코치가 작성한 교육 내용 및 교육 후 이슈/후기를 확인하세요.
        </p>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted)]">
            제출된 후기가 없습니다.
          </div>
        ) : (
          reviews.map((r) => {
            const schedule = scheduleMap[r.scheduleId];
            const assignment = assignments.find((a) => a.id === r.assignmentId);
            return (
              <div
                key={r.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-card overflow-hidden"
              >
                <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between bg-[var(--background)]">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[var(--brand)]/10 p-2 text-[var(--brand)]">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--foreground)]">
                        {schedule?.title ?? r.scheduleId}
                      </h2>
                      <p className="text-sm text-[var(--muted)]">
                        실습코치 ID: {r.coachId} · {r.submittedAt.slice(0, 10)}{" "}
                        제출
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium">{r.rating}</span>
                  </div>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--muted)] mb-1">
                      교육 내용 및 후기
                    </h3>
                    <p className="text-[var(--foreground)] whitespace-pre-wrap">
                      {r.content || "—"}
                    </p>
                  </div>
                  {r.issues && (
                    <div>
                      <h3 className="text-sm font-medium text-[var(--muted)] mb-1">
                        이슈 / 개선사항
                      </h3>
                      <p className="text-[var(--foreground)] whitespace-pre-wrap">
                        {r.issues}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
