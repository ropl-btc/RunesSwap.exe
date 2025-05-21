export const COINGECKO_BTC_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

export const getBtcPrice = async (): Promise<number> => {
  const response = await fetch(COINGECKO_BTC_PRICE_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch BTC price from CoinGecko");
  }
  const data = await response.json();
  if (!data.bitcoin || !data.bitcoin.usd) {
    throw new Error("Invalid response format from CoinGecko");
  }
  return data.bitcoin.usd;
};
