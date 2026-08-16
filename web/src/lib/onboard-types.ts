/** Kiểu dữ liệu và tính toán thuần cho onboard — dùng được cả ở trình duyệt */

export type DongOnboard = {
  id: string;
  candidate_id: string;
  onboard_date: string | null;
  office: string | null;
  checklist: Record<string, boolean>;
  assignee_pre: string | null;
  assignee_docs: string | null;
  assignee_training: string | null;
  pre_note: string | null;
  status: string | null;
  review_7d_due: string | null;
  review_7d_result: string | null;
  review_1m_due: string | null;
  review_1m_result: string | null;
  review_2m_due: string | null;
  review_2m_result: string | null;
  owner: string | null;
  note: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
  level: string | null;
  region: string | null;
  ma_ung_vien: number;
  con_lai_7d: number | null;
  con_lai_1m: number | null;
  con_lai_2m: number | null;
  so_viec_xong: number;
};

export type MucViec = { key: string; ten: string };
export type NhomViec = { key: string; ten: string; viec: MucViec[] };

export type MocDanhGia = {
  khoa: "7d" | "1m" | "2m";
  ten: string;
  han: string | null;
  ketQua: string | null;
  conLai: number | null;
};

/** Ba mốc đánh giá thử việc của một nhân sự */
export function cacMoc(d: DongOnboard): MocDanhGia[] {
  return [
    {
      khoa: "7d",
      ten: "Sau 7 ngày",
      han: d.review_7d_due,
      ketQua: d.review_7d_result,
      conLai: d.con_lai_7d,
    },
    {
      khoa: "1m",
      ten: "Sau 1 tháng",
      han: d.review_1m_due,
      ketQua: d.review_1m_result,
      conLai: d.con_lai_1m,
    },
    {
      khoa: "2m",
      ten: "Sau 2 tháng",
      han: d.review_2m_due,
      ketQua: d.review_2m_result,
      conLai: d.con_lai_2m,
    },
  ];
}

export const TRANG_THAI_KET_THUC = ["Nghỉ việc", "Pass 2 tháng thử việc"];

/**
 * Mốc gần nhất còn chưa có kết quả — dùng để cảnh báo.
 * Trả về null khi đã xong hết hoặc nhân sự đã nghỉ.
 */
export function mocSapToi(d: DongOnboard): MocDanhGia | null {
  if (d.status && TRANG_THAI_KET_THUC.includes(d.status)) return null;
  return cacMoc(d).find((m) => m.han && !m.ketQua) ?? null;
}

export type MucCanhBao = "qua_han" | "hom_nay" | "sap_toi" | "con_xa" | "khong";

export function mucCanhBao(m: MocDanhGia | null): MucCanhBao {
  if (!m || m.conLai === null) return "khong";
  if (m.conLai < 0) return "qua_han";
  if (m.conLai === 0) return "hom_nay";
  if (m.conLai <= 3) return "sap_toi";
  return "con_xa";
}

export function nhanCanhBao(m: MocDanhGia | null): string {
  if (!m || m.conLai === null) return "—";
  if (m.conLai < 0) return `quá hạn ${Math.abs(m.conLai)} ngày`;
  if (m.conLai === 0) return "đến hạn hôm nay";
  return `còn ${m.conLai} ngày`;
}

/** Đếm số mục đã tick trong một nhóm */
export function demNhom(checklist: Record<string, boolean>, nhom: NhomViec) {
  const xong = nhom.viec.filter((v) => checklist[v.key]).length;
  return { xong, tong: nhom.viec.length };
}

export function phanTramXong(checklist: Record<string, boolean>, tongMuc: number) {
  if (tongMuc === 0) return 0;
  const xong = Object.values(checklist ?? {}).filter(Boolean).length;
  return Math.round((xong / tongMuc) * 100);
}
