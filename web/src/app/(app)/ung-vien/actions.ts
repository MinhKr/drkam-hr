"use server";

import { revalidatePath } from "next/cache";
import { BUCKET_CV, kiemTraFile, mimeTheoDuoi, taoDuongDanLuu } from "@/lib/cv-file";
import { taoSupabaseServer } from "@/lib/supabase/server";
import { chuanHoaSdt } from "@/lib/utils";
import type { UngVien } from "@/lib/types";

export type KetQua = { ok: boolean; loi?: string; id?: string };

/** Client đã nối được Supabase — `taoSupabaseServer` trả null khi chưa nối */
type Supabase = NonNullable<Awaited<ReturnType<typeof taoSupabaseServer>>>;

/** Các trường HR nhập tay — khớp với 8 nhóm của sheet Data */
const TRUONG_CHO_PHEP = [
  "received_at",
  "full_name",
  "gender",
  "region",
  "phone",
  "email",
  "cv_url",
  "position",
  "department",
  "level",
  "source",
  "screener",
  "screening_note",
  "status",
  "hometown",
  "experience",
  "available_from",
  "expected_salary",
  "offer_status",
  "planned_onboard_date",
  "actual_onboard_date",
  "note",
] as const;

type TruongChoPhep = (typeof TRUONG_CHO_PHEP)[number];

/**
 * `cv_file_path` không nằm trong TRUONG_CHO_PHEP: nó không phải ô HR gõ vào mà
 * do máy chủ tự đặt sau khi cất file, nên phải để ngoài tầm với của form.
 */
type DuLieuUngVien = Partial<Record<TruongChoPhep, string | null>> & {
  cv_file_path?: string | null;
};

function locDuLieu(form: FormData): DuLieuUngVien {
  const ra: Record<string, string | null> = {};
  for (const ten of TRUONG_CHO_PHEP) {
    const v = form.get(ten);
    if (v === null) continue;
    const s = String(v).trim();
    ra[ten] = s === "" ? null : s;
  }
  if (ra.phone) ra.phone = chuanHoaSdt(ra.phone);
  if (ra.email) ra.email = ra.email.toLowerCase();
  return ra as DuLieuUngVien;
}

/**
 * Kết quả xử lý ô file CV của form.
 * `doi: false` nghĩa là lần lưu này không đụng gì tới file — giữ nguyên cái cũ.
 */
type KetQuaFile =
  | { ok: true; doi: false }
  | { ok: true; doi: true; duongDan: string | null }
  | { ok: false; loi: string };

/**
 * Đọc ô file trong form rồi cất lên Supabase Storage.
 *
 * Kiểm lại dung lượng và kiểu file dù trình duyệt đã kiểm: form gửi lên đây
 * hoàn toàn có thể bị sửa, và Server Action là chỗ cuối cùng còn kiểm được
 * trước khi file rơi vào bucket.
 */
async function xuLyFileCV(supabase: Supabase, form: FormData): Promise<KetQuaFile> {
  const file = form.get("cv_file");

  if (file instanceof File && file.size > 0) {
    const loi = kiemTraFile(file);
    if (loi) return { ok: false, loi };

    const duongDan = taoDuongDanLuu(file.name);
    const { error } = await supabase.storage.from(BUCKET_CV).upload(duongDan, file, {
      // khai content-type suy từ đuôi file, đừng tin file.type của trình duyệt
      contentType: mimeTheoDuoi(file.name) ?? undefined,
      upsert: false,
    });

    if (error) {
      // Chưa chạy 0008 thì chưa có bucket — nói thẳng phải làm gì, đừng để HR
      // đọc câu "Bucket not found" rồi ngồi đoán
      const chuaCoBucket = /bucket not found/i.test(error.message);
      return {
        ok: false,
        loi: chuaCoBucket
          ? "Chưa có chỗ chứa file CV. Mở Supabase → SQL Editor rồi chạy web/supabase/migrations/0008_bucket_cv.sql, xong thử lại. Trong lúc chờ vẫn dùng được ô Link CV."
          : `Không tải được file CV lên: ${error.message}`,
      };
    }
    return { ok: true, doi: true, duongDan };
  }

  if (form.get("xoa_cv") === "1") return { ok: true, doi: true, duongDan: null };

  return { ok: true, doi: false };
}

/**
 * Dọn file khỏi Storage. Cố gắng thôi, không chặn luồng chính: hồ sơ đã ghi
 * đúng rồi thì một file thừa nằm lại không đáng để báo lỗi vào mặt người dùng.
 */
async function xoaFileCV(supabase: Supabase, duongDan?: string | null) {
  if (!duongDan) return;
  await supabase.storage.from(BUCKET_CV).remove([duongDan]);
}

export async function taoUngVien(form: FormData): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const du_lieu = locDuLieu(form);
  if (!du_lieu.full_name) return { ok: false, loi: "Chưa điền họ và tên" };
  if (!du_lieu.received_at) du_lieu.received_at = new Date().toISOString().slice(0, 10);
  if (!du_lieu.status) du_lieu.status = "Đang liên hệ";

  const kqFile = await xuLyFileCV(supabase, form);
  if (!kqFile.ok) return { ok: false, loi: kqFile.loi };
  if (kqFile.doi) du_lieu.cv_file_path = kqFile.duongDan;

  const { data, error } = await supabase
    .from("candidates")
    .insert(du_lieu)
    .select("id")
    .single();

  if (error) {
    // hồ sơ không vào được thì đừng để file vừa tải nằm lại bơ vơ trong bucket
    if (kqFile.doi) await xoaFileCV(supabase, kqFile.duongDan);
    return { ok: false, loi: error.message };
  }

  revalidatePath("/ung-vien");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function capNhatUngVien(id: string, form: FormData): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const du_lieu = locDuLieu(form);
  if (!du_lieu.full_name) return { ok: false, loi: "Chưa điền họ và tên" };

  const kqFile = await xuLyFileCV(supabase, form);
  if (!kqFile.ok) return { ok: false, loi: kqFile.loi };

  // Đọc đường dẫn cũ TRƯỚC khi ghi đè, nhưng chỉ xoá file cũ SAU khi ghi xong.
  // Xoá sớm hơn mà câu update lại hỏng thì hồ sơ trỏ vào file không còn nữa.
  let duongDanCu: string | null = null;
  if (kqFile.doi) {
    du_lieu.cv_file_path = kqFile.duongDan;
    const { data: cu } = await supabase
      .from("candidates")
      .select("cv_file_path")
      .eq("id", id)
      .maybeSingle();
    duongDanCu = (cu?.cv_file_path as string | null) ?? null;
  }

  const { error } = await supabase.from("candidates").update(du_lieu).eq("id", id);
  if (error) {
    if (kqFile.doi) await xoaFileCV(supabase, kqFile.duongDan);
    return { ok: false, loi: error.message };
  }

  if (kqFile.doi && duongDanCu !== kqFile.duongDan) {
    await xoaFileCV(supabase, duongDanCu);
  }

  revalidatePath("/ung-vien");
  revalidatePath("/");
  return { ok: true, id };
}

export async function doiTrangThai(id: string, trang_thai: string): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const { error } = await supabase.from("candidates").update({ status: trang_thai }).eq("id", id);
  if (error) return { ok: false, loi: error.message };

  revalidatePath("/ung-vien");
  revalidatePath("/");
  return { ok: true, id };
}

export type UngVienTrung = Pick<
  UngVien,
  "id" | "full_name" | "phone" | "email" | "position" | "status" | "received_at"
>;

/** Tìm hồ sơ đã có theo số điện thoại hoặc email — gọi khi HR vừa gõ xong ô đó */
export async function timTrung(
  phone: string | null,
  email: string | null,
  boQuaId?: string,
): Promise<UngVienTrung[]> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return [];

  const sdt = chuanHoaSdt(phone);
  const mail = email?.trim().toLowerCase() || null;
  if (!sdt && !mail) return [];

  const { data, error } = await supabase.rpc("find_duplicates", {
    p_phone: sdt,
    p_email: mail,
    p_exclude: boQuaId ?? null,
  });

  if (error || !data) return [];
  return data as UngVienTrung[];
}
