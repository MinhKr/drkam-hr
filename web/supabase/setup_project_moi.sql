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
