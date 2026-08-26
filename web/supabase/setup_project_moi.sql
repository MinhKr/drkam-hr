-- =====================================================================
-- DỰNG PROJECT SUPABASE MỚI CHO APP TUYỂN DỤNG DRKAM — DÁN MỘT LẦN
--
-- File này GỘP SẴN 9 file trong migrations/ theo đúng thứ tự phải chạy:
--   0001_init.sql -> 0002_seed_catalogs.sql -> 0004 -> 0005 -> 0006 -> 0007 -> 0008 -> 0009 -> 0010
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




-- #####################################################################
-- ##  0001_init.sql
-- #####################################################################

-- =====================================================================
-- DrKam ATS — Schema khởi tạo
--
-- Dùng cho project Supabase RIÊNG của app tuyển dụng: toàn bộ bảng nằm
-- trong schema public của project đó.
--
-- ⚠  ĐỪNG chạy file này trên project dùng chung với app khác.
--    Trước đây app nằm trong schema riêng "tuyendung" chính là để không
--    đụng vào schema public của app dashboard cũ. Nay app có project riêng
--    nên bỏ schema riêng — bù lại phải có chốt an toàn ở mục 0 dưới đây:
--    thấy bảng lạ trong public là dừng, không tạo và không sửa gì cả.
--
-- Chạy trong Supabase SQL Editor (copy toàn bộ file này rồi Run).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. CHỐT AN TOÀN — chống dán nhầm sang project của app khác
--    Đặt trước mọi câu lệnh khác và chỉ đọc, chưa sửa gì, nên dán nhầm
--    thì project kia vẫn nguyên vẹn tuyệt đối.
--    Sửa danh sách bảng ở đây thì sửa cả trong f_kiem_tra_project() bên dưới.
-- ---------------------------------------------------------------------
do $$
declare v_bang_la text;
begin
  select string_agg(tablename, ', ' order by tablename)
    into v_bang_la
    from pg_tables
   where schemaname = 'public'
     and tablename not in (
       'catalogs', 'candidates', 'interviews', 'onboardings', 'activity_log', 'hr_users'
     );

  if v_bang_la is not null then
    raise exception using
      message = 'DUNG LAI: schema public của project này đang có bảng không thuộc app tuyển dụng: '
                || v_bang_la,
      hint = 'File này chỉ dành cho project Supabase RIÊNG của app tuyển dụng. '
             || 'Nếu đây là project dùng chung với app khác thì đóng lại, đừng chạy tiếp. '
             || 'Chưa có gì bị tạo hay bị sửa.';
  end if;
end $$;

-- Đưa extensions vào search_path để dùng được gin_trgm_ops khi tạo index
set search_path = public, extensions;


-- ---------------------------------------------------------------------
-- 1. Extension + hàm tiện ích
--    unaccent trên Supabase có thể nằm ở schema public hoặc extensions,
--    nên dò đúng chỗ rồi mới dựng hàm — tránh lỗi "function does not exist".
-- ---------------------------------------------------------------------
do $$
declare v_schema text;
begin
  if not exists (select 1 from pg_extension where extname = 'unaccent') then
    begin
      execute 'create extension unaccent with schema extensions';
    exception when others then
      execute 'create extension unaccent';
    end;
  end if;

  if not exists (select 1 from pg_extension where extname = 'pg_trgm') then
    begin
      execute 'create extension pg_trgm with schema extensions';
    exception when others then
      execute 'create extension pg_trgm';
    end;
  end if;

  select n.nspname into v_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'unaccent';

  execute format(
    'create or replace function public.f_unaccent(text) returns text '
    'language sql immutable parallel safe strict as $f$ select %I.unaccent(%L, $1) $f$',
    v_schema, v_schema || '.unaccent'
  );
end $$;

-- chuẩn hoá số điện thoại: bỏ mọi ký tự không phải số
create or replace function public.f_phone_norm(text)
returns text
language sql
immutable
parallel safe
as $$ select nullif(regexp_replace(coalesce($1, ''), '\D', '', 'g'), '') $$;

-- Chốt an toàn của mục 0, đóng thành hàm để các file 0002–0006 và
-- xoa_du_lieu.sql gọi lại ở dòng đầu. Dán mấy file đó vào project khác thì
-- hàm này không tồn tại ở đó -> báo lỗi ngay từ dòng đầu, chưa sửa gì cả.
create or replace function public.f_kiem_tra_project()
returns void
language plpgsql
as $$
declare v_bang_la text;
begin
  select string_agg(tablename, ', ' order by tablename)
    into v_bang_la
    from pg_tables
   where schemaname = 'public'
     and tablename not in (
       'catalogs', 'candidates', 'interviews', 'onboardings', 'activity_log', 'hr_users'
     );

  if v_bang_la is not null then
    raise exception using
      message = 'DUNG LAI: schema public của project này đang có bảng không thuộc app tuyển dụng: '
                || v_bang_la,
      hint = 'File này chỉ dành cho project Supabase RIÊNG của app tuyển dụng.';
  end if;
end $$;

comment on function public.f_kiem_tra_project() is
  'Chặn việc chạy các file SQL của app tuyển dụng lên project Supabase của app khác';


-- ---------------------------------------------------------------------
-- 2. DANH MỤC — thay cho sheet DATA GỐC và toàn bộ dropdown rời
-- ---------------------------------------------------------------------
create table if not exists public.catalogs (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  value       text not null,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (type, value)
);

create index if not exists catalogs_type_idx on public.catalogs (type, sort_order);

comment on table public.catalogs is 'Danh mục dùng chung: vị trí, phòng ban, nguồn CV, trạng thái, người PV...';


-- ---------------------------------------------------------------------
-- 3. ỨNG VIÊN — thay cho sheet Data
-- ---------------------------------------------------------------------
create table if not exists public.candidates (
  id                    uuid primary key default gen_random_uuid(),
  code                  bigint generated always as identity,

  -- 1. Định danh & thông tin cơ bản
  received_at           date not null default current_date,
  full_name             text not null,
  gender                text,
  region                text,

  -- 2. Liên hệ
  phone                 text,
  email                 text,
  cv_url                text,
  cv_file_path          text,

  -- 3. Vị trí ứng tuyển
  position              text,
  department            text,
  level                 text,
  source                text,

  -- 4. Sàng lọc CV
  screener              text,
  screening_note        text,
  status                text not null default 'Đang liên hệ',

  -- 5. Sơ vấn
  hometown              text,
  experience            text,
  available_from        text,
  expected_salary       text,

  -- 8. Offer
  offer_status          text,
  planned_onboard_date  date,
  actual_onboard_date   date,

  note                  text,

  -- tự động hoá
  phone_norm            text generated always as (public.f_phone_norm(phone)) stored,
  year                  int  generated always as (extract(year from received_at)::int) stored,
  month                 int  generated always as (extract(month from received_at)::int) stored,
  search_text           text generated always as (
                          public.f_unaccent(lower(
                            coalesce(full_name, '') || ' ' ||
                            coalesce(email, '')     || ' ' ||
                            coalesce(phone, '')     || ' ' ||
                            coalesce(position, '')
                          ))
                        ) stored,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            text,
  updated_by            text
);

create index if not exists candidates_search_idx    on public.candidates using gin (search_text gin_trgm_ops);
create index if not exists candidates_phone_idx     on public.candidates (phone_norm) where phone_norm is not null;
create index if not exists candidates_email_idx     on public.candidates (lower(email)) where email is not null;
create index if not exists candidates_status_idx    on public.candidates (status);
create index if not exists candidates_received_idx  on public.candidates (received_at desc);
create index if not exists candidates_position_idx  on public.candidates (position);
create index if not exists candidates_source_idx    on public.candidates (source);


-- ---------------------------------------------------------------------
-- 4. PHỎNG VẤN — thay cho sheet LỊCH PV
-- ---------------------------------------------------------------------
create table if not exists public.interviews (
  id                uuid primary key default gen_random_uuid(),
  candidate_id      uuid not null references public.candidates(id) on delete cascade,
  round             smallint not null check (round in (1, 2)),
  scheduled_date    date,
  scheduled_time    time,
  mode              text,
  interviewers      text[] not null default '{}',
  result            text,
  note              text,
  result_email_sent boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (candidate_id, round)
);

create index if not exists interviews_date_idx         on public.interviews (scheduled_date, scheduled_time);
create index if not exists interviews_candidate_idx    on public.interviews (candidate_id);
create index if not exists interviews_interviewers_idx on public.interviews using gin (interviewers);


-- ---------------------------------------------------------------------
-- 5. ONBOARD — thay cho sheet LỊCH ONBOARD UV
-- ---------------------------------------------------------------------
create table if not exists public.onboardings (
  id                uuid primary key default gen_random_uuid(),
  candidate_id      uuid not null unique references public.candidates(id) on delete cascade,
  onboard_date      date,
  office            text,

  checklist         jsonb not null default '{}'::jsonb,
  assignee_pre      text,
  assignee_docs     text,
  assignee_training text,
  pre_note          text,

  status            text,

  review_7d_due     date generated always as (onboard_date + 7) stored,
  review_7d_result  text,
  review_1m_due     date generated always as ((onboard_date + interval '1 month')::date) stored,
  review_1m_result  text,
  review_2m_due     date generated always as ((onboard_date + interval '2 month')::date) stored,
  review_2m_result  text,

  owner             text,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists onboardings_date_idx   on public.onboardings (onboard_date desc);
create index if not exists onboardings_status_idx on public.onboardings (status);


-- ---------------------------------------------------------------------
-- 6. NHẬT KÝ THAY ĐỔI
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id          bigint generated always as identity primary key,
  entity      text not null,
  entity_id   uuid,
  action      text not null,
  actor       text,
  changes     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_entity_idx on public.activity_log (entity, entity_id, created_at desc);


-- ---------------------------------------------------------------------
-- 7. TRIGGER: updated_at + ghi nhật ký
-- ---------------------------------------------------------------------
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.tg_activity_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email',
    'system'
  );
  v_changes jsonb;
begin
  if tg_op = 'INSERT' then
    v_changes := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    select jsonb_object_agg(key, jsonb_build_object('cu', to_jsonb(old) -> key, 'moi', value))
      into v_changes
      from jsonb_each(to_jsonb(new))
     where to_jsonb(old) -> key is distinct from value
       and key not in ('updated_at', 'search_text');
    if v_changes is null then
      return new;
    end if;
  else
    v_changes := to_jsonb(old);
  end if;

  insert into public.activity_log (entity, entity_id, action, actor, changes)
  values (tg_table_name, coalesce(new.id, old.id), lower(tg_op), v_actor, v_changes);

  return coalesce(new, old);
end $$;

drop trigger if exists candidates_touch  on public.candidates;
drop trigger if exists interviews_touch  on public.interviews;
drop trigger if exists onboardings_touch on public.onboardings;
create trigger candidates_touch  before update on public.candidates  for each row execute function public.tg_touch_updated_at();
create trigger interviews_touch  before update on public.interviews  for each row execute function public.tg_touch_updated_at();
create trigger onboardings_touch before update on public.onboardings for each row execute function public.tg_touch_updated_at();

drop trigger if exists candidates_log  on public.candidates;
drop trigger if exists interviews_log  on public.interviews;
drop trigger if exists onboardings_log on public.onboardings;
create trigger candidates_log  after insert or update or delete on public.candidates  for each row execute function public.tg_activity_log();
create trigger interviews_log  after insert or update or delete on public.interviews  for each row execute function public.tg_activity_log();
create trigger onboardings_log after insert or update or delete on public.onboardings for each row execute function public.tg_activity_log();


-- ---------------------------------------------------------------------
-- 8. TỰ ĐỘNG: kết quả PV → trạng thái CV, và tạo sẵn dòng onboard
-- ---------------------------------------------------------------------
create or replace function public.tg_interview_sync_status()
returns trigger language plpgsql as $$
begin
  if new.result is null or new.result = '' then
    return new;
  end if;

  if new.round = 1 then
    if new.result = 'Đạt' then
      update public.candidates set status = 'PV đạt - vòng 1' where id = new.candidate_id;
    elsif new.result = 'Không đạt' then
      update public.candidates set status = 'Phỏng vấn - loại' where id = new.candidate_id;
    elsif new.result = 'Back up' then
      update public.candidates set status = 'PV đạt - backup' where id = new.candidate_id;
    end if;

  elsif new.round = 2 then
    if new.result = 'Đạt' then
      update public.candidates set status = 'Chờ nhận việc' where id = new.candidate_id;
      insert into public.onboardings (candidate_id)
      values (new.candidate_id)
      on conflict (candidate_id) do nothing;
    elsif new.result = 'Không đạt' then
      update public.candidates set status = 'Phỏng vấn - loại' where id = new.candidate_id;
    elsif new.result = 'Back up' then
      update public.candidates set status = 'PV đạt - backup' where id = new.candidate_id;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists interviews_sync_status on public.interviews;
create trigger interviews_sync_status
  after insert or update of result on public.interviews
  for each row execute function public.tg_interview_sync_status();


create or replace function public.tg_interview_sync_scheduled()
returns trigger language plpgsql as $$
begin
  if new.scheduled_date is not null then
    update public.candidates
       set status = case when new.round = 1 then 'Phỏng vấn vòng 1' else 'Phỏng vấn vòng 2' end
     where id = new.candidate_id
       and status in ('Đang liên hệ', 'Chưa liên hệ được', 'PV đạt - vòng 1');
  end if;
  return new;
end $$;

drop trigger if exists interviews_sync_scheduled on public.interviews;
create trigger interviews_sync_scheduled
  after insert or update of scheduled_date on public.interviews
  for each row execute function public.tg_interview_sync_scheduled();


-- ---------------------------------------------------------------------
-- 9. TÌM ỨNG VIÊN TRÙNG (theo SĐT / email)
-- ---------------------------------------------------------------------
create or replace function public.find_duplicates(p_phone text, p_email text, p_exclude uuid default null)
returns setof public.candidates
language sql stable as $$
  select *
    from public.candidates
   where (p_exclude is null or id <> p_exclude)
     and (
       (public.f_phone_norm(p_phone) is not null and phone_norm = public.f_phone_norm(p_phone))
       or (nullif(p_email, '') is not null and lower(email) = lower(p_email))
     )
   order by received_at desc
   limit 20;
$$;


-- ---------------------------------------------------------------------
-- 10. RLS — mọi người đăng nhập đều xem và sửa được (theo yêu cầu)
-- ---------------------------------------------------------------------
alter table public.catalogs     enable row level security;
alter table public.candidates   enable row level security;
alter table public.interviews   enable row level security;
alter table public.onboardings  enable row level security;
alter table public.activity_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array['catalogs', 'candidates', 'interviews', 'onboardings'] loop
    execute format('drop policy if exists "hr_all" on public.%I', t);
    execute format(
      'create policy "hr_all" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

drop policy if exists "log_read" on public.activity_log;
create policy "log_read" on public.activity_log for select to authenticated using (true);


-- ---------------------------------------------------------------------
-- 11. QUYỀN — để Data API đọc được schema này
--     public đã nằm sẵn trong Exposed schemas của mọi project Supabase,
--     nên từ nay không phải vào Settings → API thêm schema nữa.
--     Dữ liệu vẫn kín: RLS ở mục 10 chỉ mở cho vai "authenticated",
--     nên khoá anon (khoá công khai nằm trong app) đọc không ra dòng nào.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on routines to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;


-- #####################################################################
-- ##  0002_seed_catalogs.sql
-- #####################################################################

-- =====================================================================
-- Seed danh mục — SINH TỰ ĐỘNG từ DATA UV DRKAM 2026.xlsx
-- Đừng sửa tay file này; sửa tools/gen_seed.py rồi chạy: python tools/gen_seed.py
-- =====================================================================

-- Chốt an toàn: dừng nếu đây không phải project riêng của app tuyển dụng.
-- Hàm này do 0001_init.sql tạo ra, project khác không có nên sẽ báo lỗi ngay.
select public.f_kiem_tra_project();

insert into public.catalogs (type, value, sort_order, meta) values
  ('position', 'Ads', 0, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Ads chạy kênh AI', 1, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Biên kịch Tiktok', 2, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Booking', 3, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Content', 4, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'CSKH off', 5, '{"department": "Sale offline", "level": "Nhân viên"}'::jsonb),
  ('position', 'CSKH on', 6, '{"department": "Sale online", "level": "Nhân viên"}'::jsonb),
  ('position', 'Designer', 7, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Digital Lead', 8, '{"department": "Marketing", "level": "Trưởng phòng"}'::jsonb),
  ('position', 'Đóng hàng (Fulltime)', 9, '{"department": "Kho vận", "level": "Nhân viên"}'::jsonb),
  ('position', 'Đóng hàng (Partime)', 10, '{"department": "Kho vận", "level": "Partime"}'::jsonb),
  ('position', 'HR', 11, '{"department": "HCNS", "level": "Nhân viên"}'::jsonb),
  ('position', 'HRM', 12, '{"department": "HCNS", "level": "Trưởng phòng"}'::jsonb),
  ('position', 'Kế toán sàn', 13, '{"department": "Kế toán", "level": "Nhân viên"}'::jsonb),
  ('position', 'Live full', 14, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Live Part', 15, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Marketing AI', 16, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Media', 17, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Sale off', 18, '{"department": "Sale offline", "level": "Nhân viên"}'::jsonb),
  ('position', 'Sale On', 19, '{"department": "Sale online", "level": "Nhân viên"}'::jsonb),
  ('position', 'Trưởng phòng Marketing', 20, '{"department": "Marketing", "level": "Trưởng phòng"}'::jsonb),
  ('position', 'Trợ lý TGD', 21, '{"department": "BGĐ", "level": "Nhân viên"}'::jsonb),
  ('position', 'TTS HR', 22, '{"department": "HCNS", "level": "Thực tập sinh"}'::jsonb),
  ('position', 'TTS MKT', 23, '{"department": "Marketing", "level": "Thực tập sinh"}'::jsonb),
  ('position', 'Vận hành Sàn', 24, '{"department": "Sale online", "level": "Nhân viên"}'::jsonb),
  ('position', 'Kế toán kho', 25, '{"department": "Kế toán", "level": "Nhân viên"}'::jsonb),
  ('position', 'Lead Live', 26, '{"department": "Marketing", "level": "Trưởng nhóm"}'::jsonb),
  ('position', 'Vận Đơn', 27, '{"department": "Kho vận", "level": "Nhân viên"}'::jsonb),
  ('position', 'Kế toán viên', 28, '{"department": "Kế toán", "level": "Nhân viên"}'::jsonb),
  ('position', 'Kế toán kiêm Hành chính', 29, '{"department": "Kế toán", "level": "Nhân viên"}'::jsonb),
  ('position', 'Lead Content', 30, '{"department": "Marketing", "level": "Trưởng nhóm"}'::jsonb),
  ('position', 'Brand leader', 31, '{"department": "Marketing", "level": "Trưởng phòng"}'::jsonb),
  ('position', 'TTS Media', 32, '{"department": "Marketing", "level": "Thực tập sinh"}'::jsonb),
  ('position', 'TTS Booking', 33, '{"department": "Marketing", "level": "Thực tập sinh"}'::jsonb),
  ('position', 'TTS Content', 34, '{"department": "Marketing", "level": "Thực tập sinh"}'::jsonb),
  ('position', 'Trợ live', 35, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'TTS kế toán', 36, '{"department": "Kế toán", "level": "Thực tập sinh"}'::jsonb),
  ('position', 'Telesale', 37, '{"department": "Sale online", "level": "Nhân viên"}'::jsonb),
  ('position', 'Kế toán trưởng', 38, '{"department": "Kế toán", "level": "Trưởng phòng"}'::jsonb),
  ('position', 'Quản lý kho', 39, '{"department": "Kho vận", "level": "Trưởng phòng"}'::jsonb),
  ('position', 'NV kho vận', 40, '{"department": "Kho vận", "level": "Nhân viên"}'::jsonb),
  ('position', 'Leader CSKH On', 41, '{"department": "Sale online", "level": "Trưởng nhóm"}'::jsonb),
  ('position', 'Kế toán tổng hợp', 42, '{"department": "Kế toán", "level": "Nhân viên"}'::jsonb),
  ('position', 'Digital Marketing', 43, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Kế toán nội bộ', 44, '{"department": "Kế toán", "level": "Nhân viên"}'::jsonb),
  ('position', 'SEO WEB', 45, '{"department": "Marketing", "level": "Nhân viên"}'::jsonb),
  ('position', 'Kế toán công nợ', 46, '{"department": "Kế toán", "level": "Nhân viên"}'::jsonb),
  ('position', 'HCNS', 47, '{"department": "HCNS", "level": "Nhân viên"}'::jsonb),
  ('position', 'Kế toán Thuế', 48, '{"department": "Kế toán", "level": "Nhân viên"}'::jsonb),
  ('department', 'BGĐ', 0, '{}'),
  ('department', 'HCNS', 1, '{}'),
  ('department', 'Kế toán', 2, '{}'),
  ('department', 'Kho vận', 3, '{}'),
  ('department', 'Marketing', 4, '{}'),
  ('department', 'Sale online', 5, '{}'),
  ('department', 'Sale offline', 6, '{}'),
  ('level', 'Giám đốc', 0, '{}'),
  ('level', 'Nhân viên', 1, '{}'),
  ('level', 'Thực tập sinh', 2, '{}'),
  ('level', 'Trưởng phòng', 3, '{}'),
  ('level', 'Trưởng nhóm', 4, '{}'),
  ('level', 'Partime', 5, '{}'),
  ('region', 'Hà Nội', 0, '{}'),
  ('region', 'TP.HCM', 1, '{}'),
  ('gender', 'Nam', 0, '{}'),
  ('gender', 'Nữ', 1, '{}'),
  ('province', 'An Giang', 0, '{}'),
  ('province', 'Bà Rịa - Vũng Tàu', 1, '{}'),
  ('province', 'Bắc Giang', 2, '{}'),
  ('province', 'Bắc Kạn', 3, '{}'),
  ('province', 'Bạc Liêu', 4, '{}'),
  ('province', 'Bắc Ninh', 5, '{}'),
  ('province', 'Bến Tre', 6, '{}'),
  ('province', 'Bình Định', 7, '{}'),
  ('province', 'Bình Dương', 8, '{}'),
  ('province', 'Bình Phước', 9, '{}'),
  ('province', 'Bình Thuận', 10, '{}'),
  ('province', 'Cà Mau', 11, '{}'),
  ('province', 'Cần Thơ', 12, '{}'),
  ('province', 'Cao Bằng', 13, '{}'),
  ('province', 'Đà Nẵng', 14, '{}'),
  ('province', 'Đắk Lắk', 15, '{}'),
  ('province', 'Đắk Nông', 16, '{}'),
  ('province', 'Điện Biên', 17, '{}'),
  ('province', 'Đồng Nai', 18, '{}'),
  ('province', 'Đồng Tháp', 19, '{}'),
  ('province', 'Gia Lai', 20, '{}'),
  ('province', 'Hà Giang', 21, '{}'),
  ('province', 'Hà Nam', 22, '{}'),
  ('province', 'Hà Nội', 23, '{}'),
  ('province', 'Hà Tĩnh', 24, '{}'),
  ('province', 'Hải Dương', 25, '{}'),
  ('province', 'Hải Phòng', 26, '{}'),
  ('province', 'Hậu Giang', 27, '{}'),
  ('province', 'TP. Hồ Chí Minh', 28, '{}'),
  ('province', 'Hòa Bình', 29, '{}'),
  ('province', 'Hưng Yên', 30, '{}'),
  ('province', 'Khánh Hòa', 31, '{}'),
  ('province', 'Kiên Giang', 32, '{}'),
  ('province', 'Kon Tum', 33, '{}'),
  ('province', 'Lai Châu', 34, '{}'),
  ('province', 'Lâm Đồng', 35, '{}'),
  ('province', 'Lạng Sơn', 36, '{}'),
  ('province', 'Lào Cai', 37, '{}'),
  ('province', 'Long An', 38, '{}'),
  ('province', 'Nam Định', 39, '{}'),
  ('province', 'Nghệ An', 40, '{}'),
  ('province', 'Ninh Bình', 41, '{}'),
  ('province', 'Ninh Thuận', 42, '{}'),
  ('province', 'Phú Thọ', 43, '{}'),
  ('province', 'Phú Yên', 44, '{}'),
  ('province', 'Quảng Bình', 45, '{}'),
  ('province', 'Quảng Nam', 46, '{}'),
  ('province', 'Quảng Ngãi', 47, '{}'),
  ('province', 'Quảng Ninh', 48, '{}'),
  ('province', 'Quảng Trị', 49, '{}'),
  ('province', 'Sóc Trăng', 50, '{}'),
  ('province', 'Sơn La', 51, '{}'),
  ('province', 'Tây Ninh', 52, '{}'),
  ('province', 'Thái Bình', 53, '{}'),
  ('province', 'Thái Nguyên', 54, '{}'),
  ('province', 'Thanh Hóa', 55, '{}'),
  ('province', 'Thừa Thiên - Huế', 56, '{}'),
  ('province', 'Tiền Giang', 57, '{}'),
  ('province', 'Trà Vinh', 58, '{}'),
  ('province', 'Tuyên Quang', 59, '{}'),
  ('province', 'Vĩnh Long', 60, '{}'),
  ('province', 'Vĩnh Phúc', 61, '{}'),
  ('province', 'Yên Bái', 62, '{}'),
  ('source', 'CareerLink', 0, '{}'),
  ('source', 'CareerViet', 1, '{}'),
  ('source', 'Chợ Tốt', 2, '{}'),
  ('source', 'Facebook', 3, '{}'),
  ('source', 'Hunt', 4, '{}'),
  ('source', 'LinkedIn', 5, '{}'),
  ('source', 'Nội bộ giới thiệu', 6, '{}'),
  ('source', 'Taki', 7, '{}'),
  ('source', 'TopCV', 8, '{}'),
  ('source', 'TradeCV', 9, '{}'),
  ('source', 'Vieclam24h', 10, '{}'),
  ('source', 'Vietnamworks', 11, '{}'),
  ('source', 'Ybox', 12, '{}'),
  ('source', 'Zalo', 13, '{}'),
  ('source', 'Vieclamcantho', 14, '{}'),
  ('source', 'JobsGO', 15, '{}'),
  ('source', 'Cá nhân', 16, '{}'),
  ('source', 'Web công ty', 17, '{}'),
  ('source', 'Pharma360', 18, '{}'),
  ('source', 'Mail', 19, '{}'),
  ('source', 'TopCV (chủ động lọc)', 20, '{}'),
  ('source', 'Glints', 21, '{}'),
  ('source', 'Joboko', 22, '{}'),
  ('cv_status', 'Loại', 0, '{"stage": "dung"}'::jsonb),
  ('cv_status', 'Phỏng vấn vòng 1', 1, '{"stage": "phong_van"}'::jsonb),
  ('cv_status', 'Phỏng vấn vòng 2', 2, '{"stage": "phong_van"}'::jsonb),
  ('cv_status', 'Phỏng vấn - loại', 3, '{"stage": "dung"}'::jsonb),
  ('cv_status', 'Chờ nhận việc', 4, '{"stage": "nhan_viec"}'::jsonb),
  ('cv_status', 'Nhận việc', 5, '{"stage": "nhan_viec"}'::jsonb),
  ('cv_status', 'Đang liên hệ', 6, '{"stage": "moi_ve"}'::jsonb),
  ('cv_status', 'Backup', 7, '{"stage": "cho_quyet_dinh"}'::jsonb),
  ('cv_status', 'Từ chối nhận việc', 8, '{"stage": "dung"}'::jsonb),
  ('cv_status', 'Không đến PV', 9, '{"stage": "dung"}'::jsonb),
  ('cv_status', 'Chưa lên hệ được', 10, '{"stage": "moi_ve"}'::jsonb),
  ('cv_status', 'PV đạt - backup', 11, '{"stage": "cho_quyet_dinh"}'::jsonb),
  ('cv_status', 'PV đạt - vòng 1', 12, '{"stage": "phong_van"}'::jsonb),
  ('stage', 'Mới về', 0, '{"key": "moi_ve"}'::jsonb),
  ('stage', 'Phỏng vấn', 1, '{"key": "phong_van"}'::jsonb),
  ('stage', 'Chờ quyết định', 2, '{"key": "cho_quyet_dinh"}'::jsonb),
  ('stage', 'Nhận việc', 3, '{"key": "nhan_viec"}'::jsonb),
  ('stage', 'Dừng', 4, '{"key": "dung"}'::jsonb),
  ('screener', 'Hân', 0, '{}'),
  ('screener', 'TTS Linh', 1, '{}'),
  ('screener', 'Thủy', 2, '{}'),
  ('interviewer', 'Ms Kim', 0, '{}'),
  ('interviewer', 'Ms Thu', 1, '{}'),
  ('interviewer', 'Ms Linh', 2, '{}'),
  ('interviewer', 'Ms Lan', 3, '{}'),
  ('interviewer', 'Mr Hải', 4, '{}'),
  ('interviewer', 'Mr Quang', 5, '{}'),
  ('interviewer', 'Mr Hiển', 6, '{}'),
  ('interviewer', 'Mr. Khải', 7, '{}'),
  ('interviewer', 'Ms. Ly', 8, '{}'),
  ('interviewer', 'Mr. Công', 9, '{}'),
  ('interviewer', 'Linh HCNS', 10, '{}'),
  ('interviewer', 'Ms Hải - KTT', 11, '{}'),
  ('interview_mode', 'Online', 0, '{}'),
  ('interview_mode', 'Offline HN', 1, '{}'),
  ('interview_mode', 'Offline HCM', 2, '{}'),
  ('interview_result', 'Đạt', 0, '{}'),
  ('interview_result', 'Không đạt', 1, '{}'),
  ('interview_result', 'Back up', 2, '{}'),
  ('offer_status', 'Đã gửi offer', 0, '{}'),
  ('offer_status', 'Chưa gửi offer', 1, '{}'),
  ('onboard_status', 'Pass 7 ngày thử việc', 0, '{}'),
  ('onboard_status', 'Không đạt sau 7 ngày thử việc', 1, '{}'),
  ('onboard_status', 'Pass 1 tháng thử việc', 2, '{}'),
  ('onboard_status', 'Pass 2 tháng thử việc', 3, '{}'),
  ('onboard_status', 'Nghỉ việc', 4, '{}'),
  ('onboard_status', 'Nhận việc', 5, '{}'),
  ('onboard_owner', 'Khuyên', 0, '{}'),
  ('onboard_owner', 'Chinh', 1, '{}'),
  ('onboard_owner', 'Diệu', 2, '{}'),
  ('onboard_owner', 'KA', 3, '{}'),
  ('onboard_owner', 'Ngọc', 4, '{}'),
  ('onboard_owner', 'Tên HR', 5, '{}'),
  ('onboard_owner', 'Trang', 6, '{}'),
  ('onboard_owner', 'TTS Nga', 7, '{}'),
  ('onboard_owner', 'Yến', 8, '{}'),
  ('onboard_owner', 'Linh', 9, '{}'),
  ('onboard_owner', 'Hân', 10, '{}'),
  ('onboard_owner', 'TTS Hiếu', 11, '{}'),
  ('onboard_owner', 'TTS Linh', 12, '{}'),
  ('onboard_owner', 'Thủy', 13, '{}'),
  ('onboard_office', 'Hà Nội', 0, '{}'),
  ('onboard_office', 'TP.HCM', 1, '{}'),
  ('onboard_task_group', 'Pre-onboard (1–3 ngày trước)', 0, '{"key": "pre"}'::jsonb),
  ('onboard_task_group', 'Ngày onboard', 1, '{"key": "ngay_onboard"}'::jsonb),
  ('onboard_task_group', 'Thông tin & tờ khai BHXH, thuế TNCN', 2, '{"key": "giay_to"}'::jsonb),
  ('onboard_task_group', 'Ký cam kết nhân sự', 3, '{"key": "cam_ket"}'::jsonb),
  ('onboard_task_group', 'Đào tạo và hội nhập', 4, '{"key": "dao_tao"}'::jsonb),
  ('onboard_task', 'Tạo group hội nhập / gửi ảnh chào mừng và dặn dò', 0, '{"key": "pre_group", "group": "pre"}'::jsonb),
  ('onboard_task', 'Chuẩn bị cơ sở vật chất', 1, '{"key": "pre_csvc", "group": "pre"}'::jsonb),
  ('onboard_task', 'UV đến onboard', 2, '{"key": "day_den", "group": "ngay_onboard"}'::jsonb),
  ('onboard_task', 'Tiếp nhận hồ sơ nhân viên onboard', 3, '{"key": "day_ho_so", "group": "ngay_onboard"}'::jsonb),
  ('onboard_task', 'Cấp phát trang thiết bị', 4, '{"key": "day_thiet_bi", "group": "ngay_onboard"}'::jsonb),
  ('onboard_task', 'Tờ khai tham gia BHXH', 5, '{"key": "kb_bhxh", "group": "giay_to"}'::jsonb),
  ('onboard_task', 'Tờ khai thuế TNCN (có MST)', 6, '{"key": "kb_tncn", "group": "giay_to"}'::jsonb),
  ('onboard_task', 'Giấy ủy quyền đăng ký MST TNCN (chưa có MST)', 7, '{"key": "kb_mst", "group": "giay_to"}'::jsonb),
  ('onboard_task', 'Cam kết sử dụng tài nguyên của công ty', 8, '{"key": "ck_tai_nguyen", "group": "cam_ket"}'::jsonb),
  ('onboard_task', 'Cam kết nộp đủ hồ sơ còn thiếu đúng thời hạn', 9, '{"key": "ck_ho_so", "group": "cam_ket"}'::jsonb),
  ('onboard_task', 'Ký xác nhận Quy định Chấm công', 10, '{"key": "ck_cham_cong", "group": "cam_ket"}'::jsonb),
  ('onboard_task', 'Ký xác nhận Quy định Đào tạo', 11, '{"key": "ck_dao_tao", "group": "cam_ket"}'::jsonb),
  ('onboard_task', 'Quy định về trách nhiệm bồi thường thiệt hại', 12, '{"key": "ck_boi_thuong", "group": "cam_ket"}'::jsonb),
  ('onboard_task', 'Giới thiệu về Doanh nghiệp', 13, '{"key": "dt_doanh_nghiep", "group": "dao_tao"}'::jsonb),
  ('onboard_task', 'Đào tạo về sản phẩm công ty (tùy vị trí)', 14, '{"key": "dt_san_pham", "group": "dao_tao"}'::jsonb),
  ('onboard_task', 'Đào tạo về ứng dụng AI', 15, '{"key": "dt_ai", "group": "dao_tao"}'::jsonb),
  ('onboard_task', 'Share tài liệu về AI', 16, '{"key": "dt_tai_lieu_ai", "group": "dao_tao"}'::jsonb)
on conflict (type, value) do update
  set sort_order = excluded.sort_order,
      meta       = excluded.meta,
      active     = true;


-- #####################################################################
-- ##  0004_view_ung_vien.sql
-- #####################################################################

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

-- Chốt an toàn: dừng nếu đây không phải project riêng của app tuyển dụng
select public.f_kiem_tra_project();

set search_path = public, extensions;


-- ---------------------------------------------------------------------
-- 1. View danh sách ứng viên
--    security_invoker = on  ->  vẫn áp dụng RLS của bảng gốc.
--    Thiếu dòng này thì người chưa đăng nhập đọc được hết dữ liệu.
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
  'Ứng viên kèm số lịch PV, kết quả từng vòng và số ngày chờ — dùng cho màn hình Quản lý CV';


-- ---------------------------------------------------------------------
-- 2. Sửa trigger: nhận cả hai cách viết của trạng thái "chưa liên hệ"
-- ---------------------------------------------------------------------
create or replace function public.tg_interview_sync_scheduled()
returns trigger language plpgsql as $$
begin
  if new.scheduled_date is not null then
    update public.candidates
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


-- #####################################################################
-- ##  0005_view_lich_pv.sql
-- #####################################################################

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


-- #####################################################################
-- ##  0006_view_onboard.sql
-- #####################################################################

-- =====================================================================
-- Ngày 4 — Onboard & thử việc
--
--   1. Trạng thái vòng đời mặc định là "Nhận việc" cho nhân sự mới
--   2. View v_onboard: dòng onboard kèm thông tin nhân sự và số ngày
--      còn lại tới từng mốc đánh giá
--
-- Chạy trong Supabase SQL Editor, sau 0005.
-- =====================================================================

-- Chốt an toàn: dừng nếu đây không phải project riêng của app tuyển dụng
select public.f_kiem_tra_project();

set search_path = public, extensions;

-- 1. Trạng thái mặc định
alter table public.onboardings alter column status set default 'Nhận việc';
update public.onboardings set status = 'Nhận việc' where status is null;


-- 2. View
drop view if exists public.v_onboard;

create view public.v_onboard
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
from public.onboardings o
join public.candidates c on c.id = o.candidate_id;

grant select on public.v_onboard to anon, authenticated, service_role;

comment on view public.v_onboard is
  'Nhân sự onboard kèm số ngày còn lại tới hạn đánh giá và số mục checklist đã xong';


-- #####################################################################
-- ##  0007_luu_tru_dung.sql
-- #####################################################################

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


-- #####################################################################
-- ##  0008_bucket_cv.sql
-- #####################################################################

-- =====================================================================
-- Ngày 6 — Chỗ chứa file CV tải lên
--
--   Trước nay app chỉ có ô "Link CV / Portfolio": HR phải tự cất CV ở
--   Drive hay Zalo rồi dán đường dẫn vào. Nay đính thẳng file lên hệ
--   thống được.
--
--   Cột candidates.cv_file_path đã có sẵn từ 0001_init.sql nhưng chưa
--   dùng tới — file này chỉ tạo nốt chỗ chứa file cho nó trỏ vào, KHÔNG
--   đụng gì tới bảng candidates. View v_ung_vien viết `select c.*` mà
--   cột đã có từ lúc tạo view, nên cũng không phải dựng lại view.
--
--   Bucket để CÔNG KHAI — đây là lựa chọn có chủ đích, không phải sót:
--   HR cần dán được đường dẫn CV vào file Excel xuất ra và gửi cho
--   trưởng bộ phận, mà đường dẫn có hạn thì làm vậy không được. Đổi lại,
--   ai cầm được đường dẫn cũng mở ra xem được mà không cần đăng nhập.
--   App đặt tên thư mục bằng UUID ngẫu nhiên nên không ai đoán ra, nhưng
--   đường dẫn đã lọt ra ngoài thì không thu lại được.
--   Muốn khoá lại thì đổi `public` thành false ở mục 1, rồi sửa
--   web/src/lib/cv-file.ts sang dùng createSignedUrl.
--
-- Chạy trong Supabase SQL Editor, sau 0007.
--
-- NẾU BÁO LỖI QUYỀN ở mục 2 (`must be owner of table objects`): bỏ qua
-- mục 2, vào Dashboard → Storage → chọn bucket cv-ung-vien → Policies →
-- New policy → tạo tay 4 policy đúng như mô tả trong mục đó. Mục 1 chạy
-- được là bucket đã có, phần còn lại chỉ là phân quyền.
-- =====================================================================

-- Chốt an toàn: dừng nếu đây không phải project riêng của app tuyển dụng
select public.f_kiem_tra_project();

set search_path = public, extensions;


-- ---------------------------------------------------------------------
-- 1. Bucket
--
--    file_size_limit 5 MB là lớp chặn cuối. App tự chặn ở 4 MB trước đó
--    (web/src/lib/cv-file.ts) để còn báo lỗi tiếng Việt tử tế, và vì
--    Vercel chặn cứng 4.5 MB cho mỗi request — file đi kèm form lên máy
--    chủ rồi mới sang đây. Mức 5 MB ở đây chỉ để chặn ai gọi thẳng API.
--
--    allowed_mime_types: chặn ngay từ Supabase, khỏi tin lời trình duyệt.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-ung-vien',
  'cv-ung-vien',
  true,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
   set public             = excluded.public,
       file_size_limit    = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;


-- ---------------------------------------------------------------------
-- 2. Phân quyền — mọi policy đều chốt `bucket_id = 'cv-ung-vien'` để
--    không đụng sang bucket khác nếu sau này project có thêm.
--
--    Đọc: mở cho cả anon. Bucket công khai thì đường dẫn /object/public/
--    vốn không qua RLS, nhưng có policy này thì gọi qua thư viện
--    supabase-js lúc chưa đăng nhập cũng đọc được, đỡ lệch hành vi.
--
--    Ghi / sửa / xoá: chỉ người đã đăng nhập.
-- ---------------------------------------------------------------------
drop policy if exists "cv_doc"  on storage.objects;
drop policy if exists "cv_them" on storage.objects;
drop policy if exists "cv_sua"  on storage.objects;
drop policy if exists "cv_xoa"  on storage.objects;

create policy "cv_doc" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'cv-ung-vien');

create policy "cv_them" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cv-ung-vien');

create policy "cv_sua" on storage.objects
  for update to authenticated
  using (bucket_id = 'cv-ung-vien')
  with check (bucket_id = 'cv-ung-vien');

create policy "cv_xoa" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cv-ung-vien');


-- ---------------------------------------------------------------------
-- 3. Kiểm tra lại: phải ra đúng 1 dòng bucket và 4 dòng policy
-- ---------------------------------------------------------------------
select id, public, file_size_limit from storage.buckets where id = 'cv-ung-vien';

select policyname, cmd
  from pg_policies
 where schemaname = 'storage'
   and tablename  = 'objects'
   and policyname like 'cv_%'
 order by policyname;


-- #####################################################################
-- ##  0009_stopped_at_khi_nhap.sql
-- #####################################################################

-- =====================================================================
-- Ngày 7 — Cho phép chỉ định sẵn mốc dừng khi chèn hồ sơ
--
--   Chuẩn bị cho tính năng nhập hàng loạt từ Excel.
--
--   Trigger candidates_stopped của 0007 đang đặt stopped_at := now() cho
--   MỌI dòng chèn mới mang trạng thái thuộc giai đoạn "dừng". Với thao
--   tác thêm hồ sơ bằng tay thì đúng — HR loại ai lúc nào, mốc là lúc đó.
--
--   Nhưng nhập bù dữ liệu cũ thì sai hẳn: hàng trăm hồ sơ đã loại từ
--   tháng 2 sẽ cùng nhận mốc dừng là hôm nay, rồi đổ hết vào cột "Dừng"
--   của Bảng giai đoạn — đúng cái cột mà 0007 vừa dọn cho gọn — và phải
--   chờ một ngày mới rơi xuống khu lưu trữ.
--
--   Sửa: nhánh INSERT chỉ tự đặt mốc khi dòng chèn vào CHƯA có sẵn mốc.
--   Bộ nhập Excel điền stopped_at = ngày nhận CV nên hồ sơ cũ vào thẳng
--   khu lưu trữ. Form thêm hồ sơ không gửi stopped_at nên vẫn chạy y như
--   trước, không đổi gì.
--
--   Nhánh UPDATE giữ nguyên: đang dừng rồi đổi sang trạng thái dừng khác
--   thì giữ mốc cũ, kéo ra khỏi nhóm dừng thì xoá mốc.
--
-- Chạy trong Supabase SQL Editor, SAU 0007 — file này sửa trigger mà 0007
-- tạo ra, không có 0007 thì không có gì để sửa.
-- =====================================================================

-- Chốt an toàn: dừng nếu đây không phải project riêng của app tuyển dụng
select public.f_kiem_tra_project();

set search_path = public, extensions;


-- ---------------------------------------------------------------------
-- Chốt thứ tự: chưa chạy 0007 thì dừng ngay với câu nói rõ phải làm gì.
-- Không có đoạn này thì lỗi hiện ra là "column stopped_at does not exist"
-- ở tận đoạn tự kiểm cuối file — đọc xong vẫn không biết thiếu file nào.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'candidates'
       and column_name  = 'stopped_at'
  ) then
    raise exception
      'Chưa chạy 0007_luu_tru_dung.sql. File 0009 chỉ sửa lại trigger do 0007 tạo ra, nên phải chạy 0007 trước rồi mới quay lại chạy file này.';
  end if;
end $$;


create or replace function public.tg_candidates_stopped_at()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not public.f_la_trang_thai_dung(new.status) then
      -- chèn vào mà không thuộc nhóm dừng: không giữ mốc nào cả
      new.stopped_at := null;
    elsif new.stopped_at is null then
      -- thuộc nhóm dừng mà không nói rõ mốc: coi như dừng ngay bây giờ.
      -- Nói rõ rồi (nhập bù dữ liệu cũ) thì tôn trọng mốc đó.
      new.stopped_at := now();
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

-- Trigger candidates_stopped của 0007 vẫn trỏ vào hàm này, không phải tạo lại.


-- ---------------------------------------------------------------------
-- Kiểm tra lại: chèn thử một hồ sơ dừng kèm mốc cũ, xem có bị đè không.
-- Chạy xong tự xoá, không để lại gì.
-- ---------------------------------------------------------------------
do $$
declare
  v_id  uuid;
  v_moc timestamptz;
begin
  insert into public.candidates (full_name, status, received_at, stopped_at)
  values ('__thu nghiem 0009__', 'Loại', date '2026-02-10', timestamptz '2026-02-10 09:00+07')
  returning id into v_id;

  select stopped_at into v_moc from public.candidates where id = v_id;
  delete from public.candidates where id = v_id;

  if v_moc <> timestamptz '2026-02-10 09:00+07' then
    raise exception 'Trigger vẫn đè mốc dừng: nhận % thay vì 2026-02-10 09:00+07', v_moc;
  end if;

  raise notice '0009 OK — mốc dừng chỉ định sẵn được giữ nguyên';
end $$;


-- #####################################################################
-- ##  0010_danh_muc_crud.sql
-- #####################################################################

-- =====================================================================
-- Ngày 8 — Cho HR tự thêm/sửa/ẩn/xoá danh mục ngay trong app
--
--   Trước nay bảng catalogs chỉ được ĐỌC: muốn thêm một vị trí tuyển dụng
--   hay một người phỏng vấn mới là phải nhờ người kỹ thuật vào Supabase
--   Table Editor gõ tay. File này dựng phần còn thiếu để màn hình Danh mục
--   tự làm được.
--
--   Quyền ghi thì KHÔNG phải thêm: policy hr_all của 0001 vốn đã cho
--   authenticated toàn quyền trên catalogs. Cái thiếu là hai thứ dưới đây.
--
-- 1. VIEW v_danh_muc — kèm số hồ sơ đang dùng mỗi giá trị
--
--   Hồ sơ lưu CHUỖI THÔ chứ không trỏ khoá ngoại về catalogs (xem 0001).
--   Nên trước khi cho ai đó xoá "Sale On", phải trả lời được: có bao nhiêu
--   hồ sơ đang mang chữ đó? View này đếm sẵn, một lượt cho cả 237 dòng,
--   thay vì app phải hỏi từng giá trị một.
--
-- 2. HÀM f_danh_muc_doi_ten — đổi tên kéo theo hồ sơ cũ
--
--   Cũng vì lưu chuỗi thô: đổi catalogs.value từ "Sale On" sang
--   "Sale Online" mà không đụng tới candidates thì 34 hồ sơ cũ vẫn mang
--   chữ "Sale On" — lọc theo vị trí mới sẽ không thấy chúng, và nếu là
--   Trạng thái CV thì Bảng giai đoạn xếp sai cột luôn.
--
--   Hàm này đổi trong catalogs rồi cập nhật luôn mọi cột dữ liệu đang giữ
--   chuỗi đó, trong CÙNG MỘT giao dịch: hỏng giữa chừng thì huỷ sạch,
--   không bao giờ để danh mục một đằng hồ sơ một nẻo.
--
--   Sửa catalogs TRƯỚC là có chủ đích: vướng unique (type, value) — tức
--   tên mới đã có người dùng — thì lỗi bật ra ngay lúc chưa đụng hồ sơ nào.
--
--   Ba loại stage / onboard_task / onboard_task_group bị chặn: khoá trong
--   meta.key của chúng là thứ đang nằm trong code (5 giai đoạn phễu) và
--   trong onboardings.checklist (17 mục việc). Đổi là hỏng dữ liệu đã lưu.
--
-- Chạy trong Supabase SQL Editor, SAU 0001. Không thêm cột, không xoá dòng
-- nào — chỉ tạo thêm một view và một hàm. Chạy nhầm hai lần cũng không sao.
-- =====================================================================

-- Chốt an toàn: dừng nếu đây không phải project riêng của app tuyển dụng
select public.f_kiem_tra_project();

set search_path = public, extensions;


-- ---------------------------------------------------------------------
-- 1. v_danh_muc — catalogs + số hồ sơ đang dùng
--
--    Mỗi nhánh union all là một chỗ trong cơ sở dữ liệu đang giữ giá trị
--    danh mục. Thêm cột mới có ô chọn thì thêm một nhánh vào đây, và thêm
--    một nhánh tương ứng trong f_danh_muc_doi_ten bên dưới — hai chỗ này
--    phải luôn khớp nhau.
--
--    Đếm theo HỒ SƠ chứ không theo lượt: một buổi phỏng vấn ghi 3 người PV
--    thì mỗi người tính 1, và một ca onboard để cùng một HR ở cả 4 ô phụ
--    trách vẫn chỉ tính 1.
--
--    security_invoker = on -> vẫn áp RLS của bảng gốc, người chưa đăng
--    nhập không đọc được.
-- ---------------------------------------------------------------------
create or replace view public.v_danh_muc
with (security_invoker = on)
as
with dung as (
  -- ------- các cột trên hồ sơ ứng viên -------
  select 'position'::text as type, position as value, count(*)::int as n
    from public.candidates where nullif(btrim(position), '') is not null group by 2
  union all
  select 'department', department, count(*)::int
    from public.candidates where nullif(btrim(department), '') is not null group by 2
  union all
  select 'level', level, count(*)::int
    from public.candidates where nullif(btrim(level), '') is not null group by 2
  union all
  select 'region', region, count(*)::int
    from public.candidates where nullif(btrim(region), '') is not null group by 2
  union all
  select 'gender', gender, count(*)::int
    from public.candidates where nullif(btrim(gender), '') is not null group by 2
  union all
  -- quê quán: danh mục tên là province, cột trên hồ sơ tên là hometown
  select 'province', hometown, count(*)::int
    from public.candidates where nullif(btrim(hometown), '') is not null group by 2
  union all
  select 'source', source, count(*)::int
    from public.candidates where nullif(btrim(source), '') is not null group by 2
  union all
  select 'cv_status', status, count(*)::int
    from public.candidates where nullif(btrim(status), '') is not null group by 2
  union all
  select 'screener', screener, count(*)::int
    from public.candidates where nullif(btrim(screener), '') is not null group by 2
  union all
  select 'offer_status', offer_status, count(*)::int
    from public.candidates where nullif(btrim(offer_status), '') is not null group by 2

  -- ------- các cột trên buổi phỏng vấn -------
  union all
  select 'interview_mode', mode, count(distinct candidate_id)::int
    from public.interviews where nullif(btrim(mode), '') is not null group by 2
  union all
  select 'interview_result', result, count(distinct candidate_id)::int
    from public.interviews where nullif(btrim(result), '') is not null group by 2
  union all
  -- interviewers là text[] nên phải bung ra từng phần tử
  select 'interviewer', iv, count(distinct i.candidate_id)::int
    from public.interviews i, unnest(i.interviewers) as iv
   where nullif(btrim(iv), '') is not null group by 2

  -- ------- các cột trên hồ sơ onboard -------
  union all
  select 'onboard_office', office, count(distinct candidate_id)::int
    from public.onboardings where nullif(btrim(office), '') is not null group by 2
  union all
  select 'onboard_status', status, count(distinct candidate_id)::int
    from public.onboardings where nullif(btrim(status), '') is not null group by 2
  union all
  -- HR onboard nằm ở 4 ô khác nhau, gộp lại rồi đếm theo hồ sơ
  select 'onboard_owner', ng, count(distinct cid)::int
    from (
      select candidate_id as cid, owner        as ng from public.onboardings
      union all
      select candidate_id,        assignee_pre      from public.onboardings
      union all
      select candidate_id,        assignee_docs     from public.onboardings
      union all
      select candidate_id,        assignee_training from public.onboardings
    ) t
   where nullif(btrim(ng), '') is not null group by 2
)
select
  c.id,
  c.type,
  c.value,
  c.sort_order,
  c.active,
  c.meta,
  c.created_at,
  coalesce(d.n, 0) as so_dung
from public.catalogs c
left join dung d on d.type = c.type and d.value = c.value;

comment on view public.v_danh_muc is
  'Danh mục kèm số hồ sơ đang dùng mỗi giá trị — cho màn hình quản lý danh mục';

grant select on public.v_danh_muc to anon, authenticated, service_role;


-- ---------------------------------------------------------------------
-- 2. f_danh_muc_doi_ten — đổi tên, kéo theo mọi hồ sơ đang dùng
--
--    Trả về số hồ sơ đã được cập nhật theo (0 nghĩa là chưa ai dùng).
--    Gọi từ app: supabase.rpc('f_danh_muc_doi_ten', {...}).
-- ---------------------------------------------------------------------
create or replace function public.f_danh_muc_doi_ten(
  p_type text,
  p_cu   text,
  p_moi  text
) returns int
language plpgsql
as $ham$
declare
  v_n   int := 0;
  v_tmp int;
begin
  p_moi := btrim(coalesce(p_moi, ''));

  if p_type is null or p_cu is null then
    raise exception 'Thiếu loại danh mục hoặc tên cũ';
  end if;

  if p_moi = '' then
    raise exception 'Tên mới không được để trống';
  end if;

  if p_type in ('stage', 'onboard_task', 'onboard_task_group') then
    raise exception
      'Danh mục "%" gắn với code và với dữ liệu đã lưu nên không đổi tên trong app được', p_type;
  end if;

  if p_moi = p_cu then
    return 0;
  end if;

  -- Đổi trong danh mục trước: vướng unique (type, value) thì dừng ngay
  -- tại đây, chưa hồ sơ nào bị đụng tới.
  update public.catalogs set value = p_moi where type = p_type and value = p_cu;
  if not found then
    raise exception
      'Không còn giá trị "%" trong danh mục "%" — có thể vừa bị người khác sửa hoặc xoá', p_cu, p_type;
  end if;

  -- Rồi mới tới hồ sơ. Cùng một giao dịch với lệnh trên.
  if p_type = 'position' then
    update public.candidates set position = p_moi where position = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'department' then
    update public.candidates set department = p_moi where department = p_cu;
    get diagnostics v_n = row_count;
    -- meta của vị trí trỏ tên phòng ban theo chuỗi; không đổi theo thì
    -- tính năng tự điền phòng ban khi chọn vị trí sẽ điền ra một tên đã chết
    update public.catalogs
       set meta = jsonb_set(meta, '{department}', to_jsonb(p_moi))
     where type = 'position' and meta->>'department' = p_cu;

  elsif p_type = 'level' then
    update public.candidates set level = p_moi where level = p_cu;
    get diagnostics v_n = row_count;
    update public.catalogs
       set meta = jsonb_set(meta, '{level}', to_jsonb(p_moi))
     where type = 'position' and meta->>'level' = p_cu;

  elsif p_type = 'region' then
    update public.candidates set region = p_moi where region = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'gender' then
    update public.candidates set gender = p_moi where gender = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'province' then
    update public.candidates set hometown = p_moi where hometown = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'source' then
    update public.candidates set source = p_moi where source = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'cv_status' then
    update public.candidates set status = p_moi where status = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'screener' then
    update public.candidates set screener = p_moi where screener = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'offer_status' then
    update public.candidates set offer_status = p_moi where offer_status = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'interview_mode' then
    update public.interviews set mode = p_moi where mode = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'interview_result' then
    update public.interviews set result = p_moi where result = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'interviewer' then
    update public.interviews
       set interviewers = array_replace(interviewers, p_cu, p_moi)
     where p_cu = any(interviewers);
    get diagnostics v_n = row_count;

  elsif p_type = 'onboard_office' then
    update public.onboardings set office = p_moi where office = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'onboard_status' then
    update public.onboardings set status = p_moi where status = p_cu;
    get diagnostics v_n = row_count;

  elsif p_type = 'onboard_owner' then
    -- một người có thể đứng ở cả 4 ô, cộng dồn cho biết đã đụng bao nhiêu chỗ
    update public.onboardings set owner = p_moi where owner = p_cu;
    get diagnostics v_tmp = row_count; v_n := v_n + v_tmp;
    update public.onboardings set assignee_pre = p_moi where assignee_pre = p_cu;
    get diagnostics v_tmp = row_count; v_n := v_n + v_tmp;
    update public.onboardings set assignee_docs = p_moi where assignee_docs = p_cu;
    get diagnostics v_tmp = row_count; v_n := v_n + v_tmp;
    update public.onboardings set assignee_training = p_moi where assignee_training = p_cu;
    get diagnostics v_tmp = row_count; v_n := v_n + v_tmp;

  end if;
  -- Loại nào không nằm trong danh sách trên thì chỉ đổi mỗi catalogs —
  -- đúng, vì không cột dữ liệu nào đang giữ chuỗi của nó.

  return v_n;
end
$ham$;

comment on function public.f_danh_muc_doi_ten(text, text, text) is
  'Đổi tên một giá trị danh mục và cập nhật luôn mọi hồ sơ đang giữ chuỗi đó';


-- ---------------------------------------------------------------------
-- 3. f_danh_muc_sap_xep — ghi lại thứ tự cả một danh mục sau khi kéo thả
--
--    Nhận đúng dãy id theo thứ tự mới rồi đặt sort_order = vị trí trong dãy.
--    Một lệnh update cho cả danh sách, một giao dịch: kéo xong mà hỏng giữa
--    chừng thì thứ tự cũ còn nguyên chứ không nằm lưng chừng.
--
--    Không dùng upsert từ app được: PostgREST gửi INSERT ... ON CONFLICT,
--    mà Postgres kiểm NOT NULL của cả dòng insert trước khi xử lý conflict —
--    gửi mỗi {id, sort_order} là vướng type/value not null ngay.
--
--    Điều kiện c.type = p_type là chốt chặn: id lạ của loại khác lọt vào dãy
--    cũng không đụng được tới dòng đó.
-- ---------------------------------------------------------------------
create or replace function public.f_danh_muc_sap_xep(
  p_type text,
  p_ids  uuid[]
) returns int
language plpgsql
as $sapxep$
declare
  v_n int;
begin
  if p_type is null or p_ids is null then
    raise exception 'Thiếu loại danh mục hoặc danh sách thứ tự';
  end if;

  if p_type in ('stage', 'onboard_task', 'onboard_task_group') then
    raise exception
      'Danh mục "%" gắn với code và với dữ liệu đã lưu nên không sắp xếp trong app được', p_type;
  end if;

  update public.catalogs c
     set sort_order = t.thu_tu
    from (
      select u.id, (u.ord - 1)::int as thu_tu
        from unnest(p_ids) with ordinality as u(id, ord)
    ) t
   where c.id = t.id
     and c.type = p_type
     and c.sort_order is distinct from t.thu_tu;

  get diagnostics v_n = row_count;
  return v_n;
end
$sapxep$;

comment on function public.f_danh_muc_sap_xep(text, uuid[]) is
  'Ghi lại thứ tự hiển thị của cả một danh mục theo dãy id truyền vào';


-- ---------------------------------------------------------------------
-- 4. Nhật ký thay đổi danh mục
--
--    0001 đã gắn tg_activity_log() cho candidates / interviews /
--    onboardings nhưng bỏ qua catalogs — hồi đó chỉ mình người kỹ thuật
--    sửa được nên không cần. Nay HR sửa trực tiếp thì cần: sau này thấy
--    một vị trí biến mất, còn chỗ mà tra ai xoá lúc nào.
--
--    Dùng lại đúng hàm cũ chứ không viết hàm mới: nó vốn đã đọc tên bảng
--    từ tg_table_name, và quan trọng hơn là nó chạy security definer nên
--    ghi được vào activity_log — bảng đó chỉ có policy SELECT cho
--    authenticated, app tự insert vào sẽ bị RLS chặn.
-- ---------------------------------------------------------------------
drop trigger if exists catalogs_log on public.catalogs;
create trigger catalogs_log
  after insert or update or delete on public.catalogs
  for each row execute function public.tg_activity_log();


-- ---------------------------------------------------------------------
-- Kiểm tra lại: dựng một vị trí giả + một hồ sơ dùng nó, đổi tên, xem hồ
-- sơ có đổi theo không. Chạy xong tự dọn, không để lại gì.
-- ---------------------------------------------------------------------
do $kiem$
declare
  v_id   uuid;
  v_a    uuid;
  v_b    uuid;
  v_n    int;
  v_ten  text;
  v_dem  int;
  v_tt_a int;
  v_tt_b int;
begin
  insert into public.catalogs (type, value, sort_order, meta)
  values ('position', '__thu nghiem 0010 cu__', 9998,
          '{"department": "Marketing", "level": "Nhân viên"}'::jsonb)
  returning id into v_a;

  insert into public.catalogs (type, value, sort_order)
  values ('position', '__thu nghiem 0010 b__', 9999)
  returning id into v_b;

  insert into public.candidates (full_name, position)
  values ('__thu nghiem 0010__', '__thu nghiem 0010 cu__')
  returning id into v_id;

  -- 1. view đếm đúng số hồ sơ đang dùng
  select so_dung into v_dem from public.v_danh_muc
   where type = 'position' and value = '__thu nghiem 0010 cu__';
  if v_dem is distinct from 1 then
    raise exception 'v_danh_muc đếm sai: nhận % thay vì 1', v_dem;
  end if;

  -- 2. đổi tên kéo theo hồ sơ cũ
  v_n := public.f_danh_muc_doi_ten('position', '__thu nghiem 0010 cu__', '__thu nghiem 0010 moi__');
  select position into v_ten from public.candidates where id = v_id;

  -- 3. sắp xếp: đảo ngược hai dòng thử nghiệm
  perform public.f_danh_muc_sap_xep('position', array[v_b, v_a]);
  select sort_order into v_tt_a from public.catalogs where id = v_a;
  select sort_order into v_tt_b from public.catalogs where id = v_b;

  delete from public.candidates where id = v_id;
  delete from public.catalogs where id in (v_a, v_b);

  if v_n <> 1 then
    raise exception 'Đổi tên báo cập nhật % hồ sơ, đáng lẽ 1', v_n;
  end if;
  if v_ten <> '__thu nghiem 0010 moi__' then
    raise exception 'Hồ sơ không đổi theo tên mới: vẫn là %', v_ten;
  end if;
  if v_tt_b <> 0 or v_tt_a <> 1 then
    raise exception 'Sắp xếp sai: b nhận %, a nhận %, đáng lẽ 0 và 1', v_tt_b, v_tt_a;
  end if;

  raise notice '0010 OK — đếm đúng số hồ sơ dùng, đổi tên kéo theo hồ sơ cũ, sắp xếp ghi đúng thứ tự';
end
$kiem$;
