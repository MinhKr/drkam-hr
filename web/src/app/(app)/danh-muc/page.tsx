import { Badge, Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { NHAN_LOAI_DANH_MUC, layDanhMucCoNguon } from "@/lib/danh-muc";

export const metadata = { title: "Danh mục" };

const THU_TU = [
  "position",
  "department",
  "level",
  "cv_status",
  "source",
  "interviewer",
  "screener",
  "interview_mode",
  "interview_result",
  "offer_status",
  "onboard_status",
  "onboard_owner",
  "onboard_task_group",
  "onboard_task",
  "region",
  "onboard_office",
  "gender",
  "stage",
  "province",
];

export default async function TrangDanhMuc() {
  const { muc: tatCa, nguon, loi } = await layDanhMucCoNguon();

  const nhom = THU_TU.map((loai) => ({
    loai,
    nhan: NHAN_LOAI_DANH_MUC[loai] ?? loai,
    muc: tatCa.filter((c) => c.type === loai),
  })).filter((n) => n.muc.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">
            Danh mục
          </h1>
          <p className="mt-1 max-w-2xl text-base text-[var(--ink-muted)]">
            Toàn bộ giá trị dùng cho các ô chọn trong app, nạp sẵn từ file Excel. Từ ngày 4 bạn tự
            thêm, sửa, ẩn được ngay tại đây mà không cần lập trình viên.
          </p>
        </div>
        {nguon === "co_so_du_lieu" ? (
          <Badge tone="success">Đang đọc từ cơ sở dữ liệu</Badge>
        ) : (
          <Badge tone="warning" title={loi}>
            Đang đọc bản dự phòng trong máy
          </Badge>
        )}
      </div>

      {nguon === "du_phong" && (
        <Card className="border-[var(--warning)]">
          <CardBody className="pt-5">
            <p className="text-base font-medium text-[var(--ink)]">
              Danh mục chưa nằm trong cơ sở dữ liệu
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Màn hình vẫn hiển thị đủ nhờ bản sao trong máy, nhưng khi thêm ứng viên sẽ không lưu
              được. Chạy file <span className="code">web/supabase/migrations/0002_seed_catalogs.sql</span>{" "}
              trong Supabase SQL Editor rồi tải lại trang.
              {loi && (
                <span className="mt-1 block text-xs text-[var(--ink-faint)]">Lý do: {loi}</span>
              )}
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {nhom.map(({ loai, nhan, muc }) => (
          <Card key={loai} className="flex flex-col">
            <CardHeader className="border-b border-[var(--line)]">
              <div className="flex flex-col">
                <CardTitle>{nhan}</CardTitle>
                <span className="text-2xs uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                  {loai}
                </span>
              </div>
              <Badge tone="neutral" className="tabular">
                {muc.length}
              </Badge>
            </CardHeader>
            <CardBody className="max-h-[280px] overflow-y-auto pt-4">
              <ul className="flex flex-col gap-1.5">
                {muc.map((m) => (
                  <li
                    key={m.value}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="text-[var(--ink-2)]">{m.value}</span>
                    {m.meta?.department && (
                      <span className="shrink-0 text-xs text-[var(--ink-faint)]">
                        {m.meta.department} · {m.meta.level}
                      </span>
                    )}
                    {m.meta?.stage && (
                      <span className="shrink-0 text-xs text-[var(--ink-faint)]">
                        {m.meta.stage}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
