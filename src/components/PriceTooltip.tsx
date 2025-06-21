import React from 'react';
import styles from './AppInterface.module.css';

interface PriceTooltipProps {
  show: boolean;
  setShow: (value: boolean) => void;
}

const PriceTooltip: React.FC<PriceTooltipProps> = ({ show, setShow }) => (
  <div
    className={styles.infoIconContainer}
    onMouseEnter={() => setShow(true)}
    onMouseLeave={() => setShow(false)}
    onClick={() => setShow(!show)}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.infoIcon}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
    {show && (
      <div className={styles.tooltipBox}>
        Price history might be inaccurate and should only serve as an
        estimation.
      </div>
    )}
  </div>
);

export default PriceTooltip;
