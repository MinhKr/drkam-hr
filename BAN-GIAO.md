# Bàn giao — Web app tuyển dụng DrKam

Tài liệu cho **người phụ trách kỹ thuật**. Người dùng HR đọc sổ tay riêng:
[docs/huong-dan-su-dung.html](docs/huong-dan-su-dung.html).

Cập nhật 17/08/2026.

---

## 1. Có những gì, nằm ở đâu

| Thứ | Ở đâu |
|---|---|
| Mã nguồn | github.com/MinhKr/drkam-hr (private), thư mục app là `web/` |
| Cơ sở dữ liệu + đăng nhập | Supabase project `drkam-hr`, ref `njnjuzqevycxmspyltna`, gói Free, Singapore |
| Bản chạy thật | Vercel, Root Directory đặt là `web` |
| Khoá kết nối | `web/.env.local` — **đã gitignore, không có trong repo** |
| Tiến độ, kiến trúc, lỗi đã gặp | [TIEN-DO.md](TIEN-DO.md) — đọc file này trước mọi thứ khác |
| Dựng lại cơ sở dữ liệu từ đầu | [web/README-supabase.md](web/README-supabase.md) |

Bảng nằm trong schema **`public`** của project riêng. Trước 17/08 app dùng chung project với app
dashboard cũ nên bảng phải để trong schema `tuyendung`; tên đó đã bỏ hẳn.

---

## 2. Chạy ở máy

```powershell
cd "c:\Users\nhatm\Documents\DrKam\CRM quản lý ứng viên\web"
npm install
npm run dev        # http://localhost:3000
```

Chưa có `web/.env.local` thì copy từ `web/.env.local.example` rồi điền 2 khoá lấy ở
Supabase → Project Settings → API Keys.

**Kiểm tra bắt buộc trước khi commit:**

```powershell
npx tsc --noEmit
npx eslint src
npm run build
```

Bỏ trống 2 khoá thì app chạy ở **chế độ xem trước**: giao diện đủ, danh mục đọc từ
`src/data/catalogs.json`, không ghi được gì. Dùng khi muốn chắc chắn không đụng cơ sở dữ liệu nào.

---

## 3. Deploy

Đẩy commit lên nhánh `main` là Vercel tự deploy lại. Hai biến môi trường cần có trên Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Đừng** đưa `SUPABASE_SERVICE_ROLE_KEY` lên Vercel. Sửa biến môi trường xong phải vào
**Deployments → Redeploy**, bản đang chạy không tự đổi theo.

---

## 4. Bốn việc bảo trì hay phải làm

### Thêm tài khoản cho người mới

Supabase → **Authentication → Users → Add user → Create new user**. Điền email, mật khẩu, và
**bật `Auto Confirm User`**. Không bật thì người đó đăng nhập sẽ bị báo "Tài khoản này chưa được
xác nhận trong Supabase".

App không có chỗ tự đăng ký, nên mọi tài khoản đều phải tạo tay ở đây.

### Đặt lại mật khẩu

Cũng ở **Authentication → Users**, mở người đó ra và đặt mật khẩu mới. App chưa có luồng "quên mật
khẩu" tự gửi mail.

### Thêm giá trị vào danh mục — *hiện phải làm bằng tay*

Màn hình **Danh mục** trong app **chỉ để xem**, chưa sửa được (xem mục 6). Cần thêm một vị trí,
một nguồn CV hay một người phỏng vấn thì vào Supabase → **Table Editor → `catalogs` → Insert row**:

| Cột | Điền |
|---|---|
| `type` | khoá loại danh mục, xem bảng dưới |
| `value` | đúng chữ sẽ hiện trong ô chọn, có dấu |
| `sort_order` | số thứ tự trong ô chọn, để 0 cũng được |
| `active` | `true` |
| `meta` | thường để `{}` — trừ hai loại nói ở dưới |

Khoá `type` hay dùng: `position` (vị trí ứng tuyển) · `department` (phòng ban) · `level` (cấp bậc) ·
`cv_status` (trạng thái CV) · `source` (nguồn CV) · `interviewer` (người phỏng vấn) ·
`screener` (người sàng lọc) · `interview_mode` (hình thức PV) · `offer_status` ·
`onboard_owner` · `onboard_office` · `region` · `province` · `gender`.
Danh sách đầy đủ nằm trong `NHAN_LOAI_DANH_MUC` ở [web/src/lib/danh-muc.ts](web/src/lib/danh-muc.ts).

Hai loại cần điền `meta`:

- `position` → `{"department": "Marketing", "level": "Nhân viên"}`
  Nhờ nó mà chọn vị trí là tự điền phòng ban và cấp bậc.
- `cv_status` → `{"stage": "phong_van"}`
  Quyết định trạng thái đó nằm ở cột nào của Bảng giai đoạn. Giá trị hợp lệ:
  `moi_ve`, `phong_van`, `cho_quyet_dinh`, `nhan_viec`, `dung`.

Thiếu `meta` thì không hỏng gì, chỉ mất phần tự điền, và trạng thái mới sẽ rơi vào cột *Mới về*.

> Đặt `stage` là `dung` còn có tác dụng khác: hồ sơ chuyển sang trạng thái đó sẽ được ghi mốc
> `stopped_at`, và sau **1 ngày** tự rơi xuống khu *Đã dừng từ trước* dưới Bảng giai đoạn. Trigger
> tra thẳng `meta.stage` trong bảng `catalogs` nên sửa ở đây là có hiệu lực ngay, không phải deploy lại.

### Xoá dữ liệu thử để nhập lại từ đầu

Chạy [web/supabase/xoa_du_lieu.sql](web/supabase/xoa_du_lieu.sql) trong SQL Editor. Xoá hết ứng viên,
lịch PV, onboard, nhật ký — **giữ nguyên danh mục**. Không hoàn tác được.

---

## 5. An toàn cơ sở dữ liệu — đọc trước khi chạy SQL

Bảng nằm trong `public`, mà project Supabase nào cũng có `public`. Chạy file SQL của app này lên
project của app khác là **đè lên dữ liệu app đó**. Có hai lớp chặn:

1. `0001_init.sql` dừng ngay nếu thấy bảng lạ trong `public` — lúc đó chưa tạo hay sửa gì cả.
2. Các file còn lại mở đầu bằng `select public.f_kiem_tra_project();`. Hàm đó do `0001` tạo nên
   project khác không có → lỗi ngay từ dòng đầu.

Dù vậy vẫn phải **nhìn tên project ở góc trên bên trái trước khi bấm Run**, và **đừng bôi đen chạy
từng đoạn** — làm vậy có thể bỏ qua dòng kiểm tra.

Project Supabase cũ (dùng chung với app dashboard, ref `wgkxrfljzztdlrqcnfjz`): **không dùng nữa,
không chạy file SQL nào lên đó.** Schema `tuyendung` bên ấy để nguyên cũng không ảnh hưởng app cũ.

### File migration mới chưa chạy

`setup_project_moi.sql` chỉ dùng cho project còn trống. Project đang chạy thật thì mở đúng file mới
trong `web/supabase/migrations/` rồi Run, mỗi file một lần.

| File | Việc | Chưa chạy thì sao |
|---|---|---|
| `0007_luu_tru_dung.sql` | Thêm cột `stopped_at` cho khu lưu trữ của cột Dừng | Bảng giai đoạn vẫn chạy, hiện thẻ vàng *"Còn thiếu một bước cài đặt"*, chưa có khu lưu trữ |
| `0008_bucket_cv.sql` | Tạo bucket Storage `cv-ung-vien` để đính file CV | Đính file CV báo lỗi nhắc chạy file này; ô Link CV vẫn dùng bình thường |

Cả hai file đều chỉ **thêm** chứ không xoá hay sửa dữ liệu sẵn có, chạy nhầm hai lần cũng không sao.
`0008` không đụng tới bảng nào — nó chỉ tạo chỗ chứa file và phân quyền cho chỗ đó.

### Vì sao bucket CV để công khai

Đây là lựa chọn có chủ đích chứ không phải sót. HR cần dán được đường dẫn CV vào file Excel xuất ra
và gửi cho trưởng bộ phận, mà đường dẫn có hạn thì làm vậy không được.

Đổi lại: **ai cầm được đường dẫn cũng mở ra xem được mà không cần đăng nhập.** App đặt tên thư mục
bằng UUID ngẫu nhiên nên người ngoài không mò ra, nhưng đường dẫn đã lọt ra ngoài thì không thu lại
được — mà CV có số điện thoại, email, mức lương mong muốn.

Muốn khoá lại: đổi `public` thành `false` ở mục 1 của `0008_bucket_cv.sql`, chạy lại file, rồi sửa
`duongDanCongKhai()` trong [web/src/lib/cv-file.ts](web/src/lib/cv-file.ts) sang dùng
`createSignedUrl`. Lúc đó cột "File CV đính kèm" trong Excel sẽ hết tác dụng.

### Mức trần 4 MB cho file CV đến từ đâu

File đi kèm form lên Server Action rồi mới sang Supabase, nên bị chặn ở ba chỗ. Ba con số đặt so le
để lỗi luôn rơi vào chỗ có lời nhắc tiếng Việt, không phải lỗi 413 trơ trụi:

| Chặn ở đâu | Mức | Sửa ở đâu |
|---|---|---|
| Trình duyệt, trước khi gửi | 4 MB | `TOI_DA_MB` trong [web/src/lib/cv-file.ts](web/src/lib/cv-file.ts) |
| Next.js | 5 MB | `serverActions.bodySizeLimit` trong [web/next.config.ts](web/next.config.ts) |
| Bucket Supabase | 5 MB | `file_size_limit` trong `0008_bucket_cv.sql` |

Vercel còn chặn cứng **4.5 MB** mỗi request và không chỉnh được, nên đừng nâng `TOI_DA_MB` quá 4.
Thật sự cần đính file nặng hơn thì phải đổi cách làm: cho trình duyệt tải thẳng lên Supabase, không
đi qua máy chủ nữa.

---

## 6. Việc còn thiếu, xếp theo mức đáng làm

| # | Việc | Vì sao đáng làm | Ước lượng |
|---|---|---|---|
| 1 | **Sửa danh mục trong app** | Đang phải vào Supabase Table Editor. HR tuyển vị trí mới là phải nhờ kỹ thuật | nửa ngày |
| 2 | **Bỏ vòng mạng khi xác thực** | `proxy.ts` gọi `auth.getUser()` mỗi request, tốn 200–270ms mỗi lần chuyển tab. Đổi sang `getClaims()` + chuyển JWT sang khoá bất đối xứng trong Supabase | 2 giờ |
| 3 | **Hoãn `layLichTheoUngVien`** | Thêm ~170ms cho trang Quản lý CV mà chỉ hộp thoại hồ sơ dùng tới | 1 giờ |
| 4 | Quên mật khẩu tự gửi mail | Đang phải nhờ kỹ thuật đặt lại tay | 2 giờ |
| 5 | Giao diện cho điện thoại | Menu ẩn, bảng cuộn ngang, nhập liệu khó | 1–2 ngày |
| 6 | Gửi email kết quả PV · đồng bộ Google Calendar · đọc CV PDF · dashboard phễu · phân quyền theo phòng ban | Đã cắt khỏi bản 18/08 từ đầu | mỗi cái 1–3 ngày |

Chi tiết số đo tốc độ ở mục *Tốc độ chuyển tab* trong [TIEN-DO.md](TIEN-DO.md).

Việc 2 và 3 tôi đo được nhưng chưa làm: cả hai sửa vào đường đăng nhập và hộp thoại chính, cần
đăng nhập thật để kiểm tra trước sau. Làm sau go-live, đừng làm vào đêm trước.

---

## 7. Công cụ

| Lệnh | Việc |
|---|---|
| `python tools/gen_seed.py` | Đọc lại Excel → sinh `0002_seed_catalogs.sql` + `catalogs.json` |
| `bash tools/gop_sql.sh` | Gộp 5 file migration → `web/supabase/setup_project_moi.sql` |

Sửa file nào trong `web/supabase/migrations/` thì **chạy lại `gop_sql.sh`**, không thì file gộp giữ
bản cũ.

`tools/import_excel.py` còn trong repo nhưng **không dùng nữa** — đã chốt là nhập mới hoàn toàn,
không mang dữ liệu ứng viên cũ sang. Nếu dùng lại thì đọc cảnh báo ở đầu file.

---

## 8. Tài liệu

- [docs/huong-dan-su-dung.html](docs/huong-dan-su-dung.html) — **sổ tay cho HR**, đưa cho người dùng
- [TIEN-DO.md](TIEN-DO.md) — tiến độ, kiến trúc, quy ước code, 10 lỗi đã gặp và cách xử lý
- [web/README-supabase.md](web/README-supabase.md) — dựng project Supabase từ đầu, 7 bước
- [docs/ke-hoach.html](docs/ke-hoach.html) — kế hoạch đầy đủ 11 phần

Hai file PDF trong `docs/` in từ bản HTML ngày 14/08 nên **không có** các thay đổi ngày 17/08.
Cần bản mới thì mở HTML rồi in ra PDF từ trình duyệt.
