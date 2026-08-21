/**
 * Quy tắc lưu trữ của cột "Dừng" trên Bảng giai đoạn.
 *
 * Cột Dừng gom mọi hồ sơ đã khép lại nên càng dùng càng dài. Hồ sơ dừng quá
 * NGAY_GIU_O_COT_DUNG ngày sẽ rơi xuống khu lưu trữ bên dưới bảng, cột Dừng
 * chỉ còn những ca vừa dừng — đúng phần HR còn phải nhìn tới.
 *
 * Mốc dừng lấy từ `candidates.stopped_at`, do trigger trong cơ sở dữ liệu ghi
 * đúng lúc hồ sơ vào nhóm trạng thái giai đoạn "dừng"
 * (xem supabase/migrations/0007_luu_tru_dung.sql).
 */

/** Hồ sơ dừng quá bấy nhiêu ngày thì xuống khu lưu trữ */
export const NGAY_GIU_O_COT_DUNG = 1;

/** Khu lưu trữ tải nhiều nhất bấy nhiêu hồ sơ, dư ra thì xem ở Quản lý CV */
export const TOI_DA_LUU_TRU = 60;

/**
 * Dừng trước thời điểm này thì coi như đã lưu trữ.
 * Trả chuỗi ISO để đưa thẳng vào bộ lọc PostgREST.
 */
export function mocLuuTru(bayGio: Date = new Date()): string {
  return new Date(bayGio.getTime() - NGAY_GIU_O_COT_DUNG * 86_400_000).toISOString();
}
