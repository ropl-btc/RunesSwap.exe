'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BackgroundContextType {
  backgroundImage: string | null;
  setBackgroundImage: (image: string | null) => void;
  clearBackgroundImage: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | null>(null);

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Load background from localStorage on mount and save when it changes
  useEffect(() => {
    try {
      const savedBackground = localStorage.getItem('runesswap-background');
      if (savedBackground) setBackgroundImage(savedBackground);
    } catch {
      // Ignore errors (e.g., localStorage not available)
    }
  }, []);

  useEffect(() => {
    try {
      if (backgroundImage) {
        localStorage.setItem('runesswap-background', backgroundImage);
      } else {
        localStorage.removeItem('runesswap-background');
      }
    } catch {
      // Ignore errors
    }
  }, [backgroundImage]);

  return (
    <BackgroundContext.Provider value={{
      backgroundImage,
      setBackgroundImage,
      clearBackgroundImage: () => setBackgroundImage(null)
    }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (!context) throw new Error('useBackground must be used within a BackgroundProvider');
  return context;
}
