import { cache } from "react";
import catalogsJson from "@/data/catalogs.json";
import { taoSupabaseServer } from "./supabase/server";
import type { DanhMuc, DanhMucQuanLy, GiaiDoan, LoaiDanhMuc } from "./types";

const duPhong = catalogsJson as DanhMuc[];

export type NguonDanhMuc = "co_so_du_lieu" | "du_phong";

/**
 * Đọc toàn bộ danh mục, kèm cho biết lấy từ đâu.
 * Có Supabase và bảng có dữ liệu thì lấy từ bảng catalogs,
 * còn lại lùi về bản sinh từ Excel (src/data/catalogs.json).
 *
 * Lấy CẢ dòng đang ẩn (active = false), việc lọc để cho `layTheoLoai`.
 * Cần vậy vì `banDoGiaiDoan` phải biết cả trạng thái đã ẩn: ẩn một Trạng
 * thái CV mà bản đồ giai đoạn không còn nó thì mọi hồ sơ mang trạng thái
 * đó lặng lẽ nhảy về cột "Mới về" trên Bảng giai đoạn. Màn hình Danh mục
 * cũng cần thấy dòng ẩn để bật lại được.
 *
 * Bọc trong `cache()` của React: mỗi lần dựng trang chỉ gọi cơ sở dữ liệu
 * MỘT lần, dù bên trong trang gọi lại bao nhiêu lần cũng dùng chung kết quả.
 * Cần thiết vì `layTheoLoai` / `layGiaTri` / `banDoGiaiDoan` đều gọi hàm này,
 * mà riêng trang Quản lý CV gọi 14 lần — trước đây là 14 lượt tải cả 237 dòng.
 *
 * Chỉ nhớ trong một lượt dựng trang, không nhớ xuyên request: hàm đọc cookie
 * phiên đăng nhập nên không được lưu chung giữa những người dùng khác nhau.
 */
export const layDanhMucCoNguon = cache(
  async (): Promise<{
    muc: DanhMuc[];
    nguon: NguonDanhMuc;
    loi?: string;
  }> => {
    const supabase = await taoSupabaseServer();
    if (!supabase) return { muc: duPhong, nguon: "du_phong" };

    const { data, error } = await supabase
      .from("catalogs")
      .select("id, type, value, sort_order, active, meta")
      .order("type")
      .order("sort_order");

    if (error) return { muc: duPhong, nguon: "du_phong", loi: error.message };
    if (!data || data.length === 0)
      return { muc: duPhong, nguon: "du_phong", loi: "Bảng catalogs chưa có dòng nào" };

    return { muc: data as DanhMuc[], nguon: "co_so_du_lieu" };
  },
);

export async function layDanhMuc(): Promise<DanhMuc[]> {
  return (await layDanhMucCoNguon()).muc;
}

/** Các giá trị đang hiện của một loại — dùng cho mọi ô chọn trong app */
export async function layTheoLoai(loai: LoaiDanhMuc): Promise<DanhMuc[]> {
  const all = await layDanhMuc();
  return all.filter((c) => c.type === loai && c.active !== false);
}

/** Như trên nhưng lấy cả dòng đã ẩn — dùng khi phải hiểu dữ liệu hồ sơ cũ */
export async function layTheoLoaiKeCaAn(loai: LoaiDanhMuc): Promise<DanhMuc[]> {
  const all = await layDanhMuc();
  return all.filter((c) => c.type === loai);
}

export async function layGiaTri(loai: LoaiDanhMuc): Promise<string[]> {
  return (await layTheoLoai(loai)).map((c) => c.value);
}

/** Bản đồ Vị trí → { department, level } dùng cho tính năng tự điền */
export async function banDoViTri(): Promise<Record<string, { department: string; level: string }>> {
  const ds = await layTheoLoai("position");
  return Object.fromEntries(
    ds.map((c) => [
      c.value,
      { department: c.meta?.department ?? "", level: c.meta?.level ?? "" },
    ]),
  );
}

/**
 * Bản đồ Trạng thái CV → giai đoạn phễu (dùng cho bảng kéo thả).
 *
 * Lấy cả trạng thái đã ẩn: ẩn một trạng thái chỉ có nghĩa "đừng cho chọn
 * nữa", chứ hồ sơ cũ vẫn đang mang nó và vẫn phải nằm đúng cột.
 */
export async function banDoGiaiDoan(): Promise<Record<string, GiaiDoan>> {
  const ds = await layTheoLoaiKeCaAn("cv_status");
  return Object.fromEntries(
    ds.map((c) => [c.value, (c.meta?.stage ?? "moi_ve") as GiaiDoan]),
  );
}

/** 17 mục checklist onboard, gom theo 5 nhóm */
export async function nhomCongViecOnboard() {
  const nhom = await layTheoLoai("onboard_task_group");
  const viec = await layTheoLoai("onboard_task");
  return nhom.map((g) => ({
    key: g.meta?.key ?? "",
    ten: g.value,
    viec: viec
      .filter((t) => t.meta?.group === g.meta?.key)
      .map((t) => ({ key: t.meta?.key ?? "", ten: t.value })),
  }));
}

/* ------------------------------------------------- Cho màn hình quản lý */

/**
 * Đọc danh mục kèm số hồ sơ đang dùng mỗi giá trị, từ view v_danh_muc
 * của 0010. Chưa chạy 0010 thì lùi về bảng catalogs và để số dùng là
 * `null` — màn hình vẫn sửa được, chỉ là không cảnh báo trước khi xoá.
 */
export async function layDanhMucQuanLy(): Promise<{
  muc: DanhMucQuanLy[];
  nguon: NguonDanhMuc;
  coSoDung: boolean;
  loi?: string;
}> {
  const goc = await layDanhMucCoNguon();
  if (goc.nguon === "du_phong")
    return { muc: goc.muc.map(khongDem), nguon: "du_phong", coSoDung: false, loi: goc.loi };

  const supabase = await taoSupabaseServer();
  if (!supabase)
    return { muc: goc.muc.map(khongDem), nguon: goc.nguon, coSoDung: false };

  const { data, error } = await supabase
    .from("v_danh_muc")
    .select("id, type, value, sort_order, active, meta, so_dung")
    .order("type")
    .order("sort_order");

  // Chưa chạy 0010 thì view chưa tồn tại — vẫn cho quản lý, chỉ thiếu số đếm
  if (error || !data)
    return { muc: goc.muc.map(khongDem), nguon: goc.nguon, coSoDung: false, loi: error?.message };

  return { muc: data as DanhMucQuanLy[], nguon: goc.nguon, coSoDung: true };
}

const khongDem = (m: DanhMuc): DanhMucQuanLy => ({ ...m, so_dung: null });

/**
 * Ba loại không cho sửa trong app, kèm lý do hiện thẳng trên màn hình.
 *
 * `stage`: 5 khoá giai đoạn phễu (moi_ve, phong_van…) nằm cứng trong code —
 * kiểu `GiaiDoan`, cột của Bảng giai đoạn, màu của nhãn trạng thái.
 * `onboard_task` / `onboard_task_group`: khoá của chúng chính là khoá đang
 * nằm trong onboardings.checklist của từng ca onboard đã lưu.
 */
export const LY_DO_KHOA: Record<string, string> = {
  stage: "5 giai đoạn của Bảng giai đoạn nằm cứng trong code, sửa ở đây sẽ lệch với app",
  onboard_task: "Khoá của 17 mục việc là thứ đang lưu trong checklist từng ca onboard",
  onboard_task_group: "Nhóm việc gắn với checklist onboard đã lưu",
};

export const LOAI_KHOA = Object.keys(LY_DO_KHOA);

export function suaDuocDanhMuc(loai: string): boolean {
  return !LOAI_KHOA.includes(loai);
}

/** Loại nào cần thêm ô nhập riêng cho meta */
export const META_THEO_LOAI: Record<string, ("department" | "level" | "stage")[]> = {
  position: ["department", "level"],
  cv_status: ["stage"],
};

export const NHAN_LOAI_DANH_MUC: Record<string, string> = {
  position: "Vị trí ứng tuyển",
  department: "Phòng ban",
  level: "Cấp bậc",
  region: "Khu vực",
  gender: "Giới tính",
  province: "Quê quán",
  source: "Nguồn CV",
  cv_status: "Trạng thái CV",
  stage: "Giai đoạn phễu",
  screener: "Người sàng lọc CV",
  interviewer: "Người phỏng vấn",
  interview_mode: "Hình thức phỏng vấn",
  interview_result: "Kết quả phỏng vấn",
  offer_status: "Trạng thái offer",
  onboard_status: "Trạng thái thử việc",
  onboard_owner: "HR phụ trách onboard",
  onboard_office: "Văn phòng tiếp nhận",
  onboard_task_group: "Nhóm việc onboard",
  onboard_task: "Việc onboard",
};

/** Nói rõ giá trị của loại này đang được dùng ở đâu — hiện lúc xoá */
export const CHO_DUNG_DANH_MUC: Record<string, string> = {
  position: "ô Vị trí ứng tuyển của hồ sơ",
  department: "ô Phòng ban của hồ sơ",
  level: "ô Cấp bậc của hồ sơ",
  region: "ô Khu vực của hồ sơ",
  gender: "ô Giới tính của hồ sơ",
  province: "ô Quê quán của hồ sơ",
  source: "ô Nguồn CV của hồ sơ",
  cv_status: "ô Trạng thái CV — thứ quyết định hồ sơ nằm cột nào trên Bảng giai đoạn",
  screener: "ô Người sàng lọc CV",
  offer_status: "ô Trạng thái offer",
  interviewer: "danh sách người phỏng vấn của các buổi PV",
  interview_mode: "ô Hình thức của các buổi PV",
  interview_result: "ô Kết quả của các buổi PV",
  onboard_office: "ô Văn phòng của hồ sơ onboard",
  onboard_status: "ô Trạng thái thử việc",
  onboard_owner: "các ô HR phụ trách của hồ sơ onboard",
};
