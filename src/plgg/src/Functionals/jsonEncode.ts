/**
 * Encodes data as formatted JSON string.
 */
export const jsonEncode = (
  data: unknown,
): string => JSON.stringify(data, null, 2);
