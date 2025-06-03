import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qosjuipzilzmnqvwplkt.supabase.co",
      },
    ],
  },
};

export default nextConfig;
