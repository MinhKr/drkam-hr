import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardCheck, Database, Users } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { NHAN_LOAI_DANH_MUC, layDanhMuc } from "@/lib/danh-muc";
import { daNoiSupabase } from "@/lib/supabase/config";
import { taoSupabaseServer } from "@/lib/supabase/server";
import { demCanhBao } from "@/lib/ung-vien";

export const metadata = { title: "Tổng quan" };

/** Quy trình một hồ sơ đi qua, hiện ở trang Tổng quan cho người mới dùng */
const QUY_TRINH = [
  {
    buoc: "Nhận CV",
    viec: "Thêm ứng viên mới, hệ thống tự dò trùng theo số điện thoại và email",
    href: "/ung-vien",
  },
  {
    buoc: "Sàng lọc",
    viec: "Ghi người sàng lọc và kết quả, đổi trạng thái hồ sơ",
    href: "/ung-vien?canh_bao=chua_sang_loc",
  },
  {
    buoc: "Phỏng vấn",
    viec: "Đặt lịch vòng 1 và vòng 2, nhập kết quả ngay trên danh sách",
    href: "/lich-phong-van",
  },
  {
    buoc: "Nhận việc",
    viec: "PV vòng 2 đạt là tự sinh dòng onboard, theo checklist và 3 mốc thử việc",
    href: "/onboard",
  },
];

export default async function TrangTongQuan() {
  const [danhMuc, dem, supabase] = await Promise.all([
    layDanhMuc(),
    demCanhBao(),
    taoSupabaseServer(),
  ]);

  // chỉ đếm giá trị đang hiện — danh mục bị ẩn không còn là lựa chọn nữa
  const theoLoai = danhMuc.reduce<Record<string, number>>((acc, c) => {
    if (c.active === false) return acc;
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
      ghiChu: soOnboard > 0 ? "đang theo dõi thử việc" : "chưa có ai nhận việc",
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
            <CardTitle>Một hồ sơ đi qua 4 bước</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-0">
            {QUY_TRINH.map((m, i) => (
              <Link
                key={m.buoc}
                href={m.href}
                className="group flex items-start gap-3 border-t border-[var(--line)] py-3 first:border-t-0 first:pt-0"
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-[10px] font-bold text-[var(--primary-soft-fg)]">
                  {i + 1}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--primary)]">
                    {m.buoc}
                  </span>
                  <span className="text-sm text-[var(--ink-muted)]">{m.viec}</span>
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh mục dùng chung</CardTitle>
            <Link
              href="/danh-muc"
              className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Sửa danh mục <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {Object.entries(theoLoai)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([loai, so]) => (
                  <Badge key={loai} tone="outline" className="tabular">
                    {NHAN_LOAI_DANH_MUC[loai] ?? loai} · {so}
                  </Badge>
                ))}
            </div>
            <p className="mt-4 text-sm text-[var(--ink-muted)]">
              Đây là các giá trị cho mọi ô chọn trong app: vị trí ứng tuyển, phòng ban, nguồn CV,
              trạng thái, người phỏng vấn… Màn hình{" "}
              <span className="font-medium text-[var(--ink-2)]">Danh mục</span> hiện chỉ để xem;
              cần thêm giá trị mới thì nhờ người phụ trách kỹ thuật.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
