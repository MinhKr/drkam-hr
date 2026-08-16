-- =====================================================================
-- XOÁ SẠCH DỮ LIỆU ỨNG VIÊN — giữ nguyên danh mục
--
-- Dùng khi nhập thử chán chê rồi muốn làm lại từ đầu.
-- Chỉ động vào schema tuyendung, không đụng dữ liệu app khác.
--
-- CẨN THẬN: không hoàn tác được.
-- =====================================================================

truncate table
  tuyendung.interviews,
  tuyendung.onboardings,
  tuyendung.candidates,
  tuyendung.activity_log
restart identity cascade;

-- Kiểm tra lại: cả 4 dòng đều phải bằng 0, riêng catalogs vẫn còn 237
select 'candidates'   as bang, count(*) from tuyendung.candidates
union all select 'interviews',    count(*) from tuyendung.interviews
union all select 'onboardings',   count(*) from tuyendung.onboardings
union all select 'activity_log',  count(*) from tuyendung.activity_log
union all select 'catalogs',      count(*) from tuyendung.catalogs;
