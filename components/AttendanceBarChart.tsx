"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type EventRegion = "서울" | "경기도 지역" | "지방" | "기타";

export interface AttendanceByRegionItem {
  name: string;
  서울: number;
  "경기도 지역": number;
  지방: number;
  기타: number;
  total?: number;
  email?: string;
}

/** 이번 달 참석 현황: 세로 막대 (총 참여 횟수만) */
export function AttendanceBarChart({
  data,
}: {
  data: { name: string; total?: number }[];
}) {
  const chartData = data.map((d) => ({ name: d.name, count: d.total ?? 0 }));

  if (!chartData.length) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
        이번 달 참석 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-card">
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 8, bottom: 80 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
              formatter={(value: unknown) => [`${Number(value ?? 0)}회`, "참여"]}
              labelFormatter={(label) => label}
            />
            <Bar
              dataKey="count"
              fill="var(--brand)"
              radius={[0, 4, 4, 0]}
              name="참여 횟수"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
