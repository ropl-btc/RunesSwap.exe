import React from "react";
import Image from "next/image";
import styles from "./SwapStatusMessages.module.css";
import { SwapStep } from "./SwapButton";

interface SwapStatusMessagesProps {
  /**
   * Whether a swap is being processed
   */
  isSwapping: boolean;

  /**
   * Current step in the swap process
   */
  swapStep: SwapStep;

  /**
   * Error message if the swap failed
   */
  swapError: string | null;

  /**
   * Transaction ID if swap was successful
   */
  txId: string | null;

  /**
   * Animation dots for loading states
   */
  loadingDots?: string;
}

/**
 * Component to display status messages during the swap process
 */
export const SwapStatusMessages: React.FC<SwapStatusMessagesProps> = ({
  isSwapping,
  swapStep,
  swapError,
  txId,
  // loadingDots is defined but not used, keeping parameter for API consistency
}) => (
  <>
    {/* Display Swap Process Status */}
    {isSwapping && swapStep !== "error" && swapStep !== "success" && (
      <div
        className={`smallText ${styles.messageWithIcon}`}
        style={{ paddingTop: "0.5rem" }}
      >
        <Image
          src="/icons/windows_hourglass.png"
          alt="Processing"
          className={styles.messageIcon}
          width={16}
          height={16}
        />
        <span>
          {swapStep === "getting_psbt" && "Preparing transaction..."}
          {swapStep === "signing" && "Waiting for wallet signature..."}
          {swapStep === "confirming" && "Broadcasting transaction..."}
          {swapStep === "idle" && "Processing..."}
        </span>
      </div>
    )}

    {/* Display Swap Error/Success Messages */}
    {swapError && (
      <div className={`errorText ${styles.messageWithIcon}`}>
        <Image
          src="/icons/msg_error-0.png"
          alt="Error"
          className={styles.messageIcon}
          width={16}
          height={16}
        />
        <span>Error: {swapError}</span>
        <div
          className="smallText"
          style={{ whiteSpace: "normal", wordBreak: "break-word" }}
        >
          {swapError.includes("fee rate") ? (
            <>
              The Bitcoin network is experiencing high congestion. The app is
              automatically trying with a higher fee rate. If it fails again,
              please try later.
            </>
          ) : swapError.includes("congested") ? (
            <>
              The Bitcoin network is currently congested. Please try again later
              when network fees have decreased.
            </>
          ) : (
            <>
              Please retry the swap, reconnect your wallet, or try a different
              amount.
            </>
          )}
        </div>
      </div>
    )}

    {/* Success message - shown whenever we have a transaction ID, regardless of swap step */}
    {!swapError && txId && (
      <div
        className={`smallText ${styles.messageWithIcon}`}
        style={{ paddingTop: "0.5rem", color: "#16a34a" }}
      >
        <Image
          src="/icons/check-0.png"
          alt="Success"
          className={styles.messageIcon}
          width={16}
          height={16}
        />
        <span>
          Swap successful!{" "}
          <a
            href={`https://ordiscan.com/tx/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.txLink}
          >
            View on Ordiscan
          </a>
        </span>
      </div>
    )}
  </>
);

export default SwapStatusMessages;
