"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import styles from "./Layout.module.css";
import FooterComponent from "./FooterComponent";
import { useQuery } from "@tanstack/react-query";
import { useBackground } from "@/context/BackgroundContext";
import TitleText from "./TitleText";

const COINGECKO_BTC_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";
const getBtcPrice = async (): Promise<number> => {
  const response = await fetch(COINGECKO_BTC_PRICE_URL);
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded for CoinGecko API");
    }
    throw new Error(
      `Failed to fetch BTC price from CoinGecko: ${response.status}`,
    );
  }
  const data = await response.json();
  if (!data.bitcoin || !data.bitcoin.usd)
    throw new Error("Invalid response format from CoinGecko");
  return data.bitcoin.usd;
};

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { backgroundImage, setBackgroundImage, clearBackgroundImage } =
    useBackground();
  const {
    data: btcPriceUsd,
    isLoading: isBtcPriceLoading,
    error: btcPriceError,
  } = useQuery<number, Error>({
    queryKey: ["btcPriceUsd"],
    queryFn: getBtcPrice,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Background settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBackgroundImage(event.target.result as string);
        setIsSettingsOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={styles.container}
      style={
        backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}
      }
    >
      {/* Background settings */}
      <button
        className={styles.bgSettingsButton}
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        title="Change Background"
      >
        Choose Background
      </button>

      {isSettingsOpen && (
        <div className={styles.bgSettingsPanel}>
          <div className={styles.bgSettingsContent}>
            <button
              className={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Image
            </button>

            {backgroundImage && (
              <button
                className={styles.clearButton}
                onClick={clearBackgroundImage}
              >
                Clear Background
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </div>
        </div>
      )}

      {/* Main window */}
      <div className={styles.window}>
        <div className={styles.titleBar}>
          <span className={styles.titleBarRow}>
            <Image
              src="/icons/runesswap_logo.png"
              alt="RunesSwap.app Logo"
              width={18}
              height={18}
              style={{ imageRendering: "pixelated" }}
              priority
            />
            <TitleText />
          </span>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
      <FooterComponent
        btcPriceUsd={btcPriceUsd}
        isBtcPriceLoading={isBtcPriceLoading}
        btcPriceError={btcPriceError}
      />
    </div>
  );
}

export default Layout;
