"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  LayoutGrid,
  ListChecks,
  Settings2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MucMenu = {
  href: string;
  nhan: string;
  Icon: React.ComponentType<{ className?: string }>;
  dem?: number;
};

const NHOM: { tieuDe?: string; muc: MucMenu[] }[] = [
  {
    muc: [{ href: "/", nhan: "Tổng quan", Icon: LayoutGrid }],
  },
  {
    tieuDe: "Tuyển dụng",
    muc: [
      { href: "/ung-vien", nhan: "Quản lý CV", Icon: Users },
      { href: "/giai-doan", nhan: "Bảng giai đoạn", Icon: ListChecks },
      { href: "/lich-phong-van", nhan: "Lịch phỏng vấn", Icon: CalendarDays },
    ],
  },
  {
    tieuDe: "Nhân sự mới",
    muc: [{ href: "/onboard", nhan: "Onboard & thử việc", Icon: ClipboardCheck }],
  },
  {
    tieuDe: "Cấu hình",
    muc: [{ href: "/danh-muc", nhan: "Danh mục", Icon: Settings2 }],
  },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:flex"
      aria-label="Điều hướng chính"
    >
      <div className="flex h-[var(--topbar-h)] items-center gap-2.5 border-b border-[var(--sidebar-border)] px-5">
        <span className="grid size-8 shrink-0 place-items-center rounded-[var(--r-sm)] bg-[var(--primary)] text-[13px] font-bold tracking-tight text-[var(--primary-fg)]">
          DK
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-md font-bold tracking-tight text-[var(--ink)]">
            DrKam
          </span>
          <span className="text-2xs font-medium uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            Tuyển dụng
          </span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
        {NHOM.map((nhom, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {nhom.tieuDe && (
              <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                {nhom.tieuDe}
              </p>
            )}
            {nhom.muc.map(({ href, nhan, Icon, dem }) => {
              const dangO = href === "/" ? path === "/" : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={dangO ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-[var(--r-sm)] px-3 py-2 text-base font-medium transition-colors",
                    dangO
                      ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)]"
                      : "text-[var(--sidebar-item-fg)] hover:bg-[var(--sidebar-item-hover-bg)] hover:text-[var(--ink)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[18px] shrink-0",
                      dangO ? "text-[var(--primary)]" : "text-[var(--ink-faint)]",
                    )}
                  />
                  <span className="flex-1">{nhan}</span>
                  {dem != null && dem > 0 && (
                    <span className="tabular rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-2xs font-semibold text-[var(--primary-fg)]">
                      {dem}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] px-5 py-3">
        <p className="text-2xs text-[var(--ink-faint)]">
          Bản nội bộ DrKam · dùng cho nhân sự tuyển dụng
        </p>
      </div>
    </aside>
  );
}
