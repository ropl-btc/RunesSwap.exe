"use client";

import React, { useEffect, useState } from "react";
import { ConnectWalletButton } from "./ConnectWalletButton";
import styles from "@/app/page.module.css";

export type ActiveTab =
  | "swap"
  | "runesInfo"
  | "yourTxs"
  | "portfolio"
  | "borrow";

interface TabNavigationProps {
  onTabChange?: (tab: ActiveTab) => void;
}

export default function TabNavigation({ onTabChange }: TabNavigationProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const param = sp.get("tab") as ActiveTab | null;
      if (param) return param;
    }
    return "swap";
  });

  useEffect(() => {
    const handleTabChangeEvent = (event: CustomEvent) => {
      const { tab } = event.detail;
      const allowed: ActiveTab[] = [
        "swap",
        "runesInfo",
        "yourTxs",
        "portfolio",
        "borrow",
      ];
      if (allowed.includes(tab)) {
        setActiveTab(tab as ActiveTab);
      }
    };
    window.addEventListener("tabChange", handleTabChangeEvent as EventListener);
    return () =>
      window.removeEventListener(
        "tabChange",
        handleTabChangeEvent as EventListener,
      );
  }, []);

  useEffect(() => {
    onTabChange?.(activeTab);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    const sp = new URLSearchParams(window.location.search);
    const runeParam = sp.get("rune");
    if (activeTab === "swap" && runeParam) {
      url.searchParams.set("rune", runeParam);
    } else {
      url.searchParams.delete("rune");
    }
    window.history.pushState({}, "", url.toString());
  }, [activeTab]);

  const handleClick = (tab: ActiveTab) => setActiveTab(tab);

  return (
    <div className={styles.headerContainer}>
      <div className={styles.tabsInHeader}>
        <button
          className={`${styles.pageTabButton} ${activeTab === "swap" ? styles.pageTabActive : ""}`}
          onClick={() => handleClick("swap")}
        >
          Swap
        </button>
        <button
          className={`${styles.pageTabButton} ${activeTab === "borrow" ? styles.pageTabActive : ""}`}
          onClick={() => handleClick("borrow")}
        >
          Borrow
        </button>
        <button
          className={`${styles.pageTabButton} ${activeTab === "runesInfo" ? styles.pageTabActive : ""}`}
          onClick={() => handleClick("runesInfo")}
        >
          Runes Info
        </button>
        <button
          className={`${styles.pageTabButton} ${activeTab === "yourTxs" ? styles.pageTabActive : ""}`}
          onClick={() => handleClick("yourTxs")}
        >
          Your TXs
        </button>
        <button
          className={`${styles.pageTabButton} ${activeTab === "portfolio" ? styles.pageTabActive : ""}`}
          onClick={() => handleClick("portfolio")}
        >
          Portfolio
        </button>
      </div>
      <div className={styles.connectButtonContainer}>
        <ConnectWalletButton />
      </div>
    </div>
  );
}
