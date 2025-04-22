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

interface PriceChartProps {
  assetName: string;
  timeFrame?: '24h' | '7d' | '30d' | 'all';
  onClose?: () => void;
  btcPriceUsd?: number; // BTC price in USD
}

const PriceChart: React.FC<PriceChartProps> = ({ assetName, timeFrame = '24h', onClose, btcPriceUsd }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>(timeFrame);
  
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
  
  // Convert sats to USD and filter by timeframe
  const filteredPriceData = React.useMemo(() => {
    if (!priceHistoryData?.prices || priceHistoryData.prices.length === 0) {
      return [];
    }

    // If BTC price is not available, use 1 as a fallback for display purposes
    const btcPrice = btcPriceUsd || 1;
    
    // Convert price data from sats to USD
    const convertedPriceData = priceHistoryData.prices.map(point => {
      // Convert sats to USD: sats_per_token * (btc_price_usd / 100_000_000)
      // floor_value is in sats per token
      const priceInUsd = point.price * (btcPrice / 100000000);
      
      return {
        ...point,
        price: priceInUsd,
        originalPriceInSats: point.price // Keep the original price for reference
      };
    });

    const now = Date.now();
    let timeframeMs: number;
    
    // Log the date range of the data
    if (convertedPriceData.length > 0) {
      const timestamps = convertedPriceData.map(item => item.timestamp);
      const earliest = new Date(Math.min(...timestamps));
      const latest = new Date(Math.max(...timestamps));
      const daysDiff = Math.floor((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`[PriceChart] Data date range: ${daysDiff} days (${earliest.toLocaleDateString()} to ${latest.toLocaleDateString()})`);
    }
    
    switch(selectedTimeframe) {
      case '24h':
        timeframeMs = 24 * 60 * 60 * 1000; // 24 hours in ms
        break;
      case '7d':
        timeframeMs = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
        break;
      case '30d':
        timeframeMs = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
        break;
      case 'all':
      default:
        // For "all", return all available data points without filtering
        console.log(`[PriceChart] Returning all ${convertedPriceData.length} data points`);
        return convertedPriceData.sort((a, b) => a.timestamp - b.timestamp); // Return all data, sorted by timestamp
    }
    
    // Filter data points within the selected timeframe
    const filtered = convertedPriceData.filter(point => {
      return point.timestamp >= (now - timeframeMs);
    });
    
    // Always sort by timestamp to ensure the chart draws correctly
    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  }, [priceHistoryData, selectedTimeframe, btcPriceUsd]);

  // Debug logging for price history data
  useEffect(() => {
    // Force refresh if we have problems with the data
    if (priceHistoryData?.prices && priceHistoryData.prices.length > 0 && !priceHistoryData.available) {
      // Data inconsistency detected - prices exist but available is false
    }
  }, [priceHistoryData, assetName, btcPriceUsd]);

  // Render the chart
  return (
    <div className={styles.priceChartInner}>
      <div>
        <div className={styles.priceChartHeader}>
          <h3 className={styles.priceChartTitle}>{assetName} Price</h3>
        </div>
        <div style={{ position: 'relative', width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={filteredPriceData} margin={{ top: 30, right: 10, left: 0, bottom: 25 }}>
              <CartesianGrid stroke="#C0C0C0" strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['auto', 'auto']}
                tickFormatter={ts => {
                  const date = new Date(ts);
                  switch (selectedTimeframe) {
                    case '24h':
                      return date.getHours() + ':00';
                    case '7d':
                      return date.toLocaleDateString([], { weekday: 'short' });
                    case '30d':
                    case 'all':
                      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  }
                }}
                tick={{ fill: '#000', fontSize: 10 }}
                axisLine={{ stroke: '#000' }}
                tickLine={{ stroke: '#000' }}
                minTickGap={20}
              />
              <YAxis
                dataKey="price"
                tickFormatter={v => v < 0.01 ? v.toExponential(2) : v.toFixed(4)}
                tick={{ fill: '#000', fontSize: 10 }}
                axisLine={{ stroke: '#000' }}
                tickLine={{ stroke: '#000' }}
                width={40}
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