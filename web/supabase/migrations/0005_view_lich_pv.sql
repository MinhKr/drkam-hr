-- =====================================================================
-- Ngày 3 — Lịch phỏng vấn
--
-- View v_lich_pv: mỗi ca phỏng vấn kèm sẵn thông tin ứng viên, để màn
-- hình lịch không phải gọi thêm truy vấn cho từng dòng.
--
-- Chạy trong Supabase SQL Editor, sau 0004.
-- =====================================================================

set search_path = tuyendung, public, extensions;

drop view if exists tuyendung.v_lich_pv;

create view tuyendung.v_lich_pv
with (security_invoker = on)
as
select
  i.id,
  i.candidate_id,
  i.round,
  i.scheduled_date,
  i.scheduled_time,
  i.mode,
  i.interviewers,
  i.result,
  i.note,
  i.result_email_sent,
  i.created_at,
  i.updated_at,
  c.full_name,
  c.phone,
  c.email,
  c.position,
  c.department,
  c.source,
  c.status        as trang_thai_cv,
  c.code          as ma_ung_vien
from tuyendung.interviews i
join tuyendung.candidates c on c.id = i.candidate_id;

grant select on tuyendung.v_lich_pv to anon, authenticated, service_role;

comment on view tuyendung.v_lich_pv is
  'Lịch phỏng vấn kèm thông tin ứng viên — dùng cho màn hình Lịch phỏng vấn';
