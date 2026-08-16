"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Save, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarChu } from "@/components/ui/primitives";
import { NhanTrangThai } from "./nhan-trang-thai";
import { DatLichPV, type ChonLichPV } from "./dat-lich-pv";
import { FormUngVien, type ChonLua } from "./form-ung-vien";
import { cn, dinhDangNgay } from "@/lib/utils";
import type { GiaiDoan } from "@/lib/types";
import type { CaPhongVan } from "@/lib/lich";
import type { UngVienRow } from "@/lib/ung-vien";

const FORM_ID = "form-ung-vien";

/**
 * Hộp thoại hồ sơ ứng viên — dùng chung cho màn hình Quản lý CV và Bảng giai đoạn.
 * `dangMo`: null = đóng, "moi" = thêm mới, còn lại là hồ sơ cần mở.
 */
export function HoSoDialog({
  dangMo,
  onDong,
  chon,
  chonLichPV,
  lichTheoUV,
  banDoGiaiDoan,
}: {
  dangMo: UngVienRow | "moi" | null;
  onDong: () => void;
  chon: ChonLua;
  chonLichPV: ChonLichPV;
  lichTheoUV: Record<string, CaPhongVan[]>;
  banDoGiaiDoan: Record<string, GiaiDoan>;
}) {
  const [tab, setTab] = useState<"ho-so" | "lich-pv">("ho-so");
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  // mở hồ sơ khác thì luôn bắt đầu lại từ tab Hồ sơ (đặt lại ngay khi render,
  // không dùng effect để tránh render thừa một lượt)
  const khoa = dangMo === "moi" ? "moi" : (dangMo?.id ?? "");
  const [khoaTruoc, setKhoaTruoc] = useState(khoa);
  if (khoa !== khoaTruoc) {
    setKhoaTruoc(khoa);
    setTab("ho-so");
    setLoi(null);
  }

  const soLich = dangMo && dangMo !== "moi" ? (lichTheoUV[dangMo.id]?.length ?? 0) : 0;

  return (
    <Dialog.Root
      open={dangMo !== null}
      onOpenChange={(o) => {
        if (!o) onDong();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-[820px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)] focus:outline-none"
        >
          {/* ---- Đầu hộp thoại ---- */}
          <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              {dangMo && dangMo !== "moi" ? (
                <AvatarChu ten={dangMo.full_name} className="size-11" />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--primary-soft-fg)]">
                  <UserPlus className="size-5" />
                </span>
              )}
              <div className="flex min-w-0 flex-col">
                <Dialog.Title className="truncate text-lg font-bold tracking-tight text-[var(--ink)]">
                  {dangMo === "moi" ? "Thêm ứng viên" : (dangMo?.full_name ?? "")}
                </Dialog.Title>
                {dangMo === "moi" ? (
                  <span className="text-sm text-[var(--ink-muted)]">
                    Chỉ họ và tên là bắt buộc, phần còn lại bổ sung dần cũng được.
                  </span>
                ) : (
                  dangMo && (
                    <span className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-muted)]">
                      Mã #{dangMo.code} · nhận CV {dinhDangNgay(dangMo.received_at)}
                      <NhanTrangThai
                        trangThai={dangMo.status}
                        giaiDoan={banDoGiaiDoan[dangMo.status]}
                      />
                    </span>
                  )
                )}
              </div>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Đóng">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          {/* ---- Tab: chỉ có khi mở hồ sơ đã tồn tại ---- */}
          {dangMo && dangMo !== "moi" && (
            <div className="flex gap-1 border-b border-[var(--line)] px-6">
              {(
                [
                  ["ho-so", "Hồ sơ"],
                  ["lich-pv", "Lịch phỏng vấn"],
                ] as const
              ).map(([k, nhan]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                    tab === k
                      ? "border-[var(--primary)] text-[var(--primary)]"
                      : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-2)]",
                  )}
                >
                  {nhan}
                  {k === "lich-pv" && soLich > 0 && (
                    <span className="ml-1.5 rounded-full bg-[var(--neutral-soft)] px-1.5 text-2xs text-[var(--neutral-soft-fg)]">
                      {soLich}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ---- Nội dung cuộn ---- */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {dangMo && (tab === "ho-so" || dangMo === "moi") && (
              <FormUngVien
                key={khoa}
                uv={dangMo === "moi" ? null : dangMo}
                chon={chon}
                formId={FORM_ID}
                onXong={onDong}
                onDangLuu={setDangLuu}
                onLoi={setLoi}
              />
            )}
            {dangMo && dangMo !== "moi" && tab === "lich-pv" && (
              <DatLichPV
                candidateId={dangMo.id}
                lich={lichTheoUV[dangMo.id] ?? []}
                chon={chonLichPV}
              />
            )}
          </div>

          {/* ---- Chân hộp thoại ---- */}
          <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] bg-[var(--surface-2)] px-6 py-3.5">
            <p
              role={loi ? "alert" : undefined}
              className="min-w-0 flex-1 truncate text-sm text-[var(--danger)]"
            >
              {loi}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" disabled={dangLuu}>
                  Đóng
                </Button>
              </Dialog.Close>
              {tab === "ho-so" && (
                <Button type="submit" form={FORM_ID} disabled={dangLuu}>
                  {dangLuu ? <Loader2 className="animate-spin" /> : <Save />}
                  {dangMo === "moi" ? "Thêm ứng viên" : "Lưu thay đổi"}
                </Button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
