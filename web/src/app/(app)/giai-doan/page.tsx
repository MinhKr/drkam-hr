import { BangKeoTha } from "@/components/giai-doan/bang-keo-tha";
import type { ChonLua } from "@/components/ung-vien/form-ung-vien";
import { Card, CardBody } from "@/components/ui/primitives";
import { banDoGiaiDoan, layGiaTri, layTheoLoai } from "@/lib/danh-muc";
import { NGAY_GIU_O_COT_DUNG, TOI_DA_LUU_TRU, mocLuuTru } from "@/lib/giai-doan";
import { layLichTheoUngVien } from "@/lib/phong-van";
import { taoSupabaseServer } from "@/lib/supabase/server";
import { GIAI_DOAN, type GiaiDoan } from "@/lib/types";
import type { UngVienRow } from "@/lib/ung-vien";

export const metadata = { title: "Bảng giai đoạn" };

/** Mỗi cột chỉ tải bấy nhiêu thẻ, tránh kéo hàng nghìn hồ sơ ra trình duyệt */
const MOI_COT = 40;

/** Mã lỗi Postgres "column does not exist" */
const CHUA_CO_COT = "42703";

const NHAC_CHAY_MIGRATION =
  "Cơ sở dữ liệu chưa có cột stopped_at nên chưa tách được khu lưu trữ. " +
  "Mở Supabase → SQL Editor rồi chạy web/supabase/migrations/0007_luu_tru_dung.sql, " +
  "sau đó tải lại trang. Bảng giai đoạn vẫn dùng bình thường trong lúc chờ.";

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

  // Hồ sơ dừng lâu rồi thì không lên bảng nữa mà xuống khu lưu trữ bên dưới,
  // nên phải hỏi cơ sở dữ liệu hai lượt: một cho bảng, một cho khu lưu trữ.
  const moc = mocLuuTru();

  const [bang, luuTru] = await Promise.all([
    // Lấy các hồ sơ mới nhất rồi gom theo giai đoạn ở phía máy chủ.
    // stopped_at null = chưa dừng, phải giữ lại — chính là gần hết bảng.
    supabase
      .from("v_ung_vien")
      .select("*")
      .or(`stopped_at.is.null,stopped_at.gte."${moc}"`)
      .order("received_at", { ascending: false })
      .limit(MOI_COT * GIAI_DOAN.length * 2),
    // Khu lưu trữ: mới dừng xếp trước, để cái vừa rơi xuống nằm ngay đầu
    supabase
      .from("v_ung_vien")
      .select("*", { count: "exact" })
      .lt("stopped_at", moc)
      .order("stopped_at", { ascending: false })
      .limit(TOI_DA_LUU_TRU),
  ]);

  // Chưa chạy 0007 thì view chưa có stopped_at, cả hai truy vấn trên cùng hỏng.
  // Lấy lại bảng theo cách cũ để màn hình vẫn dùng được, chỉ thiếu khu lưu trữ.
  const thieuCot = bang.error?.code === CHUA_CO_COT || luuTru.error?.code === CHUA_CO_COT;
  const bangCuoi = thieuCot
    ? await supabase
        .from("v_ung_vien")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(MOI_COT * GIAI_DOAN.length * 2)
    : bang;

  // Thiếu mỗi cột stopped_at mà truy vấn lùi vẫn chạy được: đây là lời nhắc
  // cài đặt, không phải hỏng — báo bằng thẻ vàng chứ đừng doạ người dùng.
  const nhacCaiDat = thieuCot && !bangCuoi.error;
  const loi =
    (thieuCot ? bangCuoi.error?.message : (bang.error?.message ?? luuTru.error?.message)) ??
    (nhacCaiDat ? NHAC_CHAY_MIGRATION : null);

  const dsLuuTru = thieuCot ? [] : ((luuTru.data ?? []) as UngVienRow[]);
  const tongLuuTru = thieuCot ? 0 : (luuTru.count ?? dsLuuTru.length);

  const theoGiaiDoan = { ...rong };
  const tong = { ...demRong };

  for (const uv of (bangCuoi.data ?? []) as UngVienRow[]) {
    const gd = banDo[uv.status] ?? "moi_ve";
    tong[gd] += 1;
    if (theoGiaiDoan[gd].length < MOI_COT) theoGiaiDoan[gd].push(uv);
  }

  // dữ liệu cho hộp thoại hồ sơ — mở được từ thẻ trên bảng lẫn hàng lưu trữ
  const dangHien = [...Object.values(theoGiaiDoan).flat(), ...dsLuuTru];
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
          nhìn một cái là biết đang tắc ở khâu nào. Hồ sơ dừng quá{" "}
          {NGAY_GIU_O_COT_DUNG} ngày xuống khu lưu trữ bên dưới bảng.
        </p>
      </div>

      {loi && (
        <Card className={nhacCaiDat ? "border-[var(--warning)]" : "border-[var(--danger)]"}>
          <CardBody className="pt-5">
            <p className="text-base font-medium text-[var(--ink)]">
              {nhacCaiDat ? "Còn thiếu một bước cài đặt" : "Không đọc được danh sách"}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{loi}</p>
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
        luuTru={dsLuuTru}
        tongLuuTru={tongLuuTru}
      />
    </div>
  );
}
