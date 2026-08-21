import { SUPABASE_URL } from "./supabase/config";
import { boDau } from "./utils";

/**
 * Mọi quy tắc về file CV tải lên gom về một chỗ — dùng chung cho cả trình duyệt
 * (ô chọn file báo lỗi sớm) lẫn máy chủ (Server Action không tin lời trình duyệt).
 *
 * Chỗ chứa file: bucket Supabase Storage tạo bởi
 * supabase/migrations/0008_bucket_cv.sql. Bucket để công khai — ai có đường dẫn
 * cũng mở được mà không cần đăng nhập. Đây là lựa chọn có chủ đích để dán được
 * đường dẫn vào file Excel xuất ra; xem phần đầu file SQL đó.
 */

export const BUCKET_CV = "cv-ung-vien";

/**
 * Trần dung lượng app tự áp, đặt thấp hơn hai lớp chặn phía sau để lỗi luôn rơi
 * vào chỗ có lời nhắc tiếng Việt:
 *
 *   4 MB  ← đây, trình duyệt chặn trước khi gửi
 *   5 MB  ← next.config.ts (serverActions.bodySizeLimit)
 *   5 MB  ← file_size_limit của bucket
 *   4.5MB ← Vercel chặn cứng mỗi request, không chỉnh được
 *
 * Chừa khoảng hở cho các ô chữ khác trong form cùng đi trong request đó.
 */
export const TOI_DA_MB = 4;

/**
 * Kiểu file nhận vào, kèm luôn content-type sẽ khai báo với Supabase.
 *
 * Không dùng `file.type` của trình duyệt để khai báo: máy này báo .docx là
 * application/octet-stream, máy kia báo đúng tên dài — mà bucket có
 * allowed_mime_types nên khai sai là Supabase từ chối. Suy ra từ đuôi file thì
 * máy nào cũng như nhau.
 */
const MIME_THEO_DUOI: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/** Chuỗi cho thuộc tính `accept` của ô chọn file */
export const DUOI_CHO_PHEP = Object.keys(MIME_THEO_DUOI);

/** Đuôi file, viết thường, kèm dấu chấm. "CV Anh.PDF" -> ".pdf" */
function duoiCua(ten: string): string {
  const i = ten.lastIndexOf(".");
  return i === -1 ? "" : ten.slice(i).toLowerCase();
}

export function mimeTheoDuoi(ten: string): string | null {
  return MIME_THEO_DUOI[duoiCua(ten)] ?? null;
}

/** Chỉ mấy kiểu này bấm vào mới mở thẳng tab xem, còn lại trình duyệt tải về */
export function xemDuocTrenTab(ten?: string | null): boolean {
  if (!ten) return false;
  const m = mimeTheoDuoi(ten);
  return m === "application/pdf" || (m?.startsWith("image/") ?? false);
}

/**
 * Kiểm file trước khi tải lên. Trả câu báo lỗi tiếng Việt, hoặc null nếu ổn.
 * Nhận kiểu cấu trúc chứ không phải `File` để gọi được ở cả hai phía.
 */
export function kiemTraFile(file: { name: string; size: number }): string | null {
  if (file.size === 0) return "File rỗng, chọn lại giúp mình file khác.";

  if (!mimeTheoDuoi(file.name)) {
    return `Chỉ nhận file ${DUOI_CHO_PHEP.join(", ")} — nên dùng PDF.`;
  }

  if (file.size > TOI_DA_MB * 1024 * 1024) {
    return `File nặng ${dungLuongGon(file.size)}, quá mức ${TOI_DA_MB} MB. Nén bớt hoặc lưu lại dạng PDF rồi thử lại.`;
  }

  return null;
}

/**
 * Đường dẫn để cất file trong bucket: `{uuid}/{tên file đã bỏ dấu}`.
 *
 * Thư mục UUID riêng cho từng file, không gom theo ứng viên: nhờ vậy tải file
 * lên xong mới biết id ứng viên cũng không sao, và hai người trùng tên file
 * không đè lên nhau. Bucket công khai nên cái UUID này còn là thứ khiến người
 * ngoài không mò ra đường dẫn.
 */
export function taoDuongDanLuu(tenGoc: string): string {
  const duoi = duoiCua(tenGoc);
  const than = boDau(tenGoc.slice(0, tenGoc.length - duoi.length))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${crypto.randomUUID()}/${than || "cv"}${duoi}`;
}

/**
 * Đường dẫn xem file. Bucket công khai nên chỉ nối chuỗi, không gọi mạng và
 * không hết hạn. Đổi bucket sang riêng tư thì phải thay hàm này bằng
 * createSignedUrl — lúc đó nó thành hàm bất đồng bộ, gọi từ máy chủ.
 */
export function duongDanCongKhai(path?: string | null): string | null {
  if (!path || !SUPABASE_URL) return null;
  const antoan = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_CV}/${antoan}`;
}

/** Tên file để hiện cho người dùng, cắt khỏi đường dẫn lưu trữ */
export function tenFileTuDuongDan(path?: string | null): string {
  if (!path) return "";
  return path.split("/").pop() ?? "";
}

/** 319488 -> "312 KB" · 1572864 -> "1,5 MB" */
export function dungLuongGon(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
