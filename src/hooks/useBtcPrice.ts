import { useQuery } from "@tanstack/react-query";

const COINGECKO_BTC_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

const getBtcPrice = async (): Promise<number> => {
  const response = await fetch(COINGECKO_BTC_PRICE_URL);
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded for CoinGecko API");
    }
    throw new Error(
      `Failed to fetch BTC price from CoinGecko: ${response.status}`,
    );
  }
  const data = await response.json();
  if (!data.bitcoin || !data.bitcoin.usd)
    throw new Error("Invalid response format from CoinGecko");
  return data.bitcoin.usd;
};

export function useBtcPrice() {
  const { data, isLoading, error } = useQuery<number, Error>({
    queryKey: ["btcPriceUsd"],
    queryFn: getBtcPrice,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  return {
    btcPriceUsd: data,
    isBtcPriceLoading: isLoading,
    btcPriceError: error,
  };
}

export default useBtcPrice;
