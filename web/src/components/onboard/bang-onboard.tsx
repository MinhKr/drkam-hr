"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarChu, Badge, Card, Select, TrangThaiRong } from "@/components/ui/primitives";
import { HoSoOnboard, ThanhTienDo, type ChonOnboard } from "./ho-so-onboard";
import { themOnboard } from "@/app/(app)/onboard/actions";
import {
  mocSapToi,
  mucCanhBao,
  nhanCanhBao,
  type DongOnboard,
  type NhomViec,
} from "@/lib/onboard-types";
import { cn, dinhDangNgay } from "@/lib/utils";

const MAU_CANH_BAO: Record<string, string> = {
  qua_han: "text-[var(--danger)] font-semibold",
  hom_nay: "text-[var(--danger)] font-semibold",
  sap_toi: "text-[var(--warning)] font-medium",
  con_xa: "text-[var(--ink-muted)]",
  khong: "text-[var(--ink-faint)]",
};

function toneTrangThai(tt: string | null) {
  if (!tt) return "neutral" as const;
  if (tt.startsWith("Pass 2")) return "success" as const;
  if (tt.startsWith("Pass")) return "primary" as const;
  if (tt === "Nghỉ việc" || tt.startsWith("Không đạt")) return "danger" as const;
  return "neutral" as const;
}

export function BangOnboard({
  ds,
  nhomViec,
  chon,
  chuaOnboard,
}: {
  ds: DongOnboard[];
  nhomViec: NhomViec[];
  chon: ChonOnboard;
  chuaOnboard: { id: string; full_name: string; position: string | null; status: string }[];
}) {
  const router = useRouter();
  const [dangMo, setDangMo] = useState<DongOnboard | null>(null);
  const [themAi, setThemAi] = useState("");
  const [, batDau] = useTransition();

  const tongMuc = nhomViec.reduce((s, n) => s + n.viec.length, 0);

  function them() {
    if (!themAi) return;
    batDau(async () => {
      await themOnboard(themAi);
      setThemAi("");
      router.refresh();
    });
  }

  return (
    <>
      {chuaOnboard.length > 0 && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <UserPlus className="size-4 shrink-0 text-[var(--ink-faint)]" />
            <span className="text-sm text-[var(--ink-2)]">
              Có {chuaOnboard.length} ứng viên đã nhận việc nhưng chưa có hồ sơ onboard
            </span>
            <Select
              className="ml-auto w-[260px]"
              value={themAi}
              onChange={(e) => setThemAi(e.target.value)}
              aria-label="Chọn ứng viên để thêm vào onboard"
            >
              <option value="">— chọn ứng viên —</option>
              {chuaOnboard.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} — {c.position ?? "chưa rõ vị trí"}
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={them} disabled={!themAi}>
              <Plus />
              Thêm vào onboard
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {ds.length === 0 ? (
          <TrangThaiRong
            tieuDe="Chưa có nhân sự nào onboard"
            moTa="Ứng viên đạt phỏng vấn vòng 2 sẽ tự xuất hiện ở đây. Hoặc chọn thủ công ở khung phía trên."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-left">
                  {[
                    "Nhân sự",
                    "Ngày onboard",
                    "Văn phòng",
                    "Tiến độ checklist",
                    "Mốc đánh giá tới",
                    "Trạng thái",
                  ].map((h) => (
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
                {ds.map((d) => {
                  const moc = mocSapToi(d);
                  const muc = mucCanhBao(moc);
                  const gap = muc === "qua_han" || muc === "hom_nay";
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setDangMo(d)}
                      className={cn(
                        "cursor-pointer border-b border-[var(--line)] transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]",
                        gap && "bg-[var(--danger-soft)]/30",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <AvatarChu ten={d.full_name} className="size-9" />
                          <div className="flex flex-col">
                            <span className="font-semibold text-[var(--ink)]">{d.full_name}</span>
                            <span className="text-xs text-[var(--ink-muted)]">
                              {d.position ?? "—"}
                              {d.department ? ` · ${d.department}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-3 text-[var(--ink-2)]">
                        {dinhDangNgay(d.onboard_date)}
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-2)]">{d.office ?? "—"}</td>
                      <td className="w-[200px] px-4 py-3">
                        <ThanhTienDo xong={d.so_viec_xong} tong={tongMuc} />
                      </td>
                      <td className="px-4 py-3">
                        {moc ? (
                          <div className="flex flex-col">
                            <span className="text-[var(--ink-2)]">{moc.ten}</span>
                            <span
                              className={cn(
                                "flex items-center gap-1 text-xs",
                                MAU_CANH_BAO[muc],
                              )}
                            >
                              {gap && <AlertTriangle className="size-3" />}
                              {nhanCanhBao(moc)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--ink-faint)]">xong hết</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={toneTrangThai(d.status)}>{d.status ?? "—"}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <HoSoOnboard
        dong={dangMo}
        nhomViec={nhomViec}
        chon={chon}
        onDong={() => setDangMo(null)}
      />
    </>
  );
}
