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
