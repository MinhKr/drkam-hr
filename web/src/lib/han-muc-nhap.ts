/**
 * Giới hạn của việc nhập Excel, tách riêng khỏi nhap-excel.ts.
 *
 * Vì sao phải tách: nhap-excel.ts nạp exceljs, mà hộp thoại nhập là client
 * component — để chung một file thì cả thư viện exceljs bị kéo vào bundle
 * trình duyệt, nặng thêm vài trăm KB cho mỗi lượt tải trang trong khi trình
 * duyệt không hề dùng tới nó.
 */

/** Quá số dòng này thì bắt cắt file làm nhiều đợt */
export const TOI_DA_DONG = 2000;

/**
 * Trần dung lượng file Excel.
 *
 * File đi kèm FormData lên Server Action nên bị Vercel chặn cứng ở 4.5 MB mỗi
 * request — đặt 4 MB để còn báo lỗi tiếng Việt trước khi chạm mức đó, chừa chỗ
 * cho phần còn lại của request. Cùng lý do với TOI_DA_MB trong cv-file.ts.
 */
export const TOI_DA_MB = 4;
