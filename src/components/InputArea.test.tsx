/**
 * @jest-environment node
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { BTC_ASSET } from '@/types/common';
import InputArea from './InputArea';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement('img', props),
}));

describe('InputArea', () => {
  it('renders with assetSelectorEnabled and no onAssetChange', () => {
    expect(() => {
      renderToString(
        React.createElement(InputArea, {
          label: 'Label',
          inputId: 'input',
          inputValue: '',
          assetSelectorEnabled: true,
          selectedAsset: BTC_ASSET,
          availableAssets: [BTC_ASSET],
          onPercentageClick: undefined,
          errorMessage: undefined,
        }),
      );
    }).not.toThrow();
  });
});
