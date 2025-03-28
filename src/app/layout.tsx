import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/Layout";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RuneSwap98",
  description: "Bitcoin Runes Swap Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
