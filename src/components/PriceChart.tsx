import React, { useEffect, useRef, useState } from 'react';
import styles from './SwapInterface.module.css'; 

// Mock price data - represents 24h of price data
const generateMockPriceData = (dataPoints = 24, volatility = 0.05, trend = 0) => {
  const basePrice = 100;
  const data: Array<{timestamp: string, price: number}> = [];
  
  for (let i = 0; i < dataPoints; i++) {
    // Random walk with slight trend bias
    const randomFactor = (Math.random() - 0.5 + trend/10) * volatility;
    const prevPrice: number = i > 0 ? data[i-1].price : basePrice;
    const price: number = prevPrice * (1 + randomFactor);
    
    data.push({
      timestamp: new Date(Date.now() - (dataPoints - i) * 3600000).toISOString(), // hours ago
      price: price
    });
  }
  
  return data;
};

interface PriceChartProps {
  assetName: string;
  timeFrame?: '24h' | '7d' | '30d' | 'all';
  onClose?: () => void;
}

interface DataPoint {
  x: number;
  y: number;
  price: number;
  timestamp: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ assetName, timeFrame = '24h', onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [priceData, setPriceData] = useState<Array<{timestamp: string, price: number}>>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>(timeFrame);
  const [hoverInfo, setHoverInfo] = useState<{ price: string; time: string; x: number; y: number } | null>(null);
  const chartPointsRef = useRef<DataPoint[]>([]);
  
  // Set initial mock data
  useEffect(() => {
    // Generate different data based on the selected timeframe
    let dataPoints = 24;
    let volatility = 0.05;
    let trend = 0;
    
    switch (selectedTimeframe) {
      case '24h':
        dataPoints = 24;
        volatility = 0.05;
        trend = 0.1; // slight upward trend
        break;
      case '7d':
        dataPoints = 7 * 24;
        volatility = 0.08;
        trend = -0.05; // slight downward trend
        break;
      case '30d':
        dataPoints = 30;
        volatility = 0.1;
        trend = 0.2; // stronger upward trend
        break;
      case 'all':
        dataPoints = 90;
        volatility = 0.15;
        trend = 0.3; // strong upward trend
        break;
    }
    
    setPriceData(generateMockPriceData(dataPoints, volatility, trend));
  }, [selectedTimeframe]);
  
  // Draw the chart
  useEffect(() => {
    if (!canvasRef.current || priceData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Extract price values
    const prices = priceData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Calculate nice round values for Y axis
    const yAxisSteps = 5; // Show 5 labels on Y axis
    const priceDiff = maxPrice - minPrice;
    
    // Find appropriate rounding interval based on price range
    let roundTo: number;
    if (priceDiff > 100) {
      roundTo = 20; // Round to nearest 20
    } else if (priceDiff > 50) {
      roundTo = 10; // Round to nearest 10
    } else if (priceDiff > 20) {
      roundTo = 5; // Round to nearest 5
    } else if (priceDiff > 10) {
      roundTo = 2; // Round to nearest 2
    } else if (priceDiff > 5) {
      roundTo = 1; // Round to nearest 1
    } else if (priceDiff > 2) {
      roundTo = 0.5; // Round to nearest 0.5
    } else if (priceDiff > 1) {
      roundTo = 0.2; // Round to nearest 0.2
    } else {
      roundTo = 0.1; // Round to nearest 0.1
    }
    
    // Calculate rounded min/max for y-axis
    const yMin = Math.floor(minPrice / roundTo) * roundTo;
    const yMax = Math.ceil(maxPrice / roundTo) * roundTo;
    const yRange = yMax - yMin;
    
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
    
    // Horizontal grid lines and y-axis labels
    for (let i = 0; i <= yAxisSteps; i++) {
      const yValue = yMin + (i / yAxisSteps) * yRange;
      const y = padding.top + chartHeight - (i / yAxisSteps) * chartHeight;
      
      // Grid line
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      
      // Y-axis label
      ctx.fillStyle = '#000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(yValue.toFixed(2), padding.left - 5, y + 4);
    }
    
    // Vertical grid lines and x-axis labels - show nice time intervals
    const xAxisSteps = 4; // Show 5 intervals
    
    for (let i = 0; i <= xAxisSteps; i++) {
      const x = padding.left + (i / xAxisSteps) * chartWidth;
      
      // Grid line
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      
      // Calculate nice time interval
      const dataIndex = Math.floor((i / xAxisSteps) * (priceData.length - 1));
      if (dataIndex >= 0 && dataIndex < priceData.length) {
        const date = new Date(priceData[dataIndex].timestamp);
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
    const points: DataPoint[] = [];
    
    priceData.forEach((data, index) => {
      const x = padding.left + (index / (priceData.length - 1)) * chartWidth;
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
    const latestPrice = priceData[priceData.length - 1].price;
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${latestPrice.toFixed(2)} USD`, canvas.width - padding.right, padding.top - 10);
    
    // If there's hover info, draw the indicator
    if (hoverInfo) {
      // Draw the hover indicator
      ctx.beginPath();
      ctx.arc(hoverInfo.x, hoverInfo.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
      
      // Draw hover info box
      const boxWidth = 120;
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
      ctx.fillText(`Price: $${hoverInfo.price}`, boxX + 10, boxY + 20);
      ctx.fillText(`Time: ${hoverInfo.time}`, boxX + 10, boxY + 40);
    }
    
  }, [priceData, canvasRef, selectedTimeframe, hoverInfo]);
  
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
        
        setHoverInfo({
          price: closestPoint.price.toFixed(2),
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

  return (
    <div className={styles.priceChartInner}>
      <div className={styles.priceChartHeader}>
        <h3 className={styles.priceChartTitle}>{assetName} Price</h3>
      </div>
      {/* Canvas and overlay wrapper - REMOVE_COMING_SOON_START */}
      <div style={{ position: 'relative' }}>
        <canvas 
          ref={canvasRef} 
          className={styles.priceChartCanvas}
        />
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
          Coming Soon...
        </div>
      </div>
      {/* REMOVE_COMING_SOON_END */}
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
          All
        </button>
      </div>
      
      {/* Add Collapse Chart button */}
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