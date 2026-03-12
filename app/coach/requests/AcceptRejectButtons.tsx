"use client";

import { useState } from "react";
import { updateAssignmentStatus } from "@/lib/data";
import { useRouter } from "next/navigation";

export function AcceptRejectButtons({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  const handle = async (status: "accepted" | "rejected") => {
    setLoading(status === "accepted" ? "accept" : "reject");
    try {
      await updateAssignmentStatus(assignmentId, status);
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-4 flex gap-3">
      <button
        type="button"
        onClick={() => handle("accepted")}
        disabled={!!loading}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        {loading === "accept" ? "처리 중..." : "수락"}
      </button>
      <button
        type="button"
        onClick={() => handle("rejected")}
        disabled={!!loading}
        className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--background)] disabled:opacity-50"
      >
        {loading === "reject" ? "처리 중..." : "거절"}
      </button>
    </div>
  );
}
