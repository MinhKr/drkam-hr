"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarChu, Badge, Input, Select, Textarea, Truong } from "@/components/ui/primitives";
import { capNhatOnboard, ghiKetQuaDanhGia, tickViec } from "@/app/(app)/onboard/actions";
import {
  cacMoc,
  demNhom,
  mucCanhBao,
  nhanCanhBao,
  type DongOnboard,
  type NhomViec,
} from "@/lib/onboard-types";
import { cn, dinhDangNgay } from "@/lib/utils";

export type ChonOnboard = {
  van_phong: string[];
  nguoi_phu_trach: string[];
  trang_thai: string[];
  ket_qua: string[];
};

const MAU_CANH_BAO: Record<string, string> = {
  qua_han: "text-[var(--danger)]",
  hom_nay: "text-[var(--danger)]",
  sap_toi: "text-[var(--warning)]",
  con_xa: "text-[var(--ink-muted)]",
  khong: "text-[var(--ink-faint)]",
};

function ThanhTienDo({ xong, tong }: { xong: number; tong: number }) {
  const pt = tong === 0 ? 0 : Math.round((xong / tong) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pt === 100 ? "bg-[var(--success)]" : "bg-[var(--primary)]",
          )}
          style={{ width: `${pt}%` }}
        />
      </div>
      <span className="tabular shrink-0 text-2xs text-[var(--ink-muted)]">
        {xong}/{tong}
      </span>
    </div>
  );
}

export function HoSoOnboard({
  dong,
  nhomViec,
  chon,
  onDong,
}: {
  dong: DongOnboard | null;
  nhomViec: NhomViec[];
  chon: ChonOnboard;
  onDong: () => void;
}) {
  const router = useRouter();
  const [dangChay, batDau] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);

  // tick ngay trên màn hình cho mượt, sai thì trả lại trạng thái cũ
  const [tickTam, setTickTam] = useState<Record<string, boolean>>({});

  if (!dong) return null;
  const checklist = { ...dong.checklist, ...tickTam };
  const tongMuc = nhomViec.reduce((s, n) => s + n.viec.length, 0);

  function doiTick(khoa: string, xong: boolean) {
    if (!dong) return;
    setTickTam((cu) => ({ ...cu, [khoa]: xong }));
    batDau(async () => {
      const kq = await tickViec(dong.id, khoa, xong);
      if (!kq.ok) {
        setTickTam((cu) => ({ ...cu, [khoa]: !xong }));
        setLoi(kq.loi ?? "Không lưu được");
      } else {
        router.refresh();
      }
    });
  }

  function luuTruong(truong: string, giaTri: string) {
    if (!dong) return;
    batDau(async () => {
      const kq = await capNhatOnboard(dong.id, { [truong]: giaTri || null });
      if (!kq.ok) setLoi(kq.loi ?? "Không lưu được");
      else router.refresh();
    });
  }

  function luuDanhGia(moc: "7d" | "1m" | "2m", ketQua: string) {
    if (!dong) return;
    batDau(async () => {
      const kq = await ghiKetQuaDanhGia(dong.id, moc, ketQua || null);
      if (!kq.ok) setLoi(kq.loi ?? "Không lưu được");
      else router.refresh();
    });
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onDong()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-[860px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)] focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <AvatarChu ten={dong.full_name} className="size-11" />
              <div className="flex min-w-0 flex-col">
                <Dialog.Title className="truncate text-lg font-bold tracking-tight text-[var(--ink)]">
                  {dong.full_name}
                </Dialog.Title>
                <span className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-muted)]">
                  {dong.position ?? "—"}
                  {dong.onboard_date && <>· onboard {dinhDangNgay(dong.onboard_date)}</>}
                  {dong.status && <Badge tone="neutral">{dong.status}</Badge>}
                </span>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Đóng">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-7">
              {/* Thông tin chung */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="whitespace-nowrap text-sm font-semibold text-[var(--ink)]">
                    Thông tin chung
                  </h3>
                  <span className="h-px flex-1 bg-[var(--line)]" />
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <Truong nhan="Ngày onboard" goiY="Ba mốc đánh giá tự tính từ ngày này">
                    <Input
                      type="date"
                      defaultValue={dong.onboard_date ?? ""}
                      onBlur={(e) => luuTruong("onboard_date", e.target.value)}
                    />
                  </Truong>
                  <Truong nhan="Văn phòng tiếp nhận">
                    <Select
                      defaultValue={dong.office ?? ""}
                      onChange={(e) => luuTruong("office", e.target.value)}
                    >
                      <option value="">— chọn —</option>
                      {chon.van_phong.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Truong>
                  <Truong nhan="Trạng thái vòng đời">
                    <Select
                      defaultValue={dong.status ?? ""}
                      onChange={(e) => luuTruong("status", e.target.value)}
                    >
                      <option value="">— chọn —</option>
                      {chon.trang_thai.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Truong>
                  <Truong nhan="HR phụ trách chung">
                    <Select
                      defaultValue={dong.owner ?? ""}
                      onChange={(e) => luuTruong("owner", e.target.value)}
                    >
                      <option value="">— chọn —</option>
                      {chon.nguoi_phu_trach.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Truong>
                  <Truong nhan="Ghi chú chuẩn bị" rong>
                    <Textarea
                      rows={2}
                      defaultValue={dong.pre_note ?? ""}
                      onBlur={(e) => luuTruong("pre_note", e.target.value)}
                      placeholder="Bàn làm việc, máy tính, sim điện thoại… (khối văn phòng online tự chuẩn bị laptop, trừ Design và Media)"
                    />
                  </Truong>
                </div>
              </section>

              {/* Checklist */}
              {nhomViec.map((nhom, i) => {
                const { xong, tong } = demNhom(checklist, nhom);
                const nguoiTruong =
                  nhom.key === "pre"
                    ? "assignee_pre"
                    : nhom.key === "dao_tao"
                      ? "assignee_training"
                      : nhom.key === "giay_to" || nhom.key === "cam_ket"
                        ? "assignee_docs"
                        : null;
                const nguoiHienTai =
                  nguoiTruong === "assignee_pre"
                    ? dong.assignee_pre
                    : nguoiTruong === "assignee_training"
                      ? dong.assignee_training
                      : dong.assignee_docs;

                return (
                  <section key={nhom.key} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-2xs font-bold text-[var(--primary-soft-fg)]">
                        {i + 1}
                      </span>
                      <h3 className="whitespace-nowrap text-sm font-semibold text-[var(--ink)]">
                        {nhom.ten}
                      </h3>
                      <span className="h-px flex-1 bg-[var(--line)]" />
                      <span className="tabular shrink-0 text-2xs text-[var(--ink-muted)]">
                        {xong}/{tong}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {nhom.viec.map((v) => {
                        const daXong = Boolean(checklist[v.key]);
                        return (
                          <label
                            key={v.key}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-[var(--r-sm)] px-2 py-1.5 transition-colors hover:bg-[var(--surface-hover)]",
                              daXong && "text-[var(--ink-muted)]",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors",
                                daXong
                                  ? "border-[var(--success)] bg-[var(--success)] text-white"
                                  : "border-[var(--line-strong)]",
                              )}
                            >
                              {daXong && <Check className="size-3" strokeWidth={3} />}
                            </span>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={daXong}
                              onChange={(e) => doiTick(v.key, e.target.checked)}
                            />
                            <span className={cn("text-sm", daXong && "line-through")}>{v.ten}</span>
                          </label>
                        );
                      })}
                    </div>

                    {nguoiTruong && (
                      <div className="flex items-center gap-2 pl-2">
                        <span className="text-xs text-[var(--ink-muted)]">Nhân sự phụ trách:</span>
                        <Select
                          className="w-[180px]"
                          defaultValue={nguoiHienTai ?? ""}
                          onChange={(e) => luuTruong(nguoiTruong, e.target.value)}
                        >
                          <option value="">— chọn —</option>
                          {chon.nguoi_phu_trach.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Vòng đời thử việc */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="whitespace-nowrap text-sm font-semibold text-[var(--ink)]">
                    Đánh giá thử việc
                  </h3>
                  <span className="h-px flex-1 bg-[var(--line)]" />
                </div>

                {!dong.onboard_date && (
                  <p className="rounded-[var(--r-sm)] bg-[var(--warning-soft)] px-3 py-2 text-sm text-[var(--warning-soft-fg)]">
                    Điền ngày onboard ở trên thì ba mốc đánh giá mới tự tính được.
                  </p>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  {cacMoc(dong).map((m) => {
                    const muc = mucCanhBao(m);
                    return (
                      <div
                        key={m.khoa}
                        className="flex flex-col gap-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface-2)] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[var(--ink)]">{m.ten}</span>
                          {m.ketQua && (
                            <Badge tone={m.ketQua === "Đạt" ? "success" : "danger"}>
                              {m.ketQua}
                            </Badge>
                          )}
                        </div>
                        <span className="tabular text-xs text-[var(--ink-muted)]">
                          Hạn: {dinhDangNgay(m.han)}
                        </span>
                        {!m.ketQua && (
                          <span className={cn("text-xs font-medium", MAU_CANH_BAO[muc])}>
                            {nhanCanhBao(m)}
                          </span>
                        )}
                        <Select
                          defaultValue={m.ketQua ?? ""}
                          onChange={(e) => luuDanhGia(m.khoa, e.target.value)}
                          disabled={!dong.onboard_date}
                        >
                          <option value="">— chưa đánh giá —</option>
                          {chon.ket_qua.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </Select>
                      </div>
                    );
                  })}
                </div>

                <Truong nhan="Ghi chú">
                  <Textarea
                    rows={2}
                    defaultValue={dong.note ?? ""}
                    onBlur={(e) => luuTruong("note", e.target.value)}
                  />
                </Truong>
              </section>

              <div>
                <span className="mb-1.5 block text-xs text-[var(--ink-muted)]">
                  Tiến độ toàn bộ checklist
                </span>
                <ThanhTienDo
                  xong={Object.values(checklist).filter(Boolean).length}
                  tong={tongMuc}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] bg-[var(--surface-2)] px-6 py-3.5">
            <p className="min-w-0 flex-1 truncate text-sm text-[var(--danger)]">{loi}</p>
            <div className="flex shrink-0 items-center gap-2">
              {dangChay && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                  <Loader2 className="size-3.5 animate-spin" />
                  đang lưu
                </span>
              )}
              <Dialog.Close asChild>
                <Button variant="outline">Đóng</Button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { ThanhTienDo };
