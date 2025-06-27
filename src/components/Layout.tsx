'use client';

import Image from 'next/image';
import React, { useRef, useState } from 'react';
import { useBackground } from '@/context/BackgroundContext';
import useBtcPrice from '@/hooks/useBtcPrice';
import { safeArrayFirst } from '@/utils/typeGuards';
import FooterComponent from './FooterComponent';
import styles from './Layout.module.css';
import TitleText from './TitleText';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { backgroundImage, setBackgroundImage, clearBackgroundImage } =
    useBackground();
  const { btcPriceUsd, isBtcPriceLoading, btcPriceError } = useBtcPrice();

  // Background settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const filesArray = fileList ? (Array.from(fileList) as File[]) : [];
    const file = safeArrayFirst<File>(filesArray);
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image is too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBackgroundImage(event.target.result as string);
        setIsSettingsOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={styles.container}
      style={
        backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}
      }
    >
      {/* Background settings */}
      <button
        className={styles.bgSettingsButton}
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        title="Change Background"
      >
        Choose Background
      </button>

      {isSettingsOpen && (
        <div className={styles.bgSettingsPanel}>
          <div className={styles.bgSettingsContent}>
            <button
              className={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Image
            </button>

            {backgroundImage && (
              <button
                className={styles.clearButton}
                onClick={clearBackgroundImage}
              >
                Clear Background
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Main window */}
      <div className={styles.window}>
        <div className={styles.titleBar}>
          <span className={styles.titleBarRow}>
            <Image
              src="/icons/runesswap_logo.png"
              alt="RunesSwap.app Logo"
              width={18}
              height={18}
              style={{ imageRendering: 'pixelated' }}
              priority
            />
            <TitleText />
          </span>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
      <FooterComponent
        btcPriceUsd={btcPriceUsd}
        isBtcPriceLoading={isBtcPriceLoading}
        btcPriceError={btcPriceError}
      />
    </div>
  );
}

export default Layout;
