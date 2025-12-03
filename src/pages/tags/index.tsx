import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import Layout from '@theme/Layout';
import Translate, {translate} from '@docusaurus/Translate';
import Heading from '@theme/Heading';

import styles from './styles.module.css';

interface Tag {
  label: string;
  permalink: string;
  count: number;
}

interface TagsByLetter {
  [letter: string]: Tag[];
}

interface UnifiedTagsData {
  allTags: Tag[];
  tagsByLetter: TagsByLetter;
}

export default function TagsPage(): JSX.Element {
  const pluginData = usePluginData('docusaurus-plugin-unified-tags') as UnifiedTagsData;

  console.log('Plugin data:', pluginData);

  if (!pluginData || !pluginData.tagsByLetter) {
    return (
      <Layout>
        <div className="container margin-vert--lg">
          <p>No tags data available</p>
        </div>
      </Layout>
    );
  }

  const {tagsByLetter} = pluginData;
  const letters = Object.keys(tagsByLetter).sort();

  return (
    <Layout
      title={translate({
        id: 'tags.page.title',
        message: 'Tags',
        description: 'Tags page title',
      })}
      description={translate({
        id: 'tags.page.description',
        message: 'Browse content by tags',
        description: 'Tags page meta description',
      })}>
      <div className="container margin-vert--lg">
        <Heading as="h1" className={styles.tagsPageTitle}>
          <Translate id="tags.page.heading" description="Tags page main heading">
            Tags
          </Translate>
        </Heading>

        <div className={styles.tagsContainer}>
          {letters.map((letter) => (
            <div key={letter} className={styles.letterSection}>
              <Heading as="h2" className={styles.letterHeading}>
                {letter}
              </Heading>
              <div className={styles.tagsRow}>
                {tagsByLetter[letter].map((tag) => (
                  <Link
                    key={tag.label}
                    to={`/tags/${tag.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={styles.tagLink}>
                    <span className={styles.tagLabel}>{tag.label}</span>
                    <span className={styles.tagCount}>{tag.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
