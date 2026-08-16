-- =====================================================================
-- DrKam ATS — Schema khởi tạo
--
-- App dùng CHUNG project Supabase với các app khác, nhưng toàn bộ bảng
-- nằm trong schema riêng "tuyendung" nên không đụng gì tới dữ liệu cũ
-- trong schema public.
--
-- Chạy trong Supabase SQL Editor (copy toàn bộ file này rồi Run).
-- =====================================================================

create schema if not exists tuyendung;

-- Đưa extensions vào search_path để dùng được gin_trgm_ops khi tạo index
set search_path = tuyendung, public, extensions;


-- ---------------------------------------------------------------------
-- 0. Extension + hàm tiện ích
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
    'create or replace function tuyendung.f_unaccent(text) returns text '
    'language sql immutable parallel safe strict as $f$ select %I.unaccent(%L, $1) $f$',
    v_schema, v_schema || '.unaccent'
  );
end $$;

-- chuẩn hoá số điện thoại: bỏ mọi ký tự không phải số
create or replace function tuyendung.f_phone_norm(text)
returns text
language sql
immutable
parallel safe
as $$ select nullif(regexp_replace(coalesce($1, ''), '\D', '', 'g'), '') $$;


-- ---------------------------------------------------------------------
-- 1. DANH MỤC — thay cho sheet DATA GỐC và toàn bộ dropdown rời
-- ---------------------------------------------------------------------
create table if not exists tuyendung.catalogs (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  value       text not null,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (type, value)
);

create index if not exists catalogs_type_idx on tuyendung.catalogs (type, sort_order);

comment on table tuyendung.catalogs is 'Danh mục dùng chung: vị trí, phòng ban, nguồn CV, trạng thái, người PV...';


-- ---------------------------------------------------------------------
-- 2. ỨNG VIÊN — thay cho sheet Data
-- ---------------------------------------------------------------------
create table if not exists tuyendung.candidates (
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
  phone_norm            text generated always as (tuyendung.f_phone_norm(phone)) stored,
  year                  int  generated always as (extract(year from received_at)::int) stored,
  month                 int  generated always as (extract(month from received_at)::int) stored,
  search_text           text generated always as (
                          tuyendung.f_unaccent(lower(
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

create index if not exists candidates_search_idx    on tuyendung.candidates using gin (search_text gin_trgm_ops);
create index if not exists candidates_phone_idx     on tuyendung.candidates (phone_norm) where phone_norm is not null;
create index if not exists candidates_email_idx     on tuyendung.candidates (lower(email)) where email is not null;
create index if not exists candidates_status_idx    on tuyendung.candidates (status);
create index if not exists candidates_received_idx  on tuyendung.candidates (received_at desc);
create index if not exists candidates_position_idx  on tuyendung.candidates (position);
create index if not exists candidates_source_idx    on tuyendung.candidates (source);


-- ---------------------------------------------------------------------
-- 3. PHỎNG VẤN — thay cho sheet LỊCH PV
-- ---------------------------------------------------------------------
create table if not exists tuyendung.interviews (
  id                uuid primary key default gen_random_uuid(),
  candidate_id      uuid not null references tuyendung.candidates(id) on delete cascade,
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

create index if not exists interviews_date_idx         on tuyendung.interviews (scheduled_date, scheduled_time);
create index if not exists interviews_candidate_idx    on tuyendung.interviews (candidate_id);
create index if not exists interviews_interviewers_idx on tuyendung.interviews using gin (interviewers);


-- ---------------------------------------------------------------------
-- 4. ONBOARD — thay cho sheet LỊCH ONBOARD UV
-- ---------------------------------------------------------------------
create table if not exists tuyendung.onboardings (
  id                uuid primary key default gen_random_uuid(),
  candidate_id      uuid not null unique references tuyendung.candidates(id) on delete cascade,
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

create index if not exists onboardings_date_idx   on tuyendung.onboardings (onboard_date desc);
create index if not exists onboardings_status_idx on tuyendung.onboardings (status);


-- ---------------------------------------------------------------------
-- 5. NHẬT KÝ THAY ĐỔI
-- ---------------------------------------------------------------------
create table if not exists tuyendung.activity_log (
  id          bigint generated always as identity primary key,
  entity      text not null,
  entity_id   uuid,
  action      text not null,
  actor       text,
  changes     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_entity_idx on tuyendung.activity_log (entity, entity_id, created_at desc);


-- ---------------------------------------------------------------------
-- 6. TRIGGER: updated_at + ghi nhật ký
-- ---------------------------------------------------------------------
create or replace function tuyendung.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function tuyendung.tg_activity_log()
returns trigger language plpgsql security definer set search_path = tuyendung, public as $$
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

  insert into tuyendung.activity_log (entity, entity_id, action, actor, changes)
  values (tg_table_name, coalesce(new.id, old.id), lower(tg_op), v_actor, v_changes);

  return coalesce(new, old);
end $$;

drop trigger if exists candidates_touch  on tuyendung.candidates;
drop trigger if exists interviews_touch  on tuyendung.interviews;
drop trigger if exists onboardings_touch on tuyendung.onboardings;
create trigger candidates_touch  before update on tuyendung.candidates  for each row execute function tuyendung.tg_touch_updated_at();
create trigger interviews_touch  before update on tuyendung.interviews  for each row execute function tuyendung.tg_touch_updated_at();
create trigger onboardings_touch before update on tuyendung.onboardings for each row execute function tuyendung.tg_touch_updated_at();

drop trigger if exists candidates_log  on tuyendung.candidates;
drop trigger if exists interviews_log  on tuyendung.interviews;
drop trigger if exists onboardings_log on tuyendung.onboardings;
create trigger candidates_log  after insert or update or delete on tuyendung.candidates  for each row execute function tuyendung.tg_activity_log();
create trigger interviews_log  after insert or update or delete on tuyendung.interviews  for each row execute function tuyendung.tg_activity_log();
create trigger onboardings_log after insert or update or delete on tuyendung.onboardings for each row execute function tuyendung.tg_activity_log();


-- ---------------------------------------------------------------------
-- 7. TỰ ĐỘNG: kết quả PV → trạng thái CV, và tạo sẵn dòng onboard
-- ---------------------------------------------------------------------
create or replace function tuyendung.tg_interview_sync_status()
returns trigger language plpgsql as $$
begin
  if new.result is null or new.result = '' then
    return new;
  end if;

  if new.round = 1 then
    if new.result = 'Đạt' then
      update tuyendung.candidates set status = 'PV đạt - vòng 1' where id = new.candidate_id;
    elsif new.result = 'Không đạt' then
      update tuyendung.candidates set status = 'Phỏng vấn - loại' where id = new.candidate_id;
    elsif new.result = 'Back up' then
      update tuyendung.candidates set status = 'PV đạt - backup' where id = new.candidate_id;
    end if;

  elsif new.round = 2 then
    if new.result = 'Đạt' then
      update tuyendung.candidates set status = 'Chờ nhận việc' where id = new.candidate_id;
      insert into tuyendung.onboardings (candidate_id)
      values (new.candidate_id)
      on conflict (candidate_id) do nothing;
    elsif new.result = 'Không đạt' then
      update tuyendung.candidates set status = 'Phỏng vấn - loại' where id = new.candidate_id;
    elsif new.result = 'Back up' then
      update tuyendung.candidates set status = 'PV đạt - backup' where id = new.candidate_id;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists interviews_sync_status on tuyendung.interviews;
create trigger interviews_sync_status
  after insert or update of result on tuyendung.interviews
  for each row execute function tuyendung.tg_interview_sync_status();


create or replace function tuyendung.tg_interview_sync_scheduled()
returns trigger language plpgsql as $$
begin
  if new.scheduled_date is not null then
    update tuyendung.candidates
       set status = case when new.round = 1 then 'Phỏng vấn vòng 1' else 'Phỏng vấn vòng 2' end
     where id = new.candidate_id
       and status in ('Đang liên hệ', 'Chưa liên hệ được', 'PV đạt - vòng 1');
  end if;
  return new;
end $$;

drop trigger if exists interviews_sync_scheduled on tuyendung.interviews;
create trigger interviews_sync_scheduled
  after insert or update of scheduled_date on tuyendung.interviews
  for each row execute function tuyendung.tg_interview_sync_scheduled();


-- ---------------------------------------------------------------------
-- 8. TÌM ỨNG VIÊN TRÙNG (theo SĐT / email)
-- ---------------------------------------------------------------------
create or replace function tuyendung.find_duplicates(p_phone text, p_email text, p_exclude uuid default null)
returns setof tuyendung.candidates
language sql stable as $$
  select *
    from tuyendung.candidates
   where (p_exclude is null or id <> p_exclude)
     and (
       (tuyendung.f_phone_norm(p_phone) is not null and phone_norm = tuyendung.f_phone_norm(p_phone))
       or (nullif(p_email, '') is not null and lower(email) = lower(p_email))
     )
   order by received_at desc
   limit 20;
$$;


-- ---------------------------------------------------------------------
-- 9. RLS — mọi người đăng nhập đều xem và sửa được (theo yêu cầu)
-- ---------------------------------------------------------------------
alter table tuyendung.catalogs     enable row level security;
alter table tuyendung.candidates   enable row level security;
alter table tuyendung.interviews   enable row level security;
alter table tuyendung.onboardings  enable row level security;
alter table tuyendung.activity_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array['catalogs', 'candidates', 'interviews', 'onboardings'] loop
    execute format('drop policy if exists "hr_all" on tuyendung.%I', t);
    execute format(
      'create policy "hr_all" on tuyendung.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

drop policy if exists "log_read" on tuyendung.activity_log;
create policy "log_read" on tuyendung.activity_log for select to authenticated using (true);


-- ---------------------------------------------------------------------
-- 10. QUYỀN — để Data API đọc được schema này
--     Nhớ thêm "tuyendung" vào Settings → API → Exposed schemas
-- ---------------------------------------------------------------------
grant usage on schema tuyendung to anon, authenticated, service_role;

grant all on all tables    in schema tuyendung to anon, authenticated, service_role;
grant all on all routines  in schema tuyendung to anon, authenticated, service_role;
grant all on all sequences in schema tuyendung to anon, authenticated, service_role;

alter default privileges for role postgres in schema tuyendung
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema tuyendung
  grant all on routines to anon, authenticated, service_role;
alter default privileges for role postgres in schema tuyendung
  grant all on sequences to anon, authenticated, service_role;
