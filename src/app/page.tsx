"use client";

import React, { useState, Suspense } from "react";
import { AppInterface } from "@/components/AppInterface";
import TabNavigation, { ActiveTab } from "@/components/TabNavigation";
import styles from "./page.module.css";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("swap");

  return (
    <div className={styles.mainContainer}>
      <TabNavigation onTabChange={setActiveTab} />
      <Suspense fallback={<div>Loading...</div>}>
        <AppInterface activeTab={activeTab} />
      </Suspense>
    </div>
  );
}
