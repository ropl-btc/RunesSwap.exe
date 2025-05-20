import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import styles from "./SwapDirectionButton.module.css";
import { Asset } from "@/types/common";

interface SwapDirectionButtonProps {
  /**
   * The input asset in the swap
   */
  assetIn: Asset | null;

  /**
   * The output asset in the swap
   */
  assetOut: Asset | null;

  /**
   * Whether the button should be disabled
   */
  disabled?: boolean;

  /**
   * Function to call when the button is clicked
   */
  onClick: () => void;
}

/**
 * Button component that allows users to swap the direction of assets in a trade
 */
export const SwapDirectionButton: React.FC<SwapDirectionButtonProps> = ({
  assetIn,
  assetOut,
  disabled = false,
  onClick,
}) => (
  <div className={styles.swapIconContainer}>
    <button
      onClick={onClick}
      className={styles.swapIconButton}
      aria-label="Swap direction"
      disabled={disabled || !assetIn || !assetOut}
    >
      <ArrowPathIcon className={styles.swapIcon} />
    </button>
  </div>
);

export default SwapDirectionButton;
