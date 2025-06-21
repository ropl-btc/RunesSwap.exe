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
import { useEffect, useRef, useState } from 'react';
import { useSharedLaserEyes } from '@/context/LaserEyesContext';

interface WalletErrorPatterns {
  notInstalledPatterns: string[];
  otherPatterns?: {
    [key: string]: string[];
  };
}

const WALLET_ERROR_PATTERNS: Partial<
  Record<ProviderType, WalletErrorPatterns>
> = {
  [UNISAT]: {
    notInstalledPatterns: ['not detected', 'not installed', 'not found'],
  },
  [XVERSE]: {
    notInstalledPatterns: [
      'no bitcoin wallet installed',
      'extension not installed',
      'is not defined',
    ],
  },
  [LEATHER]: {
    notInstalledPatterns: ["leather isn't installed"],
  },
  [OYL]: {
    notInstalledPatterns: ["oyl isn't installed"],
  },
  [MAGIC_EDEN]: {
    notInstalledPatterns: ['no bitcoin wallet installed'],
  },
  [OKX]: {
    notInstalledPatterns: [
      'cannot read properties of undefined',
      'provider not available',
    ],
  },
  [ORANGE]: {
    notInstalledPatterns: ['no orange bitcoin wallet installed'],
  },
  [PHANTOM]: {
    notInstalledPatterns: [
      "phantom isn't installed",
      'provider unavailable',
      'no provider',
    ],
  },
  [WIZZ]: {
    notInstalledPatterns: ['wallet is not installed'],
  },
};

const COMMON_ERROR_PATTERNS: string[] = [
  'not installed',
  'not detected',
  'not found',
  'provider not available',
  'wallet not found',
  'extension not installed',
  'missing provider',
  'undefined provider',
  'provider unavailable',
  'no provider',
  'cannot find',
  'not connected',
  'is not defined',
  'is undefined',
  'not exist',
];

const WALLET_INSTALL_LINKS: Partial<Record<ProviderType, string>> = {
  [UNISAT]: 'https://unisat.io/download',
  [XVERSE]: 'https://www.xverse.app/download',
  [LEATHER]: 'https://leather.io/install-extension',
  [OYL]:
    'https://chromewebstore.google.com/detail/oyl-wallet-bitcoin-ordina/ilolmnhjbbggkmopnemiphomhaojndmb',
  [MAGIC_EDEN]: 'https://wallet.magiceden.io/download',
  [OKX]: 'https://web3.okx.com/en-eu/download',
  [ORANGE]:
    'https://chromewebstore.google.com/detail/orange-wallet/glmhbknppefdmpemdmjnjlinpbclokhn?hl=en&authuser=0',
  [PHANTOM]: 'https://phantom.com/download',
  [WIZZ]: 'https://wizzwallet.io/',
};

export const AVAILABLE_WALLETS: {
  name: string;
  provider: ProviderType;
  disclaimer?: string;
}[] = [
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
    disclaimer: 'Runes are not supported in Phantom wallet. Use with caution.',
  },
  { name: 'Wizz', provider: WIZZ },
];

export function useWalletConnection() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [installLink, setInstallLink] = useState<string | null>(null);

  const {
    connect,
    disconnect,
    connected,
    isConnecting,
    address,
    provider,
    hasUnisat,
  } = useSharedLaserEyes();

  const checkWalletInstalled = (providerToConnect: ProviderType): boolean => {
    switch (providerToConnect) {
      case UNISAT:
        return hasUnisat || false;
      default:
        return true;
    }
  };

  const handleConnect = async (providerToConnect: ProviderType) => {
    setIsDropdownOpen(false);
    setConnectionError(null);
    setInstallLink(null);

    if (isConnecting) {
      return;
    }

    const walletName =
      AVAILABLE_WALLETS.find((w) => w.provider === providerToConnect)?.name ||
      providerToConnect;

    if (!checkWalletInstalled(providerToConnect)) {
      setConnectionError(`${walletName} wallet not installed.`);
      setInstallLink(WALLET_INSTALL_LINKS[providerToConnect] || null);
      return;
    }

    try {
      await connect(providerToConnect);
    } catch (error) {
      console.error(`Failed to connect wallet:`, error);

      let isWalletNotInstalledError = false;
      let errorMessage = '';

      if (error instanceof Error) {
        const errorString = error.message.toLowerCase();
        const walletPatterns = WALLET_ERROR_PATTERNS[providerToConnect];
        if (walletPatterns) {
          isWalletNotInstalledError = walletPatterns.notInstalledPatterns.some(
            (pattern) => errorString.includes(pattern.toLowerCase()),
          );
        }

        if (!isWalletNotInstalledError) {
          isWalletNotInstalledError = COMMON_ERROR_PATTERNS.some((pattern) =>
            errorString.includes(pattern.toLowerCase()),
          );
        }

        errorMessage = error.message;
      } else {
        isWalletNotInstalledError = true;
        errorMessage = 'Wallet provider unavailable';
      }

      if (isWalletNotInstalledError) {
        setConnectionError(`${walletName} wallet not installed.`);
        setInstallLink(WALLET_INSTALL_LINKS[providerToConnect] || null);
      } else {
        setConnectionError(
          `Failed to connect to ${walletName}: ${errorMessage || 'Unknown error'}`,
        );
        setInstallLink(null);
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setConnectionError(null);
    setInstallLink(null);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    setConnectionError(null);
    setInstallLink(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return {
    connected,
    isConnecting,
    address,
    provider,
    connectionError,
    installLink,
    isDropdownOpen,
    dropdownRef,
    toggleDropdown,
    handleConnect,
    handleDisconnect,
  };
}
