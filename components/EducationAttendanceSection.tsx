"use client";

import { useState } from "react";
import { AttendanceBarChart } from "@/components/AttendanceBarChart";
import type { AttendanceByRegionItem } from "@/components/AttendanceBarChart";
import { CoachParticipationDonut } from "@/components/CoachParticipationDonut";
import { AttendanceDetailTable } from "@/components/AttendanceDetailModal";

export type AttendancePeriod = "month" | "3months" | "year";

export interface PeriodStats {
  total: number;
  participated: number;
}

export interface EducationAttendanceSectionProps {
  attendanceByMonth: AttendanceByRegionItem[];
  attendanceBy3Months: AttendanceByRegionItem[];
  attendanceByYear: AttendanceByRegionItem[];
  statsMonth: PeriodStats;
  stats3Months: PeriodStats;
  statsYear: PeriodStats;
  periodLabels: {
    month: string;
    threeMonths: string;
    year: string;
  };
  descriptionByPeriod: {
    month: string;
    threeMonths: string;
    year: string;
  };
}

export function EducationAttendanceSection({
  attendanceByMonth,
  attendanceBy3Months,
  attendanceByYear,
  statsMonth,
  stats3Months,
  statsYear,
  periodLabels,
  descriptionByPeriod,
}: EducationAttendanceSectionProps) {
  const [period, setPeriod] = useState<AttendancePeriod>("month");

  const attendanceData =
    period === "month"
      ? attendanceByMonth
      : period === "3months"
        ? attendanceBy3Months
        : attendanceByYear;

  const stats =
    period === "month"
      ? statsMonth
      : period === "3months"
        ? stats3Months
        : statsYear;

  const periodLabel =
    period === "month"
      ? periodLabels.month
      : period === "3months"
        ? periodLabels.threeMonths
        : periodLabels.year;

  const description =
    period === "month"
      ? descriptionByPeriod.month
      : period === "3months"
        ? descriptionByPeriod.threeMonths
        : descriptionByPeriod.year;

  const donutTitle = `${periodLabel} 교육 중 실습코치 참여 비율`;

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">
        교육 참석 현황
      </h2>
      <p className="text-sm text-[var(--muted)] mb-3">
        {description}
      </p>

      {/* 기간 토글 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            { key: "month" as const, label: periodLabels.month },
            { key: "3months" as const, label: periodLabels.threeMonths },
            { key: "year" as const, label: periodLabels.year },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              period === key
                ? "bg-[var(--brand)] text-white"
                : "bg-[var(--muted)]/20 text-[var(--muted-foreground)] hover:bg-[var(--muted)]/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttendanceBarChart data={attendanceData} />
        <CoachParticipationDonut
          total={stats.total}
          coachParticipated={stats.participated}
          title={donutTitle}
        />
      </div>
      <div className="mt-4">
        <AttendanceDetailTable data={attendanceData} />
      </div>
    </div>
  );
}
