"use client";

import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import type { CoachLevelRow } from "@/types";

function toBool(val: string): boolean {
  const v = String(val).toUpperCase();
  return v === "TRUE" || v === "1";
}

function boolLabel(val: string): string {
  const v = String(val).toUpperCase();
  if (v === "TRUE" || v === "1") return "가능";
  if (v === "FALSE" || v === "0") return "불가";
  return val || "-";
}

type UpdateAvailabilityFn = (
  email: string,
  updates: { genAiAvailable?: boolean; pythonAvailable?: boolean; handsonAvailable?: boolean }
) => Promise<boolean>;

export function LevelStatusTable({
  rows,
  onUpdateAvailability,
}: {
  rows: CoachLevelRow[];
  onUpdateAvailability?: UpdateAvailabilityFn;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleChange = async (
    email: string,
    field: "genAiAvailable" | "pythonAvailable" | "handsonAvailable",
    value: "가능" | "불가능"
  ) => {
    if (!onUpdateAvailability) return;
    const ok = await onUpdateAvailability(email, {
      [field]: value === "가능",
    });
    if (ok) router.refresh();
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
        실습코치 등급 시트 데이터가 없습니다. 스프레드시트에 &quot;실습코치 등급&quot; 시트를 추가해 주세요.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background)]/50">
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                LEVEL
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                이름
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                보고서 교육 가능
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                Python/GAS
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                핸즈온가능
              </th>
              <th className="px-4 py-3 text-right font-semibold text-[var(--foreground)] w-24">
                상세
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isOpen = expanded.has(i);
              return (
                <Fragment key={i}>
                  <tr
                    key={i}
                    className="border-b border-[var(--border)] hover:bg-[var(--background)]/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {row.level?.trim() || "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {row.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {boolLabel(row.genAiAvailable)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {boolLabel(row.pythonAvailable)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {boolLabel(row.handsonAvailable)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggle(i)}
                        className="text-sm text-[var(--brand)] hover:underline font-medium"
                        aria-expanded={isOpen}
                      >
                        {isOpen ? "접기" : "상세보기"}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr
                      className="border-b border-[var(--border)] bg-[var(--background)]/20"
                    >
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-4">
                          {onUpdateAvailability && (
                            <div className="flex flex-wrap gap-6 pb-3 border-b border-[var(--border)]">
                              <EditableBool
                                label="보고서 교육 가능"
                                value={toBool(row.genAiAvailable)}
                                onChange={(v) =>
                                  handleChange(
                                    row.email,
                                    "genAiAvailable",
                                    v ? "가능" : "불가능"
                                  )
                                }
                              />
                              <EditableBool
                                label="Python/GAS"
                                value={toBool(row.pythonAvailable)}
                                onChange={(v) =>
                                  handleChange(
                                    row.email,
                                    "pythonAvailable",
                                    v ? "가능" : "불가능"
                                  )
                                }
                              />
                              <EditableBool
                                label="핸즈온가능"
                                value={toBool(row.handsonAvailable)}
                                onChange={(v) =>
                                  handleChange(
                                    row.email,
                                    "handsonAvailable",
                                    v ? "가능" : "불가능"
                                  )
                                }
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                            <DetailItem label="이메일" value={row.email} />
                            <DetailItem label="상태" value={row.status} />
                            <DetailItem label="소속" value={row.affiliation} />
                            <DetailItem
                              label="핸즈온검증"
                              value={row.handsonVerified}
                            />
                            <DetailItem
                              label="수정사유"
                              value={row.modifyReason}
                            />
                            <DetailItem label="연락처" value={row.contact} />
                            <DetailItem label="생년월일" value={row.birthDate} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const v = (value ?? "").trim() || "-";
  return (
    <div>
      <span className="text-[var(--muted)]">{label}: </span>
      <span className="text-[var(--foreground)]">{v}</span>
    </div>
  );
}

function EditableBool({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--muted)] text-sm">{label}:</span>
      <select
        value={value ? "가능" : "불가능"}
        onChange={(e) => onChange(e.target.value === "가능")}
        className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm text-[var(--foreground)]"
      >
        <option value="가능">가능</option>
        <option value="불가능">불가능</option>
      </select>
    </div>
  );
}
