"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Menu,
  X,
  Calendar,
  UserCheck,
  MessageSquare,
  Users,
  Settings,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

const EM_NAV = [
  { href: "/em", label: "대시보드", title: "대시보드", icon: LayoutDashboard },
  { href: "/em/schedules", label: "일정", title: "교육 일정", icon: Calendar },
  { href: "/em/expected-assign", label: "예상 배정", title: "예상 배정", icon: Sparkles },
  { href: "/em/assignments", label: "배정", title: "배정 관리", icon: UserCheck },
  { href: "/em/reviews", label: "후기", title: "교육 후기", icon: MessageSquare },
  { href: "/em/coaches", label: "코치", title: "실습코치 프로필", icon: Users },
  { href: "/em/auto-assign", label: "자동배정", title: "자동 배정 로직", icon: Settings },
] as const;

export function DashboardShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const basePath = "/em";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 hover:bg-[var(--background)]"
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[var(--brand)]" />
          <span className="font-semibold text-xs">EM</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 lg:hidden ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-44 flex flex-col border-r border-[var(--border)] bg-[var(--card)] transition-transform duration-200 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-12 items-center justify-between border-b border-[var(--border)] px-2.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--brand)]/10 text-[var(--brand)]">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <span className="truncate font-semibold text-xs text-[var(--foreground)]" title="EM 대시보드">
              EM
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 hover:bg-[var(--background)] lg:hidden"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
          {EM_NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== basePath && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--brand)]/10 text-[var(--brand)]"
                    : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-screen pt-14 lg:pt-0 lg:pl-44">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
