"use server";

import { revalidatePath } from "next/cache";
import { taoSupabaseServer } from "@/lib/supabase/server";

export type KetQua = { ok: boolean; loi?: string };

function lamMoi() {
  revalidatePath("/lich-phong-van");
  revalidatePath("/ung-vien");
  revalidatePath("/giai-doan");
  revalidatePath("/");
}

/** Đặt hoặc sửa lịch một vòng phỏng vấn. Mỗi ứng viên chỉ có một ca cho mỗi vòng. */
export async function luuLichPV(input: {
  candidate_id: string;
  round: 1 | 2;
  scheduled_date: string | null;
  scheduled_time: string | null;
  mode: string | null;
  interviewers: string[];
  note?: string | null;
}): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const { error } = await supabase.from("interviews").upsert(
    {
      candidate_id: input.candidate_id,
      round: input.round,
      scheduled_date: input.scheduled_date,
      scheduled_time: input.scheduled_time,
      mode: input.mode,
      interviewers: input.interviewers,
      note: input.note ?? null,
    },
    { onConflict: "candidate_id,round" },
  );

  if (error) return { ok: false, loi: error.message };
  lamMoi();
  return { ok: true };
}

/** Kéo thả trên lịch tuần — chỉ đổi ngày giờ, giữ nguyên phần còn lại */
export async function doiLich(id: string, ngay: string, gio: string): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const { error } = await supabase
    .from("interviews")
    .update({ scheduled_date: ngay, scheduled_time: gio })
    .eq("id", id);

  if (error) return { ok: false, loi: error.message };
  lamMoi();
  return { ok: true };
}

/**
 * Nhập kết quả phỏng vấn. Trigger trong cơ sở dữ liệu sẽ tự đổi trạng thái CV
 * và tạo sẵn dòng onboard nếu vòng 2 đạt.
 */
export async function nhapKetQua(
  id: string,
  ketQua: string | null,
  ghiChu?: string | null,
): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const capNhat: Record<string, unknown> = { result: ketQua };
  if (ghiChu !== undefined) capNhat.note = ghiChu;

  const { error } = await supabase.from("interviews").update(capNhat).eq("id", id);
  if (error) return { ok: false, loi: error.message };

  lamMoi();
  return { ok: true };
}

export async function danhDauDaGuiMail(id: string, daGui: boolean): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const { error } = await supabase
    .from("interviews")
    .update({ result_email_sent: daGui })
    .eq("id", id);

  if (error) return { ok: false, loi: error.message };
  lamMoi();
  return { ok: true };
}

export async function xoaLichPV(id: string): Promise<KetQua> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  const { error } = await supabase.from("interviews").delete().eq("id", id);
  if (error) return { ok: false, loi: error.message };
  lamMoi();
  return { ok: true };
}
