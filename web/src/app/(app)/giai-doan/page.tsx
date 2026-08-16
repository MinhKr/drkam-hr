import { BangKeoTha } from "@/components/giai-doan/bang-keo-tha";
import type { ChonLua } from "@/components/ung-vien/form-ung-vien";
import { Card, CardBody } from "@/components/ui/primitives";
import { banDoGiaiDoan, layGiaTri, layTheoLoai } from "@/lib/danh-muc";
import { layLichTheoUngVien } from "@/lib/phong-van";
import { taoSupabaseServer } from "@/lib/supabase/server";
import { GIAI_DOAN, type GiaiDoan } from "@/lib/types";
import type { UngVienRow } from "@/lib/ung-vien";

export const metadata = { title: "Bảng giai đoạn" };

/** Mỗi cột chỉ tải bấy nhiêu thẻ, tránh kéo hàng nghìn hồ sơ ra trình duyệt */
const MOI_COT = 40;

export default async function TrangGiaiDoan() {
  const supabase = await taoSupabaseServer();
  const banDo = await banDoGiaiDoan();

  const rong = Object.fromEntries(
    GIAI_DOAN.map((g) => [g.key, [] as UngVienRow[]]),
  ) as Record<GiaiDoan, UngVienRow[]>;
  const demRong = Object.fromEntries(GIAI_DOAN.map((g) => [g.key, 0])) as Record<GiaiDoan, number>;

  if (!supabase) {
    return (
      <Card>
        <CardBody className="pt-5">
          <p className="text-base font-medium text-[var(--ink)]">Chưa nối cơ sở dữ liệu</p>
        </CardBody>
      </Card>
    );
  }

  // Lấy các hồ sơ mới nhất rồi gom theo giai đoạn ở phía máy chủ
  const { data, error } = await supabase
    .from("v_ung_vien")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(MOI_COT * GIAI_DOAN.length * 2);

  const theoGiaiDoan = { ...rong };
  const tong = { ...demRong };

  for (const uv of (data ?? []) as UngVienRow[]) {
    const gd = banDo[uv.status] ?? "moi_ve";
    tong[gd] += 1;
    if (theoGiaiDoan[gd].length < MOI_COT) theoGiaiDoan[gd].push(uv);
  }

  // dữ liệu cho hộp thoại hồ sơ mở từ thẻ
  const dangHien = Object.values(theoGiaiDoan).flat();
  const [
    viTri,
    phongBan,
    capBac,
    khuVuc,
    gioiTinh,
    tinh,
    nguon,
    trangThai,
    sangLoc,
    offer,
    nguoiPV,
    hinhThucPV,
    ketQuaPV,
    lichTheoUV,
  ] = await Promise.all([
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
    layGiaTri("interviewer"),
    layGiaTri("interview_mode"),
    layGiaTri("interview_result"),
    layLichTheoUngVien(dangHien.map((u) => u.id)),
  ]);

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
    nguoi_sang_loc: sangLoc.map((v) => v.value),
    offer_status: offer.map((v) => v.value),
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">Bảng giai đoạn</h1>
        <p className="mt-1 max-w-3xl text-base text-[var(--ink-muted)]">
          Cùng dữ liệu với màn hình Quản lý CV nhưng bày theo 5 giai đoạn của phễu tuyển dụng —
          nhìn một cái là biết đang tắc ở khâu nào.
        </p>
      </div>

      {error && (
        <Card className="border-[var(--danger)]">
          <CardBody className="pt-5">
            <p className="text-base font-medium text-[var(--ink)]">Không đọc được danh sách</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{error.message}</p>
          </CardBody>
        </Card>
      )}

      <BangKeoTha
        theoGiaiDoan={theoGiaiDoan}
        tongTheoGiaiDoan={tong}
        chon={chon}
        chonLichPV={{ nguoi_pv: nguoiPV, hinh_thuc: hinhThucPV, ket_qua: ketQuaPV }}
        lichTheoUV={lichTheoUV}
        banDoGiaiDoan={banDo}
      />
    </div>
  );
}
