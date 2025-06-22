import {
  LEATHER,
  MAGIC_EDEN,
  OKX,
  ORANGE,
  OYL,
  PHANTOM,
  type ProviderType,
  UNISAT,
  WIZZ,
  XVERSE,
} from '@omnisat/lasereyes';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { AVAILABLE_WALLETS, useWalletConnection } from './useWalletConnection';

// Mock the LaserEyes context
jest.mock('@/context/LaserEyesContext', () => ({
  useSharedLaserEyes: jest.fn(),
}));

const { useSharedLaserEyes } = jest.requireMock('@/context/LaserEyesContext');

beforeAll(() => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  (global as unknown as { window: Window }).window =
    dom.window as unknown as Window;
  (global as unknown as { document: Document }).document = dom.window.document;
  // Add MouseEvent to global for tests
  (global as typeof globalThis).MouseEvent = dom.window.MouseEvent;
});

afterAll(() => {
  (
    global as unknown as { window: Window & { close: () => void } }
  ).window.close();
});

function renderHook() {
  let result: ReturnType<typeof useWalletConnection>;
  function TestComponent() {
    result = useWalletConnection();
    return null;
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(TestComponent));
  });
  return {
    get result() {
      return result!;
    },
    unmount() {
      act(() => {
        root.unmount();
      });
    },
  };
}

function mockLaserEyes(
  overrides: Partial<ReturnType<typeof useSharedLaserEyes>> = {},
) {
  const mockConnect = jest.fn();
  const mockDisconnect = jest.fn();

  (useSharedLaserEyes as jest.Mock).mockReturnValue({
    connect: mockConnect,
    disconnect: mockDisconnect,
    connected: false,
    isConnecting: false,
    address: null,
    provider: null,
    hasUnisat: false,
    ...overrides,
  });

  return { mockConnect, mockDisconnect };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLaserEyes();
  // Mock console.error to suppress expected error logs in tests
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console.error
  jest.restoreAllMocks();
});

describe('useWalletConnection', () => {
  describe('initial state', () => {
    it('returns correct initial state', () => {
      const hook = renderHook();

      expect(hook.result.isDropdownOpen).toBe(false);
      expect(hook.result.connectionError).toBe(null);
      expect(hook.result.installLink).toBe(null);
      expect(hook.result.connected).toBe(false);
      expect(hook.result.isConnecting).toBe(false);
      expect(hook.result.address).toBe(null);
      expect(hook.result.provider).toBe(null);

      hook.unmount();
    });

    it('passes through LaserEyes state correctly', () => {
      mockLaserEyes({
        connected: true,
        isConnecting: false,
        address: 'bc1test123',
        provider: 'unisat',
      });

      const hook = renderHook();

      expect(hook.result.connected).toBe(true);
      expect(hook.result.isConnecting).toBe(false);
      expect(hook.result.address).toBe('bc1test123');
      expect(hook.result.provider).toBe('unisat');

      hook.unmount();
    });
  });

  describe('toggleDropdown', () => {
    it('toggles dropdown state', () => {
      const hook = renderHook();

      expect(hook.result.isDropdownOpen).toBe(false);

      act(() => {
        hook.result.toggleDropdown();
      });

      expect(hook.result.isDropdownOpen).toBe(true);

      act(() => {
        hook.result.toggleDropdown();
      });

      expect(hook.result.isDropdownOpen).toBe(false);

      hook.unmount();
    });

    it('clears errors when toggling dropdown', () => {
      const hook = renderHook();

      // Set some error state first
      act(() => {
        hook.result.handleConnect(UNISAT);
      });

      expect(hook.result.connectionError).toBe('Unisat wallet not installed.');

      act(() => {
        hook.result.toggleDropdown();
      });

      expect(hook.result.connectionError).toBe(null);
      expect(hook.result.installLink).toBe(null);

      hook.unmount();
    });
  });

  describe('handleConnect', () => {
    it('successfully connects to wallet', async () => {
      const { mockConnect } = mockLaserEyes({
        hasUnisat: true,
      });
      mockConnect.mockResolvedValue(undefined);

      const hook = renderHook();

      await act(async () => {
        await hook.result.handleConnect(UNISAT);
      });

      expect(mockConnect).toHaveBeenCalledWith(UNISAT);
      expect(hook.result.connectionError).toBe(null);
      expect(hook.result.installLink).toBe(null);
      expect(hook.result.isDropdownOpen).toBe(false);

      hook.unmount();
    });

    it('handles wallet not installed (Unisat specific check)', async () => {
      mockLaserEyes({
        hasUnisat: false,
      });

      const hook = renderHook();

      await act(async () => {
        await hook.result.handleConnect(UNISAT);
      });

      expect(hook.result.connectionError).toBe('Unisat wallet not installed.');
      expect(hook.result.installLink).toBe('https://unisat.io/download');

      hook.unmount();
    });

    it('handles connection error with wallet-specific patterns', async () => {
      const { mockConnect } = mockLaserEyes({
        hasUnisat: true,
      });
      mockConnect.mockRejectedValue(new Error('not detected'));

      const hook = renderHook();

      await act(async () => {
        await hook.result.handleConnect(UNISAT);
      });

      expect(hook.result.connectionError).toBe('Unisat wallet not installed.');
      expect(hook.result.installLink).toBe('https://unisat.io/download');

      hook.unmount();
    });

    it('handles connection error with common patterns', async () => {
      const { mockConnect } = mockLaserEyes();
      mockConnect.mockRejectedValue(new Error('provider not available'));

      const hook = renderHook();

      await act(async () => {
        await hook.result.handleConnect(XVERSE);
      });

      expect(hook.result.connectionError).toBe('Xverse wallet not installed.');
      expect(hook.result.installLink).toBe('https://www.xverse.app/download');

      hook.unmount();
    });

    it('handles generic connection error', async () => {
      const { mockConnect } = mockLaserEyes();
      mockConnect.mockRejectedValue(new Error('Connection failed'));

      const hook = renderHook();

      await act(async () => {
        await hook.result.handleConnect(XVERSE);
      });

      expect(hook.result.connectionError).toBe(
        'Failed to connect to Xverse: Connection failed',
      );
      expect(hook.result.installLink).toBe(null);

      hook.unmount();
    });

    it('handles non-Error exceptions', async () => {
      const { mockConnect } = mockLaserEyes();
      mockConnect.mockRejectedValue('string error');

      const hook = renderHook();

      await act(async () => {
        await hook.result.handleConnect(XVERSE);
      });

      expect(hook.result.connectionError).toBe('Xverse wallet not installed.');
      expect(hook.result.installLink).toBe('https://www.xverse.app/download');

      hook.unmount();
    });

    it('returns early if already connecting', async () => {
      const { mockConnect } = mockLaserEyes({
        isConnecting: true,
      });

      const hook = renderHook();

      await act(async () => {
        await hook.result.handleConnect(UNISAT);
      });

      expect(mockConnect).not.toHaveBeenCalled();

      hook.unmount();
    });

    it('clears previous errors before connecting', async () => {
      const { mockConnect } = mockLaserEyes();
      mockConnect.mockResolvedValue(undefined);

      const hook = renderHook();

      // Set some error state first
      act(() => {
        hook.result.toggleDropdown();
      });

      await act(async () => {
        await hook.result.handleConnect(XVERSE);
      });

      expect(hook.result.connectionError).toBe(null);
      expect(hook.result.installLink).toBe(null);

      hook.unmount();
    });

    it('uses provider name as fallback for unknown wallets', async () => {
      const { mockConnect } = mockLaserEyes();
      mockConnect.mockRejectedValue(new Error('Connection failed'));

      const hook = renderHook();

      await act(async () => {
        await hook.result.handleConnect(WIZZ);
      });

      expect(hook.result.connectionError).toBe(
        'Failed to connect to Wizz: Connection failed',
      );

      hook.unmount();
    });
  });

  describe('handleDisconnect', () => {
    it('disconnects wallet and clears errors', () => {
      const { mockDisconnect } = mockLaserEyes();

      const hook = renderHook();

      // Set some error state first
      act(() => {
        hook.result.toggleDropdown();
      });

      act(() => {
        hook.result.handleDisconnect();
      });

      expect(mockDisconnect).toHaveBeenCalled();
      expect(hook.result.connectionError).toBe(null);
      expect(hook.result.installLink).toBe(null);

      hook.unmount();
    });
  });

  describe('click outside functionality', () => {
    it('closes dropdown when clicking outside', () => {
      const hook = renderHook();

      // Open dropdown
      act(() => {
        hook.result.toggleDropdown();
      });

      expect(hook.result.isDropdownOpen).toBe(true);

      // Mock the dropdownRef to not contain the target (click outside)
      const mockContains = jest.fn().mockReturnValue(false);
      hook.result.dropdownRef.current = {
        contains: mockContains,
      } as unknown as HTMLDivElement;

      // Simulate click outside
      act(() => {
        const event = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
      });

      expect(hook.result.isDropdownOpen).toBe(false);

      hook.unmount();
    });

    it('does not close dropdown when clicking inside', () => {
      const hook = renderHook();

      // Open dropdown
      act(() => {
        hook.result.toggleDropdown();
      });

      expect(hook.result.isDropdownOpen).toBe(true);

      // Mock the dropdownRef to contain the target
      const mockContains = jest.fn().mockReturnValue(true);
      hook.result.dropdownRef.current = {
        contains: mockContains,
      } as unknown as HTMLDivElement;

      // Simulate click inside
      act(() => {
        const event = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
      });

      expect(hook.result.isDropdownOpen).toBe(true);

      hook.unmount();
    });

    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(
        document,
        'removeEventListener',
      );

      const hook = renderHook();
      hook.unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function),
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('wallet error patterns', () => {
    it.each([
      [UNISAT, 'not detected', 'https://unisat.io/download'],
      [
        XVERSE,
        'no bitcoin wallet installed',
        'https://www.xverse.app/download',
      ],
      [
        LEATHER,
        "leather isn't installed",
        'https://leather.io/install-extension',
      ],
      [
        OYL,
        "oyl isn't installed",
        'https://chromewebstore.google.com/detail/oyl-wallet-bitcoin-ordina/ilolmnhjbbggkmopnemiphomhaojndmb',
      ],
      [
        MAGIC_EDEN,
        'no bitcoin wallet installed',
        'https://wallet.magiceden.io/download',
      ],
      [
        OKX,
        'cannot read properties of undefined',
        'https://web3.okx.com/en-eu/download',
      ],
      [
        ORANGE,
        'no orange bitcoin wallet installed',
        'https://chromewebstore.google.com/detail/orange-wallet/glmhbknppefdmpemdmjnjlinpbclokhn?hl=en&authuser=0',
      ],
      [PHANTOM, "phantom isn't installed", 'https://phantom.com/download'],
      [WIZZ, 'wallet is not installed', 'https://wizzwallet.io/'],
    ])(
      'handles %s wallet error pattern "%s"',
      async (provider, errorMessage, expectedLink) => {
        const { mockConnect } = mockLaserEyes();
        mockConnect.mockRejectedValue(new Error(errorMessage));

        const hook = renderHook();

        await act(async () => {
          await hook.result.handleConnect(provider as ProviderType);
        });

        const walletName =
          AVAILABLE_WALLETS.find((w) => w.provider === provider)?.name ||
          provider;
        expect(hook.result.connectionError).toBe(
          `${walletName} wallet not installed.`,
        );
        expect(hook.result.installLink).toBe(expectedLink);

        hook.unmount();
      },
    );
  });

  describe('AVAILABLE_WALLETS constant', () => {
    it('exports correct wallet configuration', () => {
      expect(AVAILABLE_WALLETS).toEqual([
        { name: 'Xverse', provider: XVERSE },
        { name: 'Unisat', provider: UNISAT },
        { name: 'Leather', provider: LEATHER },
        { name: 'OKX', provider: OKX },
        { name: 'Magic Eden', provider: MAGIC_EDEN },
        { name: 'OYL', provider: OYL },
        { name: 'Orange', provider: ORANGE },
        {
          name: 'Phantom',
          provider: PHANTOM,
          disclaimer:
            'Runes are not supported in Phantom wallet. Use with caution.',
        },
        { name: 'Wizz', provider: WIZZ },
      ]);
    });
  });
});
