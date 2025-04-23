'use client'; // Required for hooks

import React from 'react'; // Only import React
import styles from './Layout.module.css'; // Import the CSS module

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Use shared hook to get disconnect
  // const { disconnect } = useSharedLaserEyes();

  // WORKAROUND REMOVED: No longer force disconnect wallet on initial mount.
  // This fixes the bug where multiple sign-in popups appeared on refresh.

  return (
    // Apply styles using the styles object
    <div className={styles.container}>
      {/* The main "window" */}
      <div className={styles.window}>
        {/* Optional Title Bar */}
        <div className={styles.titleBar}>
          <span>RunesSwap.app</span>
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