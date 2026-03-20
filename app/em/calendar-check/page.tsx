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
            <span className="text-right">
              {debug.summaryFilter === "(전체 표시)"
                ? "없음 (전체 표시)"
                : `"${debug.summaryFilter}" 포함`}
            </span>
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

        {debug.totalFromApi > 0 &&
          debug.afterSummaryFilter === 0 &&
          debug.summaryFilter !== "(전체 표시)" && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
              <p className="font-medium">제목 필터 때문에 일정이 0건입니다.</p>
              <p className="mt-1 text-xs opacity-90">
                API는 {debug.totalFromApi}건을 가져왔지만, GOOGLE_CALENDAR_SUMMARY_FILTER는{" "}
                <strong>이벤트 제목</strong>에만 적용됩니다. 캘린더 이름(기업교육 일정)과는 관계없습니다.
                .env.local에서 <code className="rounded bg-black/10 px-1">GOOGLE_CALENDAR_SUMMARY_FILTER</code>{" "}
                줄을 삭제하거나 주석 처리한 뒤 서버를 다시 시작하세요.
              </p>
            </div>
          )}

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
            {debug.summaryFilter !== "(전체 표시)" ? (
              <p className="text-xs text-[var(--muted)] mt-2">
                필터가 켜져 있으면 위 제목에 &quot;{debug.summaryFilter}&quot;가 포함된 일정만 앱에 표시됩니다.
                전체를 보려면 필터 env를 비우세요.
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)] mt-2">
                제목 필터가 없어 위 일정이 모두 교육 일정·예상 배정 등에 반영됩니다.
              </p>
            )}
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
