'use client'; // Required for hooks

import React, { useEffect } from 'react'; // Added useEffect
import styles from './Layout.module.css'; // Import the CSS module
import { useLaserEyes } from '@omnisat/lasereyes'; // Import LaserEyes hook

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { disconnect } = useLaserEyes(); // Get disconnect function

  // Disconnect wallet on initial mount
  useEffect(() => {
    console.log('[Layout] Disconnecting wallet on initial load...');
    disconnect();
  }, []); // Use empty dependency array to run only once on mount

  return (
    // Apply styles using the styles object
    <div className={styles.container}>
      {/* The main "window" */}
      <div className={styles.window}>
        {/* Optional Title Bar */}
        <div className={styles.titleBar}>
          <span>RunesSwap.exe</span>
          {/* Placeholder for window controls maybe? */}
        </div>
        {/* Window Content Area */}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout; 