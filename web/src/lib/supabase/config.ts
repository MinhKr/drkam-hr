// bỏ dấu / thừa ở cuối nếu copy nguyên từ dashboard Supabase
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/**
 * App có project Supabase riêng nên bảng nằm ngay trong schema public —
 * không phải thêm gì vào Settings → API → Exposed schemas nữa.
 *
 * Trước đây giá trị này là "tuyendung": hồi app còn dùng chung project với
 * app dashboard cũ, phải để bảng trong schema riêng cho khỏi đụng vào public
 * của app kia. Đổi lại giá trị này thì nhớ đổi cả tên schema trong
 * web/supabase/migrations/*.sql.
 */
export const DB_SCHEMA = "public";

/**
 * Chưa điền .env.local thì app vẫn chạy được ở chế độ xem trước:
 * danh mục đọc từ src/data/catalogs.json, các thao tác ghi bị khoá.
 */
export const daNoiSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
