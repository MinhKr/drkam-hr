/** Kiểu dữ liệu dùng chung — khớp với bảng trong supabase/migrations/0001_init.sql */

export type LoaiDanhMuc =
  | "position"
  | "department"
  | "level"
  | "region"
  | "gender"
  | "province"
  | "source"
  | "cv_status"
  | "stage"
  | "screener"
  | "interviewer"
  | "interview_mode"
  | "interview_result"
  | "offer_status"
  | "onboard_status"
  | "onboard_owner"
  | "onboard_office"
  | "onboard_task_group"
  | "onboard_task";

export type DanhMuc = {
  id?: string;
  type: LoaiDanhMuc | string;
  value: string;
  sort_order: number;
  active: boolean;
  meta: Record<string, string>;
};

export type GiaiDoan = "moi_ve" | "phong_van" | "cho_quyet_dinh" | "nhan_viec" | "dung";

export const GIAI_DOAN: { key: GiaiDoan; ten: string }[] = [
  { key: "moi_ve", ten: "Mới về" },
  { key: "phong_van", ten: "Phỏng vấn" },
  { key: "cho_quyet_dinh", ten: "Chờ quyết định" },
  { key: "nhan_viec", ten: "Nhận việc" },
  { key: "dung", ten: "Dừng" },
];

export type UngVien = {
  id: string;
  code: number;
  received_at: string;
  full_name: string;
  gender: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  cv_url: string | null;
  cv_file_path: string | null;
  position: string | null;
  department: string | null;
  level: string | null;
  source: string | null;
  screener: string | null;
  screening_note: string | null;
  status: string;
  /** Lúc hồ sơ vào nhóm trạng thái giai đoạn "dừng"; null = chưa dừng. Trigger trong cơ sở dữ liệu tự ghi. */
  stopped_at: string | null;
  hometown: string | null;
  experience: string | null;
  available_from: string | null;
  expected_salary: string | null;
  offer_status: string | null;
  planned_onboard_date: string | null;
  actual_onboard_date: string | null;
  note: string | null;
  year: number;
  month: number;
  created_at: string;
  updated_at: string;
};

export type PhongVan = {
  id: string;
  candidate_id: string;
  round: 1 | 2;
  scheduled_date: string | null;
  scheduled_time: string | null;
  mode: string | null;
  interviewers: string[];
  result: string | null;
  note: string | null;
  result_email_sent: boolean;
};

export type Onboard = {
  id: string;
  candidate_id: string;
  onboard_date: string | null;
  office: string | null;
  checklist: Record<string, boolean>;
  assignee_pre: string | null;
  assignee_docs: string | null;
  assignee_training: string | null;
  pre_note: string | null;
  status: string | null;
  review_7d_due: string | null;
  review_7d_result: string | null;
  review_1m_due: string | null;
  review_1m_result: string | null;
  review_2m_due: string | null;
  review_2m_result: string | null;
  owner: string | null;
  note: string | null;
};
