import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/presentation">
            Découvrir la documentation
          </Link>
          <Link
            className="button button--secondary button--lg margin-left--md"
            to="/blog">
            Lire le blog
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Accueil`}
      description="Blog technique pour documenter mes recherches et réflexions sur des défis techniques">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              <div className="col col--4">
                <h3>Documentation Technique</h3>
                <p>
                  Documentation approfondie de mes projets et solutions techniques.
                </p>
              </div>
              <div className="col col--4">
                <h3>Articles de Blog</h3>
                <p>
                  Réflexions et analyses sur les défis techniques rencontrés.
                </p>
              </div>
              <div className="col col--4">
                <h3>Partage de Connaissances</h3>
                <p>
                  Partage d'expériences et de solutions pour la communauté.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
