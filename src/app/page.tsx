import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { SwapInterface } from '@/components/SwapInterface';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.mainContainer}>
      <div className={styles.connectButtonContainer}>
         <ConnectWalletButton />
      </div>

      <SwapInterface />

      {/* Optional: Add other content/components below */}
      {/* <p className="pt-4 text-xs">Status: Ready</p> */}
    </div>
  );
}
