import React from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

export const metadata = {
  title: 'Legal | RunesSwap.app',
};

export default function LegalPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Legal Disclaimer</h1>
      <div className={styles.docsContent}>
        <p>RunesSwap.app is an open-source project provided <strong>as is</strong> without any warranty.</p>
        <p>Use at your own risk. The developers assume no liability for any loss or damage.</p>
        <p>Cryptocurrency transactions are irreversible and may result in loss of funds.</p>
        <p>Always verify all transaction details and contract addresses before proceeding.</p>
        <p>No financial or legal advice is provided. This project is for educational purposes only.</p>
        <p>By using RunesSwap.app, you agree that you are solely responsible for your actions.</p>
      </div>
      <div className={styles.backToHome}>
        <Link href="/">Back to Home</Link>
      </div>
    </div>
  );
}