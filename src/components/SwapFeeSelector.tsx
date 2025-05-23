import React, { useEffect, useState } from "react";
import styles from "./FeeSelector.module.css";
import useFeeRates from "@/hooks/useFeeRates";

export type SwapFeeOption = "medium" | "fast" | "custom";

interface SwapFeeSelectorProps {
  onChange: (rate: number) => void;
}

const SwapFeeSelector: React.FC<SwapFeeSelectorProps> = ({ onChange }) => {
  const { data: fees } = useFeeRates();
  const [option, setOption] = useState<SwapFeeOption>("medium");
  const [custom, setCustom] = useState("");

  const low = fees?.hourFee ?? 1;
  const medium = fees?.halfHourFee ?? low;
  const high = fees?.fastestFee ?? medium;

  useEffect(() => {
    if (!fees) return;
    let rate = medium;
    if (option === "fast") rate = high;
    else if (option === "custom")
      rate = Math.max(parseFloat(custom) || low, low);
    onChange(rate);
  }, [option, custom, fees, onChange, low, medium, high]);

  return (
    <div className={styles.container}>
      <div className={styles.buttonRow}>
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

export default SwapFeeSelector;
