# -*- coding: utf-8 -*-
"""
Sinh file seed danh mục cho DrKam ATS từ DATA UV DRKAM 2026.xlsx.

Đọc sheet DATA GỐC + toàn bộ dropdown (data validation) trong file Excel,
chuẩn hoá các giá trị bẩn, dựng bản đồ Vị trí -> Phòng ban -> Cấp bậc,
rồi ghi ra web/supabase/migrations/0002_seed_catalogs.sql

Chạy lại bất cứ lúc nào:  python tools/gen_seed.py
"""
import re
import sys
import zipfile
import pathlib
import openpyxl

sys.stdout.reconfigure(encoding="utf-8")

ROOT = pathlib.Path(__file__).resolve().parent.parent
XLSX = ROOT / "DATA UV DRKAM 2026.xlsx"
OUT = ROOT / "web" / "supabase" / "migrations" / "0002_seed_catalogs.sql"


# ---------------------------------------------------------------- đọc dropdown
def read_validations(sheet_file: str) -> dict:
    """Trả về {sqref: [giá trị]} từ dataValidation trong XML của sheet."""
    with zipfile.ZipFile(XLSX) as z:
        xml = z.read(f"xl/worksheets/{sheet_file}").decode("utf-8", "ignore")
    out = {}
    for block in re.findall(r"<dataValidation\b.*?</dataValidation>", xml, re.S):
        sq = re.search(r'sqref="([^"]+)"', block)
        f1 = re.search(r"<formula1>\"?(.*?)\"?</formula1>", block, re.S)
        if not (sq and f1):
            continue
        out[sq.group(1)] = [v.strip() for v in f1.group(1).split(",") if v.strip()]
    return out


def pick(vals: dict, prefix: str) -> list:
    for k, v in vals.items():
        if k.startswith(prefix):
            return v
    return []


dv_data = read_validations("sheet1.xml")      # sheet Data
dv_onb = read_validations("sheet3.xml")       # sheet LỊCH ONBOARD UV


# ------------------------------------------------------------------ chuẩn hoá
def fix_broken(s: str) -> str:
    """Sửa chuỗi bị đứt khi Excel nối công thức:  Kế toá"&"n công nợ  ->  Kế toán công nợ"""
    s = s.replace('"&amp;"', "").replace('"&"', "").replace("&amp;", "&")
    return re.sub(r"\s+", " ", s).strip()


# gộp các giá trị trùng nghĩa trong danh mục Nguồn CV
SOURCE_ALIASES = {
    "Face": "Facebook",
    "VN Work": "Vietnamworks",
    "Vietnamwork": "Vietnamworks",
    "Career Link": "CareerLink",
    "Careerlink": "CareerLink",
    "career viet": "CareerViet",
    "Hunt A": "Hunt",
    "Thereads": "Threads",
    "josbgo": "JobsGO",
    "Joboko": "Joboko",
    "Linkedin": "LinkedIn",
    "Lọc Top CV": "TopCV (chủ động lọc)",
    "Chị Diệu Linh giới thiệu": "Nội bộ giới thiệu",
    "Nguồn CV": None,     # nhãn cột lọt vào danh sách -> bỏ
    "Trade CV": "TradeCV",
}

POSITION_ALIASES = {
    "MKT AI": "Marketing AI",
    "Marketing AI": "Marketing AI",
    "Digital MKT": "Digital Marketing",
    "TP MKT": "Trưởng phòng Marketing",
    "Des": "Designer",
    "KT sàn": "Kế toán sàn",
    "KT Kho": "Kế toán kho",
    "KT Viên": "Kế toán viên",
    "KT kiêm HC": "Kế toán kiêm Hành chính",
}


def norm(v: str, aliases: dict) -> str | None:
    v = fix_broken(v)
    if v in aliases:
        return aliases[v]
    return v


def dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    return out


# ------------------------------------------- bản đồ Vị trí -> Phòng ban / Cấp bậc
DEPT_RULES = [
    (r"kế toán|^kt ", "Kế toán"),
    (r"^hr$|^hrm$|^tts hr$|^hcns$|nhân sự", "HCNS"),
    (r"kho|đóng hàng|vận đơn", "Kho vận"),
    (r"cskh on|sale on|telesale|vận hành sàn|leader cskh on", "Sale online"),
    (r"cskh off|sale off", "Sale offline"),
    (r"trợ lý tgd|giám đốc", "BGĐ"),
    (r"ads|content|booking|design|media|live|tiktok|marketing|mkt|seo|brand|digital|biên kịch|trợ live",
     "Marketing"),
]

LEVEL_RULES = [
    (r"^tts |^tts$|thực tập", "Thực tập sinh"),
    (r"partime|part-time|\(partime\)", "Partime"),
    (r"trưởng phòng|^tp |kế toán trưởng|hrm|quản lý kho|brand leader|digital lead",
     "Trưởng phòng"),
    (r"lead|leader|trưởng nhóm", "Trưởng nhóm"),
    (r"giám đốc", "Giám đốc"),
]


def guess(rules: list, name: str, fallback: str) -> str:
    low = name.lower()
    for pattern, value in rules:
        if re.search(pattern, low):
            return value
    return fallback


# ---------------------------------------------------------------- sheet DATA GỐC
wb = openpyxl.load_workbook(XLSX, data_only=True, read_only=True)
ws = wb["DATA GỐC"]
rows = list(ws.iter_rows(values_only=True))
header = rows[0]
cols = {}
for i, h in enumerate(header):
    if h:
        cols[str(h).strip()] = [str(r[i]).strip() for r in rows[1:] if r[i] is not None]


# ------------------------------------------------------------------ danh mục
positions = dedupe(norm(v, POSITION_ALIASES) for v in pick(dv_data, "K3"))
sources = dedupe(norm(v, SOURCE_ALIASES) for v in pick(dv_data, "N3"))
statuses = dedupe(fix_broken(v) for v in pick(dv_data, "Q3"))
screeners = dedupe(fix_broken(v) for v in pick(dv_data, "O3"))
interviewers = dedupe(fix_broken(v) for v in pick(dv_data, "Y3"))
modes = dedupe(fix_broken(v) for v in pick(dv_data, "X3"))
iv_results = dedupe(fix_broken(v) for v in pick(dv_data, "AA3"))
offer_status = dedupe(fix_broken(v) for v in pick(dv_data, "AI3"))
onb_status = dedupe(fix_broken(v) for v in pick(dv_onb, "AD6"))
onb_owner = dedupe(fix_broken(v) for v in pick(dv_onb, "K6"))

# nhóm 5 giai đoạn của phễu tuyển dụng (dùng cho bảng kéo thả)
STAGE_OF_STATUS = {
    "Đang liên hệ": "moi_ve",
    "Chưa lên hệ được": "moi_ve",
    "Phỏng vấn vòng 1": "phong_van",
    "Phỏng vấn vòng 2": "phong_van",
    "PV đạt - vòng 1": "phong_van",
    "Backup": "cho_quyet_dinh",
    "PV đạt - backup": "cho_quyet_dinh",
    "Chờ nhận việc": "nhan_viec",
    "Nhận việc": "nhan_viec",
    "Loại": "dung",
    "Phỏng vấn - loại": "dung",
    "Không đến PV": "dung",
    "Từ chối nhận việc": "dung",
}

STAGES = [
    ("moi_ve", "Mới về"),
    ("phong_van", "Phỏng vấn"),
    ("cho_quyet_dinh", "Chờ quyết định"),
    ("nhan_viec", "Nhận việc"),
    ("dung", "Dừng"),
]

# 17 mục checklist onboard lấy đúng từ sheet LỊCH ONBOARD UV
ONBOARD_TASKS = [
    ("pre_group", "pre", "Tạo group hội nhập / gửi ảnh chào mừng và dặn dò"),
    ("pre_csvc", "pre", "Chuẩn bị cơ sở vật chất"),
    ("day_den", "ngay_onboard", "UV đến onboard"),
    ("day_ho_so", "ngay_onboard", "Tiếp nhận hồ sơ nhân viên onboard"),
    ("day_thiet_bi", "ngay_onboard", "Cấp phát trang thiết bị"),
    ("kb_bhxh", "giay_to", "Tờ khai tham gia BHXH"),
    ("kb_tncn", "giay_to", "Tờ khai thuế TNCN (có MST)"),
    ("kb_mst", "giay_to", "Giấy ủy quyền đăng ký MST TNCN (chưa có MST)"),
    ("ck_tai_nguyen", "cam_ket", "Cam kết sử dụng tài nguyên của công ty"),
    ("ck_ho_so", "cam_ket", "Cam kết nộp đủ hồ sơ còn thiếu đúng thời hạn"),
    ("ck_cham_cong", "cam_ket", "Ký xác nhận Quy định Chấm công"),
    ("ck_dao_tao", "cam_ket", "Ký xác nhận Quy định Đào tạo"),
    ("ck_boi_thuong", "cam_ket", "Quy định về trách nhiệm bồi thường thiệt hại"),
    ("dt_doanh_nghiep", "dao_tao", "Giới thiệu về Doanh nghiệp"),
    ("dt_san_pham", "dao_tao", "Đào tạo về sản phẩm công ty (tùy vị trí)"),
    ("dt_ai", "dao_tao", "Đào tạo về ứng dụng AI"),
    ("dt_tai_lieu_ai", "dao_tao", "Share tài liệu về AI"),
]

TASK_GROUPS = [
    ("pre", "Pre-onboard (1–3 ngày trước)"),
    ("ngay_onboard", "Ngày onboard"),
    ("giay_to", "Thông tin & tờ khai BHXH, thuế TNCN"),
    ("cam_ket", "Ký cam kết nhân sự"),
    ("dao_tao", "Đào tạo và hội nhập"),
]


# ------------------------------------------------------------------ sinh SQL
def q(s) -> str:
    if s is None:
        return "null"
    return "'" + str(s).replace("'", "''") + "'"


lines = [
    "-- =====================================================================",
    "-- Seed danh mục — SINH TỰ ĐỘNG từ DATA UV DRKAM 2026.xlsx",
    "-- Đừng sửa tay file này; sửa tools/gen_seed.py rồi chạy: python tools/gen_seed.py",
    "-- =====================================================================",
    "",
]

buckets: list[tuple[str, list[tuple[str, dict]]]] = []


def add(type_name: str, values, meta_fn=None):
    items = []
    for v in values:
        if not v:
            continue
        items.append((v, meta_fn(v) if meta_fn else {}))
    buckets.append((type_name, items))


def meta_json(d: dict) -> str:
    if not d:
        return "'{}'"
    inner = ", ".join(f'"{k}": "{str(v)}"' for k, v in d.items())
    return q("{" + inner + "}") + "::jsonb"


add("position", positions, lambda v: {
    "department": guess(DEPT_RULES, v, "Khác"),
    "level": guess(LEVEL_RULES, v, "Nhân viên"),
})
add("department", cols.get("Phòng ban", []))
add("level", cols.get("Cấp bậc", []))
add("region", cols.get("Khu vực", []))
add("gender", cols.get("Giới tính", []))
add("province", cols.get("Quê quán", []))
add("source", sources)
add("cv_status", statuses, lambda v: {"stage": STAGE_OF_STATUS.get(v, "moi_ve")})
add("stage", [s[1] for s in STAGES], lambda v: {"key": dict((b, a) for a, b in STAGES)[v]})
add("screener", screeners)
add("interviewer", interviewers)
add("interview_mode", modes)
add("interview_result", iv_results)
add("offer_status", offer_status)
add("onboard_status", onb_status)
add("onboard_owner", onb_owner)
add("onboard_office", cols.get("Khu vực", []))
add("onboard_task_group", [g[1] for g in TASK_GROUPS],
    lambda v: {"key": dict((b, a) for a, b in TASK_GROUPS)[v]})
add("onboard_task", [t[2] for t in ONBOARD_TASKS],
    lambda v: {
        "key": next(t[0] for t in ONBOARD_TASKS if t[2] == v),
        "group": next(t[1] for t in ONBOARD_TASKS if t[2] == v),
    })

rows_sql = []
for type_name, items in buckets:
    for i, (value, meta) in enumerate(items):
        rows_sql.append(f"  ({q(type_name)}, {q(value)}, {i}, {meta_json(meta)})")

lines.append("insert into tuyendung.catalogs (type, value, sort_order, meta) values")
lines.append(",\n".join(rows_sql))
lines.append("on conflict (type, value) do update")
lines.append("  set sort_order = excluded.sort_order,")
lines.append("      meta       = excluded.meta,")
lines.append("      active     = true;")
lines.append("")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(lines), encoding="utf-8")

# xuất thêm JSON để app dùng khi chưa nối Supabase (và làm dữ liệu mẫu)
import json

json_out = ROOT / "web" / "src" / "data" / "catalogs.json"
json_out.parent.mkdir(parents=True, exist_ok=True)
json_out.write_text(
    json.dumps(
        [
            {"type": t, "value": v, "sort_order": i, "meta": m, "active": True}
            for t, items in buckets
            for i, (v, m) in enumerate(items)
        ],
        ensure_ascii=False,
        indent=2,
    ),
    encoding="utf-8",
)

print(f"Đã ghi {OUT.relative_to(ROOT)}")
print(f"Đã ghi {json_out.relative_to(ROOT)}")
print(f"Tổng {len(rows_sql)} dòng danh mục:")
for type_name, items in buckets:
    print(f"  {type_name:<20} {len(items)}")
