import type { Order } from 'satsterminal-sdk';

/**
 * Normalizes an order object from SatsTerminal by ensuring numeric fields are
 * numbers and the 'side' property is uppercased. This is crucial for preparing
 * orders for API requests, as data from different sources or states might be in
 * string format.
 *
 * @param order - The raw order object, potentially with string-based numbers.
 * @returns A new order object with normalized `price`, `formattedAmount`,
 * `slippage`, and `side`.
 */
export function patchOrder(order: Order): Order {
  const patchedOrder: Partial<Order> = {
    ...order,
    price: typeof order.price === 'string' ? Number(order.price) : order.price,
    formattedAmount:
      typeof order.formattedAmount === 'string'
        ? Number(order.formattedAmount)
        : order.formattedAmount,
  };

  // Only add slippage if it's defined and a valid number
  if (order.slippage !== undefined) {
    const slippageValue =
      typeof order.slippage === 'string'
        ? Number(order.slippage)
        : order.slippage;
    if (!isNaN(slippageValue)) {
      patchedOrder.slippage = slippageValue;
    }
  }

  // Ensure 'side' is uppercase if it exists
  if ('side' in order && order.side) {
    (patchedOrder as Record<string, unknown>)['side'] = String(
      order.side,
    ).toUpperCase() as 'BUY' | 'SELL';
  }

  return patchedOrder as Order;
}
