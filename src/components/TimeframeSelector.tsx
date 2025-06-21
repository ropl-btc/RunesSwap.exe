import React from 'react';
import type { Timeframe } from '@/hooks/usePriceChart';
import styles from './AppInterface.module.css';

interface TimeframeSelectorProps {
  timeframe: Timeframe;
  onChange: (tf: Timeframe) => void;
}

const TIMEFRAMES: Timeframe[] = ['24h', '7d', '30d', '90d'];

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  timeframe,
  onChange,
}) => (
  <div className={styles.timeframeSelectorBottom}>
    {TIMEFRAMES.map((tf) => (
      <button
        key={tf}
        className={`${styles.timeframeButton} ${timeframe === tf ? styles.timeframeButtonActive : ''}`}
        onClick={() => onChange(tf)}
      >
        {tf}
      </button>
    ))}
  </div>
);

export default TimeframeSelector;
