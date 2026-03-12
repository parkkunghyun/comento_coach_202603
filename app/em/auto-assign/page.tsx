import { getAutoAssignRules } from "@/lib/data";
import { Settings, Zap } from "lucide-react";

export default async function EMAutoAssignPage() {
  const rules = await getAutoAssignRules();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          자동 배정 로직
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          실습코치 자동 추천/가배정에 사용되는 규칙과 가중치를 관리하세요.
        </p>
      </div>

      <div className="space-y-4">
        {rules.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-card overflow-hidden"
          >
            <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between bg-[var(--background)]">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[var(--brand)]/10 p-2 text-[var(--brand)]">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--foreground)]">
                    {r.name}
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    우선순위 {r.priority} ·{" "}
                    {r.enabled ? "활성" : "비활성"}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  r.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {r.enabled ? "활성" : "비활성"}
              </span>
            </div>
            <div className="px-6 py-4 space-y-4">
              {r.conditions && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--muted)] mb-1">
                    적용 조건
                  </h3>
                  <p className="text-sm text-[var(--foreground)]">
                    {r.conditions}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-lg bg-[var(--background)] p-3">
                  <p className="text-xs text-[var(--muted)]">레벨 가중치</p>
                  <p className="font-medium">{r.weightLevel}</p>
                </div>
                <div className="rounded-lg bg-[var(--background)] p-3">
                  <p className="text-xs text-[var(--muted)]">전문성 가중치</p>
                  <p className="font-medium">{r.weightSpecialty}</p>
                </div>
                <div className="rounded-lg bg-[var(--background)] p-3">
                  <p className="text-xs text-[var(--muted)]">평점 가중치</p>
                  <p className="font-medium">{r.weightRating}</p>
                </div>
                <div className="rounded-lg bg-[var(--background)] p-3">
                  <p className="text-xs text-[var(--muted)]">가용성 가중치</p>
                  <p className="font-medium">{r.weightAvailability}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--muted)]">
                마지막 수정: {r.updatedAt.slice(0, 10)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted)]">
          <Settings className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p>등록된 자동 배정 규칙이 없습니다.</p>
          <p className="text-sm mt-1">
            Google 시트의 auto_assign_rules 시트에 규칙을 추가하면 여기서 확인할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
