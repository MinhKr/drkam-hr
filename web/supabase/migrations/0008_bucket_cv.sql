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
