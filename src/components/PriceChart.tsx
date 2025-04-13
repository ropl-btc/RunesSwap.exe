import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRunePriceHistoryFromApi, QUERY_KEYS } from '@/lib/apiClient';
import styles from './SwapInterface.module.css';

interface PriceChartProps {
  assetName: string;
  timeFrame?: '24h' | '7d' | '30d' | 'all';
  onClose?: () => void;
  btcPriceUsd?: number; // BTC price in USD
}

interface ChartDataPoint {
  x: number;
  y: number;
  price: number;
  timestamp: number;
}

const PriceChart: React.FC<PriceChartProps> = ({ assetName, timeFrame = '24h', onClose, btcPriceUsd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>(timeFrame);
  const [hoverInfo, setHoverInfo] = useState<{ price: string; time: string; x: number; y: number } | null>(null);
  const chartPointsRef = useRef<ChartDataPoint[]>([]);
  
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
  
  // Debug logging for price history data
  useEffect(() => {
    // Force refresh if we have problems with the data
    if (priceHistoryData?.prices && priceHistoryData.prices.length > 0 && !priceHistoryData.available) {
      // Data inconsistency detected - prices exist but available is false
    }
  }, [priceHistoryData, assetName, btcPriceUsd]);

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

  // Draw the chart
  useEffect(() => {
    if (!canvasRef.current || filteredPriceData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Extract price values
    const prices = filteredPriceData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Calculate price difference
    const priceDiff = maxPrice - minPrice;
    
    // Simplified approach for y-axis scaling:
    // 1. Use actual min and max with small padding (never start at 0)
    // 2. Use nice round numbers for the y-axis
    console.log(`[PriceChart] Price range - Min: ${minPrice}, Max: ${maxPrice}, Diff: ${priceDiff}`);
    
    // Calculate a nice round interval for the y-axis
    // Based on the price difference (priceDiff)
    const magnitude = Math.floor(Math.log10(priceDiff));
    const normalizedDiff = priceDiff / Math.pow(10, magnitude);
    
    // Choose a nice interval based on the normalized difference
    let interval: number;
    if (normalizedDiff <= 1.5) {
      interval = 0.2 * Math.pow(10, magnitude); // Use 0.2, 2, 20, etc.
    } else if (normalizedDiff <= 3) {
      interval = 0.5 * Math.pow(10, magnitude); // Use 0.5, 5, 50, etc.
    } else if (normalizedDiff <= 7) {
      interval = 1 * Math.pow(10, magnitude); // Use 1, 10, 100, etc.
    } else {
      interval = 2 * Math.pow(10, magnitude); // Use 2, 20, 200, etc.
    }
    
    // For very small values, make sure the interval is not too small
    if (maxPrice < 0.01) {
      interval = Math.max(interval, Math.pow(10, Math.floor(Math.log10(minPrice)) - 1));
    }
    
    console.log(`[PriceChart] Using interval: ${interval}`);
    
    // Add padding (10% of the price range)
    const axisPadding = priceDiff * 0.1;
    
    // Calculate min/max values for y-axis
    // Round down for min, round up for max
    let yMin = Math.floor((minPrice - axisPadding) / interval) * interval;
    let yMax = Math.ceil((maxPrice + axisPadding) / interval) * interval;
    
    // If min is very close to 0, just use 0
    if (yMin < interval * 0.1) {
      yMin = 0;
    }
    
    // Make sure we have a positive range
    if (yMin >= yMax) {
      yMax = yMin + interval;
    }
    
    // Calculate the range
    const yRange = yMax - yMin;
    
    console.log(`[PriceChart] Final Y-axis range: ${yMin} to ${yMax} (${yRange})`);
    
    // Make sure we have a reasonable number of steps (5-7)
    const numberOfSteps = Math.round(yRange / interval);
    if (numberOfSteps < 3 || numberOfSteps > 8) {
      console.log(`[PriceChart] Adjusting steps: ${numberOfSteps} is outside ideal range`);
      // Adjust the interval if needed
      if (numberOfSteps < 3) {
        // If too few steps, use a smaller interval
        const newInterval = yRange / 5;
        yMin = Math.floor(minPrice / newInterval) * newInterval;
        yMax = Math.ceil(maxPrice / newInterval) * newInterval;
        console.log(`[PriceChart] Adjusted to smaller interval: ${newInterval}`);
      } else if (numberOfSteps > 8) {
        // If too many steps, use a larger interval
        const newInterval = yRange / 5;
        yMin = Math.floor(minPrice / newInterval) * newInterval;
        yMax = Math.ceil(maxPrice / newInterval) * newInterval;
        console.log(`[PriceChart] Adjusted to larger interval: ${newInterval}`);
      }
    }
    
    // Calculate chart area with padding
    const padding = {
      left: 40,
      right: 20,
      top: 30,
      bottom: 25
    };
    
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Draw background grid
    ctx.beginPath();
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 1;
    
    // Calculate how many horizontal grid lines we need based on the interval
    // We want to include both min and max values, so we add 1 to include both ends
    const gridLines = Math.round((yMax - yMin) / interval) + 1;
    
    // Draw horizontal grid lines and y-axis labels
    for (let i = 0; i <= gridLines - 1; i++) {
      const yValue = yMin + i * interval;
      // Calculate relative position of value in the range
      const relativePos = (yValue - yMin) / yRange;
      const y = padding.top + chartHeight - (relativePos * chartHeight);
      
      // Grid line
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      
      // Y-axis label with appropriate decimal places based on value size
      ctx.fillStyle = '#000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      
      // Format with more decimal places for small values
      let formattedValue: string;
      if (yValue < 0.0001) {
        formattedValue = yValue.toExponential(2); // Use scientific notation for very small values
      } else if (yValue < 0.001) {
        formattedValue = yValue.toFixed(6);
      } else if (yValue < 0.01) {
        formattedValue = yValue.toFixed(5);
      } else if (yValue < 0.1) {
        formattedValue = yValue.toFixed(4);
      } else if (yValue < 1) {
        formattedValue = yValue.toFixed(3);
      } else if (yValue < 10) {
        formattedValue = yValue.toFixed(2);
      } else {
        formattedValue = yValue.toFixed(2);
      }
      
      ctx.fillText(formattedValue, padding.left - 5, y + 4);
    }
    
    // Vertical grid lines and x-axis labels - show nice time intervals
    const xAxisSteps = 4; // Show 5 intervals
    
    for (let i = 0; i <= xAxisSteps; i++) {
      const x = padding.left + (i / xAxisSteps) * chartWidth;
      
      // Grid line
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      
      // Calculate nice time interval
      const dataIndex = Math.floor((i / xAxisSteps) * (filteredPriceData.length - 1));
      if (dataIndex >= 0 && dataIndex < filteredPriceData.length) {
        const date = new Date(filteredPriceData[dataIndex].timestamp);
        let timeLabel = '';
        
        switch (selectedTimeframe) {
          case '24h':
            // Round to nearest hour
            const roundedHour = date.getHours();
            const amPm = roundedHour >= 12 ? 'PM' : 'AM';
            const hour12 = roundedHour % 12 || 12; // Convert to 12h format
            timeLabel = `${hour12} ${amPm}`;
            break;
          case '7d':
            timeLabel = date.toLocaleDateString([], { weekday: 'short' });
            break;
          case '30d':
          case 'all':
            timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            break;
        }
        
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(timeLabel, x, padding.top + chartHeight + 15);
      }
    }
    
    ctx.stroke();
    
    // Draw price line
    ctx.beginPath();
    ctx.strokeStyle = '#000080'; // Navy blue
    ctx.lineWidth = 2;
    
    // Store data points for hover detection
    const points: ChartDataPoint[] = [];
    
    // Sort the data by timestamp to ensure the line is drawn correctly
    const sortedData = [...filteredPriceData].sort((a, b) => a.timestamp - b.timestamp);
    
    sortedData.forEach((data, index) => {
      const x = padding.left + (index / (sortedData.length - 1)) * chartWidth;
      const normalizedPrice = (data.price - yMin) / yRange;
      const y = padding.top + chartHeight - (normalizedPrice * chartHeight);
      
      points.push({
        x,
        y,
        price: data.price,
        timestamp: data.timestamp
      });
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Update the ref with the current points
    chartPointsRef.current = points;
    
    ctx.stroke();
    
    // Draw latest price
    if (sortedData.length > 0) {
      const latestPrice = sortedData[sortedData.length - 1].price;
      
      // Format price in USD
      const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      }).format(latestPrice);
      
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${formattedPrice}`, canvas.width - padding.right, padding.top - 10);
    }
    
    // If there's hover info, draw the indicator
    if (hoverInfo) {
      // Draw the hover indicator
      ctx.beginPath();
      ctx.arc(hoverInfo.x, hoverInfo.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
      
      // Draw hover info box - make it wider for small values that need more digits
      const priceValue = parseFloat(hoverInfo.price.replace(/[^0-9.-]+/g, ''));
      const needsWiderBox = priceValue < 0.01 || hoverInfo.price.length > 10;
      
      const boxWidth = needsWiderBox ? 150 : 120;
      const boxHeight = 50;
      const boxX = Math.min(Math.max(hoverInfo.x - boxWidth / 2, 10), canvas.width - boxWidth - 10);
      const boxY = 10;
      
      // Draw box background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      
      // Draw box border
      ctx.strokeStyle = '#000080';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      
      // Draw hover info text
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Price: ${hoverInfo.price}`, boxX + 10, boxY + 20); // The price already has a $ symbol
      ctx.fillText(`Time: ${hoverInfo.time}`, boxX + 10, boxY + 40);
    }
    
  }, [filteredPriceData, canvasRef, selectedTimeframe, hoverInfo]);
  
  // Handle mouse events for hover functionality
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Use the data points from our ref
      const dataPoints = chartPointsRef.current;
      
      // Find closest data point
      let closestPoint = null;
      let closestDistance = Number.MAX_VALUE;
      
      for (const point of dataPoints) {
        const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
        if (distance < closestDistance && distance < 30) { // 30px threshold for "closeness"
          closestDistance = distance;
          closestPoint = point;
        }
      }
      
      if (closestPoint) {
        const date = new Date(closestPoint.timestamp);
        let timeLabel = '';
        
        switch (selectedTimeframe) {
          case '24h':
            timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            break;
          case '7d':
            timeLabel = date.toLocaleDateString([], { weekday: 'short' }) + ' ' + 
                      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            break;
          case '30d':
          case 'all':
            timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            break;
        }
        
        // Format price in USD with appropriate decimal places based on value size
        let formattedPrice;
        if (closestPoint.price < 0.0001) {
          // For extremely small values, use scientific notation with currency
          formattedPrice = `$${closestPoint.price.toExponential(4)}`;
        } else {
          // Use Intl formatter with adaptive decimal places
          const decimalPlaces = closestPoint.price < 0.01 ? 6 : 
                               closestPoint.price < 0.1 ? 5 : 
                               closestPoint.price < 1 ? 4 : 
                               closestPoint.price < 10 ? 3 : 2;
                               
          formattedPrice = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
          }).format(closestPoint.price);
        }
        
        setHoverInfo({
          price: formattedPrice,
          time: timeLabel,
          x: closestPoint.x,
          y: closestPoint.y
        });
      } else {
        setHoverInfo(null);
      }
    };
    
    const handleMouseLeave = () => {
      setHoverInfo(null);
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef, selectedTimeframe]);

  // Render the chart
  return (
    <div className={styles.priceChartInner}>
      <div>
        <div className={styles.priceChartHeader}>
          <h3 className={styles.priceChartTitle}>{assetName} Price</h3>
        </div>
        <div style={{ position: 'relative' }}>
          <canvas 
            ref={canvasRef} 
            className={styles.priceChartCanvas}
          />

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