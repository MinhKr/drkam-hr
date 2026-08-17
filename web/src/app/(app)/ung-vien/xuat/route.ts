/**
 * GET /ung-vien/xuat?<đúng query string của trang danh sách>
 *
 * Xuất danh sách ứng viên đang lọc ra file .xlsx. Nút bấm ở thanh bộ lọc
 * mang y nguyên query string sang đây nên file tải về khớp đúng cái đang xem.
 * proxy.ts đã chặn người chưa đăng nhập, và view v_ung_vien bật security_invoker
 * nên vẫn áp RLS của người đang đăng nhập.
 */

import type { NextRequest } from "next/server";
import { docBoLoc, layToanBoDeXuat } from "@/lib/ung-vien";
import { taoFileUngVien } from "@/lib/xuat-excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOAI_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const TEN_LOC: [string, string][] = [
  ["q", "từ khoá"],
  ["vi_tri", "vị trí"],
  ["phong_ban", "phòng ban"],
  ["trang_thai", "trạng thái"],
  ["nguon", "nguồn CV"],
  ["nguoi_sang_loc", "người sàng lọc"],
  ["khu_vuc", "khu vực"],
  ["tu_ngay", "từ ngày"],
  ["den_ngay", "đến ngày"],
];

const TEN_CANH_BAO: Record<string, string> = {
  chua_sang_loc: "chưa sàng lọc",
  chua_dat_lich: "chưa đặt lịch PV",
  qua_han: "quá 7 ngày chưa phản hồi",
};

/** Câu mô tả bộ lọc, ghi vào thuộc tính file để sau này mở ra còn biết file lọc theo gì */
function moTaBoLoc(sp: URLSearchParams) {
  const phan = TEN_LOC.filter(([khoa]) => sp.get(khoa)).map(
    ([khoa, nhan]) => `${nhan} ${sp.get(khoa)}`,
  );

  const canhBao = sp.get("canh_bao");
  if (canhBao) phan.unshift(TEN_CANH_BAO[canhBao] ?? canhBao);

  return phan.length ? `Lọc theo ${phan.join(" · ")}` : "Toàn bộ ứng viên";
}

function haiSo(n: number) {
  return String(n).padStart(2, "0");
}

/** Tên file có dấu nên phải kèm bản không dấu cho trình duyệt cũ (RFC 5987) */
function dongGoiTenFile() {
  const h = new Date();
  const ngay = `${haiSo(h.getDate())}-${haiSo(h.getMonth() + 1)}-${h.getFullYear()}`;
  const coDau = `Ứng viên DrKam ${ngay}.xlsx`;
  const khongDau = `ung-vien-drkam-${ngay}.xlsx`;
  return `attachment; filename="${khongDau}"; filename*=UTF-8''${encodeURIComponent(coDau)}`;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const loc = docBoLoc(sp);
  delete loc.trang; // xuất hết, không theo trang đang xem

  const { rows, cat, loi } = await layToanBoDeXuat(loc);

  if (loi) {
    return new Response(`Không xuất được: ${loi}`, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const moTa = cat
    ? `${moTaBoLoc(sp)} — chỉ lấy ${rows.length.toLocaleString("vi-VN")} dòng đầu`
    : moTaBoLoc(sp);

  const file = await taoFileUngVien(rows, moTa);

  return new Response(file, {
    headers: {
      "Content-Type": LOAI_XLSX,
      "Content-Disposition": dongGoiTenFile(),
      "Content-Length": String(file.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
