import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
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
        <p className="hero__subtitle">
          <Translate
            id="homepage.tagline"
            description="The homepage tagline">
            Recherches et réflexions sur les défis techniques
          </Translate>
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/presentation">
            <Translate
              id="homepage.discoverDocs"
              description="The homepage button to discover the documentation">
              Découvrir la documentation
            </Translate>
          </Link>
          <Link
            className="button button--secondary button--lg margin-left--md"
            to="/blog">
            <Translate
              id="homepage.readBlog"
              description="The homepage button to read the blog">
              Lire le blog
            </Translate>
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
      title={translate({
        id: 'homepage.title',
        message: 'Accueil',
        description: 'The homepage title',
      })}
      description={translate({
        id: 'homepage.description',
        message: 'Blog technique pour documenter mes recherches et réflexions sur des défis techniques',
        description: 'The homepage meta description',
      })}>
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              <div className="col col--4">
                <h3>
                  <Translate
                    id="homepage.feature1.title"
                    description="Title of feature 1 (technical documentation) on the homepage">
                    Documentation Technique
                  </Translate>
                </h3>
                <p>
                  <Translate
                    id="homepage.feature1.description"
                    description="Description of feature 1 (technical documentation) on the homepage">
                    Documentation approfondie de mes projets et solutions techniques.
                  </Translate>
                </p>
              </div>
              <div className="col col--4">
                <h3>
                  <Translate
                    id="homepage.feature2.title"
                    description="Title of feature 2 (blog posts) on the homepage">
                    Articles de Blog
                  </Translate>
                </h3>
                <p>
                  <Translate
                    id="homepage.feature2.description"
                    description="Description of feature 2 (blog posts) on the homepage">
                    Réflexions et analyses sur les défis techniques rencontrés.
                  </Translate>
                </p>
              </div>
              <div className="col col--4">
                <h3>
                  <Translate
                    id="homepage.feature3.title"
                    description="Title of feature 3 (knowledge sharing) on the homepage">
                    Partage de Connaissances
                  </Translate>
                </h3>
                <p>
                  <Translate
                    id="homepage.feature3.description"
                    description="Description of feature 3 (knowledge sharing) on the homepage">
                    Partage d'expériences et de solutions pour la communauté.
                  </Translate>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
