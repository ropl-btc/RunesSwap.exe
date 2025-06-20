'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'runesswap-background';

interface BackgroundContextType {
  backgroundImage: string | null;
  setBackgroundImage: (image: string | null) => void;
  clearBackgroundImage: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | null>(null);

export function BackgroundProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Load background from localStorage on mount and save when it changes
  useEffect(() => {
    try {
      const savedBackground = localStorage.getItem(STORAGE_KEY);
      if (savedBackground) setBackgroundImage(savedBackground);
    } catch {
      // Ignore errors (e.g., localStorage not available)
    }
  }, []);

  useEffect(() => {
    try {
      if (backgroundImage) {
        localStorage.setItem(STORAGE_KEY, backgroundImage);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore errors
    }
  }, [backgroundImage]);

  return (
    <BackgroundContext.Provider
      value={{
        backgroundImage,
        setBackgroundImage,
        clearBackgroundImage: () => setBackgroundImage(null),
      }}
    >
      {children}
    </BackgroundContext.Provider>
  );
}

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (!context)
    throw new Error('useBackground must be used within a BackgroundProvider');
  return context;
};
