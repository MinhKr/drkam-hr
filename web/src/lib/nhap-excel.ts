/**
 * Đọc file Excel danh sách ứng viên để nhập hàng loạt.
 *
 * Đọc được HAI kiểu file mà không phải chọn:
 *   - `DATA UV DRKAM 2026.xlsx` gốc — dòng 1 là tiêu đề nhóm có emoji,
 *     tên cột thật nằm ở dòng 2
 *   - file do nút Xuất Excel của app sinh ra — tên cột ngay dòng 1
 * Được vậy nhờ tên cột hai bên trùng nhau, và bộ đọc tự dò dòng header thay vì
 * đoán trước. Nhờ đó có thêm một lối làm việc: xuất ra, sửa hàng loạt trong
 * Excel, rồi nạp lại.
 *
 * Chỉ chạy phía máy chủ — exceljs không dùng được trong trình duyệt.
 */

import ExcelJS from "exceljs";
import { boDau, chuanHoaSdt } from "./utils";
import type { GiaiDoan } from "./types";

/** Dò header trong bấy nhiêu dòng đầu rồi thôi */
const DO_HEADER_TRONG = 10;

type Truong =
  | "received_at"
  | "full_name"
  | "gender"
  | "region"
  | "phone"
  | "email"
  | "cv_url"
  | "position"
  | "department"
  | "level"
  | "source"
  | "screener"
  | "screening_note"
  | "status"
  | "hometown"
  | "experience"
  | "available_from"
  | "expected_salary"
  | "offer_status"
  | "planned_onboard_date"
  | "actual_onboard_date"
  | "note";

/**
 * Các cột nhập được — nguồn sự thật duy nhất, dùng chung cho cả bộ đọc lẫn file
 * mẫu tải về. `nhan` phải khớp đúng tiêu đề trong xuat-excel.ts để file app xuất
 * ra nạp lại được.
 *
 * Không có ở đây: mấy cột app tự tính (Mã số, Số ngày chờ, Đã onboard, Số lịch
 * PV) và toàn bộ cột phỏng vấn — đã chốt lần này chỉ nhập hồ sơ ứng viên.
 */
export const COT_NHAP: {
  nhan: string;
  truong: Truong;
  ngay?: boolean;
  rong: number;
}[] = [
  { nhan: "Ngày nhận CV", truong: "received_at", ngay: true, rong: 13 },
  { nhan: "Họ và tên", truong: "full_name", rong: 26 },
  { nhan: "Giới tính", truong: "gender", rong: 10 },
  { nhan: "Khu vực Ứng tuyển", truong: "region", rong: 16 },
  { nhan: "Số điện thoại", truong: "phone", rong: 14 },
  { nhan: "Email", truong: "email", rong: 28 },
  { nhan: "Link CV/Portfolio", truong: "cv_url", rong: 30 },
  { nhan: "Vị trí ứng tuyển", truong: "position", rong: 26 },
  { nhan: "Phòng ban", truong: "department", rong: 18 },
  { nhan: "Cấp bậc", truong: "level", rong: 14 },
  { nhan: "Nguồn CV", truong: "source", rong: 15 },
  { nhan: "Người sàng lọc CV", truong: "screener", rong: 18 },
  { nhan: "KQ sàng lọc", truong: "screening_note", rong: 30 },
  { nhan: "Trạng thái CV", truong: "status", rong: 20 },
  { nhan: "Quê quán", truong: "hometown", rong: 16 },
  { nhan: "Kinh nghiệm", truong: "experience", rong: 30 },
  { nhan: "Thời gian onboard", truong: "available_from", rong: 16 },
  { nhan: "Mức lương mong muốn", truong: "expected_salary", rong: 18 },
  { nhan: "Trạng thái offer", truong: "offer_status", rong: 16 },
  { nhan: "Ngày dự kiến onboard", truong: "planned_onboard_date", ngay: true, rong: 17 },
  { nhan: "Ngày thực tế onboard", truong: "actual_onboard_date", ngay: true, rong: 17 },
  { nhan: "Ghi chú", truong: "note", rong: 30 },
];

/**
 * Giá trị lệch chuẩn hay gặp trong file cũ, chuyển từ tools/import_excel.py.
 * Quy đổi để hồ sơ nhập vào lọc được chung với hồ sơ nhập tay — "Face" và
 * "Facebook" nằm hai rổ khác nhau thì bộ lọc Nguồn CV đếm sai.
 */
const DOI_NGUON: Record<string, string> = {
  face: "Facebook",
  facebook: "Facebook",
  "vn work": "Vietnamworks",
  vietnamwork: "Vietnamworks",
  "career link": "CareerLink",
  careerlink: "CareerLink",
  "career viet": "CareerViet",
  "hunt a": "Hunt",
  thereads: "Threads",
  josbgo: "JobsGO",
  linkedin: "LinkedIn",
  "lọc top cv": "TopCV (chủ động lọc)",
  "chị diệu linh giới thiệu": "Nội bộ giới thiệu",
  "trade cv": "TradeCV",
  topcv: "TopCV",
};

const DOI_VI_TRI: Record<string, string> = {
  "mkt ai": "Marketing AI",
  "marketing ai": "Marketing AI",
  "digital mkt": "Digital Marketing",
  "tp mkt": "Trưởng phòng Marketing",
  des: "Designer",
  "kt sàn": "Kế toán sàn",
  "kt kho": "Kế toán kho",
  "kt viên": "Kế toán viên",
  "kt kiêm hc": "Kế toán kiêm Hành chính",
};

function doiTen(v: string | null, bang: Record<string, string>): string | null {
  if (!v) return null;
  return bang[v.toLowerCase().trim()] ?? v;
}

/* ------------------------------------------------------------ đọc từng ô */

/**
 * Rút giá trị thô của một ô. exceljs trả về đủ kiểu tuỳ ô đó là chữ thường,
 * chữ có định dạng, công thức hay siêu liên kết — không gỡ hết thì mấy ô đó
 * thành "[object Object]".
 */
function docO(v: ExcelJS.CellValue): string | number | Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return v;
  if (typeof v === "boolean") return v ? "x" : null;

  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
    }
    if ("result" in o) return docO(o.result as ExcelJS.CellValue);
    if (typeof o.text === "string") return o.text;
    if ("error" in o) return null;
  }
  return String(v);
}

/** Chuỗi đã gộp khoảng trắng thừa; ô trống trả null */
function chuoi(v: ExcelJS.CellValue): string | null {
  const raw = docO(v);
  if (raw === null) return null;
  if (raw instanceof Date) return raw.toISOString();
  const s = String(raw).replace(/\s+/g, " ").trim();
  return s || null;
}

/** So tên cột bỏ dấu và bỏ khoảng trắng thừa, để "Khu vực Ứng tuyển" khớp "Khu vực ứng tuyển" */
function khoaCot(s: string): string {
  return boDau(s).replace(/\s+/g, " ").trim();
}

/** Mốc Excel đếm ngày: 1899-12-30 (đã tính cả lỗi năm nhuận 1900 của Excel) */
const MOC_EXCEL = Date.UTC(1899, 11, 30);

/**
 * Đọc ô ngày về dạng 'yyyy-mm-dd'.
 * `ok: false` nghĩa là có chữ trong ô nhưng không hiểu được — khác hẳn ô trống,
 * nên phải tách hai trường hợp chứ không gộp thành null.
 */
function docNgay(v: ExcelJS.CellValue): { ok: boolean; ngay: string | null } {
  const raw = docO(v);
  if (raw === null) return { ok: true, ngay: null };

  if (raw instanceof Date) {
    // exceljs dựng Date theo UTC nên phải đọc lại bằng getUTC*, dùng getDate()
    // là lệch một ngày ở múi giờ Việt Nam
    return { ok: true, ngay: raw.toISOString().slice(0, 10) };
  }

  if (typeof raw === "number") {
    if (raw < 1 || raw > 300000) return { ok: false, ngay: null };
    const d = new Date(MOC_EXCEL + Math.floor(raw) * 86_400_000);
    return { ok: true, ngay: d.toISOString().slice(0, 10) };
  }

  const s = String(raw).trim();
  if (!s) return { ok: true, ngay: null };

  // yyyy-mm-dd (kèm phần giờ nếu có)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return kiemNgay(+iso[1], +iso[2], +iso[3]);

  // dd/mm/yyyy hoặc dd-mm-yyyy — thứ tự của Việt Nam, không đoán kiểu Mỹ
  const vn = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (vn) return kiemNgay(+vn[3], +vn[2], +vn[1]);

  return { ok: false, ngay: null };
}

function kiemNgay(nam: number, thang: number, ngay: number) {
  const d = new Date(Date.UTC(nam, thang - 1, ngay));
  const dung =
    d.getUTCFullYear() === nam && d.getUTCMonth() === thang - 1 && d.getUTCDate() === ngay;
  return dung
    ? { ok: true, ngay: d.toISOString().slice(0, 10) }
    : { ok: false, ngay: null };
}

/* ---------------------------------------------------------------- kết quả */

export type DongLoi = {
  /** Số dòng thật trong Excel, để HR mở file ra còn tra đúng chỗ */
  dong: number;
  ten: string | null;
  ly_do: string;
};

export type DongNhap = {
  dong: number;
  ten: string;
  /** Sẵn sàng đưa thẳng vào insert bảng candidates */
  du_lieu: Record<string, string | null>;
  /** Giá trị không có trong Danh mục — vẫn nhập, chỉ nhắc ở màn xem trước */
  canh_bao: string[];
};

export type KetQuaDoc = {
  rows: DongNhap[];
  loi: DongLoi[];
  /** Cột bắt buộc không tìm thấy trong file */
  thieuCot: string[];
  /** Cột trong file mà app không dùng tới */
  cotLa: string[];
  tongDong: number;
};

/** Danh mục để kiểm giá trị, lấy từ bảng catalogs */
export type DanhMucKiem = {
  /** Trạng thái CV -> giai đoạn phễu. Trạng thái ngoài bản đồ này bị coi là lỗi. */
  trangThai: Record<string, GiaiDoan>;
  viTri: Set<string>;
  nguon: Set<string>;
};

const TRANG_THAI_MAC_DINH = "Đang liên hệ";

/* ------------------------------------------------------------------ đọc */

type ViTriHeader = { dong: number; cot: Map<Truong, number>; cotLa: string[] };

/** Dò dòng nào là header: dòng đầu tiên có ô "Họ và tên" */
function timHeader(ws: ExcelJS.Worksheet): ViTriHeader | null {
  const theoKhoa = new Map(COT_NHAP.map((c) => [khoaCot(c.nhan), c.truong]));
  const hetDong = Math.min(ws.rowCount, DO_HEADER_TRONG);

  for (let d = 1; d <= hetDong; d++) {
    const row = ws.getRow(d);
    const cot = new Map<Truong, number>();
    const cotLa: string[] = [];
    let thayHoTen = false;

    row.eachCell({ includeEmpty: false }, (o, soCot) => {
      const nhan = chuoi(o.value);
      if (!nhan) return;
      const truong = theoKhoa.get(khoaCot(nhan));
      if (truong) {
        if (truong === "full_name") thayHoTen = true;
        if (!cot.has(truong)) cot.set(truong, soCot);
      } else {
        cotLa.push(nhan);
      }
    });

    if (thayHoTen) return { dong: d, cot, cotLa };
  }
  return null;
}

/**
 * Đọc và kiểm toàn bộ file.
 *
 * Chặt tay với Trạng thái CV: giá trị lạ là loại dòng đó chứ không cho qua.
 * Trạng thái quyết định hồ sơ nằm cột nào trên Bảng giai đoạn và có bị tính là
 * đã dừng hay không — để lọt một giá trị lạ là hỏng cả hai màn hình đó.
 * Vị trí, nguồn, phòng ban thì thoáng: chỉ nhắc, vẫn nhập.
 */
export async function docFileExcel(
  buffer: ArrayBuffer,
  danhMuc: DanhMucKiem,
): Promise<KetQuaDoc | { loiChung: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return { loiChung: "Không mở được file. Kiểm tra lại đúng là file .xlsx chưa (không phải .xls hay .csv)." };
  }

  // File gốc có nhiều sheet (Data, LỊCH PV, DATA GỐC…) nên phải tìm sheet nào
  // có cột Họ và tên, chứ lấy sheet đầu tiên là trúng nhầm bảng khác
  let ws: ExcelJS.Worksheet | null = null;
  let header: ViTriHeader | null = null;
  for (const sheet of wb.worksheets) {
    const h = timHeader(sheet);
    if (h) {
      ws = sheet;
      header = h;
      break;
    }
  }

  if (!ws || !header) {
    return {
      loiChung:
        "Không thấy cột “Họ và tên” trong file. Tải file mẫu về rồi điền theo đúng tiêu đề cột.",
    };
  }

  const thieuCot = COT_NHAP.filter((c) => !header.cot.has(c.truong)).map((c) => c.nhan);
  if (header.cot.has("full_name") === false) {
    return { loiChung: "File thiếu cột “Họ và tên”." };
  }

  const rows: DongNhap[] = [];
  const loi: DongLoi[] = [];
  let tongDong = 0;

  const homNay = new Date().toISOString().slice(0, 10);

  for (let d = header.dong + 1; d <= ws.rowCount; d++) {
    const row = ws.getRow(d);
    const lay = (t: Truong) => {
      const c = header.cot.get(t);
      return c === undefined ? null : row.getCell(c).value;
    };

    const ten = chuoi(lay("full_name"));

    // dòng trống hoàn toàn thì bỏ qua lặng lẽ, không tính là lỗi — file Excel
    // hay có vài trăm dòng trống phía dưới do định dạng sẵn
    const coGiTrongDong = COT_NHAP.some((c) => chuoi(lay(c.truong)) !== null);
    if (!coGiTrongDong) continue;

    tongDong += 1;

    if (!ten) {
      loi.push({ dong: d, ten: null, ly_do: "Thiếu Họ và tên" });
      continue;
    }

    const nhanCV = docNgay(lay("received_at"));
    if (!nhanCV.ok) {
      loi.push({
        dong: d,
        ten,
        ly_do: `Ngày nhận CV không đọc được: “${chuoi(lay("received_at"))}”. Dùng dạng ngày/tháng/năm.`,
      });
      continue;
    }

    const trangThai = chuoi(lay("status")) ?? TRANG_THAI_MAC_DINH;
    if (!(trangThai in danhMuc.trangThai)) {
      loi.push({
        dong: d,
        ten,
        ly_do: `Trạng thái CV lạ: “${trangThai}”. Phải là một trong các giá trị ở màn hình Danh mục.`,
      });
      continue;
    }

    const duKien = docNgay(lay("planned_onboard_date"));
    const thucTe = docNgay(lay("actual_onboard_date"));
    if (!duKien.ok || !thucTe.ok) {
      loi.push({
        dong: d,
        ten,
        ly_do: `Ngày ${!duKien.ok ? "dự kiến" : "thực tế"} onboard không đọc được. Dùng dạng ngày/tháng/năm.`,
      });
      continue;
    }

    const viTri = doiTen(chuoi(lay("position")), DOI_VI_TRI);
    const nguon = doiTen(chuoi(lay("source")), DOI_NGUON);

    const canh_bao: string[] = [];
    if (viTri && danhMuc.viTri.size && !danhMuc.viTri.has(viTri)) {
      canh_bao.push(`Vị trí “${viTri}” chưa có trong Danh mục`);
    }
    if (nguon && danhMuc.nguon.size && !danhMuc.nguon.has(nguon)) {
      canh_bao.push(`Nguồn CV “${nguon}” chưa có trong Danh mục`);
    }

    const received_at = nhanCV.ngay ?? homNay;

    const du_lieu: Record<string, string | null> = {
      received_at,
      full_name: ten,
      gender: chuoi(lay("gender")),
      region: chuoi(lay("region")),
      phone: chuanHoaSdt(chuoi(lay("phone"))),
      email: chuoi(lay("email"))?.toLowerCase() ?? null,
      cv_url: chuoi(lay("cv_url")),
      position: viTri,
      department: chuoi(lay("department")),
      level: chuoi(lay("level")),
      source: nguon,
      screener: chuoi(lay("screener")),
      screening_note: chuoi(lay("screening_note")),
      status: trangThai,
      hometown: chuoi(lay("hometown")),
      experience: chuoi(lay("experience")),
      available_from: chuoi(lay("available_from")),
      expected_salary: chuoi(lay("expected_salary")),
      offer_status: chuoi(lay("offer_status")),
      planned_onboard_date: duKien.ngay,
      actual_onboard_date: thucTe.ngay,
      note: chuoi(lay("note")),
    };

    // Hồ sơ nhập bù mang trạng thái đã dừng: nói rõ mốc dừng là ngày nhận CV,
    // không thì trigger đặt thành bây giờ và cả trăm hồ sơ cũ đổ vào cột Dừng.
    // Cần migration 0009 mới có tác dụng.
    if (danhMuc.trangThai[trangThai] === "dung") {
      du_lieu.stopped_at = `${received_at}T00:00:00Z`;
    }

    rows.push({ dong: d, ten, du_lieu, canh_bao });
  }

  return { rows, loi, thieuCot, cotLa: header.cotLa, tongDong };
}

/* ------------------------------------------------------------- file mẫu */

/**
 * File .xlsx chỉ có dòng tiêu đề đúng các cột nhập được.
 *
 * Rẻ mà chặn được phần lớn lỗi sai định dạng: HR điền vào đây thì không thể sai
 * tên cột, và cột ngày đã đặt sẵn kiểu ngày nên gõ vào là Excel tự hiểu.
 * Dựng theo đúng khuôn file xuất ra (tô đỏ thương hiệu, đông cứng dòng đầu).
 */
export function taoFileMau(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DrKam HR";
  wb.description = "File mẫu để nhập hàng loạt ứng viên — điền từ dòng 2 trở xuống";

  const ws = wb.addWorksheet("Ứng viên", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = COT_NHAP.map((c) => ({
    header: c.nhan,
    width: c.rong,
    style: c.ngay ? { numFmt: "dd/mm/yyyy" } : {},
  }));

  // Số điện thoại để kiểu văn bản, không thì Excel ăn mất số 0 đầu
  const cotSdt = COT_NHAP.findIndex((c) => c.truong === "phone");
  if (cotSdt >= 0) ws.getColumn(cotSdt + 1).numFmt = "@";

  const tieuDe = ws.getRow(1);
  tieuDe.height = 24;
  tieuDe.font = { bold: true, color: { argb: "FFFFFFFF" } };
  tieuDe.alignment = { vertical: "middle" };
  tieuDe.eachCell((o) => {
    // đỏ chủ đạo DrKam #D32027
    o.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD32027" } };
  });

  return wb.xlsx.writeBuffer();
}
