"use server";

import { revalidatePath } from "next/cache";
import { banDoGiaiDoan, layGiaTri } from "@/lib/danh-muc";
import { TOI_DA_DONG, TOI_DA_MB } from "@/lib/han-muc-nhap";
import { docFileExcel, type DongLoi, type DongNhap } from "@/lib/nhap-excel";
import { taoSupabaseServer } from "@/lib/supabase/server";
import { chuanHoaSdt } from "@/lib/utils";

/** Chèn theo lô, đừng ném hai nghìn dòng vào một câu insert */
const MOI_LO = 200;

export type DongTrung = { dong: number; ten: string; trungVoi: string };
export type DongCanhBao = { dong: number; ten: string; ly_do: string };

export type MauDong = {
  dong: number;
  ten: string;
  vi_tri: string | null;
  sdt: string | null;
  email: string | null;
  ngay: string | null;
  trang_thai: string | null;
};

export type XemTruoc =
  | { ok: false; loi: string }
  | {
      ok: true;
      tongDong: number;
      seThem: number;
      loi: DongLoi[];
      trung: DongTrung[];
      canhBao: DongCanhBao[];
      mau: MauDong[];
      thieuCot: string[];
      cotLa: string[];
    };

export type KetQuaNhap = { ok: boolean; them?: number; loi?: string };

/* ------------------------------------------------------------- dùng chung */

type DaPhanTich = {
  giuLai: DongNhap[];
  loi: DongLoi[];
  trung: DongTrung[];
  tongDong: number;
  thieuCot: string[];
  cotLa: string[];
};

/**
 * Đọc file, kiểm dữ liệu, loại dòng trùng — dùng chung cho cả xem trước lẫn
 * nhập thật, nên hai bước không thể lệch nhau.
 */
async function phanTich(form: FormData): Promise<{ loiChung: string } | DaPhanTich> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { loiChung: "Chưa chọn file." };
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      loiChung: "Chỉ nhận file .xlsx. File .xls hay .csv thì mở bằng Excel rồi Lưu thành .xlsx.",
    };
  }
  if (file.size > TOI_DA_MB * 1024 * 1024) {
    return { loiChung: `File nặng quá ${TOI_DA_MB} MB. Cắt bớt dòng rồi nhập làm nhiều đợt.` };
  }

  const supabase = await taoSupabaseServer();
  if (!supabase) return { loiChung: "Chưa nối cơ sở dữ liệu" };

  const [banDo, viTri, nguon] = await Promise.all([
    banDoGiaiDoan(),
    layGiaTri("position"),
    layGiaTri("source"),
  ]);

  const doc = await docFileExcel(await file.arrayBuffer(), {
    trangThai: banDo,
    viTri: new Set(viTri),
    nguon: new Set(nguon),
  });

  if ("loiChung" in doc) return { loiChung: doc.loiChung };

  if (doc.tongDong > TOI_DA_DONG) {
    return {
      loiChung: `File có ${doc.tongDong.toLocaleString("vi-VN")} dòng, quá mức ${TOI_DA_DONG.toLocaleString("vi-VN")} dòng mỗi lần. Cắt file làm nhiều đợt.`,
    };
  }

  // Dò trùng bằng MỘT truy vấn rồi đối chiếu trong bộ nhớ — gọi find_duplicates
  // từng dòng thì hai nghìn dòng là hai nghìn lượt gọi cơ sở dữ liệu.
  const { data: daCo, error } = await supabase
    .from("candidates")
    .select("code, full_name, phone_norm, email, received_at");

  if (error) return { loiChung: `Không đọc được danh sách hiện có: ${error.message}` };

  const theoSdt = new Map<string, string>();
  const theoEmail = new Map<string, string>();

  for (const c of daCo ?? []) {
    const mo = `${c.full_name} (mã #${c.code})`;
    if (c.phone_norm) {
      // ghi cả dạng thô lẫn dạng đã chuẩn hoá: f_phone_norm bên SQL chỉ bỏ ký
      // tự không phải số, còn app đổi +84 thành 0 — không khớp hai dạng thì
      // hồ sơ nạp bằng script cũ sẽ trượt khỏi lưới dò trùng
      theoSdt.set(c.phone_norm, mo);
      const chuan = chuanHoaSdt(c.phone_norm);
      if (chuan) theoSdt.set(chuan, mo);
    }
    if (c.email) theoEmail.set(c.email.toLowerCase(), mo);
  }

  const giuLai: DongNhap[] = [];
  const trung: DongTrung[] = [];

  for (const r of doc.rows) {
    const sdt = r.du_lieu.phone;
    const email = r.du_lieu.email;

    const voiSdt = sdt ? theoSdt.get(sdt) : undefined;
    const voiEmail = email ? theoEmail.get(email) : undefined;
    const voi = voiSdt ?? voiEmail;

    if (voi) {
      trung.push({ dong: r.dong, ten: r.ten, trungVoi: voi });
      continue;
    }

    // đối chiếu cả trong nội bộ file: file cũ hay lặp chính nó
    if (sdt) theoSdt.set(sdt, `${r.ten} (dòng ${r.dong} trong file này)`);
    if (email) theoEmail.set(email, `${r.ten} (dòng ${r.dong} trong file này)`);
    giuLai.push(r);
  }

  return { giuLai, loi: doc.loi, trung, tongDong: doc.tongDong, thieuCot: doc.thieuCot, cotLa: doc.cotLa };
}

/* -------------------------------------------------------------- xem trước */

export async function xemTruocNhapExcel(form: FormData): Promise<XemTruoc> {
  const kq = await phanTich(form);
  if ("loiChung" in kq) return { ok: false, loi: kq.loiChung };

  return {
    ok: true,
    tongDong: kq.tongDong,
    seThem: kq.giuLai.length,
    loi: kq.loi,
    trung: kq.trung,
    canhBao: kq.giuLai
      .filter((r) => r.canh_bao.length > 0)
      .map((r) => ({ dong: r.dong, ten: r.ten, ly_do: r.canh_bao.join(" · ") })),
    mau: kq.giuLai.slice(0, 10).map((r) => ({
      dong: r.dong,
      ten: r.ten,
      vi_tri: r.du_lieu.position,
      sdt: r.du_lieu.phone,
      email: r.du_lieu.email,
      ngay: r.du_lieu.received_at,
      trang_thai: r.du_lieu.status,
    })),
    thieuCot: kq.thieuCot,
    cotLa: kq.cotLa,
  };
}

/* ------------------------------------------------------------- nhập thật */

/**
 * Đọc LẠI chính file đó rồi mới chèn, chứ không nhận mảng dữ liệu do trình
 * duyệt gửi ngược lên. Được ba thứ: khỏi phải kiểm lại dữ liệu client gửi,
 * khỏi lo mảng JSON nghìn dòng vượt giới hạn body, và danh sách trùng được dò
 * lại theo cơ sở dữ liệu tại đúng lúc nhập — trong lúc HR ngồi xem trước, đồng
 * nghiệp có thể vừa thêm hồ sơ mới.
 */
export async function nhapExcel(form: FormData): Promise<KetQuaNhap> {
  const kq = await phanTich(form);
  if ("loiChung" in kq) return { ok: false, loi: kq.loiChung };
  if (kq.giuLai.length === 0) return { ok: false, loi: "Không có dòng nào để nhập." };

  const supabase = await taoSupabaseServer();
  if (!supabase) return { ok: false, loi: "Chưa nối cơ sở dữ liệu" };

  let them = 0;
  for (let i = 0; i < kq.giuLai.length; i += MOI_LO) {
    const lo = kq.giuLai.slice(i, i + MOI_LO);
    const { error } = await supabase.from("candidates").insert(lo.map((r) => r.du_lieu));

    if (error) {
      // Nói rõ đã vào được bao nhiêu: chèn theo lô nên lỗi giữa chừng vẫn giữ
      // các lô trước. HR cần biết để nhập lại phần còn lại chứ không làm lại
      // từ đầu — mà nhập lại cũng an toàn vì phần đã vào sẽ bị coi là trùng.
      const daVao = them > 0 ? ` Đã nhập được ${them} hồ sơ trước đó, nhập lại file này sẽ tự bỏ qua phần đó.` : "";
      return {
        ok: false,
        loi: `Lỗi ở dòng ${lo[0].dong}–${lo[lo.length - 1].dong}: ${error.message}.${daVao}`,
      };
    }
    them += lo.length;
  }

  revalidatePath("/ung-vien");
  revalidatePath("/giai-doan");
  revalidatePath("/");
  return { ok: true, them };
}
