import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardCheck, Database, Users } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { layDanhMuc } from "@/lib/danh-muc";
import { daNoiSupabase } from "@/lib/supabase/config";
import { taoSupabaseServer } from "@/lib/supabase/server";
import { demCanhBao } from "@/lib/ung-vien";

export const metadata = { title: "Tổng quan" };

const LO_TRINH = [
  { ngay: "Ngày 1 · 14.08", viec: "Nền tảng, cơ sở dữ liệu, danh mục, đăng nhập", xong: true },
  { ngay: "Ngày 2 · 15.08", viec: "Quản lý CV: danh sách, hồ sơ, chặn trùng, tự động hoá", xong: true },
  { ngay: "Ngày 3 · 16.08", viec: "Lịch phỏng vấn, lịch tuần kéo thả, bảng giai đoạn", xong: true },
  { ngay: "Ngày 4 · 17.08", viec: "Onboard, thử việc, nhập hàng loạt, xuất Excel", xong: false },
  { ngay: "Ngày 5 · 18.08", viec: "Import dữ liệu cũ, bàn giao, go-live", xong: false },
];

export default async function TrangTongQuan() {
  const [danhMuc, dem, supabase] = await Promise.all([
    layDanhMuc(),
    demCanhBao(),
    taoSupabaseServer(),
  ]);

  const theoLoai = danhMuc.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});

  // Đếm lịch PV sắp tới và số người đang onboard
  let soLichSapToi = 0;
  let soOnboard = 0;
  if (supabase) {
    const homNay = new Date().toISOString().slice(0, 10);
    const [pv, ob] = await Promise.all([
      supabase
        .from("interviews")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_date", homNay),
      supabase.from("onboardings").select("id", { count: "exact", head: true }),
    ]);
    soLichSapToi = pv.count ?? 0;
    soOnboard = ob.count ?? 0;
  }

  const oSo = [
    {
      nhan: "Ứng viên",
      so: dem.tong,
      ghiChu:
        dem.chua_sang_loc > 0 ? `${dem.chua_sang_loc} hồ sơ chưa sàng lọc` : "đã sàng lọc hết",
      Icon: Users,
      href: "/ung-vien",
    },
    {
      nhan: "Lịch phỏng vấn sắp tới",
      so: soLichSapToi,
      ghiChu: dem.chua_dat_lich > 0 ? `${dem.chua_dat_lich} hồ sơ chưa đặt lịch` : "không còn tồn",
      Icon: CalendarDays,
      href: "/lich-phong-van",
    },
    {
      nhan: "Đang onboard",
      so: soOnboard,
      ghiChu: "Checklist làm ở ngày 4",
      Icon: ClipboardCheck,
      href: "/onboard",
    },
    {
      nhan: "Quá 7 ngày chưa phản hồi",
      so: dem.qua_han,
      ghiChu: dem.qua_han > 0 ? "cần xử lý sớm" : "không có hồ sơ nào tồn",
      Icon: Database,
      href: "/ung-vien?canh_bao=qua_han",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">
            Tổng quan
          </h1>
          <p className="mt-1 text-base text-[var(--ink-muted)]">
            Hệ thống tuyển dụng nội bộ DrKam — thay cho file Google Sheet.
          </p>
        </div>
        {daNoiSupabase ? (
          <Badge tone="success">Đã nối cơ sở dữ liệu</Badge>
        ) : (
          <Badge tone="warning">Chế độ xem trước — chưa nối Supabase</Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {oSo.map(({ nhan, so, ghiChu, Icon, href }) => (
          <Link key={nhan} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-[var(--line-strong)]">
              <CardBody className="flex flex-col gap-3 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--ink-muted)]">
                    {nhan}
                  </span>
                  <Icon className="size-4 text-[var(--ink-faint)]" />
                </div>
                <span className="tabular text-3xl font-bold leading-none text-[var(--ink)]">
                  {so.toLocaleString("vi-VN")}
                </span>
                <span className="text-xs text-[var(--ink-faint)]">{ghiChu}</span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Lộ trình 5 ngày</CardTitle>
            <Badge tone="primary">Đang ở ngày 4</Badge>
          </CardHeader>
          <CardBody className="flex flex-col gap-0">
            {LO_TRINH.map((m, i) => (
              <div
                key={m.ngay}
                className="flex items-start gap-3 border-t border-[var(--line)] py-3 first:border-t-0 first:pt-0"
              >
                <span
                  className={
                    m.xong
                      ? "mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--success)] text-[10px] font-bold text-white"
                      : "mt-1 grid size-5 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] text-[10px] font-semibold text-[var(--ink-faint)]"
                  }
                >
                  {m.xong ? "✓" : i + 1}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--ink)]">
                    {m.ngay}
                  </span>
                  <span className="text-sm text-[var(--ink-muted)]">{m.viec}</span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh mục đã nạp từ Excel</CardTitle>
            <Link
              href="/danh-muc"
              className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Xem tất cả <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {Object.entries(theoLoai)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([loai, so]) => (
                  <Badge key={loai} tone="outline" className="tabular">
                    {loai} · {so}
                  </Badge>
                ))}
            </div>
            <p className="mt-4 text-sm text-[var(--ink-muted)]">
              Toàn bộ lấy từ <span className="font-medium text-[var(--ink-2)]">DATA UV DRKAM 2026.xlsx</span>,
              đã gộp các giá trị trùng nghĩa (Face → Facebook, VN Work → Vietnamworks) và sửa
              những giá trị bị lỗi chuỗi trong danh sách vị trí.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
