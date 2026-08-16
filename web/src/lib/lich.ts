/**
 * Kiểu dữ liệu và hàm tính toán thuần cho lịch phỏng vấn.
 * Tách riêng khỏi phong-van.ts (có gọi Supabase phía máy chủ) để component
 * chạy trong trình duyệt dùng được mà không kéo theo mã máy chủ.
 */

export type CaPhongVan = {
  id: string;
  candidate_id: string;
  round: 1 | 2;
  scheduled_date: string | null;
  scheduled_time: string | null;
  mode: string | null;
  interviewers: string[];
  result: string | null;
  note: string | null;
  result_email_sent: boolean;
  full_name: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
  source: string | null;
  trang_thai_cv: string;
  ma_ung_vien: number;
};

/** Thứ 2 của tuần chứa ngày đưa vào */
export function thuHaiCuaTuan(d: Date) {
  const x = new Date(d);
  const thu = (x.getDay() + 6) % 7; // 0 = thứ 2
  x.setDate(x.getDate() - thu);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function ngayISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function themNgay(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export const TEN_THU = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

/** Khung giờ 30 phút, 8:00 → 18:30 */
export const KHUNG_GIO = Array.from({ length: 22 }, (_, i) => {
  const phut = 8 * 60 + i * 30;
  return `${String(Math.floor(phut / 60)).padStart(2, "0")}:${String(phut % 60).padStart(2, "0")}`;
});

/** Một ca phỏng vấn tính là chiếm bấy nhiêu phút của người PV */
export const PHUT_MOI_CA = 45;

function sangPhut(t: string | null) {
  const [h, m] = (t ?? "").split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
}

/**
 * Hai ca coi là trùng khi cùng ngày, có chung ít nhất một người phỏng vấn và
 * giờ cách nhau dưới 45 phút — không đòi trùng khít từng phút, vì xếp 9:50 và
 * 10:00 cho cùng một người vẫn là kẹt lịch.
 */
export function timTrungLich(ca: CaPhongVan[]) {
  const trung = new Set<string>();
  for (let i = 0; i < ca.length; i++) {
    for (let j = i + 1; j < ca.length; j++) {
      const a = ca[i];
      const b = ca[j];
      if (!a.scheduled_date || a.scheduled_date !== b.scheduled_date) continue;

      const pa = sangPhut(a.scheduled_time);
      const pb = sangPhut(b.scheduled_time);
      if (pa === null || pb === null) continue;
      if (Math.abs(pa - pb) >= PHUT_MOI_CA) continue;

      if (a.interviewers.some((n) => b.interviewers.includes(n))) {
        trung.add(a.id);
        trung.add(b.id);
      }
    }
  }
  return trung;
}
