import { Card, CardBody, Khung } from "@/components/ui/primitives";

/**
 * Hiện ngay khi bấm chuyển tab, trong lúc máy chủ còn đang lấy dữ liệu.
 *
 * Vì sao cần: mọi trang đều đọc cơ sở dữ liệu nên Next phải dựng ở máy chủ
 * mỗi lần vào. Không có file này thì người dùng bấm xong vẫn thấy trang cũ
 * đứng im vài trăm ms rồi mới nhảy — cảm giác lag. Có file này thì đổi ngay
 * sang khung chờ, và Next prefetch được phần vỏ của trang khi chuột đi qua
 * mục menu.
 *
 * Dùng chung cho cả 6 trang trong nhóm (app) nên chỉ vẽ bố cục thô: tiêu đề,
 * hàng ô đếm, thanh bộ lọc, bảng.
 */
export default function DangTai() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Khung className="h-8 w-64" />
        <Khung className="h-5 w-96 max-w-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardBody className="flex items-center justify-between gap-3 py-4">
              <div className="flex flex-col gap-2">
                <Khung className="h-7 w-16" />
                <Khung className="h-4 w-32" />
              </div>
              <Khung className="size-5 rounded-full" />
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
        <Khung className="h-[var(--field-h)] min-w-[240px] flex-1" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Khung key={i} className="h-[var(--field-h)] w-[130px]" />
        ))}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 py-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Khung className="h-4 w-10 shrink-0" />
              <Khung className="h-4 flex-1" />
              <Khung className="h-4 w-40 shrink-0" />
              <Khung className="h-4 w-24 shrink-0" />
              <Khung className="h-6 w-28 shrink-0 rounded-full" />
            </div>
          ))}
        </CardBody>
      </Card>

      <span className="sr-only" role="status">
        Đang tải dữ liệu
      </span>
    </div>
  );
}
