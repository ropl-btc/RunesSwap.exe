import React from 'react';
import { QuoteResponse } from 'satsterminal-sdk';
import { Asset } from '@/types/common';
import { InputArea } from '../InputArea';
import styles from '../SwapTab.module.css';
import {
  PriceInfoPanel,
  SwapButton,
  SwapDirectionButton,
  SwapStatusMessages,
  SwapStep,
} from '.';

interface SwapTabFormProps {
  connected: boolean;
  assetIn: Asset | null;
  assetOut: Asset | null;
  inputAmount: string;
  outputAmount: string;
  onInputAmountChange: (val: string) => void;
  onSelectAssetIn: (asset: Asset) => void;
  onSelectAssetOut: (asset: Asset) => void;
  onSwapDirection: () => void;
  onPercentageClick: (percentage: number) => void;
  availableRunes: Asset[];
  isLoadingRunes: boolean;
  currentRunesError: string | null;
  availableBalanceNode: React.ReactNode;
  inputUsdValue?: string | null;
  outputUsdValue?: string | null;
  exchangeRate: string | null;
  isQuoteLoading: boolean;
  isSwapping: boolean;
  quoteError: string | null;
  swapError: string | null;
  quote: QuoteResponse | null;
  quoteExpired: boolean;
  swapStep: SwapStep;
  txId: string | null;
  loadingDots: string;
  onFetchQuote: () => void;
  onSwap: () => void;
  debouncedInputAmount: number;
  showPriceChart: boolean;
  onShowPriceChart:
    | ((
        assetName?: string | undefined,
        shouldToggle?: boolean | undefined,
      ) => void)
    | undefined;
  isPreselectedRuneLoading: boolean;
  feeSelector: React.ReactNode;
}

export default function SwapTabForm({
  connected,
  assetIn,
  assetOut,
  inputAmount,
  outputAmount,
  onInputAmountChange,
  onSelectAssetIn,
  onSelectAssetOut,
  onSwapDirection,
  onPercentageClick,
  availableRunes,
  isLoadingRunes,
  currentRunesError,
  availableBalanceNode,
  inputUsdValue,
  outputUsdValue,
  exchangeRate,
  isQuoteLoading,
  isSwapping,
  quoteError,
  swapError,
  quote,
  quoteExpired,
  swapStep,
  txId,
  loadingDots,
  onFetchQuote,
  onSwap,
  debouncedInputAmount,
  showPriceChart,
  onShowPriceChart,
  isPreselectedRuneLoading,
  feeSelector,
}: SwapTabFormProps) {
  return (
    <div className={styles.swapTabContainer}>
      <h1 className="heading">Swap</h1>
      <InputArea
        label="You Pay"
        inputId="input-amount"
        inputValue={inputAmount}
        onInputChange={onInputAmountChange}
        placeholder="0.0"
        min="0"
        step="0.001"
        assetSelectorEnabled
        selectedAsset={assetIn}
        onAssetChange={onSelectAssetIn}
        availableAssets={availableRunes}
        showBtcInSelector
        isAssetsLoading={isLoadingRunes}
        assetsError={currentRunesError}
        showPercentageShortcuts={connected && !!assetIn}
        onPercentageClick={onPercentageClick}
        availableBalance={availableBalanceNode}
        usdValue={inputUsdValue || undefined}
        errorMessage={undefined}
      />
      <SwapDirectionButton
        assetIn={assetIn}
        assetOut={assetOut}
        disabled={!assetIn || !assetOut || isSwapping || isQuoteLoading}
        onClick={onSwapDirection}
      />
      <InputArea
        label="You Receive (Estimated)"
        inputId="output-amount"
        inputValue={isQuoteLoading ? `Loading${loadingDots}` : outputAmount}
        placeholder="0.0"
        readOnly
        assetSelectorEnabled
        selectedAsset={assetOut}
        onAssetChange={onSelectAssetOut}
        availableAssets={availableRunes}
        showBtcInSelector
        isAssetsLoading={isLoadingRunes}
        assetsError={currentRunesError}
        isPreselectedAssetLoading={isPreselectedRuneLoading}
        onPercentageClick={undefined}
        usdValue={outputUsdValue || undefined}
        errorMessage={quoteError && !isQuoteLoading ? quoteError : undefined}
        bottomContent={
          quoteError && !isQuoteLoading ? (
            <div
              className="smallText"
              style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
            >
              Please retry the swap, reconnect your wallet, or try a different
              amount.
            </div>
          ) : undefined
        }
      />
      <PriceInfoPanel
        assetIn={assetIn}
        assetOut={assetOut}
        exchangeRate={exchangeRate}
        isQuoteLoading={isQuoteLoading}
        quoteError={quoteError}
        debouncedInputAmount={debouncedInputAmount}
        loadingDots={loadingDots}
        showPriceChart={showPriceChart}
        onShowPriceChart={onShowPriceChart}
      />
      {feeSelector}
      <SwapButton
        connected={connected}
        assetIn={assetIn}
        assetOut={assetOut}
        inputAmount={inputAmount}
        isQuoteLoading={isQuoteLoading}
        isSwapping={isSwapping}
        quoteError={quoteError}
        quote={quote}
        quoteExpired={quoteExpired}
        swapStep={swapStep}
        txId={txId}
        loadingDots={loadingDots}
        onFetchQuote={onFetchQuote}
        onSwap={onSwap}
      />
      <SwapStatusMessages
        isSwapping={isSwapping}
        swapStep={swapStep}
        swapError={swapError}
        txId={txId}
        loadingDots={loadingDots}
      />
    </div>
  );
}
