"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CircleAlert,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Truong,
} from "@/components/ui/primitives";
import {
  anHienDanhMuc,
  sapXepDanhMuc,
  suaDanhMuc,
  themDanhMuc,
  xoaDanhMuc,
} from "@/app/(app)/danh-muc/actions";
import { GIAI_DOAN, type DanhMucQuanLy } from "@/lib/types";
import { cn } from "@/lib/utils";

export type NhomDanhMuc = {
  loai: string;
  nhan: string;
  /** Lý do không cho sửa; null nghĩa là sửa thoải mái */
  khoa: string | null;
  choDung: string;
  muc: DanhMucQuanLy[];
};

/**
 * Không chỗ nào gọi router.refresh() sau khi lưu: mọi Server Action ở đây
 * đều gọi revalidatePath, mà Next dựng lại trang ngay trong lượt trả về của
 * chính action đó — thêm refresh chỉ là một vòng gọi máy chủ thừa.
 */

/** Hộp thoại đang mở: thêm mới (dong = null) hay sửa một dòng */
type DangMo = { nhom: NhomDanhMuc; dong: DanhMucQuanLy | null };

export function QuanLyDanhMuc({
  nhom,
  phongBan,
  capBac,
}: {
  nhom: NhomDanhMuc[];
  phongBan: string[];
  capBac: string[];
}) {
  const [mo, datMo] = useState<DangMo | null>(null);
  const [xoa, datXoa] = useState<{ nhom: NhomDanhMuc; dong: DanhMucQuanLy } | null>(null);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {nhom.map((n) => (
          <TheDanhMuc
            key={n.loai}
            nhom={n}
            themMoi={() => datMo({ nhom: n, dong: null })}
            sua={(dong) => datMo({ nhom: n, dong })}
            xoa={(dong) => datXoa({ nhom: n, dong })}
          />
        ))}
      </div>

      {mo && (
        <HopThoaiSua
          key={mo.dong?.id ?? `them-${mo.nhom.loai}`}
          dangMo={mo}
          phongBan={phongBan}
          capBac={capBac}
          dong={() => datMo(null)}
        />
      )}

      {xoa && (
        <HopThoaiXoa
          key={xoa.dong.id}
          nhom={xoa.nhom}
          dong={xoa.dong}
          dongLai={() => datXoa(null)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ thẻ */

function TheDanhMuc({
  nhom,
  themMoi,
  sua,
  xoa,
}: {
  nhom: NhomDanhMuc;
  themMoi: () => void;
  sua: (d: DanhMucQuanLy) => void;
  xoa: (d: DanhMucQuanLy) => void;
}) {
  /**
   * Thứ tự giữ ở state để thả ra là thấy đổi ngay, không phải chờ máy chủ.
   * Ghi không được thì trả về đúng dãy trước khi kéo.
   */
  const [ds, datDs] = useState(nhom.muc);
  const [mucTruoc, datMucTruoc] = useState(nhom.muc);
  const [loiXep, datLoiXep] = useState<string | null>(null);
  const [dangXep, xep] = useTransition();

  // Máy chủ gửi dữ liệu mới (vừa thêm, xoá hay sửa một dòng) thì lấy lại theo
  // nó. So sánh tham chiếu: props chỉ đổi khi trang thật sự được dựng lại.
  if (mucTruoc !== nhom.muc) {
    datMucTruoc(nhom.muc);
    datDs(nhom.muc);
  }

  const sensors = useSensors(
    // đi được 5px mới tính là kéo, không thì bấm nút trên dòng cũng thành kéo
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function ketThucKeo(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const tu = ds.findIndex((m) => m.id === active.id);
    const toi = ds.findIndex((m) => m.id === over.id);
    if (tu < 0 || toi < 0) return;

    const truoc = ds;
    const moi = arrayMove(ds, tu, toi);
    datDs(moi);
    datLoiXep(null);

    xep(async () => {
      const kq = await sapXepDanhMuc(
        nhom.loai,
        moi.map((m) => m.id as string),
      );
      if (!kq.ok) {
        datDs(truoc);
        datLoiXep(kq.loi ?? "Không lưu được thứ tự");
      }
    });
  }

  const dangHien = ds.filter((m) => m.active !== false).length;
  const soAn = ds.length - dangHien;

  const dsDong = ds.map((m) =>
    nhom.khoa ? (
      <Dong key={m.id ?? m.value} nhom={nhom} dong={m} sua={sua} xoa={xoa} />
    ) : (
      <DongKeo key={m.id} nhom={nhom} dong={m} sua={sua} xoa={xoa} />
    ),
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="border-b border-[var(--line)]">
        <div className="flex min-w-0 flex-col">
          <CardTitle className="flex items-center gap-1.5">
            {nhom.nhan}
            {nhom.khoa && (
              <Lock className="size-3.5 shrink-0 text-[var(--ink-faint)]" aria-label="Chỉ xem" />
            )}
          </CardTitle>
          <span className="text-2xs uppercase tracking-[0.1em] text-[var(--ink-faint)]">
            {nhom.loai}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge tone="neutral" className="tabular">
            {dangHien}
            {soAn > 0 && <span className="text-[var(--ink-faint)]"> +{soAn} ẩn</span>}
          </Badge>
          {!nhom.khoa && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={themMoi}
              title={`Thêm giá trị vào ${nhom.nhan}`}
              aria-label={`Thêm giá trị vào ${nhom.nhan}`}
            >
              <Plus />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardBody className="max-h-[280px] overflow-y-auto pt-3">
        {nhom.khoa && (
          <p className="mb-3 flex gap-1.5 rounded-[var(--r-sm)] bg-[var(--surface-2)] px-2.5 py-2 text-xs text-[var(--ink-muted)]">
            <Lock className="mt-px size-3.5 shrink-0" />
            <span>{nhom.khoa}</span>
          </p>
        )}

        {loiXep && (
          <p className="mb-2 flex gap-1.5 rounded-[var(--r-sm)] bg-[var(--danger-soft)] px-2.5 py-2 text-xs text-[var(--danger-soft-fg)]">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            <span>{loiXep}</span>
          </p>
        )}

        {nhom.khoa ? (
          <ul className="flex flex-col">{dsDong}</ul>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={ketThucKeo}>
            <SortableContext
              items={ds.map((m) => m.id as string)}
              strategy={verticalListSortingStrategy}
            >
              <ul className={cn("flex flex-col", dangXep && "opacity-70")}>{dsDong}</ul>
            </SortableContext>
          </DndContext>
        )}
      </CardBody>
    </Card>
  );
}

/** Phần kéo thả của một dòng — chỉ dùng được bên trong SortableContext */
type TayKeo = {
  ref: (n: HTMLElement | null) => void;
  style: React.CSSProperties;
  dangKeo: boolean;
  tay: React.HTMLAttributes<HTMLElement>;
};

function DongKeo(props: {
  nhom: NhomDanhMuc;
  dong: DanhMucQuanLy;
  sua: (d: DanhMucQuanLy) => void;
  xoa: (d: DanhMucQuanLy) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.dong.id as string,
  });

  return (
    <Dong
      {...props}
      keo={{
        ref: setNodeRef,
        // Translate chứ không phải Transform: danh sách dọc không cần co giãn,
        // dùng Transform là dòng bị bóp méo khi các dòng cao thấp khác nhau.
        style: { transform: CSS.Translate.toString(transform), transition },
        dangKeo: isDragging,
        tay: { ...attributes, ...listeners } as React.HTMLAttributes<HTMLElement>,
      }}
    />
  );
}

function Dong({
  nhom,
  dong,
  sua,
  xoa,
  keo,
}: {
  nhom: NhomDanhMuc;
  dong: DanhMucQuanLy;
  sua: (d: DanhMucQuanLy) => void;
  xoa: (d: DanhMucQuanLy) => void;
  keo?: TayKeo;
}) {
  const [dangChay, chay] = useTransition();
  const [loi, datLoi] = useState<string | null>(null);
  const an = dong.active === false;

  function goi(viec: () => Promise<{ ok: boolean; loi?: string }>) {
    datLoi(null);
    chay(async () => {
      const kq = await viec();
      if (!kq.ok) {
        datLoi(kq.loi ?? "Không thực hiện được");
        return;
      }
    });
  }

  return (
    <li
      ref={keo?.ref}
      style={keo?.style}
      className={cn("flex flex-col", keo?.dangKeo && "relative z-10")}
    >
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-[var(--r-sm)] py-1 pl-0.5 text-sm",
          "hover:bg-[var(--surface-2)]",
          keo?.dangKeo && "bg-[var(--surface-2)] shadow-[var(--shadow-lg)]",
          dangChay && "opacity-50",
        )}
      >
        {keo ? (
          <button
            type="button"
            {...keo.tay}
            title="Kéo để đổi thứ tự trong ô chọn"
            aria-label={`Kéo để đổi thứ tự của ${dong.value}`}
            className={cn(
              "grid size-5 shrink-0 cursor-grab touch-none place-items-center rounded-[var(--r-sm)]",
              "text-[var(--ink-faint)] opacity-40 transition-opacity",
              "group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing",
            )}
          >
            <GripVertical className="size-3.5" />
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}

        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            an ? "text-[var(--ink-faint)] line-through" : "text-[var(--ink-2)]",
          )}
        >
          {dong.value}
        </span>

        {an && <Badge tone="neutral">ẩn</Badge>}

        {(dong.meta?.department || dong.meta?.stage) && (
          <span className="shrink-0 text-xs text-[var(--ink-faint)]">
            {dong.meta.department
              ? `${dong.meta.department} · ${dong.meta.level ?? ""}`
              : dong.meta.stage}
          </span>
        )}

        {/* số hồ sơ đang dùng — null nghĩa là chưa chạy 0010 nên chưa đếm được */}
        {dong.so_dung !== null && dong.so_dung > 0 && (
          <span
            className="shrink-0 tabular text-xs text-[var(--ink-faint)]"
            title={`${dong.so_dung} hồ sơ đang dùng giá trị này`}
          >
            {dong.so_dung}
          </span>
        )}

        {nhom.khoa ? null : dangChay ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--ink-faint)]" />
        ) : (
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
                aria-label={`Thao tác với ${dong.value}`}
              >
                <MoreVertical />
              </Button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content
                align="end"
                sideOffset={4}
                className="z-50 min-w-[180px] rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow-lg)]"
              >
                <MucMenu onSelect={() => sua(dong)} Icon={Pencil}>
                  Sửa
                </MucMenu>
                <Menu.Separator className="my-1 h-px bg-[var(--line)]" />
                <MucMenu
                  onSelect={() => goi(() => anHienDanhMuc(dong.id as string, an))}
                  Icon={an ? Eye : EyeOff}
                >
                  {an ? "Hiện lại" : "Ẩn khỏi ô chọn"}
                </MucMenu>
                <MucMenu onSelect={() => xoa(dong)} Icon={Trash2} nguyHiem>
                  Xoá hẳn
                </MucMenu>
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        )}
      </div>

      {loi && (
        <p className="flex gap-1.5 px-1.5 pb-1 text-xs text-[var(--danger-soft-fg)]">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span>{loi}</span>
        </p>
      )}
    </li>
  );
}

function MucMenu({
  onSelect,
  Icon,
  nguyHiem,
  children,
}: {
  onSelect: () => void;
  Icon: typeof Pencil;
  nguyHiem?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Menu.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-[var(--r-sm)] px-2 py-1.5 text-sm outline-none",
        "data-[highlighted]:bg-[var(--surface-2)]",
        nguyHiem ? "text-[var(--danger)]" : "text-[var(--ink-2)]",
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {children}
    </Menu.Item>
  );
}

/* ------------------------------------------------------- hộp thoại sửa */

function HopThoaiSua({
  dangMo,
  phongBan,
  capBac,
  dong,
}: {
  dangMo: DangMo;
  phongBan: string[];
  capBac: string[];
  dong: () => void;
}) {
  const { nhom, dong: cu } = dangMo;
  const themMoi = cu === null;
  const [loi, datLoi] = useState<string | null>(null);
  const [dangChay, chay] = useTransition();

  const soDung = cu?.so_dung ?? 0;

  function gui(form: FormData) {
    datLoi(null);
    chay(async () => {
      const kq = themMoi ? await themDanhMuc(form) : await suaDanhMuc(form);
      if (!kq.ok) {
        datLoi(kq.loi ?? "Không lưu được");
        return;
      }
      dong();
    });
  }

  return (
    <Dialog.Root open onOpenChange={(v) => !v && dong()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)] focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
            <div className="flex min-w-0 flex-col">
              <Dialog.Title className="text-lg font-bold tracking-tight text-[var(--ink)]">
                {themMoi ? `Thêm vào ${nhom.nhan}` : `Sửa ${nhom.nhan.toLowerCase()}`}
              </Dialog.Title>
              <span className="text-sm text-[var(--ink-muted)]">
                Giá trị này sẽ hiện trong {nhom.choDung}.
              </span>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Đóng">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <form action={gui} className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
            <input type="hidden" name="type" value={nhom.loai} />
            {cu && <input type="hidden" name="id" value={cu.id} />}
            {cu && <input type="hidden" name="value_cu" value={cu.value} />}

            <Truong nhan="Tên" batBuoc htmlFor="dm-value">
              <Input
                id="dm-value"
                name="value"
                defaultValue={cu?.value ?? ""}
                maxLength={120}
                required
                autoFocus
              />
            </Truong>

            {nhom.loai === "position" && (
              <>
                <Truong
                  nhan="Phòng ban"
                  htmlFor="dm-dept"
                  goiY="Chọn vị trí này khi thêm hồ sơ thì app tự điền phòng ban và cấp bậc theo đây."
                >
                  <Select id="dm-dept" name="meta_department" defaultValue={cu?.meta?.department ?? ""}>
                    <option value="">— chưa đặt —</option>
                    {phongBan.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Truong>
                <Truong nhan="Cấp bậc" htmlFor="dm-level">
                  <Select id="dm-level" name="meta_level" defaultValue={cu?.meta?.level ?? ""}>
                    <option value="">— chưa đặt —</option>
                    {capBac.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Truong>
              </>
            )}

            {nhom.loai === "cv_status" && (
              <Truong
                nhan="Giai đoạn phễu"
                batBuoc
                htmlFor="dm-stage"
                goiY="Quyết định hồ sơ mang trạng thái này nằm ở cột nào trên Bảng giai đoạn. Chọn Dừng thì hồ sơ được tính là đã khép."
              >
                <Select id="dm-stage" name="meta_stage" defaultValue={cu?.meta?.stage ?? ""} required>
                  <option value="">— chọn giai đoạn —</option>
                  {GIAI_DOAN.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.ten}
                    </option>
                  ))}
                </Select>
              </Truong>
            )}

            {!themMoi && soDung > 0 && (
              <p className="flex gap-2 rounded-[var(--r-sm)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--ink-muted)]">
                <CircleAlert className="mt-px size-4 shrink-0 text-[var(--ink-faint)]" />
                <span>
                  Đang có <b className="text-[var(--ink-2)]">{soDung} hồ sơ</b> dùng giá trị này.
                  Đổi tên thì cả {soDung} hồ sơ đó được cập nhật sang tên mới luôn.
                </span>
              </p>
            )}

            {loi && (
              <p className="flex gap-2 rounded-[var(--r-sm)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger-soft-fg)]">
                <TriangleAlert className="mt-px size-4 shrink-0" />
                <span>{loi}</span>
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" disabled={dangChay}>
                  Huỷ
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={dangChay}>
                {dangChay && <Loader2 className="animate-spin" />}
                {themMoi ? "Thêm" : "Lưu"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* -------------------------------------------------------- hộp thoại xoá */

function HopThoaiXoa({
  nhom,
  dong,
  dongLai,
}: {
  nhom: NhomDanhMuc;
  dong: DanhMucQuanLy;
  dongLai: () => void;
}) {
  const [loi, datLoi] = useState<string | null>(null);
  const [dangChay, chay] = useTransition();
  const soDung = dong.so_dung;
  const dangDung = soDung !== null && soDung > 0;

  function lam(viec: () => Promise<{ ok: boolean; loi?: string }>) {
    datLoi(null);
    chay(async () => {
      const kq = await viec();
      if (!kq.ok) {
        datLoi(kq.loi ?? "Không thực hiện được");
        return;
      }
      dongLai();
    });
  }

  return (
    <Dialog.Root open onOpenChange={(v) => !v && dongLai()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)] focus:outline-none"
        >
          <div className="flex items-start gap-3 px-5 pt-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--danger-soft)] text-[var(--danger-soft-fg)]">
              <TriangleAlert className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col">
              <Dialog.Title className="text-lg font-bold tracking-tight text-[var(--ink)]">
                Xoá hẳn “{dong.value}”?
              </Dialog.Title>
              <span className="text-sm text-[var(--ink-muted)]">
                Khỏi danh mục {nhom.nhan.toLowerCase()}.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-5 py-4">
            {soDung === null ? (
              <p className="text-sm text-[var(--ink-muted)]">
                Chưa đếm được có bao nhiêu hồ sơ đang dùng giá trị này (thiếu file{" "}
                <span className="code">0010_danh_muc_crud.sql</span>). Nếu không chắc thì chọn{" "}
                <b>Ẩn</b> cho an toàn.
              </p>
            ) : dangDung ? (
              <>
                <p className="text-sm text-[var(--ink-2)]">
                  Đang có <b>{soDung} hồ sơ</b> dùng giá trị này ở {nhom.choDung}.
                </p>
                <p className="text-sm text-[var(--ink-muted)]">
                  Xoá hẳn thì {soDung} hồ sơ đó <b>vẫn giữ nguyên chữ “{dong.value}”</b>, nhưng chữ
                  đó không còn trong danh mục nữa: mở hồ sơ ra ô chọn sẽ trống, và bộ lọc không còn
                  mục này để lọc. Muốn giữ hồ sơ cũ đọc được thì <b>Ẩn</b> là đúng hơn — ẩn cũng làm
                  giá trị biến mất khỏi mọi ô chọn.
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">
                Chưa hồ sơ nào dùng giá trị này, xoá đi không ảnh hưởng gì.
              </p>
            )}

            {loi && (
              <p className="flex gap-2 rounded-[var(--r-sm)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger-soft-fg)]">
                <TriangleAlert className="mt-px size-4 shrink-0" />
                <span>{loi}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--line)] px-5 py-4">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={dangChay}>
                Huỷ
              </Button>
            </Dialog.Close>
            {dong.active !== false && (
              <Button
                variant="outline"
                disabled={dangChay}
                onClick={() => lam(() => anHienDanhMuc(dong.id as string, false))}
              >
                <EyeOff />
                Ẩn thay vì xoá
              </Button>
            )}
            <Button
              variant="danger"
              disabled={dangChay}
              onClick={() => lam(() => xoaDanhMuc(dong.id as string))}
            >
              {dangChay ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Xoá hẳn
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
