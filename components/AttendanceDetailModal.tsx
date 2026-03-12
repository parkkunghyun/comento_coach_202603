"use client";

import { X } from "lucide-react";
import type { AttendanceByRegionItem, EventRegion } from "./AttendanceBarChart";

const REGION_COLORS: Record<EventRegion, string> = {
  서울: "#3b82f6",
  "경기도 지역": "#22c55e",
  지방: "#f59e0b",
  기타: "#cbd5e1",
};

const REGION_KEYS: EventRegion[] = ["서울", "경기도 지역", "지방", "기타"];

/** 실습코치별 지역 참석 상세 테이블 (인라인, 모달 아님) */
export function AttendanceDetailTable({ data }: { data: AttendanceByRegionItem[] }) {
  if (!data.length) return null;

  const maxByRegion = REGION_KEYS.reduce(
    (acc, key) => {
      acc[key] = Math.max(1, ...data.map((d) => d[key] ?? 0));
      return acc;
    },
    {} as Record<EventRegion, number>
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <h3 className="text-sm font-semibold text-[var(--foreground)] px-4 py-3 border-b border-[var(--border)]">
        실습코치별 지역 참석 상세
      </h3>
      <div className="overflow-auto p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-4 font-medium text-[var(--foreground)]">이름</th>
              {REGION_KEYS.map((key) => (
                <th key={key} className="text-left py-2 pr-2 font-medium text-[var(--foreground)]">
                  {key}
                </th>
              ))}
              <th className="text-right py-2 font-medium text-[var(--foreground)]">합계</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const total = (row.서울 ?? 0) + (row["경기도 지역"] ?? 0) + (row.지방 ?? 0) + (row.기타 ?? 0);
              return (
                <tr key={row.name} className="border-b border-[var(--border)]/60 hover:bg-[var(--background)]/50">
                  <td className="py-2.5 pr-4 font-medium text-[var(--foreground)]">{row.name}</td>
                  {REGION_KEYS.map((key) => {
                    const count = row[key] ?? 0;
                    const max = maxByRegion[key];
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <td key={key} className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-5 min-w-[2rem] rounded overflow-hidden bg-[var(--background)] flex"
                            style={{ width: "4rem" }}
                          >
                            <div
                              className="h-full rounded transition-all"
                              style={{
                                width: `${pct}%`,
                                minWidth: count > 0 ? "0.5rem" : 0,
                                backgroundColor: REGION_COLORS[key],
                              }}
                            />
                          </div>
                          <span className="text-[var(--muted)] tabular-nums">{count}회</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2.5 text-right font-medium text-[var(--foreground)] tabular-nums">
                    {total}회
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AttendanceDetailModal({
  data,
  open,
  onClose,
}: {
  data: AttendanceByRegionItem[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const maxByRegion = REGION_KEYS.reduce(
    (acc, key) => {
      acc[key] = Math.max(1, ...data.map((d) => d[key] ?? 0));
      return acc;
    },
    {} as Record<EventRegion, number>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            실습코치별 지역 참석 상세
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 pr-4 font-medium text-[var(--foreground)]">이름</th>
                {REGION_KEYS.map((key) => (
                  <th key={key} className="text-left py-2 pr-2 font-medium text-[var(--foreground)]">
                    {key}
                  </th>
                ))}
                <th className="text-right py-2 font-medium text-[var(--foreground)]">합계</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const total = (row.서울 ?? 0) + (row["경기도 지역"] ?? 0) + (row.지방 ?? 0) + (row.기타 ?? 0);
                return (
                  <tr key={row.name} className="border-b border-[var(--border)]/60 hover:bg-[var(--background)]/50">
                    <td className="py-2.5 pr-4 font-medium text-[var(--foreground)]">{row.name}</td>
                    {REGION_KEYS.map((key) => {
                      const count = row[key] ?? 0;
                      const max = maxByRegion[key];
                      const pct = max > 0 ? (count / max) * 100 : 0;
                      return (
                        <td key={key} className="py-2.5 pr-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-5 min-w-[2rem] rounded overflow-hidden bg-[var(--background)] flex"
                              style={{ width: "4rem" }}
                            >
                              <div
                                className="h-full rounded transition-all"
                                style={{
                                  width: `${pct}%`,
                                  minWidth: count > 0 ? "0.5rem" : 0,
                                  backgroundColor: REGION_COLORS[key],
                                }}
                              />
                            </div>
                            <span className="text-[var(--muted)] tabular-nums">{count}회</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-2.5 text-right font-medium text-[var(--foreground)] tabular-nums">
                      {total}회
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
