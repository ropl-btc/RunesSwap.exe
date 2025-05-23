import React, { useEffect, useState } from "react";
import styles from "./FeeSelector.module.css";
import useFeeRates from "@/hooks/useFeeRates";

export type FeeOption = "slow" | "medium" | "fast" | "custom";

interface FeeSelectorProps {
  onChange: (rate: number) => void;
}

const FeeSelector: React.FC<FeeSelectorProps> = ({ onChange }) => {
  const { data: fees } = useFeeRates();
  const [option, setOption] = useState<FeeOption>("medium");
  const [custom, setCustom] = useState("");

  const low = fees?.hourFee ?? 1;
  const medium = fees?.halfHourFee ?? low;
  const high = fees?.fastestFee ?? medium;

  useEffect(() => {
    if (!fees) return;
    let rate = medium;
    if (option === "slow") rate = low;
    else if (option === "fast") rate = high;
    else if (option === "custom")
      rate = Math.max(parseFloat(custom) || low, low);
    onChange(rate);
  }, [option, custom, fees, onChange]);

  return (
    <div className={styles.container}>
      <div className={styles.buttonRow}>
        <button
          className={`${styles.feeButton} ${option === "slow" ? styles.feeButtonActive : ""}`}
          onClick={() => setOption("slow")}
        >
          Slow ({low} sats/vb)
        </button>
        <button
          className={`${styles.feeButton} ${option === "medium" ? styles.feeButtonActive : ""}`}
          onClick={() => setOption("medium")}
        >
          Medium ({medium} sats/vb)
        </button>
        <button
          className={`${styles.feeButton} ${option === "fast" ? styles.feeButtonActive : ""}`}
          onClick={() => setOption("fast")}
        >
          Fast ({high} sats/vb)
        </button>
        <button
          className={`${styles.feeButton} ${option === "custom" ? styles.feeButtonActive : ""}`}
          onClick={() => setOption("custom")}
        >
          Custom
        </button>
      </div>
      {option === "custom" && (
        <input
          className={styles.customInput}
          type="number"
          min={low}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={`${low}+`}
        />
      )}
    </div>
  );
};

export default FeeSelector;
