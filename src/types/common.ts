/**
 * Represents a generic asset, which can be BTC or a Rune.
 */
export interface Asset {
  id: string; // Rune ID or 'BTC'
  name: string; // Rune name or 'BTC'
  imageURI?: string; // URI for the asset image (optional)
  isBTC?: boolean; // Flag to explicitly identify BTC
}

/**
 * Represents Bitcoin (BTC) as a selectable asset.
 */
export const BTC_ASSET: Asset = { id: 'BTC', name: 'BTC', imageURI: '/Bitcoin.svg', isBTC: true }; 