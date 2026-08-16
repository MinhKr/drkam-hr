import { taoSupabaseServer } from "./supabase/server";
import type { CaPhongVan } from "./lich";

export type { CaPhongVan };
export { KHUNG_GIO, TEN_THU, ngayISO, themNgay, thuHaiCuaTuan, timTrungLich } from "./lich";

export async function layLichTuan(
  tuNgay: string,
  denNgay: string,
): Promise<{ ca: CaPhongVan[]; loi?: string }> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ca: [], loi: "Chưa nối cơ sở dữ liệu" };

  const { data, error } = await supabase
    .from("v_lich_pv")
    .select("*")
    .gte("scheduled_date", tuNgay)
    .lte("scheduled_date", denNgay)
    .order("scheduled_date")
    .order("scheduled_time");

  if (error) return { ca: [], loi: error.message };
  return { ca: (data ?? []) as CaPhongVan[] };
}

export async function layDanhSachPV(
  vong: 1 | 2,
  loc: { nguoi_pv?: string; ket_qua?: string } = {},
): Promise<{ ca: CaPhongVan[]; loi?: string }> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ca: [], loi: "Chưa nối cơ sở dữ liệu" };

  let q = supabase.from("v_lich_pv").select("*").eq("round", vong);
  if (loc.nguoi_pv) q = q.contains("interviewers", [loc.nguoi_pv]);
  if (loc.ket_qua === "chua_co") q = q.is("result", null);
  else if (loc.ket_qua) q = q.eq("result", loc.ket_qua);

  const { data, error } = await q
    .order("scheduled_date", { ascending: false, nullsFirst: false })
    .order("scheduled_time", { nullsFirst: false })
    .limit(300);

  if (error) return { ca: [], loi: error.message };
  return { ca: (data ?? []) as CaPhongVan[] };
}

/** Lịch PV của nhiều ứng viên cùng lúc — dùng cho màn hình danh sách */
export async function layLichTheoUngVien(
  ids: string[],
): Promise<Record<string, CaPhongVan[]>> {
  const supabase = await taoSupabaseServer();
  if (!supabase || ids.length === 0) return {};

  const { data } = await supabase.from("v_lich_pv").select("*").in("candidate_id", ids);

  const ra: Record<string, CaPhongVan[]> = {};
  for (const c of (data ?? []) as CaPhongVan[]) {
    (ra[c.candidate_id] ??= []).push(c);
  }
  return ra;
}

export async function layLichCuaUngVien(candidateId: string): Promise<CaPhongVan[]> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return [];
  const { data } = await supabase
    .from("v_lich_pv")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("round");
  return (data ?? []) as CaPhongVan[];
}
