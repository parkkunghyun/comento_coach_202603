"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

/** 기간별 교육 중 실습코치 참여 비율 도넛 */
export function CoachParticipationDonut({
  total: totalCount,
  coachParticipated,
  title = "교육 중 실습코치 참여 비율",
}: {
  total: number;
  coachParticipated: number;
  title?: string;
}) {
  const noParticipated = Math.max(0, totalCount - coachParticipated);
  const data = [
    { name: "실습코치 참여", value: coachParticipated, color: "var(--brand)" },
    { name: "미참여", value: noParticipated, color: "var(--border)" },
  ].filter((d) => d.value > 0);

  const percent = totalCount > 0 ? ((coachParticipated / totalCount) * 100).toFixed(1) : "0";

  if (totalCount === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 h-[340px] flex items-center justify-center text-[var(--muted)] text-sm">
        해당 기간 교육 일정이 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-card">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2 text-center">
        {title}
      </h3>
      <div className="h-[280px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
              formatter={(value: unknown, name: unknown) => {
                const v = Number(value ?? 0);
                const n = String(name ?? "");
                return [
                  `${v}건 (${n})`,
                  totalCount > 0 ? `${((v / totalCount) * 100).toFixed(1)}%` : "",
                ];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        {/* 도넛 중앙에 숫자 표시 */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ marginTop: "8px" }}
        >
          <span className="text-2xl font-bold text-[var(--foreground)] tabular-nums">
            {coachParticipated}
            <span className="text-base font-normal text-[var(--muted)]"> / {totalCount}건</span>
          </span>
          <span className="text-sm font-medium text-[var(--brand)] mt-0.5">{percent}% 참여</span>
        </div>
      </div>
      <p className="text-center text-sm text-[var(--muted)]">
        전체 <strong className="text-[var(--foreground)]">{totalCount}</strong>건 중 실습코치 참여{" "}
        <strong className="text-[var(--foreground)]">{coachParticipated}</strong>건
      </p>
    </div>
  );
}
