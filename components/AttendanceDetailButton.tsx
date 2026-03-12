"use client";

import { useState } from "react";
import { BarChart2 } from "lucide-react";
import type { AttendanceByRegionItem } from "./AttendanceBarChart";
import { AttendanceDetailModal } from "./AttendanceDetailModal";

export function AttendanceDetailButton({ data }: { data: AttendanceByRegionItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
      >
        <BarChart2 className="h-4 w-4" />
        상세보기
      </button>
      <AttendanceDetailModal data={data} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
