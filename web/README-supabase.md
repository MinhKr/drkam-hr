# Nối cơ sở dữ liệu — 15 phút

App tuyển dụng dùng **project Supabase riêng**, toàn bộ bảng nằm trong schema `public` của project đó.

> **Trước ngày 17/08/2026** app còn dùng chung project với app dashboard cũ của công ty, nên bảng phải
> để trong schema riêng tên `tuyendung` cho khỏi đụng vào `public` của app kia. Nay có project riêng
> nên bỏ schema riêng đi. Nếu bạn thấy tài liệu hay ảnh chụp nào còn nhắc `tuyendung` thì đó là bản cũ.

---

## Trước khi bắt đầu — đọc kỹ một lần

Các file SQL trong `web/supabase/` **tạo và xoá bảng trong schema `public`**, mà project Supabase nào
cũng có `public`. Chạy nhầm sang project của app khác là đè lên dữ liệu app đó.

Có hai lớp chặn:

1. `0001_init.sql` dừng ngay nếu thấy trong `public` có bảng không thuộc app tuyển dụng — lúc đó nó
   chưa tạo hay sửa gì cả, project kia vẫn nguyên vẹn.
2. Các file còn lại mở đầu bằng `select public.f_kiem_tra_project();`. Hàm đó do `0001` tạo ra nên
   project khác không có → báo lỗi ngay từ dòng đầu.

Chặn được như vậy nhưng vẫn phải **nhìn tên project ở góc trên bên trái trước khi bấm Run**. Đừng chạy
từng câu lệnh bằng cách bôi đen, vì làm vậy có thể bỏ qua dòng kiểm tra.

---

## Bước 1 — Tạo project (3 phút)

[supabase.com](https://supabase.com) → **New project**

| Ô | Điền |
|---|---|
| Name | `drkam-tuyen-dung` |
| Database Password | tự sinh rồi **lưu vào nơi an toàn** — mất là không xem lại được |
| Region | **Southeast Asia (Singapore)** — gần Việt Nam nhất, app chạy nhanh hơn |

Chờ khoảng 2 phút cho project khởi tạo xong.

---

## Bước 2 — Tạo bảng (2 phút)

**SQL Editor** ở thanh trái → mở **`web/supabase/setup_project_moi.sql`** → copy toàn bộ → dán vào → **Run**.

File đó gộp sẵn 5 file migration theo đúng thứ tự, dán một lần là xong. Supabase chạy cả file trong một
giao dịch nên hỏng giữa đường thì huỷ sạch, không để lại cơ sở dữ liệu nửa vời. **Đừng bôi đen chạy từng
đoạn** — làm vậy mất cả tính chất đó lẫn dòng kiểm tra an toàn.

<details>
<summary>Hoặc chạy từng file (nếu muốn thấy rõ từng bước)</summary>

Đúng thứ tự này, thấy Success mới sang file sau:

| Lần | File | Nội dung |
|-----|------|----------|
| 1 | `migrations/0001_init.sql` | 5 bảng, trigger tự động hoá, RLS, cấp quyền |
| 2 | `migrations/0002_seed_catalogs.sql` | 237 dòng danh mục |
| 3 | `migrations/0004_view_ung_vien.sql` | View `v_ung_vien` cho màn hình Quản lý CV |
| 4 | `migrations/0005_view_lich_pv.sql` | View `v_lich_pv` cho màn hình Lịch PV |
| 5 | `migrations/0006_view_onboard.sql` | View `v_onboard` cho màn hình Onboard |

**Phải chạy `0001` đầu tiên** — nó tạo hàm kiểm tra mà 4 file sau đều gọi. Sai thứ tự sẽ gặp lỗi
`function public.f_kiem_tra_project() does not exist`; đó là dấu hiệu bỏ qua `0001` chứ không phải file lỗi.

Thiếu file nào thì màn hình tương ứng báo *"v_… không tồn tại"* — bỏ sót `0006` là trang Onboard trắng.

</details>

`0003_gioi_han_hr.sql` **không cần chạy**: nó khoá quyền theo danh sách email, sinh ra từ hồi dùng chung
project với app cũ. Project này chỉ có tài khoản do bạn tự tạo nên không cần lớp đó nữa. Muốn thêm một
lớp nữa thì đọc phần đầu file rồi chạy.

Xong 5 file, vào **Table Editor** (schema `public`) sẽ thấy: `candidates`, `interviews`, `onboardings`,
`catalogs`, `activity_log`.

> **Cơ sở dữ liệu lúc này chưa có ứng viên nào** — đúng như bạn cần để tự nhập tay.
> Riêng `catalogs` có 237 dòng: đó không phải dữ liệu ứng viên mà là giá trị cho các ô chọn
> (49 vị trí, 23 nguồn CV, 13 trạng thái, 12 người PV…). Không có nó thì mọi dropdown đều trống.

---

## Bước 3 — Không phải mở Exposed schemas nữa

Bảng nằm trong `public`, mà `public` đã được Data API đọc sẵn ở mọi project. Bước "thêm schema vào
**Settings → API → Exposed schemas**" của tài liệu cũ nay bỏ.

Dữ liệu vẫn kín: RLS chỉ mở cho vai `authenticated`, nên khoá công khai nằm trong app đọc không ra dòng nào
khi chưa đăng nhập.

---

## Bước 4 — Lấy khoá kết nối (2 phút)

**Project Settings** → **API Keys** / **Data API**, copy:

| Trên Supabase | Dán vào |
|---------------|---------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** (dashboard mới ghi là **Publishable key**, dạng `sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Cả hai dạng khoá — `eyJhbGciOi…` kiểu cũ và `sb_publishable_…` kiểu mới — app đều dùng được.

Trong thư mục `web/`, sửa file **`.env.local`** (chưa có thì copy từ `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Không cần `SUPABASE_SERVICE_ROLE_KEY` nữa — khoá đó chỉ dùng cho script nạp dữ liệu cũ, mà việc đó đã cắt.

Đổi `.env.local` xong phải **dừng `npm run dev` rồi chạy lại**, Next chỉ đọc file này lúc khởi động.

---

## Bước 5 — Tài khoản đăng nhập (3 phút)

App đăng nhập bằng **email + mật khẩu**, và **không có chỗ tự đăng ký** — mọi tài khoản do bạn tạo tay.

**Authentication → Users → Add user → Create new user**

- Điền email và mật khẩu, **bật `Auto Confirm User`** (không bật thì người đó phải bấm link trong mail mới vào được)
- Làm lần lượt cho từng người trong nhóm HR
- Gửi email + mật khẩu cho họ qua kênh riêng, dặn đổi mật khẩu sau

Không phải cấu hình gì trong **Sign In / Providers**: provider Email bật sẵn, và vì dùng mật khẩu chứ
không dùng magic link nên cũng không cần đặt Site URL hay Redirect URLs.

---

## Bước 6 — Kiểm tra ở máy

1. `npm run dev` → mở http://localhost:3000 → bị đẩy sang trang đăng nhập
2. Đăng nhập bằng tài khoản vừa tạo → vào được app, góc phải hiện email
3. Vào **Danh mục** → thấy đủ 237 dòng nghĩa là đang đọc cơ sở dữ liệu thật, không phải bản dự phòng
   trong `src/data/catalogs.json`
4. Vào **Quản lý CV** → thêm một ứng viên thử → **Lịch phỏng vấn** → đặt lịch → **Onboard** mở được, không lỗi view
5. Bấm **Xuất Excel** → tải về được file `.xlsx`

---

## Bước 7 — Đổi biến môi trường trên Vercel

Vercel vẫn đang trỏ vào project Supabase cũ. Vào **Project → Settings → Environment Variables**, sửa
`NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` thành giá trị của project mới, rồi
**Redeploy** (sửa biến thôi thì bản đã deploy không tự đổi).

Đừng đưa `SUPABASE_SERVICE_ROLE_KEY` lên Vercel.

---

## Project Supabase cũ

Không cần làm gì cả, và **đừng chạy file SQL nào lên đó**. Schema `tuyendung` bên ấy là của app này,
để nguyên cũng không ảnh hưởng gì tới app dashboard cũ. Sau này chắc chắn app mới chạy ổn mà muốn dọn
cho gọn thì tự vào xoá tay, nhớ nhìn kỹ tên project trước khi làm — tài liệu này cố tình không kèm
câu SQL xoá, để không có gì sẵn sàng cho việc dán nhầm.

---

## Xoá sạch để nhập lại

Nhập thử chán chê rồi muốn làm lại từ đầu: mở `web/supabase/xoa_du_lieu.sql`, copy vào SQL Editor → **Run**.
File này xoá hết ứng viên, lịch PV, onboard và nhật ký — **giữ nguyên danh mục**. Không hoàn tác được,
và nhớ xem kỹ đang mở project nào.

---

## Thêm danh mục mới sau này

Sửa trực tiếp trong màn hình **Danh mục** của app.

Muốn nạp lại cả bảng danh mục từ Excel thì `python tools/gen_seed.py` (đọc lại Excel, ghi ra
`0002_seed_catalogs.sql` + `catalogs.json`) rồi chạy lại file SQL đó trong Supabase — có
`on conflict do update` nên chạy nhiều lần vẫn an toàn.
