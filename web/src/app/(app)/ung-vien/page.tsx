import Link from "next/link";
import { AlertTriangle, CalendarOff, FileSearch, Users } from "lucide-react";
import { BoLoc } from "@/components/ung-vien/bo-loc";
import { BangUngVien } from "@/components/ung-vien/bang-ung-vien";
import type { ChonLua } from "@/components/ung-vien/form-ung-vien";
import { Card, CardBody } from "@/components/ui/primitives";
import { banDoGiaiDoan, layGiaTri, layTheoLoai } from "@/lib/danh-muc";
import { layLichTheoUngVien } from "@/lib/phong-van";
import {
  MOI_TRANG,
  demCanhBao,
  docBoLoc,
  layDanhSachUngVien,
  type BoLoc as Loc,
} from "@/lib/ung-vien";
import { cn } from "@/lib/utils";

export const metadata = { title: "Quản lý CV" };

type Params = Record<string, string | string[] | undefined>;

export default async function TrangUngVien(props: {
  searchParams: Promise<Params>;
}) {
  const sp = await props.searchParams;

  // gom về URLSearchParams để trang này và route xuất Excel đọc bộ lọc bằng cùng một hàm
  const qs = new URLSearchParams();
  for (const [khoa, v] of Object.entries(sp)) {
    if (typeof v === "string" && v) qs.set(khoa, v);
  }

  const loc: Loc = docBoLoc(qs);

  const [
    { rows, tong, loi },
    dem,
    viTri,
    phongBan,
    capBac,
    khuVuc,
    gioiTinh,
    tinh,
    nguon,
    trangThai,
    nguoiSangLoc,
    offerStatus,
    giaiDoan,
    nguoiPV,
    hinhThucPV,
    ketQuaPV,
  ] = await Promise.all([
    layDanhSachUngVien(loc),
    demCanhBao(),
    layTheoLoai("position"),
    layTheoLoai("department"),
    layTheoLoai("level"),
    layTheoLoai("region"),
    layTheoLoai("gender"),
    layTheoLoai("province"),
    layTheoLoai("source"),
    layTheoLoai("cv_status"),
    layTheoLoai("screener"),
    layTheoLoai("offer_status"),
    banDoGiaiDoan(),
    layGiaTri("interviewer"),
    layGiaTri("interview_mode"),
    layGiaTri("interview_result"),
  ]);

  // lịch phỏng vấn của đúng những ứng viên đang hiện trên trang
  const lichTheoUV = await layLichTheoUngVien(rows.map((r) => r.id));

  const chon: ChonLua = {
    vi_tri: viTri.map((v) => ({
      value: v.value,
      department: v.meta?.department ?? "",
      level: v.meta?.level ?? "",
    })),
    phong_ban: phongBan.map((v) => v.value),
    cap_bac: capBac.map((v) => v.value),
    khu_vuc: khuVuc.map((v) => v.value),
    gioi_tinh: gioiTinh.map((v) => v.value),
    tinh: tinh.map((v) => v.value),
    nguon: nguon.map((v) => v.value),
    trang_thai: trangThai.map((v) => v.value),
    nguoi_sang_loc: nguoiSangLoc.map((v) => v.value),
    offer_status: offerStatus.map((v) => v.value),
  };

  const O_DEM = [
    { khoa: undefined, nhan: "Tất cả ứng viên", so: dem.tong, Icon: Users, tone: "" },
    {
      khoa: "chua_sang_loc",
      nhan: "Chưa sàng lọc",
      so: dem.chua_sang_loc,
      Icon: FileSearch,
      tone: "text-[var(--secondary)]",
    },
    {
      khoa: "chua_dat_lich",
      nhan: "Chưa đặt lịch PV",
      so: dem.chua_dat_lich,
      Icon: CalendarOff,
      tone: "text-[var(--warning)]",
    },
    {
      khoa: "qua_han",
      nhan: "Quá 7 ngày chưa phản hồi",
      so: dem.qua_han,
      Icon: AlertTriangle,
      tone: "text-[var(--danger)]",
    },
  ] as const;

  function duongDan(canhBao?: string) {
    const p = new URLSearchParams(qs);
    p.delete("canh_bao");
    p.delete("trang");
    if (canhBao) p.set("canh_bao", canhBao);
    const s = p.toString();
    return s ? `/ung-vien?${s}` : "/ung-vien";
  }

  const soTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));
  const trangHienTai = Math.min(Math.max(1, loc.trang ?? 1), soTrang);

  function duongDanTrang(t: number) {
    const p = new URLSearchParams(qs);
    p.delete("trang");
    if (t > 1) p.set("trang", String(t));
    const s = p.toString();
    return s ? `/ung-vien?${s}` : "/ung-vien";
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">Quản lý CV</h1>
        <p className="mt-1 text-base text-[var(--ink-muted)]">
          Thay cho sheet <span className="font-medium text-[var(--ink-2)]">Data</span> — mọi hồ sơ
          ứng viên và kết quả sàng lọc.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {O_DEM.map(({ khoa, nhan, so, Icon, tone }) => {
          const dangChon = (loc.canh_bao ?? undefined) === khoa;
          return (
            <Link key={nhan} href={duongDan(khoa)}>
              <Card
                className={cn(
                  "h-full transition-colors hover:border-[var(--line-strong)]",
                  dangChon && "border-[var(--primary)] bg-[var(--primary-soft)]",
                )}
              >
                <CardBody className="flex items-center justify-between gap-3 py-4">
                  <div className="flex flex-col">
                    <span className="tabular text-2xl font-bold leading-none text-[var(--ink)]">
                      {so.toLocaleString("vi-VN")}
                    </span>
                    <span className="mt-1 text-sm text-[var(--ink-muted)]">{nhan}</span>
                  </div>
                  <Icon className={cn("size-5 text-[var(--ink-faint)]", tone)} />
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      <BoLoc
        nhom={{
          vi_tri: chon.vi_tri.map((v) => v.value),
          phong_ban: chon.phong_ban,
          trang_thai: chon.trang_thai,
          nguon: chon.nguon,
          nguoi_sang_loc: chon.nguoi_sang_loc,
          khu_vuc: chon.khu_vuc,
        }}
        tong={tong}
      />

      {loi && (
        <Card className="border-[var(--danger)]">
          <CardBody className="pt-5">
            <p className="text-base font-medium text-[var(--ink)]">Không đọc được danh sách</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {loi}. Nếu báo <span className="code">v_ung_vien</span> không tồn tại thì chạy file{" "}
              <span className="code">web/supabase/migrations/0004_view_ung_vien.sql</span> trong
              Supabase SQL Editor.
            </p>
          </CardBody>
        </Card>
      )}

      <BangUngVien
        rows={rows}
        chon={chon}
        banDoGiaiDoan={giaiDoan}
        lichTheoUV={lichTheoUV}
        chonLichPV={{ nguoi_pv: nguoiPV, hinh_thuc: hinhThucPV, ket_qua: ketQuaPV }}
      />

      {tong > MOI_TRANG && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--ink-muted)]">
            Hiện {(trangHienTai - 1) * MOI_TRANG + 1}–
            {Math.min(trangHienTai * MOI_TRANG, tong)} trong tổng {tong.toLocaleString("vi-VN")}
          </p>
          <div className="flex items-center gap-1.5">
            <Link
              href={duongDanTrang(trangHienTai - 1)}
              aria-disabled={trangHienTai <= 1}
              className={cn(
                "rounded-[var(--r-sm)] border border-[var(--line-strong)] px-3 py-1.5 text-sm text-[var(--ink-2)] hover:bg-[var(--surface-hover)]",
                trangHienTai <= 1 && "pointer-events-none opacity-40",
              )}
            >
              Trước
            </Link>
            <span className="tabular px-2 text-sm text-[var(--ink-muted)]">
              {trangHienTai} / {soTrang}
            </span>
            <Link
              href={duongDanTrang(trangHienTai + 1)}
              aria-disabled={trangHienTai >= soTrang}
              className={cn(
                "rounded-[var(--r-sm)] border border-[var(--line-strong)] px-3 py-1.5 text-sm text-[var(--ink-2)] hover:bg-[var(--surface-hover)]",
                trangHienTai >= soTrang && "pointer-events-none opacity-40",
              )}
            >
              Sau
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
