/**
 * GET /ung-vien/mau-nhap
 *
 * Tải file .xlsx mẫu để nhập hàng loạt — chỉ có dòng tiêu đề đúng các cột app
 * đọc được. Liên kết nằm ở bước 1 của hộp thoại Nhập Excel.
 *
 * proxy.ts đã chặn người chưa đăng nhập.
 */

import { taoFileMau } from "@/lib/nhap-excel";

export const runtime = "nodejs";

const LOAI_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Tên file có dấu nên phải kèm bản không dấu cho trình duyệt cũ (RFC 5987) */
const DAT_TEN =
  `attachment; filename="mau-nhap-ung-vien-drkam.xlsx"; ` +
  `filename*=UTF-8''${encodeURIComponent("Mẫu nhập ứng viên DrKam.xlsx")}`;

export async function GET() {
  const file = await taoFileMau();

  return new Response(file, {
    headers: {
      "Content-Type": LOAI_XLSX,
      "Content-Disposition": DAT_TEN,
      "Content-Length": String(file.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
