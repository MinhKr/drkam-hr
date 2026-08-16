// bỏ dấu / thừa ở cuối nếu copy nguyên từ dashboard Supabase
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/**
 * App dùng chung project Supabase với các app khác của công ty, nên toàn bộ
 * bảng nằm trong schema riêng — không đụng gì tới schema public của app cũ.
 * Nhớ thêm tên schema này vào Settings → API → Exposed schemas.
 */
export const DB_SCHEMA = "tuyendung";

/**
 * Chưa điền .env.local thì app vẫn chạy được ở chế độ xem trước:
 * danh mục đọc từ src/data/catalogs.json, các thao tác ghi bị khoá.
 */
export const daNoiSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
