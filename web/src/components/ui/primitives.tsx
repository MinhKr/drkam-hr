import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------- Khung chờ (skeleton) */

/**
 * Ô xám nhấp nháy, dùng trong loading.tsx để hiện ngay hình dáng trang
 * trong lúc chờ máy chủ. Có nó thì bấm chuyển tab là thấy đổi liền,
 * không phải ngồi nhìn trang cũ.
 */
export function Khung({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-[var(--r-sm)] bg-[var(--surface-2)]", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ Thẻ */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-xs)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-3 px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-md font-semibold text-[var(--ink)]", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

/* ----------------------------------------------------------------- Nhãn */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--neutral-soft)] text-[var(--neutral-soft-fg)]",
        primary: "bg-[var(--primary-soft)] text-[var(--primary-soft-fg)]",
        success: "bg-[var(--success-soft)] text-[var(--success-soft-fg)]",
        warning: "bg-[var(--warning-soft)] text-[var(--warning-soft-fg)]",
        danger: "bg-[var(--danger-soft)] text-[var(--danger-soft-fg)]",
        secondary: "bg-[var(--secondary-soft)] text-[var(--secondary-soft-fg)]",
        outline: "border border-[var(--line-strong)] text-[var(--ink-2)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/* --------------------------------------------------------------- Ô nhập */
const O_NHAP_CHUNG =
  "w-full rounded-[var(--field-radius)] border border-[var(--field-border)] bg-[var(--field-bg)] text-base text-[var(--ink)] " +
  "placeholder:text-[var(--ink-faint)] transition-colors " +
  "hover:border-[var(--ink-faint)] " +
  "focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 " +
  "disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:opacity-60";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cn(O_NHAP_CHUNG, "h-[var(--field-h)] px-3", className)} {...props} />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(O_NHAP_CHUNG, "min-h-[84px] resize-y px-3 py-2 leading-relaxed", className)} {...props} />
  );
}

/** Nhãn + ô nhập + dòng gợi ý, dùng chung cho mọi form */
export function Truong({
  nhan,
  batBuoc,
  goiY,
  rong,
  htmlFor,
  children,
}: {
  nhan: string;
  batBuoc?: boolean;
  goiY?: string;
  rong?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", rong && "sm:col-span-2")}>
      <Label htmlFor={htmlFor}>
        {nhan}
        {batBuoc && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </Label>
      {children}
      {goiY && <p className="text-xs text-[var(--ink-faint)]">{goiY}</p>}
    </div>
  );
}

/**
 * Ô chọn: mũi tên vẽ bằng thẻ riêng chứ không phải ảnh nền, để chắc chắn
 * người dùng thấy đây là dropdown bấm được.
 * className truyền vào áp cho khung ngoài (dùng để chỉnh chiều rộng).
 */
export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        className={cn(
          "h-[var(--field-h)] w-full cursor-pointer appearance-none rounded-[var(--field-radius)]",
          "border border-[var(--field-border)] bg-[var(--field-bg)] pl-3 pr-9 text-base text-[var(--ink)]",
          "transition-colors hover:bg-[var(--surface-hover)]",
          "focus:border-[var(--primary)] focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-muted)]"
      />
    </span>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-[var(--ink-2)]", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------- Ảnh đại diện chữ */
const MAU_AVATAR = [
  "bg-[var(--red-100)] text-[var(--red-700)]",
  "bg-[var(--clay-100)] text-[var(--clay-600)]",
  "bg-[var(--olive-100)] text-[var(--olive-600)]",
  "bg-[var(--amber-100)] text-[var(--amber-600)]",
  "bg-[var(--n-200)] text-[var(--n-700)]",
];

export function AvatarChu({ ten, className }: { ten: string; className?: string }) {
  const chu = ten
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const viet =
    chu.length === 0
      ? "?"
      : chu.length === 1
        ? chu[0].slice(0, 2).toUpperCase()
        : (chu[0][0] + chu[chu.length - 1][0]).toUpperCase();
  let hash = 0;
  for (const c of ten) hash = (hash + c.charCodeAt(0)) % MAU_AVATAR.length;

  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        MAU_AVATAR[hash],
        className,
      )}
      aria-hidden
    >
      {viet}
    </span>
  );
}

/* --------------------------------------------------------- Trạng thái rỗng */
export function TrangThaiRong({
  tieuDe,
  moTa,
  children,
}: {
  tieuDe: string;
  moTa?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p className="text-md font-semibold text-[var(--ink)]">{tieuDe}</p>
      {moTa && <p className="max-w-md text-base text-[var(--ink-muted)]">{moTa}</p>}
      {children}
    </div>
  );
}
