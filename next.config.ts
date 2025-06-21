import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Temporarily disable Strict Mode for testing
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'icon.unisat.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sats-terminal-node.azurewebsites.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ordinals.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ordiscan.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
