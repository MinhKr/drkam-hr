import { taoSupabaseServer } from "./supabase/server";
import { boDau } from "./utils";
import type { UngVien } from "./types";

export type UngVienRow = UngVien & {
  so_lich_pv: number;
  ngay_pv_gan_nhat: string | null;
  kq_pv1: string | null;
  kq_pv2: string | null;
  so_ngay_cho: number;
  da_onboard: boolean;
};

export type BoLoc = {
  q?: string;
  vi_tri?: string;
  phong_ban?: string;
  trang_thai?: string;
  nguon?: string;
  nguoi_sang_loc?: string;
  khu_vuc?: string;
  tu_ngay?: string;
  den_ngay?: string;
  canh_bao?: "chua_sang_loc" | "chua_dat_lich" | "qua_han";
  trang?: number;
};

export const MOI_TRANG = 25;

/** Đọc bộ lọc từ query string — dùng chung cho trang danh sách và route xuất Excel */
export function docBoLoc(sp: URLSearchParams): BoLoc {
  const lay = (khoa: string) => sp.get(khoa) || undefined;
  return {
    q: lay("q"),
    vi_tri: lay("vi_tri"),
    phong_ban: lay("phong_ban"),
    trang_thai: lay("trang_thai"),
    nguon: lay("nguon"),
    nguoi_sang_loc: lay("nguoi_sang_loc"),
    khu_vuc: lay("khu_vuc"),
    tu_ngay: lay("tu_ngay"),
    den_ngay: lay("den_ngay"),
    canh_bao: lay("canh_bao") as BoLoc["canh_bao"],
    trang: Number(lay("trang") ?? 1),
  };
}

/** Trạng thái coi như đã khép hồ sơ — không tính vào các cảnh báo cần xử lý */
const TRANG_THAI_DA_DONG = [
  "Loại",
  "Phỏng vấn - loại",
  "Không đến PV",
  "Từ chối nhận việc",
  "Nhận việc",
];

const TRANG_THAI_CHUA_LIEN_HE = ["Đang liên hệ", "Chưa lên hệ được", "Chưa liên hệ được"];

function ngayTruoc(soNgay: number) {
  const d = new Date();
  d.setDate(d.getDate() - soNgay);
  return d.toISOString().slice(0, 10);
}

/** Gắn toàn bộ điều kiện lọc vào một truy vấn PostgREST */
/* eslint-disable @typescript-eslint/no-explicit-any */
function apDungLoc(q: any, loc: BoLoc) {
  if (loc.q?.trim()) {
    // search_text trong cơ sở dữ liệu đã bỏ dấu và viết thường sẵn
    q = q.ilike("search_text", `%${boDau(loc.q)}%`);
  }
  if (loc.vi_tri) q = q.eq("position", loc.vi_tri);
  if (loc.phong_ban) q = q.eq("department", loc.phong_ban);
  if (loc.trang_thai) q = q.eq("status", loc.trang_thai);
  if (loc.nguon) q = q.eq("source", loc.nguon);
  if (loc.nguoi_sang_loc) q = q.eq("screener", loc.nguoi_sang_loc);
  if (loc.khu_vuc) q = q.eq("region", loc.khu_vuc);
  if (loc.tu_ngay) q = q.gte("received_at", loc.tu_ngay);
  if (loc.den_ngay) q = q.lte("received_at", loc.den_ngay);

  // giá trị có dấu cách nên phải bọc nháy kép, không PostgREST cắt sai
  const chuaDong = `(${TRANG_THAI_DA_DONG.map((s) => `"${s}"`).join(",")})`;

  if (loc.canh_bao === "chua_sang_loc") {
    q = q.is("screener", null).not("status", "in", chuaDong);
  } else if (loc.canh_bao === "chua_dat_lich") {
    q = q.eq("so_lich_pv", 0).not("status", "in", chuaDong);
  } else if (loc.canh_bao === "qua_han") {
    q = q
      .lte("received_at", ngayTruoc(7))
      .in("status", TRANG_THAI_CHUA_LIEN_HE);
  }
  return q;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function layDanhSachUngVien(
  loc: BoLoc,
): Promise<{ rows: UngVienRow[]; tong: number; loi?: string }> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { rows: [], tong: 0, loi: "Chưa nối cơ sở dữ liệu" };

  const trang = Math.max(1, loc.trang ?? 1);
  const tu = (trang - 1) * MOI_TRANG;

  let q = supabase.from("v_ung_vien").select("*", { count: "exact" });
  q = apDungLoc(q, loc);
  q = q.order("received_at", { ascending: false }).order("code", { ascending: false });

  const { data, count, error } = await q.range(tu, tu + MOI_TRANG - 1);
  if (error) return { rows: [], tong: 0, loi: error.message };

  return { rows: (data ?? []) as UngVienRow[], tong: count ?? 0 };
}

/** PostgREST trả tối đa 1000 dòng một lần nên phải đọc theo lô */
const LO_XUAT = 1000;
/** Chặn trên cho một lần xuất — 50 nghìn dòng đã quá xa nhu cầu thực tế */
const TOI_DA_XUAT = 50_000;

/**
 * Lấy toàn bộ dòng khớp bộ lọc, bỏ qua phân trang — dùng cho xuất Excel.
 * Bộ lọc y hệt danh sách trên màn hình nên file xuất ra khớp đúng cái đang xem.
 */
export async function layToanBoDeXuat(
  loc: BoLoc,
): Promise<{ rows: UngVienRow[]; cat: boolean; loi?: string }> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return { rows: [], cat: false, loi: "Chưa nối cơ sở dữ liệu" };

  const tatCa: UngVienRow[] = [];
  for (let tu = 0; tu < TOI_DA_XUAT; tu += LO_XUAT) {
    let q = supabase.from("v_ung_vien").select("*");
    q = apDungLoc(q, loc);
    q = q.order("received_at", { ascending: false }).order("code", { ascending: false });

    const { data, error } = await q.range(tu, tu + LO_XUAT - 1);
    if (error) return { rows: [], cat: false, loi: error.message };

    const lo = (data ?? []) as UngVienRow[];
    tatCa.push(...lo);
    if (lo.length < LO_XUAT) return { rows: tatCa, cat: false };
  }
  return { rows: tatCa, cat: true };
}

export async function demCanhBao() {
  const supabase = await taoSupabaseServer();
  const rong = { tong: 0, chua_sang_loc: 0, chua_dat_lich: 0, qua_han: 0 };
  if (!supabase) return rong;

  const dem = async (loc: BoLoc) => {
    let q = supabase.from("v_ung_vien").select("id", { count: "exact", head: true });
    q = apDungLoc(q, loc);
    const { count } = await q;
    return count ?? 0;
  };

  const [tong, chuaSangLoc, chuaDatLich, quaHan] = await Promise.all([
    dem({}),
    dem({ canh_bao: "chua_sang_loc" }),
    dem({ canh_bao: "chua_dat_lich" }),
    dem({ canh_bao: "qua_han" }),
  ]);

  return {
    tong,
    chua_sang_loc: chuaSangLoc,
    chua_dat_lich: chuaDatLich,
    qua_han: quaHan,
  };
}

export async function layMotUngVien(id: string): Promise<UngVienRow | null> {
  const supabase = await taoSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.from("v_ung_vien").select("*").eq("id", id).maybeSingle();
  return (data as UngVienRow) ?? null;
}
