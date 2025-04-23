import localFont from 'next/font/local';
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Layout from "@/components/Layout";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: 'RunesSwap.app | Swap Bitcoin Runes',
    template: '%s | RunesSwap.app',
  },
  description: 'Swap Bitcoin Runes instantly with RunesSwap.app, the aggregator for Bitcoin Runes swaps. Connect your wallet, view live prices, and trade securely with low fees—almost always getting the best exchange rate.',
  keywords: ['bitcoin', 'runes', 'swap', 'dex', 'inscriptions', 'ordiscan', 'sats', 'runeswap'],
  // viewport removed from metadata (see export below)
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://runesswap.app',
    title: 'RunesSwap.app | Swap Bitcoin Runes',
    description: 'Swap Bitcoin Runes instantly with RunesSwap.app, the aggregator for Bitcoin Runes swaps. Connect your wallet, view live prices, and trade securely with low fees—almost always getting the best exchange rate.',
    siteName: 'RunesSwap.app',
    images: [
      {
        url: 'https://runesswap.app/icons/runesswap_logo.png',
        width: 1200,
        height: 630,
        alt: 'RunesSwap.app logo and interface preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RunesSwap.app | Swap Bitcoin Runes',
    description: 'Swap Bitcoin Runes instantly with RunesSwap.app, the aggregator for Bitcoin Runes swaps. Connect your wallet, view live prices, and trade securely with low fees—almost always getting the best exchange rate.',
    images: ['https://runesswap.app/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

const windowsFont = localFont({
  src: '../../public/fonts/WindowsRegular.ttf',
  display: 'swap',
  variable: '--font-windows',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={windowsFont.variable}>
      <body>
        <Providers>
          <Layout>{children}</Layout>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
