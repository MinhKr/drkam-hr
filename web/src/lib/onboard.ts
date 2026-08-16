import { taoSupabaseServer } from "./supabase/server";
import type { DongOnboard } from "./onboard-types";

export type { DongOnboard };

export async function layDanhSachOnboard(loc: {
  q?: string;
  trang_thai?: string;
  van_phong?: string;
} = {}): Promise<{ ds: DongOnboard[]; loi?: string }> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { ds: [], loi: "Chưa nối cơ sở dữ liệu" };

  let q = supabase.from("v_onboard").select("*");
  if (loc.trang_thai) q = q.eq("status", loc.trang_thai);
  if (loc.van_phong) q = q.eq("office", loc.van_phong);

  const { data, error } = await q
    .order("onboard_date", { ascending: false, nullsFirst: true })
    .limit(300);

  if (error) return { ds: [], loi: error.message };

  let ds = (data ?? []) as DongOnboard[];
  if (loc.q?.trim()) {
    const tim = loc.q.trim().toLowerCase();
    ds = ds.filter(
      (d) =>
        d.full_name.toLowerCase().includes(tim) ||
        (d.position ?? "").toLowerCase().includes(tim) ||
        (d.phone ?? "").includes(tim),
    );
  }
  return { ds };
}

/** Ứng viên đã nhận việc nhưng chưa có dòng onboard — để HR thêm thủ công */
export async function layUngVienChuaOnboard(): Promise<
  { id: string; full_name: string; position: string | null; status: string }[]
> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return [];

  const { data: daCo } = await supabase.from("onboardings").select("candidate_id");
  const idDaCo = new Set((daCo ?? []).map((x) => x.candidate_id as string));

  const { data } = await supabase
    .from("candidates")
    .select("id, full_name, position, status")
    .in("status", ["Chờ nhận việc", "Nhận việc"])
    .order("received_at", { ascending: false })
    .limit(100);

  return ((data ?? []) as { id: string; full_name: string; position: string | null; status: string }[])
    .filter((c) => !idDaCo.has(c.id));
}
