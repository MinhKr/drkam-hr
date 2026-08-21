# Tiến độ dự án — Web app tuyển dụng DrKam

Cập nhật: 17/08/2026 · Deadline go-live: 18/08/2026

---

## Tình trạng nhanh

| Ngày | Nội dung | Trạng thái |
|---|---|---|
| 1 · 14/08 | Nền tảng, cơ sở dữ liệu, danh mục, đăng nhập | ✅ xong |
| 2 · 15/08 | Quản lý CV: danh sách, hồ sơ, chặn trùng, tự động hoá | ✅ xong |
| 3 · 16/08 | Lịch phỏng vấn, lịch tuần kéo thả, bảng giai đoạn | ✅ xong |
| 4 · 17/08 | Onboard + thử việc, xuất Excel | ✅ xong |
| 5 · 18/08 | Bàn giao, go-live | ⬜ chưa làm |

**Quyết định 17/08 — cắt bớt phạm vi:** app dùng để **nhập mới hoàn toàn**, không mang dữ liệu
ứng viên cũ sang. Nên bỏ luôn hai việc: *import dữ liệu cũ* (ngày 5) và *nhập hàng loạt trên web*
(ngày 4) — thứ hai vốn chỉ sinh ra để phục vụ thứ nhất. 237 dòng **danh mục** nạp từ Excel thì vẫn giữ.

**Quyết định 17/08 — chuyển sang project Supabase riêng:** đã có tài khoản Supabase mới nên app
không dùng chung project với app dashboard cũ nữa. Bảng chuyển từ schema riêng `tuyendung` sang
`public` của project mới. Code và toàn bộ file SQL đã sửa xong, chỉ còn phần bấm trên dashboard.
Xem [web/README-supabase.md](web/README-supabase.md) — 7 bước.

**Việc tiếp theo khi quay lại:** dựng project Supabase mới theo README (chạy 5 file SQL, tạo tài khoản
HR, đổi `.env.local`, đổi biến môi trường trên Vercel), rồi sang việc ngày 5 (hướng dẫn sử dụng, bàn giao).

---

## Nơi chạy

- **Mã nguồn:** github.com/MinhKr/drkam-hr (private)
- **Đã deploy Vercel** — Root Directory đặt là `web`, hai biến môi trường
  `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  Không đưa `SUPABASE_SERVICE_ROLE_KEY` lên Vercel.
  ⬜ **Hai biến này vẫn đang trỏ vào project Supabase cũ — phải đổi sang project mới rồi Redeploy.**
- Đẩy commit lên nhánh `main` là Vercel tự deploy lại.

---

## Cách chạy ở máy

```powershell
cd "c:\Users\nhatm\Documents\DrKam\CRM quản lý ứng viên\web"
npm run dev     # http://localhost:3000
```

Kiểm tra trước khi commit: `npx tsc --noEmit` · `npx eslint src` · `npm run build`

---

## Kiến trúc

- **Next.js 16.3** (App Router, Turbopack) + TypeScript + **Tailwind v4** + React 19.2
- **Supabase** (Postgres + Auth) — **project riêng của app tuyển dụng**, bảng nằm trong schema
  **`public`**. Không phải thêm gì vào Exposed schemas nữa.
  Đến 17/08 app còn dùng chung project với app dashboard cũ nên bảng phải để trong schema riêng
  `tuyendung`; tên đó giờ không còn trong code lẫn file SQL.
  Đổi schema thì sửa `DB_SCHEMA` trong `web/src/lib/supabase/config.ts` **và** các file
  `web/supabase/migrations/*.sql`
- Đăng nhập bằng **email + mật khẩu** (`signInWithPassword`), tài khoản tạo tay trong Supabase —
  app không có chỗ tự đăng ký. Nhớ bật `Auto Confirm User` khi tạo, không thì báo
  "Tài khoản này chưa được xác nhận trong Supabase"
- Next 16 đổi `middleware.ts` → **`proxy.ts`** (đã dùng đúng tên mới)
- Kéo thả bằng **dnd-kit**, hộp thoại bằng **Radix Dialog**
- Xuất file `.xlsx` bằng **exceljs**, chỉ chạy phía máy chủ trong route handler
  `/ung-vien/xuat` nên không làm nặng phần tải về của trình duyệt.
  `package.json` có `overrides: { uuid: ^11.1.1 }` — exceljs kéo theo `uuid` cũ bị cảnh báo
  bảo mật, ép lên bản mới thì `npm audit` sạch. Đừng xoá dòng overrides đó.

### Quy ước code

- Tên biến, hàm, comment **viết bằng tiếng Việt không dấu** (`layDanhSachUngVien`, `boLoc`, `dangLuu`)
- Component chạy ở trình duyệt **không được import module gọi Supabase phía máy chủ**.
  Phần tính toán thuần tách riêng: `lib/lich.ts`, `lib/onboard-types.ts`
- Thang chữ khai báo trong `@theme` của `globals.css` → dùng `text-sm`, `text-2xl`.
  **Không dùng** `text-[var(--text-2xl)]` vì Tailwind hiểu nhầm thành màu chữ
- Design token 3 lớp: primitive → semantic → component, trong `web/src/app/globals.css`

### Màu thương hiệu (lấy từ CSS thật của drkam.vn)

| Token | Mã |
|---|---|
| Đỏ chủ đạo | `#D32027` |
| Đỏ hover | `#B70F1B` |
| Cam đất | `#C05530` |
| Xanh olive (thành công) | `#627D47` |
| Cảnh báo đỏ | `#B20000` |
| Font | Montserrat |

---

## Cơ sở dữ liệu

Kết nối: **project riêng `drkam-hr`** — ref `njnjuzqevycxmspyltna`, tạo 17/08, gói Free,
region Singapore, schema `public`. Khoá để trong `web/.env.local` (đã gitignore).
Hướng dẫn dựng lại từ đầu: [web/README-supabase.md](web/README-supabase.md).

Project cũ `wgkxrfljzztdlrqcnfjz` (dùng chung với app dashboard) **không dùng nữa và không được
chạy file SQL nào lên đó**. Schema `tuyendung` bên ấy để nguyên, không ảnh hưởng app cũ.

### Các file SQL — chạy theo đúng thứ tự trong Supabase SQL Editor

Trên project mới thì chưa file nào chạy. **`0001` phải chạy đầu tiên** vì nó tạo hàm
`f_kiem_tra_project()` mà các file sau đều gọi ở dòng đầu.

| Lần | File | Nội dung | Đã chạy? |
|---|---|---|---|
| 1 | `0001_init.sql` | 5 bảng, trigger tự động hoá, RLS, cấp quyền, chốt an toàn | ⬜ |
| 2 | `0002_seed_catalogs.sql` | 237 dòng danh mục sinh từ Excel | ⬜ |
| 3 | `0004_view_ung_vien.sql` | View `v_ung_vien` + sửa lỗi chính tả trạng thái | ⬜ |
| 4 | `0005_view_lich_pv.sql` | View `v_lich_pv` | ⬜ |
| 5 | `0006_view_onboard.sql` | View `v_onboard` + trạng thái mặc định | ⬜ |
| 6 | `0007_luu_tru_dung.sql` | Cột `stopped_at` + dựng lại `v_ung_vien` — cho khu lưu trữ cột Dừng | ⬜ |
| 7 | `0008_bucket_cv.sql` | Bucket Storage `cv-ung-vien` + phân quyền — cho file CV tải lên | ⬜ |
| — | `0003_gioi_han_hr.sql` | Danh sách email HR được phép | không cần nữa (xem dưới) |

`0003` sinh ra hồi dùng chung project, khi mọi tài khoản của công ty đều đăng nhập được. Project riêng
chỉ có tài khoản do mình tạo nên bỏ qua được.

### Chốt an toàn trong file SQL

Bảng nằm trong `public` mà project nào cũng có `public`, nên dán nhầm sang project của app khác là đè
dữ liệu app đó. Hai lớp chặn:

1. `0001` dừng ngay nếu thấy bảng lạ trong `public` — lúc đó chưa tạo hay sửa gì
2. Các file khác mở đầu bằng `select public.f_kiem_tra_project();`, hàm do `0001` tạo nên project khác
   không có → lỗi ngay dòng đầu

Vẫn phải nhìn tên project trước khi bấm Run, và đừng chạy từng câu bằng cách bôi đen vì có thể bỏ qua
dòng kiểm tra.

### Bảng

- `candidates` — ứng viên, 8 nhóm thông tin theo sheet Data. Cột sinh tự động:
  `phone_norm`, `year`, `month`, `search_text` (bỏ dấu, dùng cho tìm kiếm)
- `interviews` — lịch PV, unique theo `(candidate_id, round)`, vòng 1 và 2
- `onboardings` — checklist jsonb + 3 mốc đánh giá `review_7d_due` / `1m` / `2m` tự tính từ `onboard_date`
- `catalogs` — danh mục dùng chung, `meta` chứa department/level cho vị trí, stage cho trạng thái
- `activity_log` — nhật ký mọi thay đổi

### Trigger tự động

- Nhập kết quả PV1 = Đạt → trạng thái CV thành "PV đạt - vòng 1"
- Nhập kết quả PV2 = Đạt → "Chờ nhận việc" **và tạo sẵn dòng onboard**
- Đặt lịch PV → đẩy trạng thái lên đúng vòng
- Đổi sang trạng thái thuộc giai đoạn *dừng* → ghi `candidates.stopped_at`; gọi hồ sơ trở lại thì xoá
- Mọi thay đổi ghi vào `activity_log`

---

## Đã làm được gì

### Ngày 1 — Nền tảng
Schema, 237 dòng danh mục sinh từ Excel (đã gộp Face→Facebook, VN Work→Vietnamworks,
sửa giá trị lỗi chuỗi), bản đồ 49 vị trí → phòng ban → cấp bậc, đăng nhập, app shell.

### Ngày 2 — Quản lý CV (`/ung-vien`)
Danh sách phân trang phía máy chủ 25 dòng, 4 ô đếm bấm được (tất cả / chưa sàng lọc /
chưa đặt lịch PV / quá 7 ngày), bộ lọc 8 tiêu chí + tìm không dấu, hộp thoại hồ sơ 5 nhóm.
Tự động: chọn vị trí → điền phòng ban + cấp bậc; gõ SĐT/email → dò trùng (cảnh báo, không chặn);
chuẩn hoá SĐT; ngày nhận CV → sinh năm/tháng/mã số.

### Ngày 3 — Lịch PV (`/lich-phong-van`) và Bảng giai đoạn (`/giai-doan`)
Lịch tuần lưới 30 phút kéo thả đổi giờ; danh sách tách vòng 1/2 nhập kết quả tại chỗ;
cảnh báo trùng lịch người PV (cùng ngày, chung người, cách nhau dưới 45 phút).
Đặt lịch ngay trong hồ sơ ứng viên (tab thứ 2 của hộp thoại).
Bảng giai đoạn 5 cột kéo thả đổi trạng thái, bấm thẻ mở hồ sơ.
13 trạng thái CV gom vào 5 cột theo `meta.stage` của danh mục `cv_status` — cột Phỏng vấn chứa
cả *Phỏng vấn vòng 1*, *Phỏng vấn vòng 2* và *PV đạt - vòng 1*, nên **thẻ có nhãn vòng**
(Vòng 1 / Vòng 2 / Vòng 1 đạt) để phân biệt. Đã chốt 17/08 là giữ 1 cột, không tách thành 6 cột.

### Ngày 4 — Onboard (`/onboard`)
Checklist 17 mục theo 5 nhóm, tick là lưu ngay; phân công người phụ trách từng giai đoạn;
3 mốc đánh giá thử việc tự tính, đến hạn thì đẩy lên đầu danh sách và tô đỏ;
chọn Đạt/Không đạt → trạng thái vòng đời tự đổi.

### Ngày 4 — Xuất Excel (`/ung-vien/xuat`)
Nút **Xuất Excel** ở thanh bộ lọc, có kèm số dòng sẽ xuất. Mang y nguyên query string của
trang danh sách sang route handler, nên file tải về **khớp đúng cái đang xem** — kể cả khi
đang bấm một trong 4 ô đếm. Xuất hết chứ không chỉ 25 dòng của trang hiện tại
(đọc theo lô 1000 dòng vì PostgREST giới hạn vậy, chặn trên 50 nghìn dòng).

File `.xlsx` thật, 29 cột, tiêu đề đặt đúng như sheet Data cũ để HR nhìn là nhận ra,
thêm mấy cột tóm tắt phỏng vấn mà bản Excel cũ không có. Dòng tiêu đề tô đỏ thương hiệu,
đông cứng khi cuộn, có sẵn bộ lọc của Excel. Ngày là ô kiểu ngày `dd/mm/yyyy` (lọc, sắp xếp
được trong Excel), số điện thoại là ô kiểu văn bản nên **không mất số 0 đầu**.

### Ngày 6 — Khu lưu trữ cho cột Dừng (`/giai-doan`)
Cột **Dừng** gom cả 4 trạng thái khép hồ sơ (*Loại*, *Phỏng vấn - loại*, *Không đến PV*,
*Từ chối nhận việc*) nên càng dùng càng dài — vài tháng nữa ca vừa dừng hôm nay sẽ chìm dưới
hàng trăm thẻ cũ. Nay hồ sơ dừng **quá 1 ngày** rơi xuống khu *Đã dừng từ trước* ngay dưới bảng,
cột Dừng chỉ còn việc mới.

Mốc đếm là cột mới `candidates.stopped_at`, trigger ghi đúng lúc hồ sơ vào nhóm trạng thái dừng.
**Không dùng `updated_at`**: sửa một dòng ghi chú cũng đổi nó, hồ sơ cũ sẽ nhảy ngược lên bảng.
Đổi qua lại giữa hai trạng thái cùng nhóm dừng thì giữ nguyên mốc; kéo hồ sơ về cột khác thì mốc
bị xoá, thẻ về đúng chỗ.

Trang hỏi cơ sở dữ liệu hai lượt — một cho bảng (lọc bỏ hồ sơ quá hạn), một cho khu lưu trữ
(tối đa 60 hồ sơ, mới dừng xếp trước, kèm đếm chính xác). Khu lưu trữ **chỉ để xem**: bấm mở
được hồ sơ nhưng không kéo thả, muốn gọi lại ứng viên thì đổi ô Trạng thái CV trong hộp thoại.

Ngưỡng 1 ngày và mức 60 hồ sơ nằm ở [web/src/lib/giai-doan.ts](web/src/lib/giai-doan.ts).

Chưa chạy `0007` thì trang **vẫn dùng được**: bắt mã lỗi Postgres `42703` (thiếu cột) rồi lùi về
truy vấn cũ, hiện thẻ vàng "Còn thiếu một bước cài đặt" thay vì để trắng màn hình.

### Ngày 6 — Tải file CV lên hệ thống (`/ung-vien`)
Trước nay chỉ có ô **Link CV / Portfolio**: HR phải tự cất CV ở Drive hay Zalo rồi dán đường dẫn.
Nay đính thẳng file lên hệ thống được — giữ nguyên ô link cũ vì nhiều CV vẫn về dạng link TopCV.

Cột `candidates.cv_file_path` **đã có sẵn từ `0001_init.sql`** nhưng chưa chỗ nào dùng, nên lần này
không phải đụng vào bảng: `0008_bucket_cv.sql` chỉ tạo bucket Storage `cv-ung-vien` và phân quyền.
View `v_ung_vien` viết `select c.*` mà cột đã có từ lúc tạo view nên cũng không phải dựng lại.

File đi kèm FormData lên **Server Action** rồi mới sang Supabase, chứ không tải thẳng từ trình duyệt.
Chọn vậy vì HR xác nhận CV thực tế chỉ vài trăm KB, mà đi đường này thì **không bao giờ có file mồ
côi**: tải lên ngay lúc chọn thì HR bấm Đóng không lưu là file nằm lại bucket vĩnh viễn. Đổi lại phải
chịu trần 4 MB — xem bảng ba mức chặn trong [BAN-GIAO.md](BAN-GIAO.md).

Thứ tự thao tác trong `actions.ts` giữ cho không bao giờ có link chết: **ghi xong dòng mới xoá file
cũ**. Ghi hỏng thì xoá file vừa tải, hồ sơ vẫn trỏ vào file cũ nguyên vẹn.

Tiện thể vá một lỗ hổng có sẵn: `cv_url` trước đây **chỉ xuất hiện trong ô nhập giữa form**, mở hồ sơ
lên không có nút nào bấm thẳng vào CV. Nay CV hiện ở **hai chỗ**: đầu hộp thoại có nút **Mở CV**
(file đính kèm) và **Link CV** (link ngoài); ngoài danh sách Quản lý CV thì mỗi dòng có một chữ
**CV** cạnh sĐT/email, bấm mở tab mới — có `stopPropagation` để không bật luôn hộp thoại của dòng.
Hồ sơ chưa có CV ghi mờ *chưa có CV*, quét một lượt là biết còn thiếu ai. Thêm `linkNgoai()` trong `utils.ts` vì link HR gõ tay hay thiếu `https://`,
thiếu thì thẻ `<a>` hiểu thành đường dẫn nội bộ rồi nhảy sang trang 404 của chính app.

Bucket để **công khai** — lựa chọn có chủ đích của người dùng, lý do và cách khoá lại ghi ở
[BAN-GIAO.md](BAN-GIAO.md). Nhờ vậy file Excel xuất ra có thêm cột **File CV đính kèm** bấm mở được.

Chưa chạy `0008` thì app **vẫn dùng được**: bắt chuỗi lỗi `Bucket not found` rồi báo đúng phải chạy
file nào, ô Link CV không ảnh hưởng.

---

## Tốc độ chuyển tab — số đo thật (17/08)

Đo từ máy ở Việt Nam sang project Supabase Singapore. Một lần chuyển tab tốn:

| Thành phần | Thời gian | Ghi chú |
|---|---|---|
| `proxy.ts` gọi `auth.getUser()` | **200–270ms** | Gọi mạng sang Supabase Auth **mỗi request**, chạy trước code trang |
| Dữ liệu của trang (song song) | ~170ms | Một vòng mạng, các truy vấn chồng lên nhau |
| `layLichTheoUngVien` ở `/ung-vien` | +170ms | **Tuần tự** sau nhóm trên vì cần `rows`; chỉ hộp thoại hồ sơ dùng tới |
| Biên dịch lần đầu (chỉ ở `npm run dev`) | vài trăm ms → vài giây | Turbopack dựng từng route khi vào lần đầu. **Không có trên Vercel** |

Đã làm:
- `app/(app)/loading.tsx` — bấm là đổi ngay sang khung chờ, và Next prefetch được phần vỏ trang
  khi chuột đi qua mục menu. Không giảm thời gian thật nhưng hết cảm giác đứng máy
- `cache()` của React bọc `layDanhMucCoNguon` — trang Quản lý CV gọi danh mục 14 lần, nay chỉ
  đọc cơ sở dữ liệu 1 lần

Đo được mà **chưa** làm:
- Bỏ vòng mạng của `auth.getUser()`: đổi sang `auth.getClaims()` để kiểm chữ ký JWT ngay tại máy
  chủ. Chỉ nhanh sau khi vào Supabase → Settings → JWT Keys **chuyển sang khoá bất đối xứng**;
  khoá HS256 hiện tại thì `getClaims()` vẫn phải gọi mạng. Đây là khoản lớn nhất, ~250ms/lần chuyển tab
- `layLichTheoUngVien` chỉ hộp thoại cần: dời sang lấy khi mở hộp thoại thì `/ung-vien` bớt ~170ms

Cả hai đều sửa vào đường đăng nhập hoặc hộp thoại chính, mà chưa kiểm được với tài khoản thật,
nên để sau go-live.

**Đừng kết luận tốc độ từ `npm run dev`** — dev không có bản build tối ưu và biên dịch lại khi vào
route lần đầu. So sánh phải làm trên bản Vercel.

---

## Lỗi đã gặp và cách xử lý (để khỏi vấp lại)

1. **`text-[var(--text-3xl)]` không ăn** — Tailwind hiểu `text-[...]` là màu chữ.
   Giải: khai báo thang chữ trong `@theme`, dùng `text-3xl`.
2. **Mũi tên dropdown biến mất** — data-URI có dấu cách nên Tailwind bỏ qua cả class.
   Giải: vẽ mũi tên bằng thẻ SVG riêng trong `Select`.
3. **Ca PV 09:50 không hiện trên lịch tuần** — lưới chỉ có ô :00 và :30, so khớp chính xác nên hụt.
   Giải: dồn về ô 30 phút gần nhất phía trước, kẹp biên 8:00–18:30.
4. **`Number.isNaN(undefined)` trả về `false`** — guard không chặn được ca thiếu giờ.
   Giải: dùng `Number.isFinite`.
5. **Build hỏng: client component kéo theo module máy chủ** — tách `lib/lich.ts` thuần tính toán.
6. **ESLint chặn `setState` trong `useEffect`** — đặt lại state ngay khi render
   (mẫu `khoaTruoc`), hoặc chuyển vào sự kiện onChange.
7. **Trạng thái `"Chưa lên hệ được"`** trong danh mục gốc bị thiếu chữ "i" — trigger phải
   nhận cả hai cách viết.
8. **Next 16 khoá dev server** — không chạy được hai `npm run dev` cùng lúc trên một project.
9. **Ngày trong Excel lệch một ngày** — exceljs đổi `Date` sang số của Excel bằng `getTime()`,
   tức là theo UTC. Dựng ngày bằng `new Date("2026-08-17")` rồi để múi giờ máy chủ xen vào là
   lệch. Giải: dựng bằng `new Date(Date.UTC(nam, thang - 1, ngay))`.
10. **exceljs load lại không dựng lại `autoFilter`** — thẻ `<autoFilter>` có thật trong file,
   chỉ là bộ đọc của exceljs bỏ qua. Đừng kết luận sai khi tự kiểm tra bằng cách đọc lại file.
11. **Kéo thẻ vào cột Phỏng vấn làm tụt hồ sơ về vòng 1** — mỗi cột chỉ có một trạng thái mặc
   định, nên lấy lại một hồ sơ Backup đã đạt vòng 1 là bị đặt lại thành *Phỏng vấn vòng 1*,
   im lặng mất dữ kiện đã phỏng vấn. Giải: xét `kq_pv1`, đã đạt vòng 1 thì đặt *Phỏng vấn vòng 2*.
   Bài học chung — cột gom nhiều trạng thái thì trạng thái mặc định phải xét dữ liệu của hồ sơ,
   không thể một giá trị cứng cho cả cột.

---

## Việc còn lại

### Ngày 5
Dựng project Supabase mới — làm theo [web/README-supabase.md](web/README-supabase.md), 7 bước:

- ✅ Tạo project `drkam-hr` (Free, Singapore)
- ✅ Chạy `setup_project_moi.sql` — đã xác nhận đủ 5 bảng + 3 view, RLS chặn khoá công khai
- ✅ Đổi 2 khoá trong `web/.env.local`, khởi động lại dev server (4 trang đều 307 về đăng nhập)
- ⬜ Tạo tài khoản HR (Authentication → Users), **bật `Auto Confirm User`**
- ⬜ Đăng nhập kiểm tra 5 màn hình + nút Xuất Excel, xem Danh mục có đủ 237 dòng
- ⬜ Đổi 2 biến môi trường trên Vercel rồi **Redeploy**

Bàn giao:
- ✅ Sổ tay cho HR — [docs/huong-dan-su-dung.html](docs/huong-dan-su-dung.html), 10 phần theo đúng
  đường một hồ sơ đi qua
- ✅ Tài liệu bàn giao kỹ thuật — [BAN-GIAO.md](BAN-GIAO.md): 4 việc bảo trì hay phải làm,
  cách thêm danh mục bằng tay, việc còn thiếu xếp theo mức đáng làm
- ✅ Dọn nội dung nội bộ khỏi giao diện: trang Tổng quan bỏ thẻ "Lộ trình 5 ngày · Đang ở ngày 4",
  thay bằng 4 bước quy trình bấm được; thẻ danh mục hiện nhãn tiếng Việt thay vì khoá `position`;
  sidebar bỏ dòng "Bản nội bộ · Ngày 1"
- ✅ Sửa hai chỗ nói sai sự thật: màn hình Danh mục ghi "bạn tự thêm, sửa, ẩn được ngay tại đây"
  nhưng thực tế **chỉ để xem** — đã sửa lại ở cả trang Danh mục và trang Tổng quan
- Kiểm tra lại bản deploy trên Vercel sau khi merge nhánh này vào `main`

### Đã cắt khỏi bản 18/08
Import dữ liệu ứng viên cũ · nhập hàng loạt trên web (xem quyết định 17/08 ở đầu file) ·
gửi email tự động · đồng bộ Google Calendar · đọc CV PDF · dashboard phễu tuyển dụng ·
phân quyền theo phòng ban · giao diện riêng cho điện thoại

---

## Công cụ

| Lệnh | Việc |
|---|---|
| `python tools/gen_seed.py` | Đọc lại Excel → sinh `0002_seed_catalogs.sql` + `catalogs.json` |
| `bash tools/gop_sql.sh` | Gộp 7 file migration → `web/supabase/setup_project_moi.sql` |

Sửa file nào trong `web/supabase/migrations/` thì **chạy lại `tools/gop_sql.sh`**, không thì
`setup_project_moi.sql` vẫn giữ bản cũ.

`tools/import_excel.py` vẫn còn trong repo nhưng **không dùng nữa** kể từ quyết định 17/08
(không mang dữ liệu ứng viên cũ sang). Giữ lại để sau này cần thì có sẵn.

---

## Tài liệu

- [web/README-supabase.md](web/README-supabase.md) — **dựng project Supabase mới, 7 bước** (đã cập nhật 17/08)
- [docs/ke-hoach.html](docs/ke-hoach.html) — kế hoạch đầy đủ 11 phần, đã cập nhật phần project Supabase
- [docs/timeline.md](docs/timeline.md) · [PDF](docs/timeline.pdf) — timeline 5 ngày có ô tick

Hai file PDF trong `docs/` in ra từ bản HTML ngày 14/08 nên **không có các thay đổi ngày 17/08**
(tách project Supabase, cắt phần import và nhập hàng loạt). Cần bản PDF mới thì mở lại file HTML
rồi in ra PDF từ trình duyệt.
