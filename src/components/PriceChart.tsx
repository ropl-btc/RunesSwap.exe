import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRunePriceHistoryFromApi, QUERY_KEYS } from '@/lib/apiClient';
import styles from './AppInterface.module.css';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import hourglassIcon from '/public/icons/windows_hourglass.png';
import Image from 'next/image';

interface PriceChartProps {
  assetName: string;
  timeFrame?: '24h' | '7d' | '30d' | 'all';
  onClose?: () => void;
  btcPriceUsd?: number; // BTC price in USD
}

const PriceChart: React.FC<PriceChartProps> = ({ assetName, timeFrame = '24h', onClose, btcPriceUsd }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>(timeFrame);
  const [showTooltip, setShowTooltip] = useState(false);
  const [btcPriceLoadingTimeout, setBtcPriceLoadingTimeout] = useState(false);
  
  // Fetch price history data using React Query
  const {
    data: priceHistoryData,
    isLoading,
    isError
  } = useQuery({
    queryKey: [QUERY_KEYS.RUNE_PRICE_HISTORY, assetName],
    queryFn: () => fetchRunePriceHistoryFromApi(assetName),
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 2, // Retry failed requests twice
  });
  
  // TEMPORARY FIX: The external API only returns data points when the price changes, so there are gaps in the time series.
  // This helper forward-fills missing hourly data points so the chart is visually continuous.
  // Ideally, the API should provide a complete time series and this workaround can be removed.
  function fillMissingHours(sortedData: { timestamp: number; price: number; originalPriceInSats?: number }[], hours: number, endTimestamp: number) {
    const filled: { timestamp: number; price: number; originalPriceInSats: number }[] = [];
    let lastPrice = 0;
    let lastOriginal = 0;
    let dataIdx = 0;
    for (let i = hours - 1; i >= 0; i--) {
      const ts = endTimestamp - i * 60 * 60 * 1000;
      while (dataIdx < sortedData.length && sortedData[dataIdx].timestamp <= ts) {
        if (typeof sortedData[dataIdx].price === 'number') {
          lastPrice = sortedData[dataIdx].price;
          lastOriginal = sortedData[dataIdx].originalPriceInSats ?? sortedData[dataIdx].price;
        }
        dataIdx++;
      }
      filled.push({
        timestamp: ts,
        price: lastPrice,
        originalPriceInSats: lastOriginal
      });
    }
    return filled;
  }

  // Replace the filtering and start/end logic in the useMemo for filteredPriceData
  const { filteredPriceData, startTime, endTime } = React.useMemo(() => {
    if (!priceHistoryData?.prices || priceHistoryData.prices.length === 0) {
      return { filteredPriceData: [], startTime: null, endTime: null };
    }

    // Sort data by timestamp ascending
    const sortedData = priceHistoryData.prices
      .map(point => ({
        ...point,
        price: btcPriceUsd !== undefined ? point.price * (btcPriceUsd / 100000000) : null,
        originalPriceInSats: point.price
      }))
      .filter((point): point is { timestamp: number; price: number; originalPriceInSats: number } => typeof point.price === 'number')
      .sort((a, b) => a.timestamp - b.timestamp);

    // Determine time window
    let now = Date.now();
    let windowStart: number;
    let hours = 0;
    switch (selectedTimeframe) {
      case '24h':
        hours = 24;
        windowStart = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        hours = 7 * 24;
        windowStart = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        hours = 30 * 24;
        windowStart = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'all':
        windowStart = sortedData[0]?.timestamp || now;
        now = sortedData[sortedData.length - 1]?.timestamp || now;
        break;
    }

    let filtered;
    if (selectedTimeframe === 'all') {
      filtered = sortedData.filter(point => point.timestamp >= windowStart && point.timestamp <= now);
    } else {
      filtered = fillMissingHours(sortedData, hours, now);
    }

    return {
      filteredPriceData: filtered,
      startTime: filtered.length > 0 ? new Date(filtered[0].timestamp) : null,
      endTime: filtered.length > 0 ? new Date(filtered[filtered.length - 1].timestamp) : null
    };
  }, [priceHistoryData, selectedTimeframe, btcPriceUsd]);

  // Debug logging for price history data
  useEffect(() => {
    if (filteredPriceData.length > 0 && startTime && endTime) {
      console.log(`[PriceChart] ${selectedTimeframe} data range: ${startTime.toLocaleString()} to ${endTime.toLocaleString()}`);
      console.log(`[PriceChart] Number of data points: ${filteredPriceData.length}`);
    }
  }, [filteredPriceData, startTime, endTime, selectedTimeframe]);

  // Replace getCustomTicks logic with a simpler, data-driven approach
  const getCustomTicks = React.useMemo(() => {
    if (!startTime || !endTime || filteredPriceData.length === 0) return [];

    const dataTimestamps = filteredPriceData.map(p => p.timestamp);

    switch (selectedTimeframe) {
      case '24h': {
        // Use available data points for ticks, spaced every ~3-4 points (hourly granularity)
        const tickCount = Math.min(8, dataTimestamps.length);
        if (tickCount <= 2) return dataTimestamps;
        const step = Math.floor(dataTimestamps.length / (tickCount - 1));
        return dataTimestamps.filter((_, i) => i % step === 0 || i === dataTimestamps.length - 1);
      }
      case '7d':
      case '30d':
      case 'all': {
        // For longer timeframes, space ticks evenly across available data
        const tickCount = 6;
        if (dataTimestamps.length <= tickCount) return dataTimestamps;
        const step = Math.floor(dataTimestamps.length / (tickCount - 1));
        return dataTimestamps.filter((_, i) => i % step === 0 || i === dataTimestamps.length - 1);
      }
    }
  }, [startTime, endTime, filteredPriceData, selectedTimeframe]);

  useEffect(() => {
    if (btcPriceUsd === undefined) {
      const timer = setTimeout(() => setBtcPriceLoadingTimeout(true), 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
    setBtcPriceLoadingTimeout(false);
  }, [btcPriceUsd]);

  // If BTC price is not available, show loading spinner
  if (btcPriceUsd === undefined) {
    return (
      <div className={styles.priceChartInner} style={{ position: 'relative', width: '100%', height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src={hourglassIcon.src || '/icons/windows_hourglass.png'} alt="Loading..." width={48} height={48} style={{ marginRight: 12 }} />
        <span style={{ fontSize: '1.2rem', color: '#000080', fontWeight: 'bold' }}>
          {btcPriceLoadingTimeout
            ? "Unable to load BTC price. Chart may be inaccurate."
            : "Loading BTC price..."}
        </span>
      </div>
    );
  }

  // Render the chart
  return (
    <div className={styles.priceChartInner}>
      <div>
        <div className={styles.priceChartHeader}>
          <h3 className={styles.priceChartTitle}>{assetName} Price</h3>
          <div 
            className={styles.infoIconContainer} 
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
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
            {showTooltip && (
              <div className={styles.tooltipBox}>
                Price history might be inaccurate and should only serve as an estimation.
              </div>
            )}
          </div>
        </div>
        <div style={{ position: 'relative', width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart 
              data={filteredPriceData} 
              margin={{ top: 30, right: 10, left: 0, bottom: 25 }}
            >
              <CartesianGrid stroke="#C0C0C0" strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={[
                  startTime?.getTime() || 'dataMin', 
                  endTime?.getTime() || 'dataMax'
                ]}
                ticks={getCustomTicks}
                tickFormatter={ts => {
                  const date = new Date(ts);
                  switch (selectedTimeframe) {
                    case '24h':
                      // Show HH:00 format for 24 hour view
                      return `${date.getHours()}:00`;
                    case '7d':
                      // Show day and month for 7d view
                      return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
                    case '30d':
                    case 'all':
                      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    default:
                      return date.toLocaleString();
                  }
                }}
                tick={{ fill: '#000', fontSize: 10 }}
                axisLine={{ stroke: '#000' }}
                tickLine={{ stroke: '#000' }}
                minTickGap={15}
              />
              <YAxis
                dataKey="price"
                tickFormatter={v => {
                  // Format based on value range, preserving readability without exponential notation
                  if (v < 0.0001) return v.toFixed(8);
                  if (v < 0.001) return v.toFixed(6);
                  if (v < 0.01) return v.toFixed(5);
                  if (v < 0.1) return v.toFixed(4);
                  if (v < 1) return v.toFixed(3);
                  return v.toFixed(2);
                }}
                tick={{ fill: '#000', fontSize: 10 }}
                axisLine={{ stroke: '#000' }}
                tickLine={{ stroke: '#000' }}
                width={50}
                domain={['dataMin', 'dataMax']}
              />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #000080', fontSize: 12 }}
                labelFormatter={ts => {
                  const date = new Date(ts as number);
                  return date.toLocaleString();
                }}
                formatter={(value: number) => [
                  value < 0.0001 ? `$${value.toExponential(4)}` : `$${value.toFixed(6)}`,
                  'Price (USD)'
                ]}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#000080"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Show message when chart data is not available */}
          {(!isLoading && filteredPriceData.length === 0) && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(240, 240, 240, 0.7)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '1.4rem',
              fontWeight: 'bold',
              color: '#000080',
              textShadow: '1px 1px 2px white'
            }}>
              Price Chart Not Available
            </div>
          )}

          {/* Show loading indicator */}
          {isLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(240, 240, 240, 0.7)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '1.4rem',
              fontWeight: 'bold',
              color: '#000080',
              textShadow: '1px 1px 2px white'
            }}>
              Loading...
            </div>
          )}

          {/* Show error message */}
          {isError && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(240, 240, 240, 0.7)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '1.4rem',
              fontWeight: 'bold',
              color: '#CC0000',
              textShadow: '1px 1px 2px white'
            }}>
              Error loading price data
            </div>
          )}
        </div>
        <div className={styles.timeframeSelectorBottom}>
          <button 
            className={`${styles.timeframeButton} ${selectedTimeframe === '24h' ? styles.timeframeButtonActive : ''}`} 
            onClick={() => setSelectedTimeframe('24h')}
          >
            24h
          </button>
          <button 
            className={`${styles.timeframeButton} ${selectedTimeframe === '7d' ? styles.timeframeButtonActive : ''}`} 
            onClick={() => setSelectedTimeframe('7d')}
          >
            7d
          </button>
          <button 
            className={`${styles.timeframeButton} ${selectedTimeframe === '30d' ? styles.timeframeButtonActive : ''}`} 
            onClick={() => setSelectedTimeframe('30d')}
          >
            30d
          </button>
          <button 
            className={`${styles.timeframeButton} ${selectedTimeframe === 'all' ? styles.timeframeButtonActive : ''}`} 
            onClick={() => setSelectedTimeframe('all')}
          >
            90d
          </button>
        </div>
      </div>
      
      {/* Collapse Chart button */}
      <button 
        className={styles.collapseChartButton}
        onClick={onClose}
      >
        Collapse Price Chart
      </button>
    </div>
  );
};

export default PriceChart;