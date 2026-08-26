import { Badge, Card, CardBody } from "@/components/ui/primitives";
import { QuanLyDanhMuc, type NhomDanhMuc } from "@/components/danh-muc/quan-ly-danh-muc";
import {
  CHO_DUNG_DANH_MUC,
  LY_DO_KHOA,
  NHAN_LOAI_DANH_MUC,
  layDanhMucQuanLy,
} from "@/lib/danh-muc";

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
  const { muc: tatCa, nguon, coSoDung, loi } = await layDanhMucQuanLy();

  const nhom: NhomDanhMuc[] = THU_TU.map((loai) => ({
    loai,
    nhan: NHAN_LOAI_DANH_MUC[loai] ?? loai,
    khoa: LY_DO_KHOA[loai] ?? null,
    choDung: CHO_DUNG_DANH_MUC[loai] ?? "các ô chọn của app",
    muc: tatCa.filter((c) => c.type === loai),
  })).filter((n) => n.muc.length > 0);

  // Gợi ý cho hai ô chọn trong hộp thoại sửa vị trí — lấy sẵn ở đây cho khỏi
  // phải gọi thêm một lượt máy chủ lúc mở hộp thoại
  const dsTheoLoai = (loai: string) =>
    tatCa.filter((c) => c.type === loai && c.active !== false).map((c) => c.value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">Danh mục</h1>
          <p className="mt-1 max-w-2xl text-base text-[var(--ink-muted)]">
            Toàn bộ giá trị dùng cho các ô chọn trong app. Thêm, sửa, ẩn hay xoá ngay tại đây —
            không phải nhờ người kỹ thuật nữa. <b className="font-medium text-[var(--ink-2)]">Kéo</b>{" "}
            một dòng để đổi thứ tự nó xuất hiện trong ô chọn. Số bên phải mỗi dòng là{" "}
            <span className="font-medium text-[var(--ink-2)]">số hồ sơ đang dùng</span> giá trị đó.
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
              Màn hình vẫn hiển thị đủ nhờ bản sao trong máy, nhưng chưa sửa được gì và khi thêm
              ứng viên cũng không lưu được. Chạy file{" "}
              <span className="code">web/supabase/migrations/0002_seed_catalogs.sql</span> trong
              Supabase SQL Editor rồi tải lại trang.
              {loi && (
                <span className="mt-1 block text-xs text-[var(--ink-faint)]">Lý do: {loi}</span>
              )}
            </p>
          </CardBody>
        </Card>
      )}

      {nguon === "co_so_du_lieu" && !coSoDung && (
        <Card className="border-[var(--warning)]">
          <CardBody className="pt-5">
            <p className="text-base font-medium text-[var(--ink)]">Còn thiếu một bước cài đặt</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Thêm, ẩn, xoá thì vẫn làm được, nhưng chưa đếm được mỗi giá trị đang có bao nhiêu hồ
              sơ dùng, và <b>chưa đổi tên hay kéo sắp xếp được</b> — hai việc đó phải chạy trong một
              giao dịch dưới cơ sở dữ liệu nên cần hàm riêng. Chạy file{" "}
              <span className="code">web/supabase/migrations/0010_danh_muc_crud.sql</span> trong
              Supabase SQL Editor rồi tải lại trang.
              {loi && (
                <span className="mt-1 block text-xs text-[var(--ink-faint)]">Lý do: {loi}</span>
              )}
            </p>
          </CardBody>
        </Card>
      )}

      {nguon === "du_phong" ? (
        <ChiXem nhom={nhom} />
      ) : (
        <QuanLyDanhMuc
          nhom={nhom}
          phongBan={dsTheoLoai("department")}
          capBac={dsTheoLoai("level")}
        />
      )}
    </div>
  );
}

/**
 * Chưa nối được cơ sở dữ liệu thì bày đúng bản dự phòng, không nút nào —
 * bấm cũng chẳng lưu được vào đâu.
 */
function ChiXem({ nhom }: { nhom: NhomDanhMuc[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {nhom.map(({ loai, nhan, muc }) => (
        <Card key={loai} className="flex flex-col">
          <CardBody className="max-h-[280px] overflow-y-auto pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--ink)]">{nhan}</span>
              <Badge tone="neutral" className="tabular">
                {muc.length}
              </Badge>
            </div>
            <ul className="flex flex-col gap-1.5">
              {muc.map((m) => (
                <li key={m.value} className="text-sm text-[var(--ink-2)]">
                  {m.value}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
