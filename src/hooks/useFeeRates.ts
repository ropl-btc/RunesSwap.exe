import { useQuery } from "@tanstack/react-query";
import { fetchRecommendedFeeRates, QUERY_KEYS } from "@/lib/api";

export const useFeeRates = () =>
  useQuery({
    queryKey: [QUERY_KEYS.BTC_FEE_RATES],
    queryFn: fetchRecommendedFeeRates,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

export default useFeeRates;
