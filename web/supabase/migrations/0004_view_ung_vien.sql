-- =====================================================================
-- Ngày 2 — Bổ sung cho màn hình Quản lý CV
--
--   1. View v_ung_vien: ứng viên kèm số lịch PV và kết quả từng vòng,
--      để lọc được "chưa đặt lịch PV" và hiện trạng thái phỏng vấn
--      ngay trên danh sách mà không phải gọi thêm truy vấn.
--   2. Sửa lỗi chính tả trạng thái trong trigger: danh mục gốc ghi
--      "Chưa lên hệ được" (thiếu chữ i), trigger cũ dò "Chưa liên hệ được"
--      nên không khớp.
--
-- Chạy trong Supabase SQL Editor, sau 0001 và 0002.
-- =====================================================================

set search_path = tuyendung, public, extensions;


-- ---------------------------------------------------------------------
-- 1. View danh sách ứng viên
--    security_invoker = on  ->  vẫn áp dụng RLS của bảng gốc.
--    Thiếu dòng này thì người chưa đăng nhập đọc được hết dữ liệu.
-- ---------------------------------------------------------------------
drop view if exists tuyendung.v_ung_vien;

create view tuyendung.v_ung_vien
with (security_invoker = on)
as
select
  c.*,
  coalesce(pv.so_lich, 0)                                  as so_lich_pv,
  pv.ngay_pv_gan_nhat,
  pv.kq_pv1,
  pv.kq_pv2,
  (current_date - c.received_at)                           as so_ngay_cho,
  (ob.candidate_id is not null)                            as da_onboard
from tuyendung.candidates c
left join lateral (
  select
    count(*) filter (where i.scheduled_date is not null)          as so_lich,
    max(i.scheduled_date)                                          as ngay_pv_gan_nhat,
    max(i.result) filter (where i.round = 1)                       as kq_pv1,
    max(i.result) filter (where i.round = 2)                       as kq_pv2
  from tuyendung.interviews i
  where i.candidate_id = c.id
) pv on true
left join tuyendung.onboardings ob on ob.candidate_id = c.id;

grant select on tuyendung.v_ung_vien to anon, authenticated, service_role;

comment on view tuyendung.v_ung_vien is
  'Ứng viên kèm số lịch PV, kết quả từng vòng và số ngày chờ — dùng cho màn hình Quản lý CV';


-- ---------------------------------------------------------------------
-- 2. Sửa trigger: nhận cả hai cách viết của trạng thái "chưa liên hệ"
-- ---------------------------------------------------------------------
create or replace function tuyendung.tg_interview_sync_scheduled()
returns trigger language plpgsql as $$
begin
  if new.scheduled_date is not null then
    update tuyendung.candidates
       set status = case when new.round = 1 then 'Phỏng vấn vòng 1' else 'Phỏng vấn vòng 2' end
     where id = new.candidate_id
       and status in (
         'Đang liên hệ',
         'Chưa lên hệ được',    -- đúng như trong danh mục gốc
         'Chưa liên hệ được',
         'PV đạt - vòng 1'
       );
  end if;
  return new;
end $$;
