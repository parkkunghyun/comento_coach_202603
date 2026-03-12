import Link from "next/link";
import { getSession } from "@/app/actions/auth";
import { getCalendarDebug } from "@/lib/data";
import { CheckCircle, XCircle } from "lucide-react";

export default async function CoachCalendarCheckPage() {
  const session = await getSession();
  const attendeeEmail = session?.role === "coach" ? session.email : undefined;
  const debug = await getCalendarDebug(attendeeEmail);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          캘린더 연동 확인
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          본인 이메일로 참여자 필터가 적용된 결과를 확인합니다.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        {attendeeEmail ? (
          <p className="text-sm text-[var(--muted)]">
            참여자 이메일: <strong className="text-[var(--foreground)]">{attendeeEmail}</strong>
          </p>
        ) : (
          <p className="text-sm text-amber-600">
            로그인된 실습코치 이메일이 없습니다. 시트 &quot;실습코치 로그인&quot; F열에 이메일이 있는지 확인하세요.
          </p>
        )}

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
            <span className="text-[var(--muted)]">API 조회 건수</span>
            <span>{debug.totalFromApi}건</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--muted)]">제목 필터 후</span>
            <span>{debug.afterSummaryFilter}건</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--muted)]">참여자 필터 후 (본인)</span>
            <span>{debug.afterAttendeeFilter}건</span>
          </div>
        </dl>

        {debug.afterSummaryFilter > 0 && debug.afterAttendeeFilter === 0 && attendeeEmail && (
          <p className="text-sm text-amber-600">
            기업교육 일정은 있으나, 해당 이벤트의 참석자(attendee)에 &quot;{attendeeEmail}&quot; 가 없습니다.
            Google 캘린더에서 해당 일정에 본인 이메일을 참석자로 추가해 주세요.
          </p>
        )}
      </div>

      <Link
        href="/coach/scheduled"
        className="inline-block rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        예정된 교육으로 돌아가기
      </Link>
    </div>
  );
}
