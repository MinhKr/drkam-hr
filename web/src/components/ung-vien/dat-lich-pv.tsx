"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Input, Select, Truong } from "@/components/ui/primitives";
import { luuLichPV, nhapKetQua } from "@/app/(app)/lich-phong-van/actions";
import type { CaPhongVan } from "@/lib/lich";

export type ChonLichPV = {
  nguoi_pv: string[];
  hinh_thuc: string[];
  ket_qua: string[];
};

function MotVong({
  candidateId,
  vong,
  ca,
  chon,
}: {
  candidateId: string;
  vong: 1 | 2;
  ca?: CaPhongVan;
  chon: ChonLichPV;
}) {
  const router = useRouter();
  const [dangLuu, batDau] = useTransition();
  const [daLuu, setDaLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const [ngay, setNgay] = useState(ca?.scheduled_date ?? "");
  const [gio, setGio] = useState((ca?.scheduled_time ?? "").slice(0, 5));
  const [hinhThuc, setHinhThuc] = useState(ca?.mode ?? "");
  const [nguoi, setNguoi] = useState<string[]>(ca?.interviewers ?? []);
  const [ketQua, setKetQua] = useState(ca?.result ?? "");

  function doiNguoi(ten: string) {
    setNguoi((cu) => (cu.includes(ten) ? cu.filter((x) => x !== ten) : [...cu, ten]));
  }

  function luu() {
    setLoi(null);
    batDau(async () => {
      const kq = await luuLichPV({
        candidate_id: candidateId,
        round: vong,
        scheduled_date: ngay || null,
        scheduled_time: gio ? `${gio}:00` : null,
        mode: hinhThuc || null,
        interviewers: nguoi,
      });
      if (!kq.ok) return setLoi(kq.loi ?? "Không lưu được lịch");

      // Lưu kết quả sau khi đã có bản ghi lịch
      if (ca && ketQua !== (ca.result ?? "")) {
        await nhapKetQua(ca.id, ketQua || null);
      }
      setDaLuu(true);
      setTimeout(() => setDaLuu(false), 2000);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface-2)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[var(--ink)]">Phỏng vấn vòng {vong}</h4>
        {ca?.result && <Badge tone={ca.result === "Đạt" ? "success" : "neutral"}>{ca.result}</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Truong nhan="Ngày">
          <Input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
        </Truong>
        <Truong nhan="Giờ" goiY="Giờ lẻ cũng được, lịch tuần tự xếp vào khung gần nhất">
          <Input type="time" value={gio} onChange={(e) => setGio(e.target.value)} />
        </Truong>
        <Truong nhan="Hình thức">
          <Select value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value)}>
            <option value="">— chọn —</option>
            {chon.hinh_thuc.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Truong>
        <Truong nhan="Kết quả" goiY={ca ? undefined : "Lưu lịch xong mới nhập được kết quả"}>
          <Select
            value={ketQua}
            onChange={(e) => setKetQua(e.target.value)}
            disabled={!ca}
          >
            <option value="">— chưa có —</option>
            {chon.ket_qua.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Truong>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--ink-2)]">Người phỏng vấn</span>
        <div className="flex flex-wrap gap-1.5">
          {chon.nguoi_pv.map((ten) => {
            const chonRoi = nguoi.includes(ten);
            return (
              <button
                key={ten}
                type="button"
                onClick={() => doiNguoi(ten)}
                aria-pressed={chonRoi}
                className={
                  chonRoi
                    ? "rounded-full bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-[var(--primary-fg)]"
                    : "rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-hover)]"
                }
              >
                {ten}
              </button>
            );
          })}
        </div>
      </div>

      {loi && <p className="text-sm text-[var(--danger)]">{loi}</p>}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={luu} disabled={dangLuu}>
          {dangLuu ? <Loader2 className="animate-spin" /> : daLuu ? <Check /> : <CalendarPlus />}
          {daLuu ? "Đã lưu" : ca ? "Cập nhật lịch" : "Đặt lịch"}
        </Button>
        {ca?.result === "Đạt" && vong === 1 && (
          <span className="text-xs text-[var(--success)]">
            Đạt vòng 1 — đặt tiếp lịch vòng 2 bên dưới
          </span>
        )}
        {ca?.result === "Đạt" && vong === 2 && (
          <span className="text-xs text-[var(--success)]">
            Đạt vòng 2 — hệ thống đã tạo sẵn hồ sơ onboard
          </span>
        )}
      </div>
    </div>
  );
}

export function DatLichPV({
  candidateId,
  lich,
  chon,
}: {
  candidateId: string;
  lich: CaPhongVan[];
  chon: ChonLichPV;
}) {
  return (
    <div className="flex flex-col gap-3">
      <MotVong
        candidateId={candidateId}
        vong={1}
        ca={lich.find((c) => c.round === 1)}
        chon={chon}
      />
      <MotVong
        candidateId={candidateId}
        vong={2}
        ca={lich.find((c) => c.round === 2)}
        chon={chon}
      />
      <p className="text-xs text-[var(--ink-faint)]">
        Nhập kết quả xong, trạng thái CV tự đổi theo: đạt vòng 1 thì chuyển “PV đạt - vòng 1”, đạt
        vòng 2 thì chuyển “Chờ nhận việc” và tạo sẵn dòng onboard.
      </p>
    </div>
  );
}
