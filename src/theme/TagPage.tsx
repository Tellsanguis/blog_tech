import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import Layout from '@theme/Layout';
import Translate, {translate} from '@docusaurus/Translate';
import Heading from '@theme/Heading';

import styles from '../pages/tags/styles.module.css';

interface TagItem {
  type: 'blog' | 'doc';
  title: string;
  permalink: string;
  date?: string;
  formattedDate?: string;
  description?: string;
  authors?: any[];
  tags?: any[];
  readingTime?: number;
}

interface TagData {
  label: string;
  permalink: string;
  count: number;
  items: TagItem[];
}

interface TagsMapData {
  [tagKey: string]: TagData;
}

interface UnifiedTagsData {
  tagsMap: TagsMapData;
}

interface TagPageProps {
  tagKey: string;
}

export default function TagPage(props: TagPageProps): JSX.Element {
  const {tagsMap} = usePluginData('docusaurus-plugin-unified-tags') as UnifiedTagsData;
  const tagData = tagsMap[props.tagKey];

  if (!tagData) {
    return (
      <Layout>
        <div className="container margin-vert--lg">
          <Heading as="h1">Tag Not Found</Heading>
          <p>The tag you are looking for does not exist.</p>
          <Link to="/tags">View All Tags</Link>
        </div>
      </Layout>
    );
  }

  const {label, count, items} = tagData;

  return (
    <Layout
      title={translate(
        {
          id: 'tags.filtered.title',
          message: '{count} posts tagged with "{tagName}"',
          description: 'Filtered tag page title',
        },
        {count, tagName: label}
      )}
      description={translate(
        {
          id: 'tags.filtered.description',
          message: 'Browse all content tagged with {tagName}',
          description: 'Filtered tag page meta description',
        },
        {tagName: label}
      )}>
      <div className="container margin-vert--lg">
        <div className={styles.tagHeader}>
          <Heading as="h1" className={styles.tagTitle}>
            <Translate
              id="tags.filtered.heading"
              description="Filtered tag page heading"
              values={{count, tagName: label}}>
              {'{count} posts tagged with "{tagName}"'}
            </Translate>
          </Heading>
          <Link to="/tags" className={styles.viewAllTagsLink}>
            <Translate id="tags.viewAll" description="View all tags link">
              View All Tags
            </Translate>
          </Link>
        </div>

        <div className={styles.itemsList}>
          {items.map((item, idx) => (
            <article key={idx} className={styles.itemCard}>
              <Heading as="h2" className={styles.itemTitle}>
                <Link to={item.permalink}>{item.title}</Link>
              </Heading>

              {item.type === 'blog' && (
                <div className={styles.itemMeta}>
                  {item.formattedDate && (
                    <time dateTime={item.date} className={styles.itemDate}>
                      {item.formattedDate}
                    </time>
                  )}
                  {item.authors && item.authors.length > 0 && (
                    <span className={styles.itemAuthors}>
                      {item.authors.map((author, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          {author.name}
                        </span>
                      ))}
                    </span>
                  )}
                  {item.readingTime && (
                    <span className={styles.itemReadingTime}>
                      {Math.ceil(item.readingTime)} min read
                    </span>
                  )}
                </div>
              )}

              {item.description && (
                <p className={styles.itemDescription}>{item.description}</p>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className={styles.itemTags}>
                  {item.tags.map((tag, i) => (
                    <Link key={i} to={`/tags/${tag.label.toLowerCase()}`} className={styles.itemTag}>
                      {tag.label}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </Layout>
  );
}
