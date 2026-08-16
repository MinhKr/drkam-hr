"use server";

import { revalidatePath } from "next/cache";
import { taoSupabaseServer } from "@/lib/supabase/server";

export type KetQua = { ok: boolean; loi?: string };

function lamMoi() {
  revalidatePath("/onboard");
  revalidatePath("/");
}

/** Tick hoặc bỏ tick một mục checklist */
export async function tickViec(id: string, khoaViec: string, xong: boolean): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const { data, error: loiDoc } = await supabase
    .from("onboardings")
    .select("checklist")
    .eq("id", id)
    .single();
  if (loiDoc) return { ok: false, loi: loiDoc.message };

  const checklist = { ...((data?.checklist ?? {}) as Record<string, boolean>) };
  if (xong) checklist[khoaViec] = true;
  else delete checklist[khoaViec];

  const { error } = await supabase.from("onboardings").update({ checklist }).eq("id", id);
  if (error) return { ok: false, loi: error.message };

  lamMoi();
  return { ok: true };
}

/** Cập nhật thông tin chung: ngày onboard, văn phòng, người phụ trách, ghi chú */
export async function capNhatOnboard(
  id: string,
  duLieu: {
    onboard_date?: string | null;
    office?: string | null;
    assignee_pre?: string | null;
    assignee_docs?: string | null;
    assignee_training?: string | null;
    owner?: string | null;
    pre_note?: string | null;
    note?: string | null;
    status?: string | null;
  },
): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const sach = Object.fromEntries(
    Object.entries(duLieu).map(([k, v]) => [k, v === "" ? null : v]),
  );

  const { error } = await supabase.from("onboardings").update(sach).eq("id", id);
  if (error) return { ok: false, loi: error.message };

  lamMoi();
  return { ok: true };
}

/** Ghi kết quả một mốc đánh giá thử việc */
export async function ghiKetQuaDanhGia(
  id: string,
  moc: "7d" | "1m" | "2m",
  ketQua: string | null,
): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const cot = { "7d": "review_7d_result", "1m": "review_1m_result", "2m": "review_2m_result" }[moc];

  // Ghi kết quả xong thì đẩy luôn trạng thái vòng đời cho khớp
  const trangThaiTheoKetQua: Record<string, string | undefined> = {
    "Đạt|7d": "Pass 7 ngày thử việc",
    "Đạt|1m": "Pass 1 tháng thử việc",
    "Đạt|2m": "Pass 2 tháng thử việc",
    "Không đạt|7d": "Không đạt sau 7 ngày thử việc",
    "Không đạt|1m": "Nghỉ việc",
    "Không đạt|2m": "Nghỉ việc",
  };

  const capNhat: Record<string, unknown> = { [cot]: ketQua };
  const tt = ketQua ? trangThaiTheoKetQua[`${ketQua}|${moc}`] : undefined;
  if (tt) capNhat.status = tt;

  const { error } = await supabase.from("onboardings").update(capNhat).eq("id", id);
  if (error) return { ok: false, loi: error.message };

  lamMoi();
  return { ok: true };
}

/** Thêm nhân sự vào danh sách onboard (khi không đi qua luồng PV vòng 2) */
export async function themOnboard(candidateId: string): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const { error } = await supabase
    .from("onboardings")
    .upsert({ candidate_id: candidateId }, { onConflict: "candidate_id" });

  if (error) return { ok: false, loi: error.message };
  lamMoi();
  return { ok: true };
}
