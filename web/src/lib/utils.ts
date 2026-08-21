import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Bỏ dấu tiếng Việt để tìm kiếm: "Nguyễn Văn A" -> "nguyen van a" */
export function boDau(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** Chuẩn hoá số điện thoại: giữ số 0 đầu, bỏ mọi ký tự thừa */
export function chuanHoaSdt(s?: string | null) {
  if (!s) return null;
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("84") && digits.length >= 11) return "0" + digits.slice(2);
  if (!digits.startsWith("0") && digits.length === 9) return "0" + digits;
  return digits;
}

const TEN_THANG = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

export function thangCuaNgay(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return TEN_THANG[date.getMonth()];
}

export function dinhDangNgay(d?: string | Date | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function dinhDangGio(t?: string | null) {
  if (!t) return "—";
  return t.slice(0, 5);
}

/** Số ngày kể từ mốc — dùng cho cảnh báo "quá 7 ngày chưa phản hồi" */
export function soNgayTu(d?: string | Date | null) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * Chuẩn hoá link HR gõ tay để đặt vào thẻ <a>.
 * Thiếu https:// thì trình duyệt hiểu "topcv.vn/abc" là đường dẫn trong app,
 * bấm vào là nhảy sang trang 404 của chính mình chứ không ra ngoài.
 */
export function linkNgoai(url?: string | null): string | null {
  const s = url?.trim();
  if (!s) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(s)) return s;
  return `https://${s}`;
}

/** Chữ cái đầu để làm ảnh đại diện: "Nguyễn Văn A" -> "NA" */
export function chuVietTat(ten: string) {
  const parts = ten.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
