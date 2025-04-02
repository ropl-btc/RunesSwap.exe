'use client';

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../page.module.css';

export default function DocsPage() {
  return (
    <div className={styles.container}>
      <Head>
        <title>RunesSwap.app - Bitcoin Runes Swapping Platform Documentation</title>
        <meta name="description" content="Learn how to use RunesSwap.app - the premier Bitcoin Runes swap platform. Swap, buy, and sell Bitcoin Runes with our decentralized exchange (DEX)." />
        <meta name="keywords" content="bitcoin, runes, bitcoin runes, ordinals, inscriptions, swap, dex, swapping, swaps, sell, buy, decentralized exchange, bitcoin swap" />
      </Head>
      
      <h1 className={styles.title}>RunesSwap.app Documentation</h1>
      
      <div className={styles.docsContent}>
        <section>
          <h2>What is RunesSwap.app?</h2>
          <p>
            RunesSwap.app is a Bitcoin Runes swap platform built with Next.js, TypeScript, and SatsTerminal SDK. 
            Our platform provides a Uniswap-like experience for the Bitcoin ecosystem, featuring a minimalist 
            Windows 98 UI theme that offers an intuitive yet nostalgic user experience.
          </p>
        </section>
        
        <section>
          <h2>Key Features</h2>
          <ul>
            <li><strong>Seamless Bitcoin Runes Swapping</strong> - Trade your Bitcoin Runes easily</li>
            <li><strong>Wallet Integration</strong> - Connect securely with Laser Eyes wallet technology</li>
            <li><strong>Balance & UTXO Tracking</strong> - View your holdings via Ordiscan integration</li>
            <li><strong>Mobile-Friendly Design</strong> - Trade on any device with our responsive interface</li>
            <li><strong>Lightweight Performance</strong> - Enjoy fast loading times and minimal resource usage</li>
            <li><strong>Retro Windows 98 UI</strong> - Experience the nostalgic minimalist interface</li>
          </ul>
        </section>
        
        <section>
          <h2>How to Use RunesSwap.app</h2>
          
          <h3>1. Connect Your Wallet</h3>
          <p>
            Click the &ldquo;Connect Wallet&rdquo; button and select your preferred Bitcoin wallet. 
            RunesSwap.app uses Laser Eyes technology for secure wallet connections.
          </p>
          
          <h3>2. Select Tokens to Swap</h3>
          <p>
            Choose which Bitcoin Runes you want to swap from the dropdown menus.
            Select your input and output tokens and specify the amount you wish to trade.
          </p>
          
          <h3>3. Review and Confirm</h3>
          <p>
            Check the swap details, including exchange rate, fees, and estimated output.
            Once satisfied, click &ldquo;Swap&rdquo; to confirm the transaction.
          </p>
          
          <h3>4. Complete the Transaction</h3>
          <p>
            Approve the transaction in your wallet. The swap will be executed on the Bitcoin 
            blockchain using inscriptions technology.
          </p>
          
          <h3>5. View Transaction History</h3>
          <p>
            Track all your swaps in the &ldquo;Your Txs&rdquo; tab to see pending and completed transactions.
          </p>
        </section>
        
        <section>
          <h2>Technical Information</h2>
          <p>
            RunesSwap.app is built using a modern tech stack:
          </p>
          <ul>
            <li><strong>Framework:</strong> Next.js</li>
            <li><strong>Language:</strong> TypeScript</li>
            <li><strong>Styling:</strong> Regular CSS</li>
            <li><strong>Swap Logic:</strong> SatsTerminal SDK</li>
            <li><strong>Wallet Connection:</strong> Laser Eyes</li>
            <li><strong>Data Fetching:</strong> React Query (TanStack Query)</li>
            <li><strong>State Management:</strong> Zustand</li>
            <li><strong>Balance/UTXO Info:</strong> Ordiscan</li>
          </ul>
        </section>
        
        <section>
          <h2>FAQ</h2>
          
          <h3>What are Bitcoin Runes?</h3>
          <p>
            Bitcoin Runes is a token protocol built on Bitcoin that enables the creation and transfer
            of fungible tokens directly on the Bitcoin blockchain. Runes offer improved
            efficiency and capabilities for token operations on Bitcoin.
          </p>
          
          <h3>How are Runes different from Ordinals?</h3>
          <p>
            While Ordinals use inscriptions to store data, Runes use a more
            efficient method that reduces blockchain bloat while maintaining the security and
            decentralization of Bitcoin.
          </p>
          
          <h3>Are swaps instant?</h3>
          <p>
            Swaps are subject to Bitcoin blockchain confirmation times, which typically range
            from 10 minutes to an hour depending on network congestion and transaction fees.
          </p>
          
          <h3>What fees are involved?</h3>
          <p>
            RunesSwap.app doesn&apos;t charge any extra fees on top of the standard SatsTerminal fees. 
            This means we almost always provide the best exchange rates for Bitcoin Runes swaps. 
            Users only pay the standard Bitcoin network fee required for processing the transaction 
            on the blockchain.
          </p>
        </section>
        
        <section>
          <h2>Contact & Support</h2>
          <p>
            For support or inquiries, please reach out through our GitHub repository or follow
            us on Twitter/X for the latest updates.
          </p>
          <div className={styles.contactLinks}>
            <a 
              href="https://github.com/ropl-btc/RunesSwap.app" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              GitHub Repository
            </a>
            <a 
              href="https://twitter.com/robin_liquidium" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Twitter/X
            </a>
          </div>
        </section>
        
        <div className={styles.backToHome}>
          <Link href="/">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
} 