import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'apis3.aurelonlabs.com',
        port: '9002',
        pathname: '/dreamlity/images/**',
      },
    ],
  },
};

export default nextConfig;
