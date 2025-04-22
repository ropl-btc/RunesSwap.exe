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

// Find the closest timestamp to a target timestamp from an array of data points
const findClosestTimestamp = (data: Array<{timestamp: number}>, targetTimestamp: number) => {
  if (!data || data.length === 0) return null;
  
  return data.reduce((prev, curr) => {
    return Math.abs(curr.timestamp - targetTimestamp) < Math.abs(prev.timestamp - targetTimestamp) ? curr : prev;
  });
};

const PriceChart: React.FC<PriceChartProps> = ({ assetName, timeFrame = '24h', onClose, btcPriceUsd }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>(timeFrame);
  const [showTooltip, setShowTooltip] = useState(false);
  
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
  const { filteredPriceData, startTime, endTime } = React.useMemo(() => {
    if (!priceHistoryData?.prices || priceHistoryData.prices.length === 0) {
      return { filteredPriceData: [], startTime: null, endTime: null };
    }

    // Current time to calculate exact time ranges
    const now = new Date();
    
    // Convert price data from sats to USD
    const convertedPriceData = priceHistoryData.prices.map(point => {
      // Convert sats to USD: sats_per_token * (btc_price_usd / 100_000_000)
      const priceInUsd = point.price * (btcPriceUsd! / 100000000);
      
      return {
        ...point,
        price: priceInUsd,
        originalPriceInSats: point.price // Keep the original price for reference
      };
    }).sort((a, b) => a.timestamp - b.timestamp); // Ensure data is sorted by timestamp

    // Calculate the exact target end time (current time) and start time (24h/7d/30d ago)
    const targetEndTime = now.getTime();
    let targetStartTime: number;
    let periodLabel: string;
    
    switch(selectedTimeframe) {
      case '24h':
        // Exactly 24 hours ago from current time
        targetStartTime = now.getTime() - (24 * 60 * 60 * 1000);
        periodLabel = '24 hours';
        break;
      case '7d':
        // Exactly 7 days ago from current time
        targetStartTime = now.getTime() - (7 * 24 * 60 * 60 * 1000);
        periodLabel = '7 days';
        break;
      case '30d':
        // Exactly 30 days ago from current time
        targetStartTime = now.getTime() - (30 * 24 * 60 * 60 * 1000);
        periodLabel = '30 days';
        break;
      case 'all':
        // For "all" (90 days), calculate exact 90 days ago
        targetStartTime = now.getTime() - (90 * 24 * 60 * 60 * 1000);
        periodLabel = '90 days';
        break;
    }
    
    // Find closest data points to our target times
    const closestEndPoint = findClosestTimestamp(convertedPriceData, targetEndTime);
    const closestStartPoint = findClosestTimestamp(convertedPriceData, targetStartTime);
    
    const startTimestamp = closestStartPoint?.timestamp || targetStartTime;
    
    // Always use the current time as the end time for consistent display
    const endTimestamp = targetEndTime;
    
    // Safety check - if no close data points found, use actual targets
    if (!closestStartPoint || !closestEndPoint) {
      console.log(`[PriceChart] Warning: Missing data points near target times for ${periodLabel} period`);
    }
    
    // Filter data to include points between start and end times
    const filtered = convertedPriceData.filter(point => {
      return point.timestamp >= startTimestamp && point.timestamp <= endTimestamp;
    });
    
    return { 
      filteredPriceData: filtered,
      startTime: new Date(startTimestamp),
      endTime: now // Use the actual current time for end boundary
    };
  }, [priceHistoryData, selectedTimeframe, btcPriceUsd]);

  // Debug logging for price history data
  useEffect(() => {
    if (filteredPriceData.length > 0 && startTime && endTime) {
      console.log(`[PriceChart] ${selectedTimeframe} data range: ${startTime.toLocaleString()} to ${endTime.toLocaleString()}`);
      console.log(`[PriceChart] Number of data points: ${filteredPriceData.length}`);
    }
  }, [filteredPriceData, startTime, endTime, selectedTimeframe]);

  // Get ticks for the x-axis based on timeframe
  const getCustomTicks = React.useMemo(() => {
    if (!startTime || !endTime || filteredPriceData.length === 0) return [];
    
    const startMs = startTime.getTime();
    const endMs = endTime.getTime();
    const duration = endMs - startMs;
    
    // Generate appropriate number of ticks based on timeframe
    switch(selectedTimeframe) {
      case '24h': {
        // For 24h view, create hour-based ticks
        const startDate = new Date(startMs);
        const endDate = new Date(endMs);
        
        // Get the current hour to make sure we include it
        const currentHour = endDate.getHours();
        
        // Create a tick for each 3-hour interval, ensuring we include the current hour
        const hours: number[] = [];
        for (let h = 0; h <= 24; h += 3) {
          // Create a new date at start time and set the hour based on our interval
          const tickDate = new Date(startDate);
          tickDate.setHours(startDate.getHours() + h);
          
          // Only add if within our range
          if (tickDate.getTime() <= endMs) {
            hours.push(tickDate.getTime());
          }
        }
        
        // Make sure we include the current hour if it's not already included
        const lastTickHour = new Date(hours[hours.length - 1]).getHours();
        if (lastTickHour !== currentHour && currentHour % 3 !== 0) {
          const currentHourDate = new Date(endDate);
          currentHourDate.setMinutes(0, 0, 0); // Set minutes, seconds, ms to 0
          hours.push(currentHourDate.getTime());
        }
        
        return hours;
      }
      case '7d': {
        // For 7d view, create day-based ticks
        const startDate = new Date(startMs);
        const endDate = new Date(endMs);
        
        // Create a tick for each day
        const days: number[] = [];
        for (let d = 0; d <= 7; d++) {
          const tickDate = new Date(startDate);
          tickDate.setDate(startDate.getDate() + d);
          
          // Only add if within our range
          if (tickDate.getTime() <= endMs) {
            days.push(tickDate.getTime());
          }
        }
        
        // Make sure we include the current day
        const lastTickDay = new Date(days[days.length - 1]).getDate();
        if (lastTickDay !== endDate.getDate()) {
          const currentDayDate = new Date(endDate);
          currentDayDate.setHours(0, 0, 0, 0); // Set time to start of day
          days.push(currentDayDate.getTime());
        }
        
        return days;
      }
      case '30d': {
        // Create approximately 6 evenly spaced ticks, plus start and end dates
        const tickCount = 6;
        const ticks: number[] = [];
        for (let i = 0; i <= tickCount; i++) {
          ticks.push(startMs + (i * (duration / tickCount)));
        }
        return ticks;
      }
      case 'all': // 90 days
        // Create approximately 6 evenly spaced ticks
        const tickCount = 6;
        const ticks: number[] = [];
        for (let i = 0; i <= tickCount; i++) {
          ticks.push(startMs + (i * (duration / tickCount)));
        }
        return ticks;
    }
  }, [startTime, endTime, filteredPriceData, selectedTimeframe]);

  // If BTC price is not available, show loading spinner
  if (btcPriceUsd === undefined) {
    return (
      <div className={styles.priceChartInner} style={{ position: 'relative', width: '100%', height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src={hourglassIcon.src || '/icons/windows_hourglass.png'} alt="Loading..." width={48} height={48} style={{ marginRight: 12 }} />
        <span style={{ fontSize: '1.2rem', color: '#000080', fontWeight: 'bold' }}>Loading BTC price...</span>
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
                label={{ 
                  value: `Time (${selectedTimeframe})`, 
                  position: 'insideBottom', 
                  offset: -15,
                  style: { fontSize: 10 }
                }}
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