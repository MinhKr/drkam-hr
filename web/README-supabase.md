# Nối cơ sở dữ liệu — 10 phút

Gói Supabase Free chỉ cho 2 project và bạn đã dùng hết, nên app này **dùng chung một project sẵn có**.
Toàn bộ bảng nằm trong schema riêng tên `tuyendung`, tách biệt hẳn với schema `public` mà các app cũ
đang dùng — không đụng, không sửa, không xoá gì của app cũ.

App đang chạy ở **chế độ xem trước**: giao diện và danh mục hiển thị đầy đủ nhưng chưa lưu được gì.
Làm 5 bước dưới đây là có đăng nhập thật.

> **Chọn project nào?** Project nào cũng được, nên chọn cái còn nhiều dung lượng hơn.
> Cần khoảng 50–100MB cho 4.697 hồ sơ dạng chữ. Xem dung lượng ở **Project Settings → Usage**.

---

## Bước 1 — Tạo bảng (2 phút)

Mở project đã chọn → **SQL Editor** ở thanh trái → chạy lần lượt **đúng thứ tự**:

| Lần | Mở file | Làm gì |
|-----|---------|--------|
| 1 | `web/supabase/migrations/0001_init.sql` | Copy toàn bộ → dán vào SQL Editor → **Run** |
| 2 | `web/supabase/migrations/0002_seed_catalogs.sql` | Copy toàn bộ → dán → **Run** |

File thứ nhất tự tạo schema `tuyendung`, 5 bảng, các trigger tự động hoá và cấp quyền.
File thứ hai nạp 237 dòng danh mục.

Chạy xong, vào **Table Editor** → đổi ô chọn schema ở góc trên trái từ `public` sang **`tuyendung`**
sẽ thấy: `candidates`, `interviews`, `onboardings`, `catalogs`, `activity_log`.

> **Cơ sở dữ liệu lúc này rỗng hoàn toàn** — chưa có ứng viên nào, đúng như bạn cần để tự nhập tay.
> Riêng bảng `catalogs` có sẵn 237 dòng: đó không phải dữ liệu ứng viên mà là các giá trị cho ô chọn
> (49 vị trí, 23 nguồn CV, 13 trạng thái, 12 người PV…). Không có nó thì mọi dropdown trong app đều trống.
> Muốn tự gõ lại từ đầu thì bỏ qua file thứ hai, nhưng sẽ mất thời gian nhập lại 237 giá trị.

---

## Bước 2 — Mở schema cho Data API (1 phút) — **quan trọng, bỏ qua là app không đọc được**

**Project Settings** → **API** → mục **Data API** → **Exposed schemas**

Thêm `tuyendung` vào danh sách (giữ nguyên `public` đang có) → **Save**.

Mặc định Supabase chỉ cho API đọc schema `public`. Không làm bước này thì app báo lỗi
*"The schema must be one of the following: public"*.

---

## Bước 3 — Lấy khoá kết nối (1 phút)

Vẫn ở **Project Settings** → **API**, copy:

| Trên Supabase | Dán vào |
|---------------|---------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** (bấm *Reveal*) | `SUPABASE_SERVICE_ROLE_KEY` |

Trong thư mục `web/`, tạo file tên **`.env.local`** (copy từ `.env.local.example`) rồi dán:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

> `service_role` là khoá toàn quyền cho **cả project**, kể cả dữ liệu app cũ. Chỉ để trong máy,
> dùng cho script import. Đừng gửi qua chat, đừng đưa lên Vercel.

Khởi động lại: dừng `npm run dev` rồi chạy lại.

---

## Bước 4 — Tài khoản đăng nhập (2 phút)

> **Lưu ý: project này đã có sẵn tài khoản của app dashboard cũ** trong Authentication → Users.
> App tuyển dụng dùng chung danh sách đó, nên:
> - **Đừng đổi** các cài đặt trong *Sign In / Providers* (Confirm email, Allow new users to sign up…).
>   Chúng dùng chung cả project, đổi là ảnh hưởng app cũ. Email provider vốn đã bật sẵn.
> - Tài khoản `@drkam.vn` nào đã có là **đăng nhập vào app tuyển dụng được luôn**, không cần tạo mới.

**Nếu bạn muốn chỉ HR mới xem được dữ liệu ứng viên** (khuyến nghị — mặc định mọi tài khoản trong
project đều xem được):

1. SQL Editor → chạy `web/supabase/migrations/0003_gioi_han_hr.sql`
2. Mở lại file đó, sửa danh sách email ở cuối, bỏ dấu `--` rồi chạy đoạn `insert` đó

Bảng `hr_users` còn trống thì mọi thứ giữ nguyên như cũ, nên chạy file này không thể tự khoá mình ra ngoài.
Chỉ khi thêm dòng đầu tiên thì giới hạn mới bắt đầu có hiệu lực — và nhớ có email của chính bạn trong đó.

Cần tạo tài khoản mới cho HR chưa có: **Authentication → Users → Add user → Create new user**
(mật khẩu điền gì cũng được, mọi người đăng nhập bằng link gửi qua mail).

---

## Bước 5 — Kiểm tra

1. Mở `http://localhost:3000` → bị đẩy sang trang đăng nhập
2. Nhập email vừa tạo → **Gửi link đăng nhập**
3. Mở hộp thư, bấm link → vào được app, góc phải hiện email của bạn
4. Vào **Danh mục** → thấy đủ 237 dòng nghĩa là đang đọc từ cơ sở dữ liệu thật, không phải bản dự phòng

---

## Nếu sau này có project riêng

Muốn tách sang project Supabase riêng thì chỉ cần đổi 3 giá trị trong `.env.local` và chạy lại 2 file SQL
ở bước 1. Tên schema đặt trong `web/src/lib/supabase/config.ts` (`DB_SCHEMA`), đổi sang `public` cũng được.

---

## Xoá sạch để nhập lại

Nhập thử chán chê rồi muốn làm lại từ đầu: mở `web/supabase/xoa_du_lieu.sql`, copy vào SQL Editor → **Run**.
File này xoá hết ứng viên, lịch PV, onboard và nhật ký — nhưng **giữ nguyên danh mục**.

---

## Nạp dữ liệu cũ từ Excel — *tuỳ chọn, chưa cần bây giờ*

Bạn đang chọn tự nhập tay nên phần này bỏ qua cũng được. Khi nào muốn đưa 4.697 CV cũ vào,
thay file `DATA UV DRKAM 2026.xlsx` ở thư mục gốc bằng bản export đầy đủ rồi:

```bash
# 1. Xem trước, chưa ghi gì — kiểm tra số lượng và các hồ sơ nghi trùng
python tools/import_excel.py

# 2. Sinh file SQL để dán vào Supabase SQL Editor
python tools/import_excel.py --sql web/supabase/seed_data.sql

# hoặc đẩy thẳng lên (cần SUPABASE_SERVICE_ROLE_KEY trong .env.local)
python tools/import_excel.py --push
```

Script tự tắt trigger trong lúc nạp để giữ nguyên trạng thái lịch sử của từng ứng viên, xong thì bật lại.

## Thêm danh mục mới sau này

```bash
python tools/gen_seed.py     # đọc lại Excel, ghi ra 0002_seed_catalogs.sql + catalogs.json
```

rồi chạy lại file SQL đó trong Supabase (có `on conflict do update` nên chạy nhiều lần vẫn an toàn).
Từ ngày 4 sẽ sửa được trực tiếp trong màn hình **Danh mục**, không cần chạy script.
