"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileText, Paperclip, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DUOI_CHO_PHEP,
  TOI_DA_MB,
  duongDanCongKhai,
  dungLuongGon,
  kiemTraFile,
  tenFileTuDuongDan,
  xemDuocTrenTab,
} from "@/lib/cv-file";
import { daNoiSupabase } from "@/lib/supabase/config";

/**
 * Ô đính file CV trong form hồ sơ.
 *
 * Thuần giao diện — không gọi Supabase. File nằm yên trong form cho tới lúc bấm
 * Lưu, rồi đi kèm FormData lên Server Action; ở đó mới cất vào Storage. Nhờ vậy
 * HR bấm Đóng giữa chừng là không còn dấu vết gì, không có file mồ côi.
 *
 * Ba trạng thái: chưa có gì · đang có file cũ · vừa chọn file mới.
 */
export function OTaiCV({ duongDanHienCo }: { duongDanHienCo?: string | null }) {
  const oFile = useRef<HTMLInputElement>(null);
  const [moi, setMoi] = useState<{ ten: string; co: number } | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [boFileCu, setBoFileCu] = useState(false);

  const tenCu = tenFileTuDuongDan(duongDanHienCo);
  const linkCu = duongDanCongKhai(duongDanHienCo);
  const conGiuFileCu = Boolean(duongDanHienCo) && !boFileCu && !moi;

  function chonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      setMoi(null);
      return;
    }

    const sai = kiemTraFile(f);
    if (sai) {
      // bỏ file ra khỏi form luôn, đừng để nó lên tới máy chủ rồi mới bị chối
      e.target.value = "";
      setMoi(null);
      setLoi(sai);
      return;
    }

    setLoi(null);
    setMoi({ ten: f.name, co: f.size });
    setBoFileCu(false);
  }

  function boChon() {
    if (oFile.current) oFile.current.value = "";
    setMoi(null);
    setLoi(null);
  }

  if (!daNoiSupabase) {
    return (
      <p className="rounded-[var(--r-sm)] border border-dashed border-[var(--line-strong)] px-3 py-2.5 text-sm text-[var(--ink-faint)]">
        Chưa nối cơ sở dữ liệu nên chưa đính file được — vẫn dùng ô Link CV ở trên.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Ô thật của form. Ẩn đi nhưng vẫn nằm trong DOM để FormData gửi kèm. */}
      <input
        ref={oFile}
        id="cv_file"
        type="file"
        name="cv_file"
        accept={DUOI_CHO_PHEP.join(",")}
        onChange={chonFile}
        className="sr-only"
      />
      {/* Bỏ file cũ mà không chọn file mới — máy chủ đọc cờ này để xoá */}
      {boFileCu && !moi && <input type="hidden" name="xoa_cv" value="1" />}

      {conGiuFileCu ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5">
          <FileText className="size-4 shrink-0 text-[var(--ink-faint)]" />
          <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]" title={tenCu}>
            {tenCu}
          </span>
          {linkCu && (
            <Button variant="ghost" size="sm" asChild>
              <a href={linkCu} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Mở
              </a>
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => oFile.current?.click()}>
            <Paperclip />
            Thay file
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setBoFileCu(true)}>
            <Trash2 />
            Bỏ file
          </Button>
        </div>
      ) : moi ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--r-sm)] border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-3 py-2.5">
          <FileText className="size-4 shrink-0 text-[var(--primary-soft-fg)]" />
          <span
            className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--primary-soft-fg)]"
            title={moi.ten}
          >
            {moi.ten}
          </span>
          <span className="tabular shrink-0 text-xs text-[var(--primary-soft-fg)]/80">
            {dungLuongGon(moi.co)} · sẽ tải lên khi bấm Lưu
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={boChon}>
            <Trash2 />
            Bỏ chọn
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => oFile.current?.click()}>
            <Paperclip />
            Chọn file CV
          </Button>
          {boFileCu && (
            <>
              <span className="text-sm text-[var(--ink-muted)]">
                File cũ sẽ bị xoá khi bấm Lưu.
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setBoFileCu(false)}>
                <RotateCcw />
                Giữ lại
              </Button>
            </>
          )}
        </div>
      )}

      {loi ? (
        <p className="flex items-start gap-1.5 text-xs text-[var(--danger)]" role="alert">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          {loi}
        </p>
      ) : (
        <p className="text-xs text-[var(--ink-faint)]">
          Tối đa {TOI_DA_MB} MB. <b className="font-semibold">Nên dùng PDF</b> — bấm vào là mở ra
          xem ngay; file Word thì trình duyệt tải về máy chứ không mở tab xem được.
          {conGiuFileCu && !xemDuocTrenTab(tenCu) && " File đang đính là dạng tải về."}
        </p>
      )}
    </div>
  );
}
