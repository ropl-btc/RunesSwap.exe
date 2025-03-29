import localFont from 'next/font/local';
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Layout from "@/components/Layout";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RunesSwap.exe",
  description: "Bitcoin Runes Swap Platform",
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
