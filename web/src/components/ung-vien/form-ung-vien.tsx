"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Wand2 } from "lucide-react";
import { Input, Select, Textarea, Truong } from "@/components/ui/primitives";
import { OTaiCV } from "./o-tai-cv";
import { capNhatUngVien, taoUngVien, timTrung, type UngVienTrung } from "@/app/(app)/ung-vien/actions";
import { dinhDangNgay } from "@/lib/utils";
import type { UngVienRow } from "@/lib/ung-vien";

export type ChonLua = {
  vi_tri: { value: string; department: string; level: string }[];
  phong_ban: string[];
  cap_bac: string[];
  khu_vuc: string[];
  gioi_tinh: string[];
  tinh: string[];
  nguon: string[];
  trang_thai: string[];
  nguoi_sang_loc: string[];
  offer_status: string[];
};

/** Tiêu đề nhóm, có đường kẻ mảnh chạy hết chiều ngang */
function Nhom({ so, ten, children }: { so: number; ten: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-2xs font-bold text-[var(--primary-soft-fg)]">
          {so}
        </span>
        <h3 className="whitespace-nowrap text-sm font-semibold text-[var(--ink)]">{ten}</h3>
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function OChon({
  ten,
  giaTri,
  danhSach,
}: {
  ten: string;
  giaTri?: string | null;
  danhSach: string[];
}) {
  return (
    <Select name={ten} defaultValue={giaTri ?? ""} id={ten}>
      <option value="">— chọn —</option>
      {danhSach.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </Select>
  );
}

export function FormUngVien({
  uv,
  chon,
  formId,
  onXong,
  onDangLuu,
  onLoi,
}: {
  uv: UngVienRow | null;
  chon: ChonLua;
  formId: string;
  onXong: (idMoi?: string) => void;
  onDangLuu: (dang: boolean) => void;
  onLoi: (loi: string | null) => void;
}) {
  const laTaoMoi = uv === null;
  const formRef = useRef<HTMLFormElement>(null);
  const [, batDau] = useTransition();
  const [trung, setTrung] = useState<UngVienTrung[]>([]);

  const [viTri, setViTri] = useState(uv?.position ?? "");
  const [phongBan, setPhongBan] = useState(uv?.department ?? "");
  const [capBac, setCapBac] = useState(uv?.level ?? "");
  const [daTuDien, setDaTuDien] = useState(false);

  const banDo = useMemo(
    () => Object.fromEntries(chon.vi_tri.map((v) => [v.value, v])),
    [chon.vi_tri],
  );

  /** Chọn vị trí thì tự điền phòng ban và cấp bậc — vẫn sửa lại được */
  function chonViTri(v: string) {
    setViTri(v);
    const m = banDo[v];
    if (m?.department) setPhongBan(m.department);
    if (m?.level) setCapBac(m.level);
    setDaTuDien(Boolean(m?.department));
  }

  async function kiemTraTrung() {
    const f = formRef.current;
    if (!f) return;
    const phone = (f.elements.namedItem("phone") as HTMLInputElement)?.value ?? "";
    const email = (f.elements.namedItem("email") as HTMLInputElement)?.value ?? "";
    if (!phone && !email) return setTrung([]);
    setTrung(await timTrung(phone, email, uv?.id));
  }

  function luu(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onLoi(null);
    onDangLuu(true);
    const form = new FormData(e.currentTarget);
    batDau(async () => {
      const kq = laTaoMoi ? await taoUngVien(form) : await capNhatUngVien(uv.id, form);
      onDangLuu(false);
      if (kq.ok) onXong(kq.id);
      else onLoi(kq.loi ?? "Không lưu được");
    });
  }

  return (
    <form ref={formRef} id={formId} onSubmit={luu} className="flex flex-col gap-7">
      <Nhom so={1} ten="Thông tin cơ bản">
        <Truong nhan="Họ và tên" batBuoc rong htmlFor="full_name">
          <Input
            id="full_name"
            name="full_name"
            required
            autoFocus
            defaultValue={uv?.full_name ?? ""}
            placeholder="Nguyễn Văn A"
          />
        </Truong>
        <Truong nhan="Ngày nhận CV" htmlFor="received_at">
          <Input
            id="received_at"
            type="date"
            name="received_at"
            defaultValue={uv?.received_at ?? new Date().toISOString().slice(0, 10)}
          />
        </Truong>
        <Truong nhan="Giới tính" htmlFor="gender">
          <OChon ten="gender" giaTri={uv?.gender} danhSach={chon.gioi_tinh} />
        </Truong>
        <Truong nhan="Khu vực ứng tuyển" htmlFor="region">
          <OChon ten="region" giaTri={uv?.region} danhSach={chon.khu_vuc} />
        </Truong>
        <Truong nhan="Quê quán" htmlFor="hometown">
          <OChon ten="hometown" giaTri={uv?.hometown} danhSach={chon.tinh} />
        </Truong>
      </Nhom>

      <Nhom so={2} ten="Liên hệ">
        <Truong nhan="Số điện thoại" goiY="Tự bỏ dấu chấm, khoảng trắng và đổi +84 thành 0" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            inputMode="tel"
            defaultValue={uv?.phone ?? ""}
            onBlur={kiemTraTrung}
            placeholder="0901234567"
          />
        </Truong>
        <Truong nhan="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={uv?.email ?? ""}
            onBlur={kiemTraTrung}
            placeholder="ten@gmail.com"
          />
        </Truong>
        <Truong
          nhan="Link CV / Portfolio"
          rong
          htmlFor="cv_url"
          goiY="Dùng khi CV nằm sẵn ở TopCV, Google Drive… — không bắt buộc nếu đã đính file bên dưới"
        >
          <Input id="cv_url" name="cv_url" defaultValue={uv?.cv_url ?? ""} placeholder="https://…" />
        </Truong>

        <Truong nhan="File CV đính kèm" rong htmlFor="cv_file">
          <OTaiCV duongDanHienCo={uv?.cv_file_path} />
        </Truong>

        {trung.length > 0 && (
          <div className="flex flex-col gap-2 rounded-[var(--r-sm)] border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3 sm:col-span-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--warning-soft-fg)]">
              <AlertTriangle className="size-4 shrink-0" />
              Đã có {trung.length} hồ sơ trùng số điện thoại hoặc email
            </p>
            <ul className="flex flex-col gap-1">
              {trung.map((t) => (
                <li key={t.id} className="text-sm text-[var(--warning-soft-fg)]">
                  <span className="font-medium">{t.full_name}</span> — {t.position ?? "chưa rõ vị trí"}{" "}
                  · {t.status} · nhận CV {dinhDangNgay(t.received_at)}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[var(--warning-soft-fg)]/80">
              Vẫn lưu được — người cũ ứng tuyển lại vị trí khác là chuyện bình thường.
            </p>
          </div>
        )}
      </Nhom>

      <Nhom so={3} ten="Vị trí ứng tuyển">
        <Truong nhan="Vị trí" htmlFor="position">
          <Select
            id="position"
            name="position"
            value={viTri}
            onChange={(e) => chonViTri(e.target.value)}
          >
            <option value="">— chọn —</option>
            {chon.vi_tri.map((v) => (
              <option key={v.value} value={v.value}>
                {v.value}
              </option>
            ))}
          </Select>
        </Truong>
        <Truong nhan="Nguồn CV" htmlFor="source">
          <OChon ten="source" giaTri={uv?.source} danhSach={chon.nguon} />
        </Truong>
        <Truong
          nhan="Phòng ban"
          goiY={daTuDien ? "Tự điền theo vị trí, sửa lại được" : undefined}
          htmlFor="department"
        >
          <Select
            id="department"
            name="department"
            value={phongBan}
            onChange={(e) => setPhongBan(e.target.value)}
          >
            <option value="">— chọn —</option>
            {chon.phong_ban.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Truong>
        <Truong
          nhan="Cấp bậc"
          goiY={daTuDien ? "Tự điền theo vị trí, sửa lại được" : undefined}
          htmlFor="level"
        >
          <Select id="level" name="level" value={capBac} onChange={(e) => setCapBac(e.target.value)}>
            <option value="">— chọn —</option>
            {chon.cap_bac.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Truong>

        {daTuDien && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--success)] sm:col-span-2">
            <Wand2 className="size-3.5" />
            Đã tự điền phòng ban và cấp bậc theo vị trí vừa chọn
          </p>
        )}
      </Nhom>

      <Nhom so={4} ten="Sàng lọc CV">
        <Truong nhan="Người sàng lọc" htmlFor="screener">
          <OChon ten="screener" giaTri={uv?.screener} danhSach={chon.nguoi_sang_loc} />
        </Truong>
        <Truong nhan="Trạng thái CV" htmlFor="status">
          <OChon ten="status" giaTri={uv?.status ?? "Đang liên hệ"} danhSach={chon.trang_thai} />
        </Truong>
        <Truong nhan="Nhận xét sau khi đọc CV" rong htmlFor="screening_note">
          <Textarea
            id="screening_note"
            name="screening_note"
            rows={4}
            defaultValue={uv?.screening_note ?? ""}
            placeholder="Sinh năm, kinh nghiệm, lý do nghỉ việc ở công ty cũ, nhận định chung…"
          />
        </Truong>
      </Nhom>

      <Nhom so={5} ten="Sơ vấn qua điện thoại">
        <Truong nhan="Kinh nghiệm" htmlFor="experience">
          <Input
            id="experience"
            name="experience"
            defaultValue={uv?.experience ?? ""}
            placeholder="2 năm kho vận"
          />
        </Truong>
        <Truong nhan="Mức lương mong muốn" htmlFor="expected_salary">
          <Input
            id="expected_salary"
            name="expected_salary"
            defaultValue={uv?.expected_salary ?? ""}
            placeholder="10–12 triệu"
          />
        </Truong>
        <Truong nhan="Có thể đi làm từ" rong htmlFor="available_from">
          <Input
            id="available_from"
            name="available_from"
            defaultValue={uv?.available_from ?? ""}
            placeholder="Ngay lập tức / sau 2 tuần"
          />
        </Truong>
      </Nhom>

      {/* Chỉ hiện khi sửa hồ sơ cũ — thêm mới thì chưa ai nghĩ tới offer */}
      {!laTaoMoi && (
        <Nhom so={6} ten="Offer & onboard">
          <Truong nhan="Trạng thái offer" htmlFor="offer_status">
            <OChon ten="offer_status" giaTri={uv.offer_status} danhSach={chon.offer_status} />
          </Truong>
          <Truong nhan="Ngày dự kiến onboard" htmlFor="planned_onboard_date">
            <Input
              id="planned_onboard_date"
              type="date"
              name="planned_onboard_date"
              defaultValue={uv.planned_onboard_date ?? ""}
            />
          </Truong>
          <Truong nhan="Ngày thực tế onboard" htmlFor="actual_onboard_date">
            <Input
              id="actual_onboard_date"
              type="date"
              name="actual_onboard_date"
              defaultValue={uv.actual_onboard_date ?? ""}
            />
          </Truong>
          <Truong nhan="Ghi chú" rong htmlFor="note">
            <Input id="note" name="note" defaultValue={uv.note ?? ""} />
          </Truong>
        </Nhom>
      )}

      <p className="text-xs text-[var(--ink-faint)]">
        Lịch phỏng vấn vòng 1 và vòng 2 làm ở ngày 3 · checklist onboard ở ngày 4.
      </p>
    </form>
  );
}
