import { BangOnboard } from "@/components/onboard/bang-onboard";
import type { ChonOnboard } from "@/components/onboard/ho-so-onboard";
import { Card, CardBody } from "@/components/ui/primitives";
import { layGiaTri, nhomCongViecOnboard } from "@/lib/danh-muc";
import { layDanhSachOnboard, layUngVienChuaOnboard } from "@/lib/onboard";
import { mocSapToi, mucCanhBao, TRANG_THAI_KET_THUC } from "@/lib/onboard-types";

export const metadata = { title: "Onboard & thử việc" };

export default async function TrangOnboard() {
  const [{ ds, loi }, nhomViec, vanPhong, nguoiPhuTrach, trangThai, chuaOnboard] =
    await Promise.all([
      layDanhSachOnboard(),
      nhomCongViecOnboard(),
      layGiaTri("onboard_office"),
      layGiaTri("onboard_owner"),
      layGiaTri("onboard_status"),
      layUngVienChuaOnboard(),
    ]);

  const chon: ChonOnboard = {
    van_phong: vanPhong,
    nguoi_phu_trach: nguoiPhuTrach,
    trang_thai: trangThai,
    ket_qua: ["Đạt", "Không đạt"],
  };

  // đến hạn thì đẩy lên đầu danh sách
  const uuTien = { qua_han: 0, hom_nay: 1, sap_toi: 2, con_xa: 3, khong: 4 };
  const dsSapXep = [...ds].sort((a, b) => {
    const ma = uuTien[mucCanhBao(mocSapToi(a))];
    const mb = uuTien[mucCanhBao(mocSapToi(b))];
    if (ma !== mb) return ma - mb;
    return (b.onboard_date ?? "").localeCompare(a.onboard_date ?? "");
  });

  const dangThuViec = ds.filter((d) => !d.status || !TRANG_THAI_KET_THUC.includes(d.status));
  const denHan = ds.filter((d) => ["qua_han", "hom_nay"].includes(mucCanhBao(mocSapToi(d))));
  const hoanTat = ds.filter((d) => d.status === "Pass 2 tháng thử việc");
  const nghiViec = ds.filter((d) => d.status === "Nghỉ việc");

  const oSo = [
    { nhan: "Đang thử việc", so: dangThuViec.length, mau: "text-[var(--ink)]" },
    { nhan: "Đến hạn đánh giá", so: denHan.length, mau: "text-[var(--danger)]" },
    { nhan: "Đã qua thử việc", so: hoanTat.length, mau: "text-[var(--success)]" },
    { nhan: "Nghỉ việc", so: nghiViec.length, mau: "text-[var(--ink-muted)]" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">Onboard &amp; thử việc</h1>
        <p className="mt-1 max-w-3xl text-base text-[var(--ink-muted)]">
          Thay cho sheet <span className="font-medium text-[var(--ink-2)]">LỊCH ONBOARD UV</span> —
          checklist {nhomViec.reduce((s, n) => s + n.viec.length, 0)} mục và ba mốc đánh giá thử
          việc tự tính từ ngày onboard.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {oSo.map(({ nhan, so, mau }) => (
          <Card key={nhan}>
            <CardBody className="flex flex-col gap-1 py-4">
              <span className={`tabular text-2xl font-bold leading-none ${mau}`}>{so}</span>
              <span className="text-sm text-[var(--ink-muted)]">{nhan}</span>
            </CardBody>
          </Card>
        ))}
      </div>

      {loi && (
        <Card className="border-[var(--danger)]">
          <CardBody className="pt-5">
            <p className="text-base font-medium text-[var(--ink)]">Không đọc được danh sách</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {loi}. Nếu báo <span className="code">v_onboard</span> không tồn tại thì chạy file{" "}
              <span className="code">web/supabase/migrations/0006_view_onboard.sql</span> trong
              Supabase SQL Editor.
            </p>
          </CardBody>
        </Card>
      )}

      <BangOnboard
        ds={dsSapXep}
        nhomViec={nhomViec}
        chon={chon}
        chuaOnboard={chuaOnboard}
      />
    </div>
  );
}
