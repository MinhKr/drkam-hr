"use client";

import { useState } from "react";
import { CalendarClock, Mail, Phone, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarChu, Badge, Card, TrangThaiRong } from "@/components/ui/primitives";
import { NhanTrangThai } from "./nhan-trang-thai";
import { HoSoDialog } from "./ho-so-dialog";
import type { ChonLichPV } from "./dat-lich-pv";
import type { ChonLua } from "./form-ung-vien";
import { dinhDangNgay } from "@/lib/utils";
import type { GiaiDoan } from "@/lib/types";
import type { CaPhongVan } from "@/lib/lich";
import type { UngVienRow } from "@/lib/ung-vien";

export function BangUngVien({
  rows,
  chon,
  banDoGiaiDoan,
  lichTheoUV,
  chonLichPV,
}: {
  rows: UngVienRow[];
  chon: ChonLua;
  banDoGiaiDoan: Record<string, GiaiDoan>;
  lichTheoUV: Record<string, CaPhongVan[]>;
  chonLichPV: ChonLichPV;
}) {
  const [dangMo, setDangMo] = useState<UngVienRow | "moi" | null>(null);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--ink-muted)]">Bấm vào một dòng để mở hồ sơ đầy đủ</p>
        <Button onClick={() => setDangMo("moi")}>
          <Plus />
          Thêm ứng viên
        </Button>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <TrangThaiRong
            tieuDe="Chưa có ứng viên nào"
            moTa="Bấm “Thêm ứng viên” để nhập hồ sơ đầu tiên, hoặc bỏ bớt bộ lọc nếu bạn đang lọc."
          >
            <Button className="mt-3" onClick={() => setDangMo("moi")}>
              <UserPlus />
              Thêm ứng viên đầu tiên
            </Button>
          </TrangThaiRong>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-left">
                  {["Ứng viên", "Vị trí", "Nguồn", "Nhận CV", "Lịch PV", "Trạng thái"].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-2.5 text-2xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setDangMo(r)}
                    className="cursor-pointer border-b border-[var(--line)] transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AvatarChu ten={r.full_name} className="size-9" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--ink)]">{r.full_name}</span>
                          <span className="flex flex-wrap items-center gap-x-3 text-xs text-[var(--ink-muted)]">
                            {r.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="size-3" />
                                {r.phone}
                              </span>
                            )}
                            {r.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="size-3" />
                                {r.email}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--ink-2)]">{r.position ?? "—"}</span>
                      {r.department && (
                        <span className="block text-xs text-[var(--ink-faint)]">
                          {r.department}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-2)]">{r.source ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="tabular whitespace-nowrap text-[var(--ink-2)]">
                        {dinhDangNgay(r.received_at)}
                      </span>
                      {r.so_ngay_cho > 7 && (
                        <span className="block text-xs text-[var(--warning)]">
                          chờ {r.so_ngay_cho} ngày
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.so_lich_pv > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
                          <CalendarClock className="size-3.5 text-[var(--ink-faint)]" />
                          {dinhDangNgay(r.ngay_pv_gan_nhat)}
                          {r.kq_pv1 && <Badge tone="outline">{r.kq_pv1}</Badge>}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--ink-faint)]">chưa đặt</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <NhanTrangThai trangThai={r.status} giaiDoan={banDoGiaiDoan[r.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <HoSoDialog
        dangMo={dangMo}
        onDong={() => setDangMo(null)}
        chon={chon}
        chonLichPV={chonLichPV}
        lichTheoUV={lichTheoUV}
        banDoGiaiDoan={banDoGiaiDoan}
      />
    </>
  );
}
