import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, daNoiSupabase } from "@/lib/supabase/config";

const DUONG_DAN_CONG_KHAI = ["/dang-nhap", "/auth"];

/**
 * Next.js 16: middleware đã đổi tên thành proxy.
 * Nhiệm vụ: làm mới phiên đăng nhập và chặn người chưa đăng nhập.
 */
export async function proxy(request: NextRequest) {
  // Chưa nối Supabase thì cho vào thẳng — app chạy ở chế độ xem trước.
  if (!daNoiSupabase) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const congKhai = DUONG_DAN_CONG_KHAI.some((p) => path.startsWith(p));

  if (!user && !congKhai) {
    const url = request.nextUrl.clone();
    url.pathname = "/dang-nhap";
    url.searchParams.set("tiep_tuc", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/dang-nhap") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
