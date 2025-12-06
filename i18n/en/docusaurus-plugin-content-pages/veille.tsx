import React from 'react';
import Layout from '@theme/Layout';
import RSSFeedWidget from '@site/src/components/RSSFeedWidget';
import styles from './veille.module.css';

export default function Veille(): JSX.Element {
  return (
    <Layout
      title="Tech Watch"
      description="Daily RSS feeds on SysAdmin, DevOps, SRE, Cloud, and Security">
      <main className={styles.veillePage}>
        <div className="container">
          <header className={styles.header}>
            <h1>Tech Watch</h1>
            <p className={styles.subtitle}>
              Today's articles from recognized sources in SysAdmin, DevOps, SRE, Cloud, and Cybersecurity
            </p>

            <div className={styles.actions}>
              <a
                href="/veille-tech.opml"
                download="veille-tech.opml"
                className={styles.downloadButton}>
                Download OPML file
              </a>
              <p className={styles.opmlInfo}>
                Import this file into your favorite RSS reader (Feedly, Inoreader, FreshRSS, etc.)
              </p>
            </div>
          </header>

          <section className={styles.content}>
            <RSSFeedWidget />
          </section>
        </div>
      </main>
    </Layout>
  );
}
