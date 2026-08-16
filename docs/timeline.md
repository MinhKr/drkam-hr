# TIMELINE — Web app tuyển dụng DrKam

**Bắt đầu:** Thứ 5, 14/08/2026 · **Go-live:** Thứ 2, 18/08/2026
**Kế hoạch chi tiết:** [ke-hoach.html](ke-hoach.html)

Cách dùng file này: mỗi mục xong thì tick `[x]`. Mục gắn nhãn 🔴 là việc chặn — chưa xong thì phần phía sau không chạy được. Mục gắn nhãn 👤 là việc cần bạn làm, không phải tôi.

---

## Tổng quan

| Ngày | | Trọng tâm | Cuối ngày có gì | Trạng thái |
|---|---|---|---|---|
| 1 | T5 14/08 | Nền tảng + dữ liệu danh mục | App chạy, 237 dòng danh mục | ✅ |
| 2 | T6 15/08 | Quản lý CV + tự động hoá | Nhập ứng viên mới trên app được | ⬜ |
| 3 | T7 16/08 | Lịch PV + bảng giai đoạn kéo thả | Thay được sheet LỊCH PV | ⬜ |
| 4 | CN 17/08 | Onboard + thử việc + xuất Excel | Đủ tính năng bản 1 | ⬜ |
| 5 | T2 18/08 | Import dữ liệu thật + bàn giao | **GO-LIVE** | ⬜ |

**Việc của bạn trong 5 ngày:** gửi file export Google Sheet (trước 16/08), duyệt phần demo cuối mỗi ngày (~15 phút), chốt danh sách email HR được dùng app (ngày 1), có mặt chiều 18/08 để nhận bàn giao.

---

## NGÀY 1 — Thứ 5, 14/08
### Nền tảng

**Sáng**
- [x] Khởi tạo dự án Next.js 16 + TypeScript + Tailwind v4 trong thư mục `web/`
- [x] Lấy màu thương hiệu từ drkam.vn: đỏ #D32027, cam đất #C05530, olive #627D47, font Montserrat
- [x] Dựng hệ design token 3 lớp primitive → semantic → component, đủ cả nền sáng và nền tối
- [x] 🔴 Thiết kế và tạo bảng dữ liệu: `candidates`, `interviews`, `onboardings`, `catalogs`, `activity_log`
- [x] Bật tìm kiếm tiếng Việt không dấu (`unaccent` + `pg_trgm`), tạo index
- [x] Viết trigger tự động: kết quả PV đổi trạng thái CV, PV2 đạt thì tạo sẵn dòng onboard, ghi nhật ký thay đổi

**Chiều**
- [x] Nạp danh mục từ sheet DATA GỐC: phòng ban, cấp bậc, khu vực, quê quán (63 tỉnh)
- [x] Nạp danh mục từ các dropdown rời: 49 vị trí, 23 nguồn CV, 13 trạng thái CV, 12 người PV, 3 người sàng lọc, 3 hình thức PV — tổng 237 dòng
- [x] Chuẩn hoá danh mục bẩn ngay từ đầu: gộp Face/Facebook, Linkedin trùng, VN Work/Vietnamwork; sửa giá trị lỗi chuỗi trong danh sách vị trí
- [x] Dựng bản đồ ánh xạ Vị trí → Phòng ban → Cấp bậc (dùng cho tính năng tự điền ngày 2)
- [x] Viết script import Excel (đọc .xlsx, đối chiếu cột, chuẩn hoá SĐT/ngày tháng, báo cáo hồ sơ nghi trùng)
- [x] Đăng nhập bằng email — gửi link đăng nhập vào hộp thư, không cần mật khẩu
- [x] Khung giao diện: sidebar trái, thanh trên, trang Tổng quan, trang Danh mục
- [ ] 👤 Tạo dự án Supabase và điền `.env.local` — làm theo `web/README-supabase.md`
- [ ] Deploy lên Vercel *(chờ có Supabase và tài khoản Vercel)*

**Cuối ngày**
- [x] ✅ **Bàn giao:** app chạy được tại `localhost:3000`, danh mục đầy đủ và sạch, đã qua kiểm tra kiểu dữ liệu và bản dựng
- [ ] 👤 Bạn gửi danh sách email HR sẽ dùng app
- [ ] 👤 Bạn xác nhận: bản đồ Vị trí → Phòng ban có chỗ nào sai không (xem trang **Danh mục**)

---

## NGÀY 2 — Thứ 6, 15/08
### Quản lý CV — phần lõi

**Sáng**
- [ ] 🔴 Màn hình danh sách ứng viên: bảng phân trang phía máy chủ, chịu được vài nghìn dòng
- [ ] Bộ lọc: tên/email/SĐT, vị trí, phòng ban, trạng thái, nguồn CV, người sàng lọc, khu vực, khoảng thời gian
- [ ] Ba ô đếm bấm được: Chưa sàng lọc · Chưa đặt lịch PV · Quá 7 ngày chưa phản hồi
- [ ] Panel hồ sơ ứng viên trượt từ phải, đủ 8 nhóm thông tin theo sheet

**Chiều**
- [ ] Form thêm và sửa ứng viên, mọi dropdown lấy từ danh mục
- [ ] 🔴 Chặn trùng theo SĐT và email — hiện hồ sơ cũ kèm lịch sử ứng tuyển ngay khi gõ
- [ ] Phần sàng lọc CV: người sàng lọc, nhận xét, kết quả, chuyển trạng thái
- [ ] **Tự động hoá:** chọn ngày nhận CV → tự điền Năm/Tháng + sinh số thứ tự
- [ ] **Tự động hoá:** chọn vị trí → tự điền Phòng ban + Cấp bậc (sửa lại được)
- [ ] **Tự động hoá:** chuẩn hoá SĐT về một dạng, giữ số 0 đầu
- [ ] **Tự động hoá:** hồ sơ quá 7 ngày chưa xử lý → tự gắn nhãn cảnh báo
- [ ] Thả file CV (PDF/ảnh) vào hồ sơ để lưu kèm
- [ ] Ghi nhật ký thay đổi (ai sửa gì, lúc nào)

**Cuối ngày**
- [ ] ✅ **Bàn giao:** nhập ứng viên mới trên app được — chạy song song với sheet để đối chiếu
- [ ] 👤 Bạn nhập thử 5–10 ứng viên thật, ghi lại chỗ nào vướng

---

## NGÀY 3 — Thứ 7, 16/08
### Lịch phỏng vấn + bảng giai đoạn

**Sáng**
- [ ] Đặt lịch PV vòng 1 và vòng 2 ngay trong hồ sơ ứng viên: ngày, giờ, hình thức, người PV (chọn nhiều)
- [ ] 🔴 Màn hình Lịch PV dạng danh sách, tách vòng 1 / vòng 2 như sheet cũ
- [ ] Nhập kết quả và ghi chú PV ngay trên dòng lịch
- [ ] Đánh dấu "đã trả kết quả qua mail"
- [ ] **Tự động hoá:** PV1 Đạt → trạng thái "PV đạt - vòng 1" + mở sẵn ô đặt lịch vòng 2; Không đạt → "Phỏng vấn - loại"
- [ ] **Tự động hoá:** PV2 Đạt → trạng thái "Chờ nhận việc" + tạo sẵn dòng onboard

**Chiều**
- [ ] Lịch tuần: lưới ngày × khung giờ
- [ ] Kéo thả ô phỏng vấn sang ngày/giờ khác
- [ ] Cảnh báo trùng lịch người PV (đổi màu ô, chặn lưu nếu trùng)
- [ ] Bảng giai đoạn: 5 cột (Mới về · Phỏng vấn · Chờ quyết định · Nhận việc · Dừng), kéo thẻ để đổi trạng thái
- [ ] Thẻ ứng viên hiện tên, vị trí, nguồn, số ngày chờ
- [ ] 🔴 Chạy thử import 4.697 CV lên môi trường nháp — kiểm tra dữ liệu bẩn, đối chiếu số lượng

**Cuối ngày**
- [ ] ✅ **Bàn giao:** thay được sheet LỊCH PV, hết cảnh chép tay hai lần
- [ ] 👤 Bạn kiểm tra kết quả import thử: số lượng có khớp không, có ứng viên nào sai lệch không

> ⚠️ 🔴👤 **Hạn chót nhận file:** bản export đầy đủ Google Sheet phải có trong hôm nay. Muộn hơn thì app vẫn go-live 18/08 nhưng dữ liệu cũ sẽ import sau.

---

## NGÀY 4 — Chủ nhật, 17/08
### Onboard + thử việc + xuất Excel

**Sáng**
- [ ] 🔴 Màn hình Onboard: mỗi nhân sự mới một dòng, checklist 17 mục gom theo 5 nhóm
- [ ] Tick thay cho gõ "Yes"; thanh tiến độ từng giai đoạn
- [ ] Phân công nhân sự phụ trách cho từng giai đoạn (pre-onboard, hồ sơ giấy tờ, đào tạo)
- [ ] Trạng thái vòng đời: Nhận việc → Pass 7 ngày → Pass 1 tháng → Pass 2 tháng, nhánh Không đạt / Nghỉ việc
- [ ] **Tự động hoá:** điền ngày onboard → tự tính hạn 7 ngày, 1 tháng, 2 tháng
- [ ] **Tự động hoá:** đến hạn đánh giá → đẩy lên đầu danh sách kèm cảnh báo

**Chiều**
- [ ] Trang nhập liệu hàng loạt: thả file .xlsx/.csv, hiện bảng đối chiếu cột trước khi lưu
- [ ] Dán nhiều dòng copy thẳng từ Excel
- [ ] Xuất Excel: danh sách ứng viên theo bộ lọc đang chọn
- [ ] Màn hình danh mục: HR tự thêm/sửa/ẩn vị trí, nguồn CV, người PV
- [ ] Trang tổng quan: số CV theo tháng, theo nguồn, theo trạng thái, theo phòng ban
- [ ] Rà lỗi toàn bộ, sửa các góp ý tích luỹ từ ngày 2 và 3

**Cuối ngày**
- [ ] ✅ **Bàn giao:** đủ tính năng bản 1, sẵn sàng cho ngày go-live
- [ ] 👤 Bạn duyệt lần cuối trước khi đưa dữ liệu thật vào

---

## NGÀY 5 — Thứ 2, 18/08
### Import dữ liệu thật + bàn giao

**Sáng**
- [ ] 🔴 Import chính thức 4.697 CV vào hệ thống thật
- [ ] Chuẩn hoá khi import: SĐT, ngày tháng, gộp giá trị danh mục trùng nghĩa
- [ ] Đánh dấu các hồ sơ nghi trùng theo SĐT/email để HR xem lại thủ công
- [ ] 🔴 Đối chiếu số liệu với sheet: tổng số CV, số theo từng trạng thái, số theo nguồn
- [ ] Sao lưu cơ sở dữ liệu ngay sau import

**Chiều**
- [ ] 👤 HR dùng thử tại chỗ — nhập một ứng viên thật từ đầu đến cuối quy trình
- [ ] Sửa lỗi phát sinh ngay tại buổi dùng thử
- [ ] Bàn giao: hướng dẫn sử dụng ngắn (1 trang), tài khoản đăng nhập cho từng HR
- [ ] 👤 Chốt ngày ngừng nhập trên sheet, chuyển sheet sang chế độ chỉ đọc

**Cuối ngày**
- [ ] ✅ **GO-LIVE** — HR nhập liệu trên app, sheet chỉ còn để tra cứu lịch sử

---

## Nếu chậm tiến độ

Thứ tự hy sinh, cắt từ trên xuống. Quyết định muộn nhất vào chiều 17/08:

1. Xuất Excel — tạm thời tôi xuất tay khi bạn cần báo cáo
2. Màn hình danh mục — cần thêm vị trí mới thì báo tôi, sửa trực tiếp trong cơ sở dữ liệu
3. Trang tổng quan số liệu — vẫn đếm được bằng bộ lọc ở màn hình danh sách
4. Lịch tuần kéo thả — vẫn còn lịch dạng danh sách, đổi lịch bằng form

**Không cắt:** hồ sơ ứng viên, lịch PV, onboard checklist, import dữ liệu cũ.

---

## Đã cắt khỏi bản 18/08 (làm sau)

- Gửi email tự động mời PV và trả kết quả — bản này chỉ đánh dấu "đã gửi", HR vẫn gửi tay
- Đồng bộ Google Calendar
- Đọc CV PDF tự điền thông tin
- Dashboard phễu tuyển dụng, time-to-hire, năng suất từng HR
- Phân quyền theo phòng ban / khu vực HN–HCM
- Giao diện riêng cho điện thoại
