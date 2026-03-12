"use client";

import { useState } from "react";
import { updateCoachProfileLevel } from "@/lib/data";

export function CoachLevelForm({
  profileId,
  currentLevel,
}: {
  profileId: string;
  currentLevel: number;
}) {
  const [level, setLevel] = useState(currentLevel);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (level === currentLevel) return;
    setSaving(true);
    try {
      await updateCoachProfileLevel(profileId, level);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      <label className="text-xs text-[var(--muted)]">레벨</label>
      <select
        value={level}
        onChange={(e) => setLevel(Number(e.target.value))}
        className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || level === currentLevel}
        className="rounded bg-[var(--brand)] px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
