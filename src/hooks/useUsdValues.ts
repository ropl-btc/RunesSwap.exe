import { useMemo } from 'react';
import { QuoteResponse } from 'satsterminal-sdk';
import { Asset } from '@/types/common';
import { RuneMarketInfo as OrdiscanRuneMarketInfo } from '@/types/ordiscan';

export interface UseUsdValuesArgs {
  inputAmount: string;
  outputAmount: string;
  assetIn: Asset | null;
  assetOut: Asset | null;
  btcPriceUsd: number | undefined;
  isBtcPriceLoading: boolean;
  btcPriceError: Error | null;
  quote: QuoteResponse | null;
  quoteError: string | null;
  inputRuneMarketInfo: OrdiscanRuneMarketInfo | null | undefined;
  outputRuneMarketInfo: OrdiscanRuneMarketInfo | null | undefined;
}

export default function useUsdValues({
  inputAmount,
  outputAmount,
  assetIn,
  assetOut,
  btcPriceUsd,
  isBtcPriceLoading,
  btcPriceError,
  quote,
  quoteError,
  inputRuneMarketInfo,
  outputRuneMarketInfo,
}: UseUsdValuesArgs) {
  return useMemo(() => {
    if (!inputAmount || !assetIn || isBtcPriceLoading || btcPriceError) {
      return {
        inputUsdValue: null as string | null,
        outputUsdValue: null as string | null,
      };
    }

    try {
      const amountNum = parseFloat(inputAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return { inputUsdValue: null, outputUsdValue: null };
      }

      let inputUsdVal: number | null = null;
      if (assetIn.isBTC && btcPriceUsd) {
        inputUsdVal = amountNum * btcPriceUsd;
      } else if (!assetIn.isBTC && inputRuneMarketInfo) {
        inputUsdVal = amountNum * inputRuneMarketInfo.price_in_usd;
      } else if (
        !assetIn.isBTC &&
        quote &&
        quote.totalPrice &&
        btcPriceUsd &&
        !quoteError
      ) {
        const btcPerRune =
          quote.totalFormattedAmount &&
          parseFloat(quote.totalFormattedAmount.replace(/,/g, '')) > 0
            ? parseFloat(quote.totalPrice.replace(/,/g, '')) /
              parseFloat(quote.totalFormattedAmount.replace(/,/g, ''))
            : 0;
        if (btcPerRune > 0) {
          inputUsdVal = amountNum * btcPerRune * btcPriceUsd;
        }
      }

      let outputUsdVal: number | null = null;
      if (outputAmount && assetOut) {
        const sanitizedOutputAmount = outputAmount.replace(/,/g, '');
        const outputAmountNum = parseFloat(sanitizedOutputAmount);
        if (!isNaN(outputAmountNum) && outputAmountNum > 0) {
          if (assetOut.isBTC && btcPriceUsd) {
            outputUsdVal = outputAmountNum * btcPriceUsd;
          } else if (!assetOut.isBTC && outputRuneMarketInfo) {
            outputUsdVal = outputAmountNum * outputRuneMarketInfo.price_in_usd;
          } else if (
            !assetOut.isBTC &&
            quote &&
            quote.totalPrice &&
            btcPriceUsd &&
            !quoteError
          ) {
            const btcPerRune =
              quote.totalFormattedAmount &&
              parseFloat(quote.totalFormattedAmount.replace(/,/g, '')) > 0
                ? parseFloat(quote.totalPrice.replace(/,/g, '')) /
                  parseFloat(quote.totalFormattedAmount.replace(/,/g, ''))
                : 0;
            if (btcPerRune > 0) {
              outputUsdVal = outputAmountNum * btcPerRune * btcPriceUsd;
            }
          }
        }
      }

      const format = (v: number | null) =>
        v !== null && v > 0
          ? v.toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : null;

      return {
        inputUsdValue: format(inputUsdVal),
        outputUsdValue: format(outputUsdVal),
      };
    } catch {
      return { inputUsdValue: null, outputUsdValue: null };
    }
  }, [
    inputAmount,
    outputAmount,
    assetIn,
    assetOut,
    btcPriceUsd,
    isBtcPriceLoading,
    btcPriceError,
    quote,
    quoteError,
    inputRuneMarketInfo,
    outputRuneMarketInfo,
  ]);
}
