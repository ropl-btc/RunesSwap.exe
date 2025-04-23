import fs from 'fs';
import path from 'path';
import React from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../page.module.css';

export default function DocsPage() {
  const readmePath = path.join(process.cwd(), 'README.md');
  let fileContents = '';
  try {
    fileContents = fs.readFileSync(readmePath, 'utf-8');
  } catch (err) {
    console.error('Error reading README.md:', err);
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Documentation</h1>
      <div className={styles.docsContent}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {fileContents}
        </ReactMarkdown>
      </div>
      <div className={styles.backToHome}>
        <Link href="/">
          Back to Home
        </Link>
      </div>
    </div>
  );
}