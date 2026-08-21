import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * File CV đi kèm form lên Server Action, mà Next mặc định chỉ nhận 1 MB
       * cho mỗi lần gọi — không nới thì một CV 1.5 MB đã bị chặn.
       *
       * Đừng nâng quá 4.5 MB: Vercel chặn cứng ở mức đó cho mỗi request, nâng
       * hơn cũng không có tác dụng, chỉ khiến lỗi rơi vào tay Vercel với thông
       * báo 413 khó hiểu thay vì lời nhắc tiếng Việt của app.
       *
       * App tự chặn ở 4 MB trước đó — xem TOI_DA_MB trong src/lib/cv-file.ts.
       */
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
