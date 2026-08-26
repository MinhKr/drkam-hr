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
