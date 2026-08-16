import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { nguoiDangDangNhap } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const email = await nguoiDangDangNhap();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />
      <div className="lg:pl-[var(--sidebar-w)]">
        <Topbar email={email} />
        <main className="mx-auto max-w-[1400px] px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
