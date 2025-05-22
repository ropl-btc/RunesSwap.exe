import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Temporarily disable Strict Mode for testing
  images: {
    domains: [
      'icon.unisat.io',
      'sats-terminal-node.azurewebsites.net',
      'ordinals.com',
      'ordiscan.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        // allow images from any https domain
        hostname: '*.*',
      },
    ],
  },
};

export default nextConfig;
