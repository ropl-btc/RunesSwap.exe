import localFont from 'next/font/local';
import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/Layout";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RuneSwap98",
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
        </Providers>
      </body>
    </html>
  );
}
