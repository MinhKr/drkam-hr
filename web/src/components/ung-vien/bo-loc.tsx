"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type NhomChon = {
  vi_tri: string[];
  phong_ban: string[];
  trang_thai: string[];
  nguon: string[];
  nguoi_sang_loc: string[];
  khu_vuc: string[];
};

const O_CHON: { khoa: keyof NhomChon; nhan: string }[] = [
  { khoa: "vi_tri", nhan: "Vị trí" },
  { khoa: "trang_thai", nhan: "Trạng thái" },
  { khoa: "nguon", nhan: "Nguồn CV" },
  { khoa: "phong_ban", nhan: "Phòng ban" },
  { khoa: "nguoi_sang_loc", nhan: "Người sàng lọc" },
  { khoa: "khu_vuc", nhan: "Khu vực" },
];

export function BoLoc({ nhom, tong }: { nhom: NhomChon; tong: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [dangChay, batDau] = useTransition();
  const [tuKhoa, setTuKhoa] = useState(sp.get("q") ?? "");
  const lanDau = useRef(true);

  function dat(thayDoi: Record<string, string | null>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(thayDoi)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.delete("trang"); // đổi bộ lọc thì về trang 1
    batDau(() => router.push(`${pathname}?${p.toString()}`));
  }

  // gõ xong 400ms mới tìm, tránh gọi máy chủ mỗi ký tự
  useEffect(() => {
    if (lanDau.current) {
      lanDau.current = false;
      return;
    }
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== tuKhoa) dat({ q: tuKhoa || null });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tuKhoa]);

  const dangLoc = Array.from(sp.keys()).some((k) => k !== "trang" && k !== "uv");

  // xuất hết những dòng khớp bộ lọc, không phải chỉ trang đang xem
  const duongDanXuat = (() => {
    const p = new URLSearchParams(sp.toString());
    p.delete("trang");
    p.delete("uv");
    const s = p.toString();
    return s ? `/ung-vien/xuat?${s}` : "/ung-vien/xuat";
  })();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
      <span className="shrink-0 pl-1 pr-1 text-sm font-medium text-[var(--ink-muted)]">
        Bộ lọc:
      </span>

      <div className="relative min-w-[240px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-faint)]" />
        <Input
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
          placeholder="Tìm tên không dấu, email, số điện thoại…"
          className="pl-9"
          aria-label="Tìm ứng viên"
        />
      </div>

      {O_CHON.map(({ khoa, nhan }) => (
        <Select
          key={khoa}
          aria-label={nhan}
          value={sp.get(khoa) ?? ""}
          onChange={(e) => dat({ [khoa]: e.target.value || null })}
          className="w-auto min-w-[130px] max-w-[190px]"
        >
          <option value="">{nhan}: tất cả</option>
          {nhom[khoa].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      ))}

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          aria-label="Từ ngày"
          className="w-[145px]"
          value={sp.get("tu_ngay") ?? ""}
          onChange={(e) => dat({ tu_ngay: e.target.value || null })}
        />
        <span className="text-sm text-[var(--ink-faint)]">→</span>
        <Input
          type="date"
          aria-label="Đến ngày"
          className="w-[145px]"
          value={sp.get("den_ngay") ?? ""}
          onChange={(e) => dat({ den_ngay: e.target.value || null })}
        />
      </div>

      <Button
        asChild
        variant="outline"
        size="sm"
        className={cn(tong === 0 && "pointer-events-none opacity-40")}
      >
        <a
          href={duongDanXuat}
          title={
            dangLoc
              ? `Tải ${tong.toLocaleString("vi-VN")} dòng đang lọc thành file Excel`
              : `Tải toàn bộ ${tong.toLocaleString("vi-VN")} ứng viên thành file Excel`
          }
        >
          <Download />
          Xuất Excel
          <span className="tabular text-[var(--ink-muted)]">{tong.toLocaleString("vi-VN")}</span>
        </a>
      </Button>

      {dangLoc && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setTuKhoa("");
            batDau(() => router.push(pathname));
          }}
        >
          <RotateCcw />
          Đặt lại
        </Button>
      )}

      {dangChay && <span className="text-xs text-[var(--ink-faint)]">đang lọc…</span>}
    </div>
  );
}
