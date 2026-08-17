-- =====================================================================
-- XOÁ SẠCH DỮ LIỆU ỨNG VIÊN — giữ nguyên danh mục
--
-- Dùng khi nhập thử chán chê rồi muốn làm lại từ đầu.
--
-- CẨN THẬN: không hoàn tác được.
--
-- ⚠  File này XOÁ bảng trong schema public, mà app nào cũng có schema
--    public. Chỉ chạy trên project Supabase RIÊNG của app tuyển dụng.
--    Dòng kiểm tra ngay dưới đây sẽ chặn nếu dán nhầm sang project khác,
--    nhưng đừng dựa hẳn vào nó: nhìn kỹ tên project ở góc trên bên trái
--    trước khi bấm Run.
-- =====================================================================

-- Chốt an toàn: dừng nếu đây không phải project riêng của app tuyển dụng.
-- Hàm này do 0001_init.sql tạo ra, project khác không có nên sẽ báo lỗi
-- ngay trước khi câu truncate kịp chạy.
select public.f_kiem_tra_project();

truncate table
  public.interviews,
  public.onboardings,
  public.candidates,
  public.activity_log
restart identity cascade;

-- Kiểm tra lại: cả 4 dòng đều phải bằng 0, riêng catalogs vẫn còn 237
select 'candidates'   as bang, count(*) from public.candidates
union all select 'interviews',    count(*) from public.interviews
union all select 'onboardings',   count(*) from public.onboardings
union all select 'activity_log',  count(*) from public.activity_log
union all select 'catalogs',      count(*) from public.catalogs;
