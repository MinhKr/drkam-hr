import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { DanhSachPV } from "@/components/phong-van/danh-sach-pv";
import { LichTuan } from "@/components/phong-van/lich-tuan";
import { Card, CardBody } from "@/components/ui/primitives";
import { layGiaTri } from "@/lib/danh-muc";
import {
  layDanhSachPV,
  layLichTuan,
  ngayISO,
  themNgay,
  thuHaiCuaTuan,
  timTrungLich,
} from "@/lib/phong-van";
import { cn } from "@/lib/utils";

export const metadata = { title: "Lịch phỏng vấn" };

type Params = Record<string, string | string[] | undefined>;

function lay(sp: Params, khoa: string) {
  const v = sp[khoa];
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function TrangLichPhongVan(props: { searchParams: Promise<Params> }) {
  const sp = await props.searchParams;
  const cheDo = lay(sp, "che_do") === "danh-sach" ? "danh-sach" : "tuan";
  const vong = lay(sp, "vong") === "2" ? 2 : 1;

  const moc = lay(sp, "tuan") ? new Date(lay(sp, "tuan")!) : new Date();
  const thuHai = thuHaiCuaTuan(Number.isNaN(moc.getTime()) ? new Date() : moc);
  const ngayTrongTuan = Array.from({ length: 7 }, (_, i) => ngayISO(themNgay(thuHai, i)));

  const ketQuaChon = await layGiaTri("interview_result");

  const duLieu =
    cheDo === "tuan"
      ? await layLichTuan(ngayTrongTuan[0], ngayTrongTuan[6])
      : await layDanhSachPV(vong as 1 | 2);

  const idTrung = Array.from(timTrungLich(duLieu.ca));

  function duongDan(thayDoi: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string" && v) p.set(k, v);
    }
    for (const [k, v] of Object.entries(thayDoi)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `/lich-phong-van?${s}` : "/lich-phong-van";
  }

  const nhanTuan = `${ngayTrongTuan[0].slice(8, 10)}/${ngayTrongTuan[0].slice(5, 7)} – ${ngayTrongTuan[6].slice(8, 10)}/${ngayTrongTuan[6].slice(5, 7)}/${ngayTrongTuan[6].slice(0, 4)}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">Lịch phỏng vấn</h1>
          <p className="mt-1 text-base text-[var(--ink-muted)]">
            Thay cho sheet <span className="font-medium text-[var(--ink-2)]">LỊCH PV</span> — đặt
            lịch trong hồ sơ ứng viên, lịch tự hiện ở đây.
          </p>
        </div>

        {/* chuyển chế độ xem */}
        <div className="flex items-center gap-1 rounded-[var(--r-sm)] border border-[var(--line-strong)] p-0.5">
          <Link
            href={duongDan({ che_do: undefined })}
            className={cn(
              "flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors",
              cheDo === "tuan"
                ? "bg-[var(--primary)] text-[var(--primary-fg)]"
                : "text-[var(--ink-2)] hover:bg-[var(--surface-hover)]",
            )}
          >
            <CalendarDays className="size-4" />
            Lịch tuần
          </Link>
          <Link
            href={duongDan({ che_do: "danh-sach" })}
            className={cn(
              "flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors",
              cheDo === "danh-sach"
                ? "bg-[var(--primary)] text-[var(--primary-fg)]"
                : "text-[var(--ink-2)] hover:bg-[var(--surface-hover)]",
            )}
          >
            <List className="size-4" />
            Danh sách
          </Link>
        </div>
      </div>

      {duLieu.loi && (
        <Card className="border-[var(--danger)]">
          <CardBody className="pt-5">
            <p className="text-base font-medium text-[var(--ink)]">Không đọc được lịch phỏng vấn</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {duLieu.loi}. Nếu báo <span className="code">v_lich_pv</span> không tồn tại thì chạy
              file <span className="code">web/supabase/migrations/0005_view_lich_pv.sql</span> trong
              Supabase SQL Editor.
            </p>
          </CardBody>
        </Card>
      )}

      {cheDo === "tuan" ? (
        <>
          <div className="flex items-center gap-2">
            <Link
              href={duongDan({ tuan: ngayISO(themNgay(thuHai, -7)) })}
              className="grid size-9 place-items-center rounded-[var(--r-sm)] border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface-hover)]"
              aria-label="Tuần trước"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={duongDan({ tuan: ngayISO(themNgay(thuHai, 7)) })}
              className="grid size-9 place-items-center rounded-[var(--r-sm)] border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface-hover)]"
              aria-label="Tuần sau"
            >
              <ChevronRight className="size-4" />
            </Link>
            <Link
              href={duongDan({ tuan: undefined })}
              className="rounded-[var(--r-sm)] border border-[var(--line-strong)] px-3 py-1.5 text-sm font-medium text-[var(--ink-2)] hover:bg-[var(--surface-hover)]"
            >
              Tuần này
            </Link>
            <span className="tabular ml-2 text-md font-semibold text-[var(--ink)]">{nhanTuan}</span>
            <span className="tabular ml-auto text-sm text-[var(--ink-muted)]">
              {duLieu.ca.length} ca
              {idTrung.length > 0 && (
                <span className="ml-2 text-[var(--danger)]">· {idTrung.length} ca trùng giờ</span>
              )}
            </span>
          </div>

          <LichTuan ca={duLieu.ca} ngayTrongTuan={ngayTrongTuan} idTrung={idTrung} />
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {[1, 2].map((v) => (
              <Link
                key={v}
                href={duongDan({ che_do: "danh-sach", vong: String(v) })}
                className={cn(
                  "rounded-[var(--r-sm)] border px-3 py-1.5 text-sm font-medium transition-colors",
                  vong === v
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-fg)]"
                    : "border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface-hover)]",
                )}
              >
                Phỏng vấn vòng {v}
              </Link>
            ))}
            <span className="tabular ml-auto text-sm text-[var(--ink-muted)]">
              {duLieu.ca.length} ca
            </span>
          </div>

          <DanhSachPV
            ca={duLieu.ca}
            vong={vong as 1 | 2}
            ketQuaChon={ketQuaChon}
            idTrung={idTrung}
          />
        </>
      )}
    </div>
  );
}
