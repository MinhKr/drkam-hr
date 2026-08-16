# Tiến độ dự án — Web app tuyển dụng DrKam

Cập nhật: 16/08/2026 · Deadline go-live: 18/08/2026

---

## Tình trạng nhanh

| Ngày | Nội dung | Trạng thái |
|---|---|---|
| 1 · 14/08 | Nền tảng, cơ sở dữ liệu, danh mục, đăng nhập | ✅ xong |
| 2 · 15/08 | Quản lý CV: danh sách, hồ sơ, chặn trùng, tự động hoá | ✅ xong |
| 3 · 16/08 | Lịch phỏng vấn, lịch tuần kéo thả, bảng giai đoạn | ✅ xong |
| 4 · 17/08 | Onboard + thử việc | ✅ xong · **nhập hàng loạt và xuất Excel còn lại** |
| 5 · 18/08 | Import dữ liệu cũ, bàn giao, go-live | ⬜ chưa làm |

**Việc tiếp theo khi quay lại:** làm nốt 2 phần của ngày 4 — nhập hàng loạt (thả file Excel/CSV, dán từ Excel) và xuất Excel theo bộ lọc đang chọn.

---

## Cách chạy

```powershell
cd "c:\Users\nhatm\Documents\DrKam\CRM quản lý ứng viên\web"
npm run dev     # http://localhost:3000
```

Kiểm tra trước khi commit: `npx tsc --noEmit` · `npx eslint src` · `npm run build`

---

## Kiến trúc

- **Next.js 16.3** (App Router, Turbopack) + TypeScript + **Tailwind v4** + React 19.2
- **Supabase** (Postgres + Auth), dùng **chung project với app dashboard cũ** của công ty,
  toàn bộ bảng nằm trong schema riêng **`tuyendung`** — không đụng schema `public` của app cũ
- Đăng nhập bằng **email + mật khẩu** (`signInWithPassword`), tài khoản tạo tay trong Supabase.
  `shouldCreateUser: false` nên người lạ không tự đăng ký được
- Next 16 đổi `middleware.ts` → **`proxy.ts`** (đã dùng đúng tên mới)
- Kéo thả bằng **dnd-kit**, hộp thoại bằng **Radix Dialog**

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

Kết nối: project `wgkxrfljzztdlrqcnfjz`, schema `tuyendung`, đã thêm vào **Exposed schemas**.
Khoá để trong `web/.env.local` (đã gitignore).

### Các file SQL — chạy theo đúng thứ tự trong Supabase SQL Editor

| File | Nội dung | Đã chạy? |
|---|---|---|
| `0001_init.sql` | Schema, 5 bảng, trigger tự động hoá, RLS, cấp quyền | ✅ |
| `0002_seed_catalogs.sql` | 237 dòng danh mục sinh từ Excel | ✅ |
| `0003_gioi_han_hr.sql` | Danh sách email HR được phép (tuỳ chọn) | ⬜ chưa chạy |
| `0004_view_ung_vien.sql` | View `v_ung_vien` + sửa lỗi chính tả trạng thái | ✅ |
| `0005_view_lich_pv.sql` | View `v_lich_pv` | ✅ |
| `0006_view_onboard.sql` | View `v_onboard` + trạng thái mặc định | ⬜ **cần chạy** |

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

### Ngày 4 — Onboard (`/onboard`)
Checklist 17 mục theo 5 nhóm, tick là lưu ngay; phân công người phụ trách từng giai đoạn;
3 mốc đánh giá thử việc tự tính, đến hạn thì đẩy lên đầu danh sách và tô đỏ;
chọn Đạt/Không đạt → trạng thái vòng đời tự đổi.

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

---

## Việc còn lại

### Ngày 4 (còn 2 phần)
- Nhập hàng loạt: thả file .xlsx/.csv hoặc dán nhiều dòng từ Excel, có bảng đối chiếu cột trước khi lưu.
  Cần cài `xlsx` (SheetJS) để đọc .xlsx
- Xuất Excel danh sách ứng viên theo bộ lọc đang chọn

### Ngày 5
- Import dữ liệu cũ: `python tools/import_excel.py` (đã viết sẵn, đã test chế độ sinh SQL).
  Cần bản export đầy đủ Google Sheet thay cho `DATA UV DRKAM 2026.xlsx` hiện tại
- Deploy Vercel, hướng dẫn sử dụng, bàn giao

### Đã cắt khỏi bản 18/08
Gửi email tự động · đồng bộ Google Calendar · đọc CV PDF · dashboard phễu tuyển dụng ·
phân quyền theo phòng ban · giao diện riêng cho điện thoại

---

## Công cụ

| Lệnh | Việc |
|---|---|
| `python tools/gen_seed.py` | Đọc lại Excel → sinh `0002_seed_catalogs.sql` + `catalogs.json` |
| `python tools/import_excel.py` | Xem trước dữ liệu, báo hồ sơ nghi trùng |
| `python tools/import_excel.py --sql <file>` | Sinh SQL để dán vào Supabase |
| `python tools/import_excel.py --push` | Đẩy thẳng lên Supabase (cần service_role key) |

---

## Tài liệu

- [docs/ke-hoach.html](docs/ke-hoach.html) · [PDF](docs/ke-hoach.pdf) — kế hoạch đầy đủ 11 phần
- [docs/timeline.md](docs/timeline.md) · [PDF](docs/timeline.pdf) — timeline 5 ngày có ô tick
- [web/README-supabase.md](web/README-supabase.md) — hướng dẫn nối cơ sở dữ liệu
