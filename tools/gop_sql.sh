#!/usr/bin/env bash
# Gộp 5 file migration thành web/supabase/setup_project_moi.sql để dán một lần
# vào Supabase SQL Editor khi dựng project mới.
#
# Chạy lại mỗi khi sửa bất kỳ file nào trong web/supabase/migrations/:
#     bash tools/gop_sql.sh
#
# Không gộp 0003_gioi_han_hr.sql: file đó tuỳ chọn, chỉ chạy khi muốn khoá
# quyền theo danh sách email.

set -euo pipefail

GOC="$(cd "$(dirname "$0")/.." && pwd)/web/supabase"
OUT="$GOC/setup_project_moi.sql"
FILES=(0001_init 0002_seed_catalogs 0004_view_ung_vien 0005_view_lich_pv 0006_view_onboard)

cat > "$OUT" << 'HEADER'
-- =====================================================================
-- DỰNG PROJECT SUPABASE MỚI CHO APP TUYỂN DỤNG DRKAM — DÁN MỘT LẦN
--
-- File này GỘP SẴN 5 file trong migrations/ theo đúng thứ tự phải chạy:
--   0001_init.sql -> 0002_seed_catalogs.sql -> 0004 -> 0005 -> 0006
-- Dán toàn bộ vào Supabase SQL Editor rồi Run một lần là xong, khỏi lo
-- chạy thiếu file hay sai thứ tự.
--
-- ⚠  CHỈ chạy trên project Supabase RIÊNG của app tuyển dụng, nơi schema
--    public còn trống. Mục 0 của phần 1 sẽ dừng ngay nếu thấy bảng lạ
--    trong public — lúc đó chưa có gì bị tạo hay bị sửa.
--    Nhìn tên project ở góc trên bên trái trước khi bấm Run.
--
-- Supabase SQL Editor gửi cả file như một lệnh nên chạy trong một giao dịch:
-- hỏng ở giữa thì huỷ sạch, không để lại cơ sở dữ liệu nửa vời. Vì vậy đừng
-- bôi đen chạy từng đoạn — làm vậy mất cả tính chất đó lẫn dòng kiểm tra.
--
-- File này SINH TỰ ĐỘNG — đừng sửa tay. Sửa file trong migrations/ rồi gộp lại
-- bằng lệnh ghi ở TIEN-DO.md, mục Công cụ.
-- =====================================================================


HEADER

for f in "${FILES[@]}"; do
  {
    printf '\n\n-- #####################################################################\n'
    printf -- '-- ##  %s.sql\n' "$f"
    printf -- '-- #####################################################################\n\n'
  } >> "$OUT"
  cat "$GOC/migrations/$f.sql" >> "$OUT"
done

echo "Đã ghi $OUT ($(grep -c '' "$OUT") dòng)"
