"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CoachLoginProfile } from "@/types";

type UpdateFn = (
  rowIndex: number,
  updates: {
    status?: string;
    name?: string;
    affiliation?: string;
    email?: string;
    contact?: string;
    birthDate?: string;
    address?: string;
  }
) => Promise<boolean>;

export function CoachProfileTable({
  profiles,
  onUpdateProfile,
}: {
  profiles: CoachLoginProfile[];
  onUpdateProfile: UpdateFn;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CoachLoginProfile | null>(null);
  const [form, setForm] = useState({
    status: "",
    name: "",
    affiliation: "",
    email: "",
    contact: "",
    birthDate: "",
    address: "",
  });

  const openEdit = (p: CoachLoginProfile) => {
    setEditing(p);
    setForm({
      status: p.status,
      name: p.name,
      affiliation: p.affiliation,
      email: p.email,
      contact: p.contact,
      birthDate: p.birthDate,
      address: p.address,
    });
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const ok = await onUpdateProfile(editing.rowIndex, form);
    if (ok) {
      closeEdit();
      router.refresh();
    }
  };

  const activeProfiles = profiles.filter(
    (p) => String(p.status).trim().toLowerCase() !== "inactive"
  );
  const inactiveProfiles = profiles.filter(
    (p) => String(p.status).trim().toLowerCase() === "inactive"
  );

  const renderTableBody = (
    list: CoachLoginProfile[],
    rowStyle: "active" | "inactive"
  ) =>
    list.map((p, i) => {
      const isInternal = String(p.affiliation).trim().includes("내부");
      const rowClass =
        rowStyle === "inactive"
          ? "border-b border-[var(--border)] bg-gray-200/80 dark:bg-gray-800/60 text-[var(--muted)]"
          : isInternal
            ? "border-b border-[var(--border)] bg-amber-100 dark:bg-amber-950/30"
            : "border-b border-[var(--border)] hover:bg-[var(--background)]/30";
      return (
        <tr key={`${p.rowIndex}-${i}`} className={rowClass}>
          <td className="px-4 py-3 font-medium whitespace-nowrap">
            {p.name || "-"}
          </td>
          <td className="px-4 py-3 overflow-hidden">
            <span
              className="block truncate"
              title={p.email || undefined}
            >
              {p.email || "-"}
            </span>
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            {p.contact || "-"}
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            {p.birthDate || "-"}
          </td>
          <td className="px-4 py-3 min-w-0 overflow-hidden">
            <span
              className="block truncate"
              title={p.address || undefined}
            >
              {p.address || "-"}
            </span>
          </td>
          <td className="px-4 py-3 text-right">
            <button
              type="button"
              onClick={() => openEdit(p)}
              className="text-sm text-[var(--brand)] hover:underline font-medium"
            >
              수정
            </button>
          </td>
        </tr>
      );
    });

  const tableCols = (
    <>
      <col style={{ width: "10%" }} />
      <col style={{ width: "220px" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "auto" }} />
      <col style={{ width: "72px" }} />
    </>
  );

  const tableHeader = (
    <tr className="border-b border-[var(--border)] bg-[var(--background)]/50">
      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
        이름
      </th>
      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
        이메일
      </th>
      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
        연락처
      </th>
      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
        생년월일
      </th>
      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
        거주지
      </th>
      <th className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">
        작업
      </th>
    </tr>
  );

  return (
    <>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup>{tableCols}</colgroup>
            <thead>{tableHeader}</thead>
            <tbody>{renderTableBody(activeProfiles, "active")}</tbody>
          </table>
        </div>
        {activeProfiles.length === 0 && inactiveProfiles.length === 0 && (
          <div className="px-6 py-12 text-center text-[var(--muted)]">
            실습코치 로그인 시트에 데이터가 없습니다.
          </div>
        )}
        {activeProfiles.length === 0 && inactiveProfiles.length > 0 && (
          <div className="px-6 py-8 text-center text-[var(--muted)]">
            교육 가능한 실습코치가 없습니다.
          </div>
        )}
      </div>

      {inactiveProfiles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            교육 불가
          </h2>
          <p className="text-sm text-[var(--muted)]">
            상태가 Inactive인 실습코치입니다. 수정에서 Active로 변경하면 위 목록으로 이동합니다.
          </p>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
                <colgroup>{tableCols}</colgroup>
                <thead>{tableHeader}</thead>
                <tbody>{renderTableBody(inactiveProfiles, "inactive")}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          aria-modal="true"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-card p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              프로필 수정
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  실습코치 상태
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  소속
                </label>
                <input
                  type="text"
                  value={form.affiliation}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, affiliation: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  placeholder="내부 / 외부"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  이메일
                </label>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  연락처
                </label>
                <input
                  type="text"
                  value={form.contact}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  생년월일
                </label>
                <input
                  type="text"
                  value={form.birthDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, birthDate: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  placeholder="예: 1996.06.13"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                  거주지
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
