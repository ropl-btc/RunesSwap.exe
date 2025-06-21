import Image from 'next/image';
import React, { ReactNode } from 'react';
import { Asset } from '@/types/common';
import AmountHelpers from './AmountHelpers';
import AssetSelector from './AssetSelector';
import styles from './InputArea.module.css';

interface InputAreaProps {
  label: string;
  inputId: string;
  inputValue: string;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  min?: string;
  step?: string;

  assetSelectorEnabled?: boolean;
  selectedAsset?: Asset | null;
  onAssetChange?: (asset: Asset) => void;
  availableAssets?: Asset[];
  showBtcInSelector?: boolean;
  isAssetsLoading?: boolean;
  assetsError?: string | null;
  isPreselectedAssetLoading?: boolean;

  assetSelectorComponent?: ReactNode;

  showPercentageShortcuts?: boolean | undefined;
  onPercentageClick: ((percentage: number) => void) | undefined;
  availableBalance?: ReactNode | undefined;

  usdValue?: string | undefined;
  minMaxRange?: string | undefined;
  errorMessage: string | undefined;
  bottomContent?: ReactNode;
}

export const InputArea: React.FC<InputAreaProps> = ({
  label,
  inputId,
  inputValue,
  onInputChange,
  placeholder = '0.0',
  readOnly = false,
  disabled = false,
  min = '0',
  step = '0.001',
  assetSelectorEnabled = false,
  selectedAsset = null,
  onAssetChange,
  availableAssets = [],
  showBtcInSelector = true,
  isAssetsLoading = false,
  assetsError = null,
  isPreselectedAssetLoading = false,
  assetSelectorComponent,
  showPercentageShortcuts = false,
  onPercentageClick,
  availableBalance,
  usdValue,
  minMaxRange,
  errorMessage,
  bottomContent,
}) => (
  <div className={styles.inputArea}>
    <div className={styles.inputHeader}>
      <label htmlFor={inputId} className={styles.inputLabel}>
        {label}
      </label>
      <AmountHelpers
        showPercentageShortcuts={showPercentageShortcuts}
        onPercentageClick={onPercentageClick}
        availableBalance={availableBalance}
        disabled={disabled}
      />
    </div>

    <div className={styles.inputRow}>
      <input
        type={readOnly ? 'text' : 'number'}
        id={inputId}
        placeholder={placeholder}
        value={inputValue}
        onChange={
          onInputChange ? (e) => onInputChange(e.target.value) : undefined
        }
        className={readOnly ? styles.amountInputReadOnly : styles.amountInput}
        readOnly={readOnly}
        disabled={disabled}
        min={min}
        step={step}
      />
      {assetSelectorEnabled ? (
        <AssetSelector
          selectedAsset={selectedAsset}
          onAssetChange={onAssetChange ?? (() => {})}
          availableAssets={availableAssets}
          disabled={disabled}
          showBtcInSelector={showBtcInSelector}
          isAssetsLoading={isAssetsLoading}
          assetsError={assetsError}
          isPreselectedAssetLoading={isPreselectedAssetLoading}
        />
      ) : (
        assetSelectorComponent
      )}
    </div>

    {(usdValue || minMaxRange) && (
      <div
        className={styles.usdValueText}
        style={{ display: 'flex', justifyContent: 'space-between' }}
      >
        <div>{usdValue && `≈ ${usdValue}`}</div>
        <div>{minMaxRange}</div>
      </div>
    )}

    {errorMessage && (
      <div
        className={`${styles.errorText} ${styles.messageWithIcon}`}
        style={{ paddingTop: '0.25rem', width: '100%' }}
      >
        <Image
          src="/icons/msg_error-0.png"
          alt="Error"
          className={styles.messageIcon}
          width={16}
          height={16}
        />
        <span>{errorMessage}</span>
      </div>
    )}

    {bottomContent}
  </div>
);

export default InputArea;
