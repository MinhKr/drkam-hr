import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DB_SCHEMA, SUPABASE_ANON_KEY, SUPABASE_URL, daNoiSupabase } from "./config";

/** Client dùng trong Server Component / Server Action. Trả về null nếu chưa nối Supabase. */
export async function taoSupabaseServer() {
  if (!daNoiSupabase) return null;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: DB_SCHEMA },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Gọi từ Server Component thì không set được cookie — proxy.ts đã làm mới phiên rồi.
        }
      },
    },
  });
}

/** Email người đang đăng nhập, dùng để ghi nhật ký thay đổi. */
export async function nguoiDangDangNhap() {
  const supabase = await taoSupabaseServer();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}
