import type { Order } from 'satsterminal-sdk';
import { patchOrder } from './orderUtils';

describe('patchOrder', () => {
  it('converts string fields to numbers', () => {
    const order = {
      market: 'BTC-USD',
      id: '1',
      price: '100',
      formattedAmount: '200',
      slippage: '0.5',
    } as unknown as Order;

    const patched = patchOrder(order);
    expect(typeof patched.price).toBe('number');
    expect(typeof patched.formattedAmount).toBe('number');
    expect(typeof patched.slippage).toBe('number');
    expect(patched.price).toBe(100);
    expect(patched.formattedAmount).toBe(200);
    expect(patched.slippage).toBe(0.5);
  });

  it('leaves numeric fields unchanged', () => {
    const order = {
      market: 'BTC-USD',
      id: '2',
      price: 50,
      formattedAmount: 75,
      slippage: 1,
    } as Order;

    const patched = patchOrder(order);
    expect(patched.price).toBe(50);
    expect(patched.formattedAmount).toBe(75);
    expect(patched.slippage).toBe(1);
  });

  it('ignores invalid numeric strings', () => {
    const order = {
      market: 'BTC-USD',
      id: '3',
      price: 'not-a-number',
      formattedAmount: '123abc',
      slippage: 'NaN',
    } as unknown as Order;

    const patched = patchOrder(order);
    expect(patched.price).toBe('not-a-number');
    expect(patched.formattedAmount).toBe('123abc');
    expect(patched.slippage).toBe('NaN');
  });
});
