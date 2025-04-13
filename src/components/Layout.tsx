'use client'; // Required for hooks

import React, { useEffect } from 'react'; // Added useEffect
import styles from './Layout.module.css'; // Import the CSS module
import { useSharedLaserEyes } from '@/context/LaserEyesContext'; // Import shared hook

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Use shared hook to get disconnect
  const { disconnect } = useSharedLaserEyes();

  // WORKAROUND: Force disconnect wallet on initial mount.
  // This is a workaround for a bug observed with the LaserEyes library (v0.0.134)
  // where refreshing the page while connected (especially with Xverse) triggers
  // multiple simultaneous connection prompts from the wallet extension.
  // This occurs even when using a single shared hook instance and with React Strict Mode off,
  // suggesting an issue with the library's internal auto-reconnect/initialization logic.
  // Forcing disconnect on mount prevents these multiple prompts, requiring manual reconnect after refresh.
  useEffect(() => {
    disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Use empty dependency array to run only ONCE on mount

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