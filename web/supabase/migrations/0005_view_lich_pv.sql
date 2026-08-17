-- =====================================================================
-- Ngày 3 — Lịch phỏng vấn
--
-- View v_lich_pv: mỗi ca phỏng vấn kèm sẵn thông tin ứng viên, để màn
-- hình lịch không phải gọi thêm truy vấn cho từng dòng.
--
-- Chạy trong Supabase SQL Editor, sau 0004.
-- =====================================================================

-- Chốt an toàn: dừng nếu đây không phải project riêng của app tuyển dụng
select public.f_kiem_tra_project();

set search_path = public, extensions;

drop view if exists public.v_lich_pv;

create view public.v_lich_pv
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
from public.interviews i
join public.candidates c on c.id = i.candidate_id;

grant select on public.v_lich_pv to anon, authenticated, service_role;

comment on view public.v_lich_pv is
  'Lịch phỏng vấn kèm thông tin ứng viên — dùng cho màn hình Lịch phỏng vấn';
