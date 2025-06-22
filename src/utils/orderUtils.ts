import type { Order } from 'satsterminal-sdk';

/**
 * Normalizes an order object from SatsTerminal by ensuring numeric fields are
 * numbers. This is crucial for preparing orders for API requests, as data from
 * different sources or states might be in string format.
 *
 * @param order - The raw order object, potentially with string-based numbers.
 * @returns A new order object with normalized numeric fields.
 */
export function patchOrder(order: Order): Order {
  const patchedOrder: Partial<Order> = { ...order };

  if (typeof patchedOrder.price === 'string') {
    const priceAsNumber = Number(patchedOrder.price);
    if (!isNaN(priceAsNumber)) {
      patchedOrder.price = priceAsNumber;
    }
  }

  if (typeof patchedOrder.formattedAmount === 'string') {
    const amountAsNumber = Number(patchedOrder.formattedAmount);
    if (!isNaN(amountAsNumber)) {
      patchedOrder.formattedAmount = amountAsNumber;
    }
  }

  // Only add slippage if it's defined and a valid number
  if (patchedOrder.slippage !== undefined) {
    const slippageValue =
      typeof patchedOrder.slippage === 'string'
        ? Number(patchedOrder.slippage)
        : patchedOrder.slippage;
    if (!isNaN(slippageValue)) {
      patchedOrder.slippage = slippageValue;
    }
  }

  return patchedOrder as Order;
}
