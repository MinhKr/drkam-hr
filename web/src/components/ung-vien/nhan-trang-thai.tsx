import { Badge } from "@/components/ui/primitives";
import type { GiaiDoan } from "@/lib/types";

const TONE: Record<GiaiDoan, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  moi_ve: "neutral",
  phong_van: "primary",
  cho_quyet_dinh: "warning",
  nhan_viec: "success",
  dung: "danger",
};

export function NhanTrangThai({
  trangThai,
  giaiDoan,
}: {
  trangThai: string;
  giaiDoan?: GiaiDoan;
}) {
  return <Badge tone={TONE[giaiDoan ?? "moi_ve"]}>{trangThai}</Badge>;
}
