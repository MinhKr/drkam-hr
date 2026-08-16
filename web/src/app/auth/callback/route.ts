import { NextResponse, type NextRequest } from "next/server";
import { taoSupabaseServer } from "@/lib/supabase/server";

/** Nơi link đăng nhập trong email trỏ về: đổi mã sang phiên rồi vào app. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tiepTuc = searchParams.get("tiep_tuc") ?? "/";

  if (code) {
    const supabase = await taoSupabaseServer();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${tiepTuc}`);
    }
  }

  return NextResponse.redirect(`${origin}/dang-nhap?loi=khong_dang_nhap_duoc`);
}
