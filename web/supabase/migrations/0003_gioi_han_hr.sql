-- =====================================================================
-- GIỚI HẠN NGƯỜI XEM — chỉ HR mới vào được app tuyển dụng
--
-- TUỲ CHỌN, và từ khi app có project Supabase riêng thì gần như không
-- cần nữa: project này chỉ có tài khoản do bạn tự tạo cho HR, nên ai
-- đăng nhập được cũng đúng là người được phép. File sinh ra khi app còn
-- dùng chung project với app dashboard cũ, lúc đó mọi tài khoản của công
-- ty đều đăng nhập được nên phải chặn thêm.
--
-- Chỉ chạy nếu muốn thêm một lớp nữa: khoá theo danh sách email, để lỡ
-- có ai được tạo tài khoản trong project này cũng không đọc được dữ liệu
-- ứng viên.
--
-- AN TOÀN: khi bảng hr_users còn trống, mọi tài khoản vẫn vào được
-- như cũ — nên chạy file này không thể tự khoá mình ra ngoài.
-- Chỉ khi bạn thêm dòng đầu tiên thì giới hạn mới bắt đầu có hiệu lực.
-- =====================================================================

-- Chốt an toàn: dừng nếu đây không phải project riêng của app tuyển dụng
select public.f_kiem_tra_project();

set search_path = public, extensions;

create table if not exists public.hr_users (
  email      text primary key,
  full_name  text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.hr_users is
  'Danh sách email được phép dùng app tuyển dụng. Trống = cho phép tất cả.';

grant all on table public.hr_users to anon, authenticated, service_role;


-- Email của người đang đăng nhập có nằm trong danh sách không?
create or replace function public.la_hr()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- chưa khai báo ai thì giữ nguyên như cũ: ai đăng nhập cũng xem được
    when not exists (select 1 from public.hr_users where active) then true
    else exists (
      select 1
        from public.hr_users
       where active
         and lower(email) = lower(
               coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', '')
             )
    )
  end;
$$;


-- Áp dụng cho toàn bộ bảng dữ liệu
do $$
declare t text;
begin
  foreach t in array array['catalogs', 'candidates', 'interviews', 'onboardings'] loop
    execute format('drop policy if exists "hr_all" on public.%I', t);
    execute format(
      'create policy "hr_all" on public.%I for all to authenticated '
      'using (public.la_hr()) with check (public.la_hr())', t
    );
  end loop;
end $$;

drop policy if exists "log_read" on public.activity_log;
create policy "log_read" on public.activity_log
  for select to authenticated using (public.la_hr());


-- =====================================================================
-- KHAI BÁO DANH SÁCH HR — sửa dòng dưới rồi bỏ dấu chú thích để chạy.
-- NHỚ: phải có email của chính bạn, không thì bạn cũng không vào được.
-- =====================================================================

-- insert into public.hr_users (email, full_name) values
--   ('admin@drkam.vn',  'Quản trị'),
--   ('hant@drkam.vn',   'Hân'),
--   ('minhldn@drkam.vn','Linh')
-- on conflict (email) do update set active = true, full_name = excluded.full_name;


-- Kiểm tra ai đang được phép:
-- select * from public.hr_users order by email;
