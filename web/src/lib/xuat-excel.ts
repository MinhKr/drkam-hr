/**
 * Dựng file .xlsx cho danh sách ứng viên.
 *
 * Tiêu đề cột đặt đúng như sheet Data cũ để HR mở ra là nhận ra ngay,
 * kèm mấy cột tóm tắt phỏng vấn mà bản Excel cũ không có.
 *
 * Chỉ chạy phía máy chủ — exceljs không dùng được trong trình duyệt.
 */

import ExcelJS from "exceljs";
import type { UngVienRow } from "./ung-vien";

const DINH_DANG_NGAY = "dd/mm/yyyy";
/** Định dạng văn bản — giữ số 0 đầu của số điện thoại, Excel khỏi hiểu thành số */
const DINH_DANG_CHU = "@";

/**
 * '2026-08-17' -> Date đúng nửa đêm UTC.
 * exceljs đổi Date sang số của Excel bằng getTime() nên mốc UTC cho ra số nguyên chẵn,
 * không bị lệch một ngày theo múi giờ máy chủ.
 */
function ngay(s: string | null): Date | null {
  if (!s) return null;
  const [nam, thang, ngayTrongThang] = s.slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(nam) || !Number.isFinite(thang) || !Number.isFinite(ngayTrongThang)) {
    return null;
  }
  return new Date(Date.UTC(nam, thang - 1, ngayTrongThang));
}

type Cot = {
  nhan: string;
  rong: number;
  lay: (r: UngVienRow) => string | number | Date | null;
  dinhDang?: string;
};

const COT: Cot[] = [
  { nhan: "Mã số", rong: 9, lay: (r) => r.code },
  { nhan: "Ngày nhận CV", rong: 13, lay: (r) => ngay(r.received_at), dinhDang: DINH_DANG_NGAY },
  { nhan: "Họ và tên", rong: 26, lay: (r) => r.full_name },
  { nhan: "Giới tính", rong: 10, lay: (r) => r.gender },
  { nhan: "Khu vực Ứng tuyển", rong: 16, lay: (r) => r.region },
  { nhan: "Số điện thoại", rong: 14, lay: (r) => r.phone, dinhDang: DINH_DANG_CHU },
  { nhan: "Email", rong: 28, lay: (r) => r.email },
  { nhan: "Link CV/Portfolio", rong: 30, lay: (r) => r.cv_url },
  { nhan: "Vị trí ứng tuyển", rong: 26, lay: (r) => r.position },
  { nhan: "Phòng ban", rong: 18, lay: (r) => r.department },
  { nhan: "Cấp bậc", rong: 14, lay: (r) => r.level },
  { nhan: "Nguồn CV", rong: 15, lay: (r) => r.source },
  { nhan: "Người sàng lọc CV", rong: 18, lay: (r) => r.screener },
  { nhan: "KQ sàng lọc", rong: 30, lay: (r) => r.screening_note },
  { nhan: "Trạng thái CV", rong: 20, lay: (r) => r.status },
  { nhan: "Quê quán", rong: 16, lay: (r) => r.hometown },
  { nhan: "Kinh nghiệm", rong: 30, lay: (r) => r.experience },
  { nhan: "Thời gian onboard", rong: 16, lay: (r) => r.available_from },
  { nhan: "Mức lương mong muốn", rong: 18, lay: (r) => r.expected_salary },
  { nhan: "Trạng thái offer", rong: 16, lay: (r) => r.offer_status },
  {
    nhan: "Ngày dự kiến onboard",
    rong: 17,
    lay: (r) => ngay(r.planned_onboard_date),
    dinhDang: DINH_DANG_NGAY,
  },
  {
    nhan: "Ngày thực tế onboard",
    rong: 17,
    lay: (r) => ngay(r.actual_onboard_date),
    dinhDang: DINH_DANG_NGAY,
  },
  { nhan: "Số lịch PV", rong: 10, lay: (r) => r.so_lich_pv },
  {
    nhan: "Ngày PV gần nhất",
    rong: 15,
    lay: (r) => ngay(r.ngay_pv_gan_nhat),
    dinhDang: DINH_DANG_NGAY,
  },
  { nhan: "KQ PV1", rong: 14, lay: (r) => r.kq_pv1 },
  { nhan: "KQ PV2", rong: 14, lay: (r) => r.kq_pv2 },
  { nhan: "Số ngày chờ", rong: 11, lay: (r) => r.so_ngay_cho },
  { nhan: "Đã onboard", rong: 11, lay: (r) => (r.da_onboard ? "x" : null) },
  { nhan: "Ghi chú", rong: 30, lay: (r) => r.note },
];

/** Mô tả bộ lọc đang dùng, ghi vào phần thuộc tính của file cho biết file này lọc theo gì */
export function taoFileUngVien(rows: UngVienRow[], moTaLoc: string): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DrKam HR";
  wb.description = moTaLoc;

  const ws = wb.addWorksheet("Ứng viên", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = COT.map((c) => ({
    header: c.nhan,
    width: c.rong,
    style: c.dinhDang ? { numFmt: c.dinhDang } : {},
  }));

  const tieuDe = ws.getRow(1);
  tieuDe.height = 24;
  tieuDe.font = { bold: true, color: { argb: "FFFFFFFF" } };
  tieuDe.alignment = { vertical: "middle" };
  tieuDe.eachCell((o) => {
    // đỏ chủ đạo DrKam #D32027
    o.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD32027" } };
  });

  for (const r of rows) {
    ws.addRow(COT.map((c) => c.lay(r)));
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COT.length } };

  return wb.xlsx.writeBuffer();
}
