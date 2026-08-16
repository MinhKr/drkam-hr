-- =====================================================================
-- Ngày 4 — Onboard & thử việc
--
--   1. Trạng thái vòng đời mặc định là "Nhận việc" cho nhân sự mới
--   2. View v_onboard: dòng onboard kèm thông tin nhân sự và số ngày
--      còn lại tới từng mốc đánh giá
--
-- Chạy trong Supabase SQL Editor, sau 0005.
-- =====================================================================

set search_path = tuyendung, public, extensions;

-- 1. Trạng thái mặc định
alter table tuyendung.onboardings alter column status set default 'Nhận việc';
update tuyendung.onboardings set status = 'Nhận việc' where status is null;


-- 2. View
drop view if exists tuyendung.v_onboard;

create view tuyendung.v_onboard
with (security_invoker = on)
as
select
  o.*,
  c.full_name,
  c.phone,
  c.email,
  c.position,
  c.department,
  c.level,
  c.region,
  c.code                                       as ma_ung_vien,
  -- số ngày còn lại tới từng mốc: âm nghĩa là đã quá hạn
  (o.review_7d_due - current_date)             as con_lai_7d,
  (o.review_1m_due - current_date)             as con_lai_1m,
  (o.review_2m_due - current_date)             as con_lai_2m,
  -- số mục checklist đã tick
  (
    select count(*)
      from jsonb_each(o.checklist) as x(k, v)
     where v = 'true'::jsonb
  )                                            as so_viec_xong
from tuyendung.onboardings o
join tuyendung.candidates c on c.id = o.candidate_id;

grant select on tuyendung.v_onboard to anon, authenticated, service_role;

comment on view tuyendung.v_onboard is
  'Nhân sự onboard kèm số ngày còn lại tới hạn đánh giá và số mục checklist đã xong';
