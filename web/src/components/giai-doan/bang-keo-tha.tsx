"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Archive, CalendarClock, ChevronDown, GripVertical } from "lucide-react";
import { AvatarChu, Badge } from "@/components/ui/primitives";
import { HoSoDialog } from "@/components/ung-vien/ho-so-dialog";
import type { ChonLichPV } from "@/components/ung-vien/dat-lich-pv";
import type { ChonLua } from "@/components/ung-vien/form-ung-vien";
import { doiTrangThai } from "@/app/(app)/ung-vien/actions";
import { NGAY_GIU_O_COT_DUNG } from "@/lib/giai-doan";
import { GIAI_DOAN, type GiaiDoan } from "@/lib/types";
import { dinhDangNgay, cn } from "@/lib/utils";
import type { CaPhongVan } from "@/lib/lich";
import type { UngVienRow } from "@/lib/ung-vien";

/** Kéo vào cột nào thì đặt trạng thái mặc định của cột đó */
const TRANG_THAI_MAC_DINH: Record<GiaiDoan, string> = {
  moi_ve: "Đang liên hệ",
  phong_van: "Phỏng vấn vòng 1",
  cho_quyet_dinh: "Backup",
  nhan_viec: "Chờ nhận việc",
  dung: "Loại",
};

/**
 * Cột Phỏng vấn gom cả vòng 1, vòng 2 và "PV đạt - vòng 1" vào một chỗ.
 * Không có nhãn này thì cả cột nhìn như một khối, không biết ai đang ở vòng nào.
 */
function nhanVong(trangThai: string): string | null {
  if (trangThai === "Phỏng vấn vòng 1") return "Vòng 1";
  if (trangThai === "Phỏng vấn vòng 2") return "Vòng 2";
  if (trangThai === "PV đạt - vòng 1") return "Vòng 1 đạt";
  return null;
}

const MAU_COT: Record<GiaiDoan, string> = {
  moi_ve: "border-t-[var(--n-400)]",
  phong_van: "border-t-[var(--primary)]",
  cho_quyet_dinh: "border-t-[var(--warning)]",
  nhan_viec: "border-t-[var(--success)]",
  dung: "border-t-[var(--n-500)]",
};

function The({ uv, onMo }: { uv: UngVienRow; onMo: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: uv.id });
  const vong = nhanVong(uv.status);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onMo}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onMo();
        }
      }}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 30 }
          : undefined
      }
      className={cn(
        "group flex cursor-grab flex-col gap-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--line-strong)] active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
      title={`Bấm để mở hồ sơ ${uv.full_name} · kéo để đổi giai đoạn`}
    >
      <div className="flex items-start gap-2.5">
        <AvatarChu ten={uv.full_name} className="size-8 text-xs" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-[var(--ink)]">{uv.full_name}</span>
          <span className="truncate text-xs text-[var(--ink-muted)]">{uv.position ?? "—"}</span>
        </div>
        <GripVertical className="size-3.5 shrink-0 text-[var(--ink-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {vong && <Badge tone="primary">{vong}</Badge>}
        {uv.source && <Badge tone="outline">{uv.source}</Badge>}
        {uv.so_lich_pv > 0 && (
          <span className="inline-flex items-center gap-1 text-2xs text-[var(--ink-muted)]">
            <CalendarClock className="size-3" />
            {dinhDangNgay(uv.ngay_pv_gan_nhat)}
          </span>
        )}
        <span
          className={cn(
            "tabular ml-auto text-2xs",
            uv.so_ngay_cho > 7 ? "text-[var(--warning)]" : "text-[var(--ink-faint)]",
          )}
          title={`Nhận CV ngày ${dinhDangNgay(uv.received_at)}`}
        >
          {uv.so_ngay_cho} ngày
        </span>
      </div>

      <span className="truncate text-2xs text-[var(--ink-faint)]">{uv.status}</span>
    </div>
  );
}

function Cot({
  gd,
  ten,
  ds,
  tong,
  ghiChu,
  onMo,
}: {
  gd: GiaiDoan;
  ten: string;
  ds: UngVienRow[];
  tong: number;
  /** Dòng chữ nhỏ dưới đáy cột — cột Dừng dùng để chỉ xuống khu lưu trữ */
  ghiChu?: string;
  onMo: (uv: UngVienRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: gd });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[420px] w-[280px] shrink-0 flex-col gap-2 rounded-[var(--card-radius)] border border-t-2 border-[var(--card-border)] bg-[var(--surface-2)] p-2.5 transition-colors",
        MAU_COT[gd],
        isOver && "bg-[var(--primary-soft)] ring-2 ring-[var(--primary)]/30",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-[var(--ink)]">{ten}</span>
        <span className="tabular rounded-full bg-[var(--surface)] px-2 py-0.5 text-2xs font-semibold text-[var(--ink-muted)]">
          {tong}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {ds.map((uv) => (
          <The key={uv.id} uv={uv} onMo={() => onMo(uv)} />
        ))}
        {ds.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-[var(--ink-faint)]">
            Kéo thẻ vào đây
          </p>
        )}
        {tong > ds.length && (
          <p className="px-1 py-2 text-center text-2xs text-[var(--ink-faint)]">
            còn {tong - ds.length} hồ sơ nữa, xem ở màn hình Quản lý CV
          </p>
        )}
      </div>

      {ghiChu && (
        <p className="mt-auto border-t border-[var(--line)] px-1 pt-2 text-2xs text-[var(--ink-faint)]">
          {ghiChu}
        </p>
      )}
    </div>
  );
}


/**
 * Một hàng trong khu lưu trữ — gọn hơn thẻ trên bảng vì đây là chỗ tra lại,
 * không phải chỗ theo dõi hằng ngày. Bấm vào vẫn mở đúng hộp thoại hồ sơ đó.
 */
function HangLuuTru({ uv, onMo }: { uv: UngVienRow; onMo: () => void }) {
  return (
    <button
      type="button"
      onClick={onMo}
      className="flex w-full items-center gap-2.5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-left transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface-hover)]"
      title={`Bấm để mở hồ sơ ${uv.full_name}`}
    >
      <AvatarChu ten={uv.full_name} className="size-7 text-2xs" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-[var(--ink)]">{uv.full_name}</span>
        <span className="truncate text-2xs text-[var(--ink-faint)]">
          {uv.position ?? "—"} · {uv.status}
        </span>
      </span>
      <span
        className="tabular shrink-0 text-2xs text-[var(--ink-faint)]"
        title="Ngày dừng hồ sơ"
      >
        {dinhDangNgay(uv.stopped_at)}
      </span>
    </button>
  );
}


/**
 * Khu lưu trữ dưới bảng: nơi hồ sơ ở cột Dừng rơi xuống sau
 * NGAY_GIU_O_COT_DUNG ngày, để cột Dừng không phình ra vô hạn.
 *
 * Mở sẵn cho dễ thấy nhưng khung cuộn riêng, cao tối đa một khoảng cố định —
 * dù có mấy chục hồ sơ cũng không đẩy bảng giai đoạn lên mất hút.
 */
function KhuLuuTru({
  ds,
  tong,
  onMo,
}: {
  ds: UngVienRow[];
  tong: number;
  onMo: (uv: UngVienRow) => void;
}) {
  const [mo, setMo] = useState(true);

  return (
    <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--surface-2)]">
      <button
        type="button"
        onClick={() => setMo((v) => !v)}
        aria-expanded={mo}
        className="flex w-full items-center gap-2.5 rounded-[var(--card-radius)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
      >
        <Archive className="size-4 shrink-0 text-[var(--ink-faint)]" />
        <span className="text-sm font-semibold text-[var(--ink)]">Đã dừng từ trước</span>
        <span className="tabular rounded-full bg-[var(--surface)] px-2 py-0.5 text-2xs font-semibold text-[var(--ink-muted)]">
          {tong}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1 text-2xs text-[var(--ink-faint)]">
          {mo ? "Thu gọn" : "Mở ra"}
          <ChevronDown className={cn("size-3.5 transition-transform", mo && "rotate-180")} />
        </span>
      </button>

      {mo && (
        <div className="border-t border-[var(--line)] p-2.5">
          {ds.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-[var(--ink-faint)]">
              Chưa có hồ sơ nào dừng quá {NGAY_GIU_O_COT_DUNG} ngày
            </p>
          ) : (
            <>
              <div className="grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
                {ds.map((uv) => (
                  <HangLuuTru key={uv.id} uv={uv} onMo={() => onMo(uv)} />
                ))}
              </div>
              {tong > ds.length && (
                <p className="px-1 pt-2.5 text-center text-2xs text-[var(--ink-faint)]">
                  còn {tong - ds.length} hồ sơ nữa, xem ở màn hình Quản lý CV
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

export function BangKeoTha({
  theoGiaiDoan,
  tongTheoGiaiDoan,
  chon,
  chonLichPV,
  lichTheoUV,
  banDoGiaiDoan,
  luuTru,
  tongLuuTru,
}: {
  theoGiaiDoan: Record<GiaiDoan, UngVienRow[]>;
  tongTheoGiaiDoan: Record<GiaiDoan, number>;
  chon: ChonLua;
  chonLichPV: ChonLichPV;
  lichTheoUV: Record<string, CaPhongVan[]>;
  banDoGiaiDoan: Record<string, GiaiDoan>;
  /** Hồ sơ đã dừng quá hạn, không lên bảng nữa mà nằm ở khu lưu trữ bên dưới */
  luuTru: UngVienRow[];
  tongLuuTru: number;
}) {
  const router = useRouter();
  const [, batDau] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);
  const [dangMo, setDangMo] = useState<UngVienRow | null>(null);
  // vừa kéo xong thì bỏ qua sự kiện bấm, không thì thả ra là hộp thoại bật lên
  const vuaKeo = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function moHoSo(uv: UngVienRow) {
    if (vuaKeo.current) return;
    setDangMo(uv);
  }

  function ketThucKeo(e: DragEndEvent) {
    vuaKeo.current = true;
    setTimeout(() => (vuaKeo.current = false), 120);

    const id = String(e.active.id);
    const cot = e.over?.id as GiaiDoan | undefined;
    if (!cot) return;

    const dangO = (Object.keys(theoGiaiDoan) as GiaiDoan[]).find((g) =>
      theoGiaiDoan[g].some((u) => u.id === id),
    );
    if (dangO === cot) return;

    // Kéo về cột Phỏng vấn: người đã đạt vòng 1 thì vào vòng 2, không tụt lại vòng 1.
    // Hay gặp khi lấy lại một hồ sơ Backup để phỏng vấn tiếp.
    const uv = (Object.values(theoGiaiDoan).flat() as UngVienRow[]).find((u) => u.id === id);
    const trangThaiMoi =
      cot === "phong_van" && uv?.kq_pv1 === "Đạt"
        ? "Phỏng vấn vòng 2"
        : TRANG_THAI_MAC_DINH[cot];

    batDau(async () => {
      const kq = await doiTrangThai(id, trangThaiMoi);
      if (kq.ok) router.refresh();
      else setLoi(kq.loi ?? "Không đổi được trạng thái");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {loi && (
        <p className="rounded-[var(--r-sm)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-soft-fg)]">
          {loi}
        </p>
      )}

      <DndContext sensors={sensors} onDragEnd={ketThucKeo}>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {GIAI_DOAN.map(({ key, ten }) => (
            <Cot
              key={key}
              gd={key}
              ten={ten}
              ds={theoGiaiDoan[key] ?? []}
              tong={tongTheoGiaiDoan[key] ?? 0}
              ghiChu={
                key === "dung" && tongLuuTru > 0
                  ? `${tongLuuTru} hồ sơ dừng lâu hơn nằm ở khu lưu trữ bên dưới`
                  : undefined
              }
              onMo={moHoSo}
            />
          ))}
        </div>
      </DndContext>

      <KhuLuuTru ds={luuTru} tong={tongLuuTru} onMo={moHoSo} />

      <HoSoDialog
        dangMo={dangMo}
        onDong={() => setDangMo(null)}
        chon={chon}
        chonLichPV={chonLichPV}
        lichTheoUV={lichTheoUV}
        banDoGiaiDoan={banDoGiaiDoan}
      />

      <p className="max-w-4xl text-xs text-[var(--ink-faint)]">
        Mỗi cột gom nhiều trạng thái CV — cột <b className="font-semibold">Phỏng vấn</b> chứa cả
        vòng 1 và vòng 2, nhãn trên thẻ cho biết từng người đang ở vòng nào. Kéo thẻ sang cột khác
        là trạng thái đổi theo: cột Phỏng vấn đặt thành “Phỏng vấn vòng 1”, riêng người đã đạt vòng
        1 thì thành “Phỏng vấn vòng 2”; cột Nhận việc thành “Chờ nhận việc”; cột Dừng thành “Loại”.
        Cần đặt trạng thái khác thì mở hồ sơ rồi chọn trong ô Trạng thái CV.
      </p>

      <p className="max-w-4xl text-xs text-[var(--ink-faint)]">
        Cột <b className="font-semibold">Dừng</b> chỉ giữ hồ sơ vừa dừng trong{" "}
        {NGAY_GIU_O_COT_DUNG} ngày; quá hạn thì tự xuống khu{" "}
        <b className="font-semibold">Đã dừng từ trước</b> ngay dưới bảng — bấm vào hàng nào cũng mở
        được hồ sơ như thẻ trên bảng. Muốn gọi lại một ứng viên đã lưu trữ thì mở hồ sơ rồi đổi ô
        Trạng thái CV sang trạng thái khác, thẻ sẽ quay lại đúng cột của nó.
      </p>
    </div>
  );
}
