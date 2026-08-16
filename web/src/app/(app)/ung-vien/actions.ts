"use server";

import { revalidatePath } from "next/cache";
import { taoSupabaseServer } from "@/lib/supabase/server";
import { chuanHoaSdt } from "@/lib/utils";
import type { UngVien } from "@/lib/types";

export type KetQua = { ok: boolean; loi?: string; id?: string };

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

function locDuLieu(form: FormData) {
  const ra: Record<string, string | null> = {};
  for (const ten of TRUONG_CHO_PHEP) {
    const v = form.get(ten);
    if (v === null) continue;
    const s = String(v).trim();
    ra[ten] = s === "" ? null : s;
  }
  if (ra.phone) ra.phone = chuanHoaSdt(ra.phone);
  if (ra.email) ra.email = ra.email.toLowerCase();
  return ra as Partial<Record<TruongChoPhep, string | null>>;
}

export async function taoUngVien(form: FormData): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const du_lieu = locDuLieu(form);
  if (!du_lieu.full_name) return { ok: false, loi: "Chưa điền họ và tên" };
  if (!du_lieu.received_at) du_lieu.received_at = new Date().toISOString().slice(0, 10);
  if (!du_lieu.status) du_lieu.status = "Đang liên hệ";

  const { data, error } = await supabase
    .from("candidates")
    .insert(du_lieu)
    .select("id")
    .single();

  if (error) return { ok: false, loi: error.message };

  revalidatePath("/ung-vien");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function capNhatUngVien(id: string, form: FormData): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const du_lieu = locDuLieu(form);
  if (!du_lieu.full_name) return { ok: false, loi: "Chưa điền họ và tên" };

  const { error } = await supabase.from("candidates").update(du_lieu).eq("id", id);
  if (error) return { ok: false, loi: error.message };

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
