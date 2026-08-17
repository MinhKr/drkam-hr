import { cache } from "react";
import catalogsJson from "@/data/catalogs.json";
import { taoSupabaseServer } from "./supabase/server";
import type { DanhMuc, GiaiDoan, LoaiDanhMuc } from "./types";

const duPhong = catalogsJson as DanhMuc[];

export type NguonDanhMuc = "co_so_du_lieu" | "du_phong";

/**
 * Đọc toàn bộ danh mục, kèm cho biết lấy từ đâu.
 * Có Supabase và bảng có dữ liệu thì lấy từ bảng catalogs,
 * còn lại lùi về bản sinh từ Excel (src/data/catalogs.json).
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
      .eq("active", true)
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

export async function layTheoLoai(loai: LoaiDanhMuc): Promise<DanhMuc[]> {
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

/** Bản đồ Trạng thái CV → giai đoạn phễu (dùng cho bảng kéo thả) */
export async function banDoGiaiDoan(): Promise<Record<string, GiaiDoan>> {
  const ds = await layTheoLoai("cv_status");
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
