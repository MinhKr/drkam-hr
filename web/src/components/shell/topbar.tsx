"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AvatarChu } from "@/components/ui/primitives";
import { taoSupabaseClient } from "@/lib/supabase/client";
import { daNoiSupabase } from "@/lib/supabase/config";

export function Topbar({ email }: { email: string | null }) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  async function dangXuat() {
    if (!daNoiSupabase) return;
    await taoSupabaseClient().auth.signOut();
    router.push("/dang-nhap");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-[var(--topbar-h)] items-center gap-4 border-b border-[var(--line)] bg-[var(--topbar-bg)] px-5">
      {/* Ô tìm kiếm nằm trong thanh bộ lọc của từng màn hình, không để ở đây
          nữa để tránh hai ô tìm kiếm cùng lúc. */}
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Đổi nền sáng tối"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {/* Hiện icon bằng CSS thay vì state, tránh lệch giữa máy chủ và trình duyệt */}
          <Moon className="dark:hidden" />
          <Sun className="hidden dark:block" />
        </Button>

        {email ? (
          <div className="flex items-center gap-2.5 border-l border-[var(--line)] pl-3">
            <AvatarChu ten={email} className="size-8 text-xs" />
            <span className="hidden text-sm text-[var(--ink-2)] sm:block">
              {email}
            </span>
            <Button variant="ghost" size="icon-sm" aria-label="Đăng xuất" onClick={dangXuat}>
              <LogOut />
            </Button>
          </div>
        ) : (
          <span className="rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-medium text-[var(--warning-soft-fg)]">
            Xem trước
          </span>
        )}
      </div>
    </header>
  );
}
