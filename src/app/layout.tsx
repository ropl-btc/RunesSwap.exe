import localFont from 'next/font/local';
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Layout from "@/components/Layout";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: 'RunesSwap.app',
    template: '%s | RunesSwap.app',
  },
  description: 'Swap Bitcoin Runes easily with RunesSwap.app – a Uniswap‑style DEX on Bitcoin featuring Laser Eyes wallet integration, Ordiscan balances, and a classic Windows 98 theme.',
  keywords: ['bitcoin', 'runes', 'swap', 'dex', 'inscriptions', 'ordiscan', 'sats', 'windows 98', 'runeswap'],
  viewport: 'width=device-width, initial-scale=1',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://runesswap.app',
    title: 'RunesSwap.app - Bitcoin Runes Swap Platform',
    description: 'Swap Bitcoin Runes easily with RunesSwap.app – a Uniswap‑style DEX on Bitcoin featuring Laser Eyes wallet integration, Ordiscan balances, and a classic Windows 98 theme.',
    siteName: 'RunesSwap.app',
    images: [
      {
        url: 'https://runesswap.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RunesSwap.app logo and interface preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RunesSwap.app - Bitcoin Runes Swap Platform',
    description: 'Swap Bitcoin Runes easily with RunesSwap.app – a Uniswap‑style DEX on Bitcoin featuring Laser Eyes wallet integration, Ordiscan balances, and a classic Windows 98 theme.',
    images: ['https://runesswap.app/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

// Configure the custom font
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
