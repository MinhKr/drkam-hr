-- =====================================================================
-- Ngày 6 — Khu lưu trữ cho cột "Dừng" của Bảng giai đoạn
--
--   Cột Dừng gom mọi hồ sơ đã khép lại nên càng dùng càng dài: vài tháng
--   nữa những ca vừa dừng hôm nay sẽ chìm dưới hàng trăm thẻ cũ. Nay hồ
--   sơ dừng quá 1 ngày rơi xuống khu lưu trữ bên dưới bảng, cột Dừng chỉ
--   còn việc mới.
--
--   Muốn biết "dừng được bao lâu" thì phải có mốc thời gian riêng.
--   updated_at không dùng được: sửa một dòng ghi chú cũng đổi nó, hồ sơ
--   cũ sẽ nhảy ngược lên bảng.
--
--   1. candidates.stopped_at — lúc hồ sơ bước vào nhóm trạng thái thuộc
--      giai đoạn "dừng"; trigger tự ghi, gọi hồ sơ trở lại thì tự xoá.
--   2. View v_ung_vien dựng lại cho có cột mới: view viết `select c.*`
--      nhưng Postgres chốt danh sách cột ngay lúc tạo, thêm cột vào bảng
--      thì view cũ vẫn không thấy.
--
-- Chạy trong Supabase SQL Editor, sau 0006.
-- =====================================================================

-- Chốt an toàn: dừng nếu đây không phải project riêng của app tuyển dụng
select public.f_kiem_tra_project();

set search_path = public, extensions;


-- ---------------------------------------------------------------------
-- 1. Cột mốc thời gian
-- ---------------------------------------------------------------------
alter table public.candidates add column if not exists stopped_at timestamptz;

comment on column public.candidates.stopped_at is
  'Lúc hồ sơ vào nhóm trạng thái giai đoạn "dừng"; null = chưa dừng. Trigger candidates_stopped tự ghi, đừng sửa tay.';

-- Bảng giai đoạn lọc "dừng trước mốc X" rồi xếp theo mốc dừng mới nhất.
-- Chỉ đánh chỉ mục dòng đã dừng — phần lớn hồ sơ có stopped_at null.
create index if not exists candidates_stopped_idx
  on public.candidates (stopped_at desc) where stopped_at is not null;


-- ---------------------------------------------------------------------
-- 2. Trạng thái này có thuộc giai đoạn "dừng" không?
--
--    Đọc thẳng từ catalogs thay vì chép cứng danh sách: app cũng lấy
--    giai đoạn từ meta->>'stage' của cùng những dòng đó, nên đổi phân
--    nhóm một trạng thái trong màn hình Danh mục là trigger theo ngay,
--    không có chuyện hai nơi hiểu khác nhau.
--
--    Không lọc active: tắt một trạng thái trong danh mục chỉ là để nó
--    thôi hiện trong ô chọn, không có nghĩa hồ sơ đang mang trạng thái
--    đó bỗng dưng hết dừng.
--
--    security definer: trigger chạy dưới quyền người đang đăng nhập, mà
--    RLS của catalogs có thể chặn — hàm phải tự đọc được.
-- ---------------------------------------------------------------------
create or replace function public.f_la_trang_thai_dung(p_status text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.catalogs
     where type = 'cv_status'
       and value = p_status
       and meta->>'stage' = 'dung'
  );
$$;

comment on function public.f_la_trang_thai_dung(text) is
  'Trạng thái CV có nằm trong giai đoạn "dừng" của phễu không — tra theo meta.stage trong catalogs';


-- ---------------------------------------------------------------------
-- 3. Trigger giữ stopped_at
-- ---------------------------------------------------------------------
create or replace function public.tg_candidates_stopped_at()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if public.f_la_trang_thai_dung(new.status) then
      new.stopped_at := now();
    else
      new.stopped_at := null;
    end if;

  elsif new.status is distinct from old.status then
    if not public.f_la_trang_thai_dung(new.status) then
      -- gọi hồ sơ trở lại phễu: xoá mốc, thẻ về đúng cột của nó
      new.stopped_at := null;
    elsif not public.f_la_trang_thai_dung(old.status) then
      -- vừa bước vào nhóm dừng: đây là lúc bắt đầu đếm
      new.stopped_at := now();
    end if;
    -- đổi qua lại giữa hai trạng thái cùng nhóm dừng ("Loại" -> "Không
    -- đến PV") thì giữ nguyên mốc cũ, không đẩy hồ sơ lên lại
  end if;

  return new;
end $$;

drop trigger if exists candidates_stopped on public.candidates;
create trigger candidates_stopped
  before insert or update on public.candidates
  for each row execute function public.tg_candidates_stopped_at();


-- ---------------------------------------------------------------------
-- 4. Điền mốc cho hồ sơ đã dừng từ trước
--
--    Không có mốc thật cho những hồ sơ này, lấy updated_at làm xấp xỉ —
--    lần sửa gần nhất thường chính là lúc HR đổi sang trạng thái dừng.
--
--    Tắt hai trigger phụ trong lúc điền: candidates_touch sẽ dời
--    updated_at của mọi hồ sơ đã dừng về hôm nay (mất luôn cái xấp xỉ
--    đang dùng), còn candidates_log ghi vào nhật ký mỗi hồ sơ một dòng
--    cho một thao tác kỹ thuật chẳng ai cần đọc.
-- ---------------------------------------------------------------------
alter table public.candidates disable trigger candidates_touch;
alter table public.candidates disable trigger candidates_log;

update public.candidates
   set stopped_at = coalesce(updated_at, created_at, now())
 where stopped_at is null
   and public.f_la_trang_thai_dung(status);

alter table public.candidates enable trigger candidates_touch;
alter table public.candidates enable trigger candidates_log;


-- ---------------------------------------------------------------------
-- 5. Dựng lại view cho có cột stopped_at
--    Y hệt 0004, chỉ chạy lại để `select c.*` nhận cột mới.
-- ---------------------------------------------------------------------
drop view if exists public.v_ung_vien;

create view public.v_ung_vien
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
from public.candidates c
left join lateral (
  select
    count(*) filter (where i.scheduled_date is not null)          as so_lich,
    max(i.scheduled_date)                                          as ngay_pv_gan_nhat,
    max(i.result) filter (where i.round = 1)                       as kq_pv1,
    max(i.result) filter (where i.round = 2)                       as kq_pv2
  from public.interviews i
  where i.candidate_id = c.id
) pv on true
left join public.onboardings ob on ob.candidate_id = c.id;

grant select on public.v_ung_vien to anon, authenticated, service_role;

comment on view public.v_ung_vien is
  'Ứng viên kèm số lịch PV, kết quả từng vòng, số ngày chờ và mốc dừng — dùng cho màn hình Quản lý CV và Bảng giai đoạn';
