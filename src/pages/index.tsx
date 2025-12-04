import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import ArticleCarousel from '@site/src/components/ArticleCarousel';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
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
                to="/docs/projets-openclassrooms">
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
          <div className={styles.heroIllustration}>
            <img
              src="/img/illustration_vache.png"
              alt="TellServ Tech Blog Illustration"
            />
            <div className={styles.illustrationCredit}>
              <Translate
                id="homepage.illustrationCredit"
                description="The credit for the homepage illustration"
                values={{
                  artistLink: (
                    <a
                      href="https://vassile.fr"
                      target="_blank"
                      rel="noopener noreferrer">
                      Vassile
                    </a>
                  ),
                }}>
                {'Illustration par {artistLink}'}
              </Translate>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();

  // Get recent articles data from plugin
  const {articles} = usePluginData('docusaurus-plugin-recent-articles') as {
    articles: Array<{
      title: string;
      permalink: string;
      type: 'blog' | 'doc';
      date?: string;
    }>;
  };

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
        <ArticleCarousel articles={articles || []} maxVisible={6} />
      </main>
    </Layout>
  );
}
