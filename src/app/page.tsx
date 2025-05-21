"use client";

import React, { useState } from "react";
import { AppInterface } from "@/components/AppInterface";
import TabNavigation, { ActiveTab } from "@/components/TabNavigation";
import styles from "./page.module.css";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("swap");

  return (
    <div className={styles.mainContainer}>
      <TabNavigation onTabChange={setActiveTab} />
      <AppInterface activeTab={activeTab} />
    </div>
  );
}
