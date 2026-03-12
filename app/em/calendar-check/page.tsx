import Link from "next/link";
import { getCalendarDebug } from "@/lib/data";
import { CheckCircle, XCircle } from "lucide-react";

export default async function EMCalendarCheckPage() {
  const debug = await getCalendarDebug();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          캘린더 연동 확인
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Google 캘린더 연결 상태와 일정 필터 결과를 확인합니다.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        {debug.error ? (
          <div className="flex gap-3 p-4 rounded-lg bg-rose-500/10 text-rose-700">
            <XCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">오류</p>
              <p className="text-sm mt-1">{debug.error}</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 p-4 rounded-lg bg-emerald-500/10 text-emerald-700">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium">캘린더 API 연결 성공</p>
          </div>
        )}

        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--muted)]">인증</span>
            <span>{debug.hasAuth ? "설정됨" : "없음"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--muted)]">캘린더 ID</span>
            <span className="truncate max-w-[240px]" title={debug.calendarId}>
              {debug.calendarId}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--muted)]">제목 필터</span>
            <span>&quot;{debug.summaryFilter}&quot; 포함</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--muted)]">API 조회 건수</span>
            <span>{debug.totalFromApi}건</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--muted)]">필터 후 건수</span>
            <span>{debug.afterSummaryFilter}건</span>
          </div>
        </dl>

        {debug.sampleSummaries.length > 0 && (
          <div>
            <p className="text-sm font-medium text-[var(--muted)] mb-2">
              캘린더 이벤트 제목 샘플 (최대 10건)
            </p>
            <ul className="text-sm text-[var(--foreground)] list-disc list-inside space-y-1">
              {debug.sampleSummaries.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <p className="text-xs text-[var(--muted)] mt-2">
              위 제목에 &quot;{debug.summaryFilter}&quot;가 포함되어야 교육 일정에 표시됩니다.
              공백 유무는 자동으로 무시됩니다. 다른 문구를 쓰려면 .env에
              GOOGLE_CALENDAR_SUMMARY_FILTER=원하는문구 를 설정하세요.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href="/em/schedules"
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          교육 일정으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
