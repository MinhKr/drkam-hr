import { Card, CardBody, TrangThaiRong } from "@/components/ui/primitives";

/** Màn hình giữ chỗ cho các phần sẽ làm ở ngày 2–4 của lộ trình. */
export function SapCo({
  tieuDe,
  ngay,
  gomNhung,
}: {
  tieuDe: string;
  ngay: string;
  gomNhung: string[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">
        {tieuDe}
      </h1>
      <Card>
        <CardBody className="pt-5">
          <TrangThaiRong tieuDe={`Phần này làm ở ${ngay}`}>
            <ul className="mt-3 flex flex-col gap-1.5 text-left text-sm text-[var(--ink-muted)]">
              {gomNhung.map((g) => (
                <li key={g} className="flex items-start gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-[var(--primary)]" />
                  {g}
                </li>
              ))}
            </ul>
          </TrangThaiRong>
        </CardBody>
      </Card>
    </div>
  );
}
