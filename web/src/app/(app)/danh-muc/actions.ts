"use server";

import { revalidatePath } from "next/cache";
import { LY_DO_KHOA, META_THEO_LOAI, suaDuocDanhMuc } from "@/lib/danh-muc";
import { taoSupabaseServer } from "@/lib/supabase/server";
import { GIAI_DOAN } from "@/lib/types";

export type KetQuaDanhMuc = {
  ok: boolean;
  loi?: string;
  /** Số hồ sơ được cập nhật theo khi đổi tên */
  soHoSoDoi?: number;
};

/**
 * Danh mục nằm trong ô chọn của gần như mọi màn hình, nên sửa xong phải
 * dựng lại hết. Rẻ vì các trang này đều đọc danh mục qua một lượt truy vấn
 * chung đã được cache() gom lại.
 */
function dungLaiCacTrang() {
  revalidatePath("/danh-muc");
  revalidatePath("/ung-vien");
  revalidatePath("/giai-doan");
  revalidatePath("/lich-phong-van");
  revalidatePath("/onboard");
  revalidatePath("/");
}

/** Đổi mã lỗi Postgres thành câu tiếng Việt HR đọc hiểu */
function dichLoi(loi: { code?: string; message: string }, loai?: string): string {
  if (loi.code === "23505")
    return "Danh mục này đã có sẵn một giá trị trùng tên. Đặt tên khác, hoặc bật lại giá trị cũ nếu nó đang bị ẩn.";
  if (loi.code === "42P01")
    return "Chưa chạy file 0010_danh_muc_crud.sql trong Supabase — xem hướng dẫn ở BAN-GIAO.md.";
  if (loi.code === "42883" || loi.code === "PGRST202")
    return "Thao tác này cần file 0010_danh_muc_crud.sql, chưa chạy trong Supabase. Chạy file đó rồi thử lại.";
  if (loi.code === "42501")
    return "Tài khoản này không có quyền sửa danh mục.";
  return loi.message + (loai ? ` (danh mục ${loai})` : "");
}

/**
 * Kiểm phần chung của cả thêm lẫn sửa.
 * Chặn loại bị khoá ở ĐÂY chứ không chỉ ở giao diện: nút có bị ẩn trên màn
 * hình thì lời gọi Server Action vẫn tới thẳng được.
 */
function kiemTra(form: FormData): { ok: true; loai: string; ten: string; meta: Record<string, string> } | { ok: false; loi: string } {
  const loai = String(form.get("type") ?? "").trim();
  const ten = String(form.get("value") ?? "").trim();

  if (!loai) return { ok: false, loi: "Thiếu loại danh mục" };
  if (!suaDuocDanhMuc(loai))
    return { ok: false, loi: LY_DO_KHOA[loai] ?? "Loại danh mục này không sửa được trong app" };
  if (!ten) return { ok: false, loi: "Chưa điền tên" };
  if (ten.length > 120) return { ok: false, loi: "Tên dài quá 120 ký tự" };

  const meta: Record<string, string> = {};
  for (const khoa of META_THEO_LOAI[loai] ?? []) {
    const v = String(form.get(`meta_${khoa}`) ?? "").trim();
    if (v) meta[khoa] = v;
  }

  // Trạng thái CV bắt buộc phải nói rõ thuộc giai đoạn nào: thiếu là hồ sơ
  // mang trạng thái đó rơi về cột "Mới về" của Bảng giai đoạn.
  if (loai === "cv_status") {
    const gd = meta.stage;
    if (!gd) return { ok: false, loi: "Chọn giai đoạn phễu cho trạng thái này" };
    if (!GIAI_DOAN.some((g) => g.key === gd))
      return { ok: false, loi: `Giai đoạn "${gd}" không có trong 5 giai đoạn của app` };
  }

  return { ok: true, loai, ten, meta };
}

/*
 * Không có hàm ghi nhật ký ở đây: trigger catalogs_log của 0010 ghi sẵn mọi
 * thêm/sửa/xoá vào activity_log rồi. Để app tự insert vào bảng đó là hỏng —
 * activity_log chỉ có policy SELECT cho authenticated nên câu insert bị RLS
 * chặn lặng lẽ, tưởng ghi được mà không ghi gì. Trigger chạy security definer
 * nên không vướng, lại bắt được cả thay đổi làm thẳng trong Supabase.
 */

export async function themDanhMuc(form: FormData): Promise<KetQuaDanhMuc> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const kt = kiemTra(form);
  if (!kt.ok) return { ok: false, loi: kt.loi };

  // Xếp xuống cuối danh sách của loại đó
  const { data: cuoi } = await supabase
    .from("catalogs")
    .select("sort_order")
    .eq("type", kt.loai)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("catalogs").insert({
    type: kt.loai,
    value: kt.ten,
    sort_order: (cuoi?.sort_order ?? -1) + 1,
    active: true,
    meta: kt.meta,
  });

  if (error) return { ok: false, loi: dichLoi(error, kt.loai) };

  dungLaiCacTrang();
  return { ok: true };
}

/**
 * Sửa một giá trị. Đổi tên thì KHÔNG update thẳng mà gọi hàm SQL
 * f_danh_muc_doi_ten: hồ sơ lưu chuỗi thô nên phải cập nhật kèm, và phải
 * nằm trong cùng một giao dịch với việc đổi danh mục.
 */
export async function suaDanhMuc(form: FormData): Promise<KetQuaDanhMuc> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const id = String(form.get("id") ?? "").trim();
  const tenCu = String(form.get("value_cu") ?? "").trim();
  if (!id) return { ok: false, loi: "Thiếu id" };

  const kt = kiemTra(form);
  if (!kt.ok) return { ok: false, loi: kt.loi };

  let soHoSoDoi = 0;

  if (kt.ten !== tenCu) {
    const { data, error } = await supabase.rpc("f_danh_muc_doi_ten", {
      p_type: kt.loai,
      p_cu: tenCu,
      p_moi: kt.ten,
    });
    if (error) return { ok: false, loi: dichLoi(error, kt.loai) };
    soHoSoDoi = (data as number | null) ?? 0;
  }

  // meta đi riêng: nó không nằm trên hồ sơ nào nên update thẳng là đủ.
  // Chỉ ghi cho loại thật sự có ô meta trên form — loại khác mà ghi vào là
  // lấy {} đè lên meta sẵn có, xoá mất thứ mình không hề đụng tới.
  if (META_THEO_LOAI[kt.loai]) {
    const { error: loiMeta } = await supabase
      .from("catalogs")
      .update({ meta: kt.meta })
      .eq("id", id);
    if (loiMeta) return { ok: false, loi: dichLoi(loiMeta, kt.loai) };
  }

  dungLaiCacTrang();
  return { ok: true, soHoSoDoi };
}

/**
 * Ẩn / hiện. Ẩn nghĩa là "đừng cho chọn nữa" — hồ sơ cũ vẫn giữ nguyên chữ
 * và vẫn hiển thị đúng, kể cả Bảng giai đoạn (banDoGiaiDoan đọc cả dòng ẩn).
 */
export async function anHienDanhMuc(id: string, hien: boolean): Promise<KetQuaDanhMuc> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const { data: dong, error: loiDoc } = await supabase
    .from("catalogs")
    .select("type")
    .eq("id", id)
    .maybeSingle();
  if (loiDoc) return { ok: false, loi: dichLoi(loiDoc) };
  if (!dong) return { ok: false, loi: "Giá trị này không còn nữa" };
  if (!suaDuocDanhMuc(dong.type))
    return { ok: false, loi: LY_DO_KHOA[dong.type] ?? "Loại danh mục này không sửa được trong app" };

  const { error } = await supabase.from("catalogs").update({ active: hien }).eq("id", id);
  if (error) return { ok: false, loi: dichLoi(error, dong.type) };

  dungLaiCacTrang();
  return { ok: true };
}

/**
 * Xoá hẳn. Người dùng đã được cảnh báo số hồ sơ đang dùng ở màn hình xác
 * nhận rồi — hồ sơ cũ vẫn giữ chuỗi cũ, chỉ là chuỗi đó không còn trong
 * danh mục nữa.
 */
export async function xoaDanhMuc(id: string): Promise<KetQuaDanhMuc> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const { data: dong, error: loiDoc } = await supabase
    .from("catalogs")
    .select("type")
    .eq("id", id)
    .maybeSingle();
  if (loiDoc) return { ok: false, loi: dichLoi(loiDoc) };
  if (!dong) return { ok: false, loi: "Giá trị này không còn nữa" };
  if (!suaDuocDanhMuc(dong.type))
    return { ok: false, loi: LY_DO_KHOA[dong.type] ?? "Loại danh mục này không xoá được trong app" };

  const { error } = await supabase.from("catalogs").delete().eq("id", id);
  if (error) return { ok: false, loi: dichLoi(error, dong.type) };

  dungLaiCacTrang();
  return { ok: true };
}

/**
 * Ghi lại thứ tự sau khi kéo thả — nhận nguyên dãy id theo thứ tự mới của
 * một loại, không phải từng cặp đổi chỗ.
 *
 * Gửi cả danh sách chứ không gửi "kéo id X tới vị trí thứ 4": máy chủ khỏi
 * phải đoán lại danh sách lúc đó gồm những gì, và hai người cùng kéo một lúc
 * thì người sau ghi đè bằng thứ tự mình đang nhìn thấy, chứ không ra một thứ
 * tự lai không ai muốn.
 */
export async function sapXepDanhMuc(loai: string, ids: string[]): Promise<KetQuaDanhMuc> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  if (!suaDuocDanhMuc(loai))
    return { ok: false, loi: LY_DO_KHOA[loai] ?? "Loại danh mục này không sắp xếp được trong app" };
  if (ids.length === 0) return { ok: true };

  const { error } = await supabase.rpc("f_danh_muc_sap_xep", { p_type: loai, p_ids: ids });
  if (error) return { ok: false, loi: dichLoi(error, loai) };

  dungLaiCacTrang();
  return { ok: true };
}
