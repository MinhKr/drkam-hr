"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Input, Label } from "@/components/ui/primitives";
import { taoSupabaseClient } from "@/lib/supabase/client";
import { daNoiSupabase } from "@/lib/supabase/config";

export default function TrangDangNhap() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function dangNhap(e: React.FormEvent) {
    e.preventDefault();
    setLoi(null);
    setDangGui(true);
    try {
      const { error } = await taoSupabaseClient().auth.signInWithPassword({
        email: email.trim(),
        password: matKhau,
      });
      if (error) throw error;

      // quay lại đúng trang đang định vào trước khi bị chặn
      const tiepTuc = new URLSearchParams(window.location.search).get("tiep_tuc");
      router.push(tiepTuc && tiepTuc.startsWith("/") ? tiepTuc : "/");
      router.refresh();
    } catch (err) {
      const goc = err instanceof Error ? err.message : "";
      setLoi(
        /invalid login credentials/i.test(goc)
          ? "Email hoặc mật khẩu không đúng."
          : /email not confirmed/i.test(goc)
            ? "Tài khoản này chưa được xác nhận trong Supabase."
            : /too many requests|rate limit/i.test(goc)
              ? "Thử quá nhiều lần. Đợi một lát rồi đăng nhập lại."
              : goc || "Không đăng nhập được. Thử lại giúp tôi.",
      );
      setDangGui(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] px-5 py-10">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-[var(--r-md)] bg-[var(--primary)] text-lg font-bold text-[var(--primary-fg)]">
            DK
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
              DrKam Tuyển dụng
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Đăng nhập bằng tài khoản nội bộ.
            </p>
          </div>
        </div>

        <Card>
          <CardBody className="pt-5">
            {!daNoiSupabase ? (
              <div className="flex flex-col gap-3 text-center">
                <p className="text-base font-medium text-[var(--ink)]">
                  Chưa nối cơ sở dữ liệu
                </p>
                <p className="text-sm text-[var(--ink-muted)]">
                  Điền <span className="font-mono text-xs">.env.local</span> theo hướng dẫn trong{" "}
                  <span className="font-medium">web/README-supabase.md</span> rồi khởi động lại.
                  Trong lúc đó app vẫn xem trước được.
                </p>
                <Button asChild variant="outline">
                  <Link href="/">Vào chế độ xem trước</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={dangNhap} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="ten.ban@drkam.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="matkhau">Mật khẩu</Label>
                  <div className="relative">
                    <Input
                      id="matkhau"
                      type={hienMatKhau ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-10"
                      value={matKhau}
                      onChange={(e) => setMatKhau(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setHienMatKhau((v) => !v)}
                      aria-label={hienMatKhau ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-[var(--ink-faint)] hover:text-[var(--ink-2)]"
                    >
                      {hienMatKhau ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {loi && (
                  <p
                    role="alert"
                    className="rounded-[var(--r-sm)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-soft-fg)]"
                  >
                    {loi}
                  </p>
                )}

                <Button type="submit" disabled={dangGui} className="w-full">
                  {dangGui ? <Loader2 className="animate-spin" /> : <LogIn />}
                  {dangGui ? "Đang đăng nhập…" : "Đăng nhập"}
                </Button>

                <p className="text-center text-xs text-[var(--ink-faint)]">
                  Quên mật khẩu thì nhờ người quản trị đặt lại trong Supabase → Authentication → Users.
                </p>
              </form>
            )}
          </CardBody>
        </Card>

        <p className="text-center text-xs text-[var(--ink-faint)]">
          Hệ thống nội bộ · Mọi thay đổi đều được ghi nhật ký
        </p>
      </div>
    </div>
  );
}
