"use client";

import { useState } from "react";
import { createReview } from "@/lib/data";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

export function ReviewForm({
  assignmentId,
  scheduleId,
  coachId,
}: {
  assignmentId: string;
  scheduleId: string;
  coachId: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [issues, setIssues] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReview({
        assignmentId,
        scheduleId,
        coachId,
        content,
        issues,
        rating,
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
          교육 내용 및 후기
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          placeholder="교육 진행 내용, 참여자 반응, 잘된 점 등을 작성해 주세요."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
          이슈 / 개선사항
        </label>
        <textarea
          value={issues}
          onChange={(e) => setIssues(e.target.value)}
          rows={2}
          placeholder="발생한 이슈나 개선이 필요한 점이 있다면 적어 주세요."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          평점
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="p-1 rounded hover:bg-[var(--background)]"
            >
              <Star
                className={`h-8 w-8 ${
                  n <= rating ? "fill-amber-400 text-amber-400" : "text-[var(--border)]"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "제출 중..." : "후기 제출"}
      </button>
    </form>
  );
}
