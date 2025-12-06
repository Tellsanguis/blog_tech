import React from 'react';
import Layout from '@theme/Layout';
import RSSFeedWidget from '@site/src/components/RSSFeedWidget';
import styles from './veille.module.css';

export default function Veille(): JSX.Element {
  return (
    <Layout
      title="Veille Technologique"
      description="Flux RSS quotidiens sur le SysAdmin, DevOps, SRE, Cloud et Sécurité">
      <main className={styles.veillePage}>
        <div className="container">
          <header className={styles.header}>
            <h1>Veille Technologique</h1>
            <p className={styles.subtitle}>
              Articles du jour provenant de sources reconnues en SysAdmin, DevOps, SRE, Cloud et Cybersécurité
            </p>

            <div className={styles.actions}>
              <a
                href="/veille-tech.opml"
                download="veille-tech.opml"
                className={styles.downloadButton}>
                Télécharger le fichier OPML
              </a>
              <p className={styles.opmlInfo}>
                Importez ce fichier dans votre lecteur RSS favori (Feedly, Inoreader, FreshRSS, etc.)
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
