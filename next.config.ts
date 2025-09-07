import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'apis3.aurelonlabs.com',
        port: '9000',
        pathname: '/dreamlity/images/**',
      },
    ],
  },
};

export default nextConfig;
