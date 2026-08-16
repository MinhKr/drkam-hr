"use client";

import { useState, useTransition } from "react";
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
import { AlertTriangle, GripVertical, Video } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { doiLich } from "@/app/(app)/lich-phong-van/actions";
import { KHUNG_GIO, TEN_THU, type CaPhongVan } from "@/lib/lich";
import { cn } from "@/lib/utils";

const CAO_O = 46; // chiều cao một khung 30 phút

function gioNgan(t: string | null) {
  return (t ?? "").slice(0, 5);
}

/**
 * Ca đặt lúc 09:50 vẫn phải hiện, nên dồn về ô 30 phút gần nhất phía trước.
 * Ca ngoài khung 8:00–18:30 thì kẹp vào ô đầu hoặc ô cuối để không bị mất.
 */
function oCuaCa(t: string | null) {
  const [h, m] = gioNgan(t).split(":").map(Number);
  // dùng isFinite chứ không isNaN: ca chưa điền giờ thì m là undefined,
  // mà Number.isNaN(undefined) lại trả về false
  if (!Number.isFinite(h) || !Number.isFinite(m)) return KHUNG_GIO[0];
  const phut = h * 60 + m;
  const dau = 8 * 60;
  const cuoi = 18 * 60 + 30;
  if (phut < dau) return KHUNG_GIO[0];
  if (phut > cuoi) return KHUNG_GIO[KHUNG_GIO.length - 1];
  const don = Math.floor((phut - dau) / 30) * 30 + dau;
  return `${String(Math.floor(don / 60)).padStart(2, "0")}:${String(don % 60).padStart(2, "0")}`;
}

function TheCa({
  ca,
  trung,
  dangKeo,
}: {
  ca: CaPhongVan;
  trung: boolean;
  dangKeo?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ca.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 30 }
          : undefined
      }
      className={cn(
        "group relative flex cursor-grab flex-col gap-0.5 rounded-[var(--r-sm)] border px-2 py-1.5 text-left shadow-[var(--shadow-xs)] active:cursor-grabbing",
        ca.round === 1
          ? "border-[var(--primary)]/25 bg-[var(--primary-soft)]"
          : "border-[var(--secondary)]/25 bg-[var(--secondary-soft)]",
        trung && "ring-2 ring-[var(--danger)]",
        (isDragging || dangKeo) && "opacity-60",
      )}
      title={`${ca.full_name} · ${ca.position ?? ""} · ${ca.interviewers.join(", ")}`}
    >
      <span className="flex items-center gap-1">
        <GripVertical className="size-3 shrink-0 text-[var(--ink-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
        <span className="tabular text-2xs font-semibold text-[var(--ink-2)]">
          {gioNgan(ca.scheduled_time)}
        </span>
        <span className="text-2xs font-semibold text-[var(--ink-faint)]">V{ca.round}</span>
        {trung && <AlertTriangle className="size-3 text-[var(--danger)]" />}
      </span>
      <span className="truncate text-xs font-semibold text-[var(--ink)]">{ca.full_name}</span>
      <span className="truncate text-2xs text-[var(--ink-muted)]">
        {ca.position ?? "—"}
      </span>
      {ca.interviewers.length > 0 && (
        <span className="truncate text-2xs text-[var(--ink-faint)]">
          {ca.interviewers.join(", ")}
        </span>
      )}
      {ca.mode?.startsWith("Online") && (
        <Video className="absolute right-1.5 top-1.5 size-3 text-[var(--ink-faint)]" />
      )}
    </div>
  );
}

function OTha({
  ngay,
  gio,
  children,
}: {
  ngay: string;
  gio: string;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${ngay}|${gio}` });
  return (
    <div
      ref={setNodeRef}
      style={{ minHeight: CAO_O }}
      className={cn(
        "border-b border-r border-[var(--line)] p-1 transition-colors",
        isOver && "bg-[var(--primary-soft)]",
      )}
    >
      {children}
    </div>
  );
}

export function LichTuan({
  ca,
  ngayTrongTuan,
  idTrung,
}: {
  ca: CaPhongVan[];
  ngayTrongTuan: string[];
  idTrung: string[];
}) {
  const router = useRouter();
  const [, batDau] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);
  const trung = new Set(idTrung);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function ketThucKeo(e: DragEndEvent) {
    const id = String(e.active.id);
    const dich = e.over?.id ? String(e.over.id) : null;
    if (!dich) return;
    const [ngay, gio] = dich.split("|");

    const hienTai = ca.find((c) => c.id === id);
    if (hienTai?.scheduled_date === ngay && oCuaCa(hienTai.scheduled_time) === gio) return;

    batDau(async () => {
      const kq = await doiLich(id, ngay, `${gio}:00`);
      if (kq.ok) router.refresh();
      else setLoi(kq.loi ?? "Không đổi được lịch");
    });
  }

  const homNay = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-3">
      {loi && (
        <p className="rounded-[var(--r-sm)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-soft-fg)]">
          {loi}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--ink-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-[var(--primary)]/25 bg-[var(--primary-soft)]" />
          Vòng 1
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-[var(--secondary)]/25 bg-[var(--secondary-soft)]" />
          Vòng 2
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 text-[var(--danger)]" />
          Người phỏng vấn bị trùng giờ
        </span>
        <span className="ml-auto">Kéo thẻ sang ô khác để đổi ngày giờ</span>
      </div>

      <div className="overflow-x-auto rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
        <DndContext sensors={sensors} onDragEnd={ketThucKeo}>
          <div className="min-w-[900px]">
            {/* hàng tiêu đề */}
            <div
              className="sticky top-0 z-10 grid border-b border-[var(--line)] bg-[var(--surface-2)]"
              style={{ gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))` }}
            >
              <div className="border-r border-[var(--line)] px-2 py-2 text-2xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                Giờ
              </div>
              {ngayTrongTuan.map((n, i) => (
                <div
                  key={n}
                  className={cn(
                    "border-r border-[var(--line)] px-2 py-2 text-center last:border-r-0",
                    n === homNay && "bg-[var(--primary-soft)]",
                  )}
                >
                  <div className="text-xs font-semibold text-[var(--ink)]">{TEN_THU[i]}</div>
                  <div className="tabular text-2xs text-[var(--ink-muted)]">
                    {n.slice(8, 10)}/{n.slice(5, 7)}
                  </div>
                </div>
              ))}
            </div>

            {/* lưới giờ */}
            {KHUNG_GIO.map((gio) => (
              <div
                key={gio}
                className="grid"
                style={{ gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))` }}
              >
                <div className="border-b border-r border-[var(--line)] px-2 py-1 text-right">
                  <span className="tabular text-2xs text-[var(--ink-faint)]">{gio}</span>
                </div>
                {ngayTrongTuan.map((ngay) => {
                  const trongO = ca.filter(
                    (c) => c.scheduled_date === ngay && oCuaCa(c.scheduled_time) === gio,
                  );
                  return (
                    <OTha key={ngay + gio} ngay={ngay} gio={gio}>
                      <div className="flex flex-col gap-1">
                        {trongO.map((c) => (
                          <TheCa key={c.id} ca={c} trung={trung.has(c.id)} />
                        ))}
                      </div>
                    </OTha>
                  );
                })}
              </div>
            ))}
          </div>
        </DndContext>
      </div>

      {ca.length === 0 && (
        <p className="py-6 text-center text-sm text-[var(--ink-muted)]">
          Tuần này chưa có ca phỏng vấn nào. Đặt lịch trong hồ sơ ứng viên ở màn hình{" "}
          <Badge tone="outline">Quản lý CV</Badge>.
        </p>
      )}
    </div>
  );
}
