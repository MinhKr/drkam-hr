"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarChu, Badge, Card, OptionDanhMuc, Select, TrangThaiRong } from "@/components/ui/primitives";
import { danhDauDaGuiMail, nhapKetQua, xoaLichPV } from "@/app/(app)/lich-phong-van/actions";
import { dinhDangNgay } from "@/lib/utils";
import type { CaPhongVan } from "@/lib/lich";
import { cn } from "@/lib/utils";

function tone(kq: string | null) {
  if (kq === "Đạt") return "success" as const;
  if (kq === "Không đạt") return "danger" as const;
  if (kq === "Back up") return "warning" as const;
  return "neutral" as const;
}

export function DanhSachPV({
  ca,
  vong,
  ketQuaChon,
  idTrung,
}: {
  ca: CaPhongVan[];
  vong: 1 | 2;
  ketQuaChon: string[];
  idTrung: string[];
}) {
  const router = useRouter();
  const [dangChay, batDau] = useTransition();
  const [dangSua, setDangSua] = useState<string | null>(null);
  const trung = new Set(idTrung);

  function doiKetQua(id: string, kq: string) {
    setDangSua(id);
    batDau(async () => {
      await nhapKetQua(id, kq || null);
      setDangSua(null);
      router.refresh();
    });
  }

  function doiMail(id: string, daGui: boolean) {
    batDau(async () => {
      await danhDauDaGuiMail(id, daGui);
      router.refresh();
    });
  }

  function xoa(id: string, ten: string) {
    if (!confirm(`Xoá lịch phỏng vấn vòng ${vong} của ${ten}?`)) return;
    batDau(async () => {
      await xoaLichPV(id);
      router.refresh();
    });
  }

  if (ca.length === 0) {
    return (
      <Card>
        <TrangThaiRong
          tieuDe={`Chưa có ca phỏng vấn vòng ${vong} nào`}
          moTa="Đặt lịch trong hồ sơ ứng viên ở màn hình Quản lý CV, lịch sẽ hiện ngay tại đây."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-left">
              {["Ngày giờ", "Ứng viên", "Vị trí", "Người PV", "Hình thức", "Kết quả", "Đã báo KQ", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-2.5 text-2xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {ca.map((c) => (
              <tr
                key={c.id}
                className={cn(
                  "border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--surface-hover)]",
                  trung.has(c.id) && "bg-[var(--danger-soft)]/40",
                )}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="tabular font-medium text-[var(--ink)]">
                    {dinhDangNgay(c.scheduled_date)}
                  </div>
                  <div className="tabular flex items-center gap-1 text-xs text-[var(--ink-muted)]">
                    {(c.scheduled_time ?? "—").slice(0, 5)}
                    {trung.has(c.id) && (
                      <span
                        className="inline-flex items-center gap-1 text-[var(--danger)]"
                        title="Người phỏng vấn bị xếp hai ca cùng giờ"
                      >
                        <AlertTriangle className="size-3" />
                        trùng
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AvatarChu ten={c.full_name} className="size-8" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--ink)]">{c.full_name}</span>
                      <span className="text-xs text-[var(--ink-muted)]">
                        {c.phone ?? c.email ?? "—"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--ink-2)]">{c.position ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--ink-2)]">
                  {c.interviewers.length ? c.interviewers.join(", ") : "—"}
                </td>
                <td className="px-4 py-3">
                  {c.mode ? <Badge tone="outline">{c.mode}</Badge> : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Select
                      className="w-[150px]"
                      value={c.result ?? ""}
                      onChange={(e) => doiKetQua(c.id, e.target.value)}
                      aria-label={`Kết quả phỏng vấn của ${c.full_name}`}
                    >
                      <OptionDanhMuc
                        danhSach={ketQuaChon}
                        giaTri={c.result}
                        nhanTrong="— chưa có —"
                      />
                    </Select>
                    {dangSua === c.id && dangChay && (
                      <Loader2 className="size-4 animate-spin text-[var(--ink-faint)]" />
                    )}
                    {c.result && dangSua !== c.id && (
                      <Badge tone={tone(c.result)}>{c.result}</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => doiMail(c.id, !c.result_email_sent)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                      c.result_email_sent
                        ? "bg-[var(--success-soft)] text-[var(--success-soft-fg)]"
                        : "bg-[var(--neutral-soft)] text-[var(--neutral-soft-fg)] hover:bg-[var(--surface-2)]",
                    )}
                    title="Đánh dấu đã gửi mail trả kết quả cho ứng viên"
                  >
                    {c.result_email_sent ? <Check className="size-3" /> : <Mail className="size-3" />}
                    {c.result_email_sent ? "đã gửi" : "chưa gửi"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Xoá lịch của ${c.full_name}`}
                    onClick={() => xoa(c.id, c.full_name)}
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
