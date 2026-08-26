"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  nhapExcel,
  xemTruocNhapExcel,
  type XemTruoc,
} from "@/app/(app)/ung-vien/actions-nhap";
import { TOI_DA_DONG, TOI_DA_MB } from "@/lib/han-muc-nhap";
import { cn } from "@/lib/utils";

/** Nhóm gấp mở được trong màn xem trước — mặc định đóng cho khỏi rối */
function Nhom({
  mo,
  dat,
  mau,
  Icon,
  tieuDe,
  so,
  children,
}: {
  mo: boolean;
  dat: (v: boolean) => void;
  mau: string;
  Icon: typeof CircleAlert;
  tieuDe: string;
  so: number;
  children: React.ReactNode;
}) {
  if (so === 0) return null;

  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--line)]">
      <button
        type="button"
        onClick={() => dat(!mo)}
        aria-expanded={mo}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Icon className={cn("size-4 shrink-0", mau)} />
        <span className="text-sm font-medium text-[var(--ink)]">
          {so} {tieuDe}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto size-3.5 shrink-0 text-[var(--ink-faint)] transition-transform",
            mo && "rotate-180",
          )}
        />
      </button>
      {mo && (
        <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto border-t border-[var(--line)] px-3 py-2">
          {children}
        </ul>
      )}
    </div>
  );
}

export function NhapExcelDialog() {
  const router = useRouter();
  const oFile = useRef<HTMLInputElement>(null);
  const [mo, setMo] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [xem, setXem] = useState<XemTruoc | null>(null);
  const [dangChay, setDangChay] = useState(false);
  const [xong, setXong] = useState<number | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [, batDau] = useTransition();

  const [moLoi, setMoLoi] = useState(false);
  const [moTrung, setMoTrung] = useState(false);
  const [moCanhBao, setMoCanhBao] = useState(false);

  function datLai() {
    setFile(null);
    setXem(null);
    setXong(null);
    setLoi(null);
    setMoLoi(false);
    setMoTrung(false);
    setMoCanhBao(false);
    if (oFile.current) oFile.current.value = "";
  }

  function dong(v: boolean) {
    setMo(v);
    if (!v) datLai();
  }

  async function chonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setLoi(null);
    setXem(null);
    setDangChay(true);

    const form = new FormData();
    form.set("file", f);
    const kq = await xemTruocNhapExcel(form);

    setDangChay(false);
    if (!kq.ok) {
      setLoi(kq.loi);
      setFile(null);
      if (oFile.current) oFile.current.value = "";
      return;
    }
    setXem(kq);
  }

  async function nhap() {
    if (!file) return;
    setDangChay(true);
    setLoi(null);

    const form = new FormData();
    form.set("file", file);
    const kq = await nhapExcel(form);

    setDangChay(false);
    if (!kq.ok) {
      setLoi(kq.loi ?? "Không nhập được");
      return;
    }
    setXong(kq.them ?? 0);
    batDau(() => router.refresh());
  }

  const coXem = xem?.ok === true ? xem : null;

  return (
    <Dialog.Root open={mo} onOpenChange={dong}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" title="Nạp nhiều hồ sơ cùng lúc từ file Excel">
          <Upload />
          Nhập Excel
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)] focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--primary-soft-fg)]">
                <FileSpreadsheet className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <Dialog.Title className="text-lg font-bold tracking-tight text-[var(--ink)]">
                  Nhập ứng viên từ Excel
                </Dialog.Title>
                <span className="text-sm text-[var(--ink-muted)]">
                  Xem trước rồi mới nhập — chưa bấm nút nhập thì chưa có gì vào cơ sở dữ liệu.
                </span>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Đóng">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <input
              ref={oFile}
              type="file"
              accept=".xlsx"
              onChange={chonFile}
              className="sr-only"
            />

            {/* ---------------- xong ---------------- */}
            {xong !== null ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <CheckCircle2 className="size-10 text-[var(--success)]" />
                <p className="text-md font-semibold text-[var(--ink)]">
                  Đã nhập {xong.toLocaleString("vi-VN")} hồ sơ
                </p>
                <p className="max-w-md text-sm text-[var(--ink-muted)]">
                  Danh sách phía sau đã cập nhật. Hồ sơ mang trạng thái đã dừng sẽ nằm ở khu lưu
                  trữ dưới Bảng giai đoạn chứ không đổ vào cột Dừng.
                </p>
                <Button variant="outline" size="sm" onClick={datLai}>
                  <Upload />
                  Nhập file khác
                </Button>
              </div>
            ) : !coXem ? (
              /* ---------------- bước 1: chọn file ---------------- */
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-center gap-3 rounded-[var(--r-sm)] border border-dashed border-[var(--line-strong)] px-6 py-10 text-center">
                  <Upload className="size-8 text-[var(--ink-faint)]" />
                  <Button
                    type="button"
                    onClick={() => oFile.current?.click()}
                    disabled={dangChay}
                  >
                    {dangChay ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
                    {dangChay ? "Đang đọc file…" : "Chọn file Excel"}
                  </Button>
                  <p className="text-xs text-[var(--ink-faint)]">
                    File <b className="font-semibold">.xlsx</b>, tối đa {TOI_DA_MB} MB và{" "}
                    {TOI_DA_DONG.toLocaleString("vi-VN")} dòng mỗi lần.
                  </p>
                </div>

                <div className="flex flex-col gap-2 rounded-[var(--r-sm)] bg-[var(--surface-2)] px-4 py-3">
                  <p className="text-sm font-medium text-[var(--ink)]">Nhận được file nào</p>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-xs text-[var(--ink-muted)]">
                    <li>File <em>DATA UV DRKAM 2026</em> cũ — để nguyên cũng đọc được.</li>
                    <li>
                      File do nút <b className="font-semibold">Xuất Excel</b> tạo ra — xuất ra, sửa
                      hàng loạt trong Excel rồi nạp lại.
                    </li>
                    <li>File tự làm theo mẫu bên dưới.</li>
                  </ul>
                  <Button variant="link" size="sm" className="self-start px-0" asChild>
                    <a href="/ung-vien/mau-nhap">
                      <Download />
                      Tải file mẫu
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              /* ---------------- bước 2: xem trước ---------------- */
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold text-[var(--ink)]">
                    Sẽ thêm {coXem.seThem.toLocaleString("vi-VN")} hồ sơ
                  </span>
                  <span className="text-[var(--ink-faint)]">
                    trên {coXem.tongDong.toLocaleString("vi-VN")} dòng có dữ liệu
                  </span>
                </div>

                <Nhom
                  mo={moTrung}
                  dat={setMoTrung}
                  mau="text-[var(--warning)]"
                  Icon={Copy}
                  tieuDe="dòng trùng — bỏ qua"
                  so={coXem.trung.length}
                >
                  {coXem.trung.map((t) => (
                    <li key={t.dong} className="text-xs text-[var(--ink-2)]">
                      <b className="font-semibold">Dòng {t.dong}</b> · {t.ten} — trùng với{" "}
                      {t.trungVoi}
                    </li>
                  ))}
                </Nhom>

                <Nhom
                  mo={moLoi}
                  dat={setMoLoi}
                  mau="text-[var(--danger)]"
                  Icon={CircleAlert}
                  tieuDe="dòng lỗi — bỏ qua"
                  so={coXem.loi.length}
                >
                  {coXem.loi.map((l) => (
                    <li key={l.dong} className="text-xs text-[var(--ink-2)]">
                      <b className="font-semibold">Dòng {l.dong}</b>
                      {l.ten ? ` · ${l.ten}` : ""} — {l.ly_do}
                    </li>
                  ))}
                </Nhom>

                <Nhom
                  mo={moCanhBao}
                  dat={setMoCanhBao}
                  mau="text-[var(--ink-muted)]"
                  Icon={TriangleAlert}
                  tieuDe="dòng có giá trị lạ — vẫn nhập"
                  so={coXem.canhBao.length}
                >
                  {coXem.canhBao.map((c) => (
                    <li key={c.dong} className="text-xs text-[var(--ink-2)]">
                      <b className="font-semibold">Dòng {c.dong}</b> · {c.ten} — {c.ly_do}
                    </li>
                  ))}
                </Nhom>

                {coXem.thieuCot.length > 0 && (
                  <p className="rounded-[var(--r-sm)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink-muted)]">
                    File không có cột: {coXem.thieuCot.join(", ")} — các ô đó sẽ để trống.
                  </p>
                )}

                {coXem.seThem > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {coXem.seThem > coXem.mau.length
                        ? `${coXem.mau.length} dòng đầu — soi xem cột có khớp không`
                        : "Kiểm lại trước khi nhập"}
                    </p>
                    <div className="overflow-x-auto rounded-[var(--r-sm)] border border-[var(--line)]">
                      <table className="w-full min-w-[560px] border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-left">
                            {["Dòng", "Họ và tên", "Vị trí", "SĐT", "Nhận CV", "Trạng thái"].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="whitespace-nowrap px-2.5 py-1.5 font-semibold text-[var(--ink-muted)]"
                                >
                                  {h}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {coXem.mau.map((m) => (
                            <tr key={m.dong} className="border-b border-[var(--line)] last:border-b-0">
                              <td className="tabular px-2.5 py-1.5 text-[var(--ink-faint)]">
                                {m.dong}
                              </td>
                              <td className="px-2.5 py-1.5 font-medium text-[var(--ink)]">
                                {m.ten}
                              </td>
                              <td className="px-2.5 py-1.5 text-[var(--ink-2)]">
                                {m.vi_tri ?? "—"}
                              </td>
                              <td className="tabular px-2.5 py-1.5 text-[var(--ink-2)]">
                                {m.sdt ?? "—"}
                              </td>
                              <td className="tabular px-2.5 py-1.5 text-[var(--ink-2)]">
                                {m.ngay ?? "—"}
                              </td>
                              <td className="px-2.5 py-1.5 text-[var(--ink-2)]">
                                {m.trang_thai ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {loi && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-1.5 rounded-[var(--r-sm)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-soft-fg)]"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                {loi}
              </p>
            )}
          </div>

          {xong === null && (
            <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] bg-[var(--surface-2)] px-6 py-3.5">
              <p className="min-w-0 flex-1 truncate text-xs text-[var(--ink-faint)]">
                {file?.name}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {coXem && (
                  <Button variant="ghost" size="sm" onClick={datLai} disabled={dangChay}>
                    Chọn file khác
                  </Button>
                )}
                <Dialog.Close asChild>
                  <Button variant="ghost" size="sm" disabled={dangChay}>
                    Đóng
                  </Button>
                </Dialog.Close>
                {coXem && (
                  <Button size="sm" onClick={nhap} disabled={dangChay || coXem.seThem === 0}>
                    {dangChay ? <Loader2 className="animate-spin" /> : <Upload />}
                    Nhập {coXem.seThem.toLocaleString("vi-VN")} hồ sơ
                  </Button>
                )}
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
