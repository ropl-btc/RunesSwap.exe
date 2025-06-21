export const handleApiResponse = <T>(
  data: unknown,
  expectedArrayType = false,
): T => {
  if (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    (data as Record<string, unknown>).success === true &&
    'data' in data
  ) {
    const responseData = (data as { data: unknown }).data;
    if (expectedArrayType && !Array.isArray(responseData)) {
      return [] as unknown as T;
    }
    return responseData as T;
  }
  if (
    (expectedArrayType && Array.isArray(data)) ||
    (!expectedArrayType && data !== null)
  ) {
    return data as T;
  }
  return (expectedArrayType ? [] : null) as unknown as T;
};
