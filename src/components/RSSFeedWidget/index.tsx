import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import styles from './styles.module.css';

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
}

interface CategoryGroup {
  category: string;
  items: FeedItem[];
}

interface RSSCacheData {
  groups: CategoryGroup[];
  generatedAt: string;
  totalArticles: number;
}

const RSSFeedWidget: React.FC = () => {
  const location = useLocation();
  const isEnglish = location.pathname.startsWith('/en');
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const t = {
    loading: isEnglish ? 'Loading RSS feeds...' : 'Chargement des flux RSS...',
    error: isEnglish ? 'Error loading RSS feeds' : 'Erreur lors du chargement des flux RSS',
    noArticles: isEnglish ? 'No articles published in the last 24 hours in monitored RSS feeds.' : 'Aucun article publié dans les dernières 24h dans les flux RSS suivis.',
    comeBack: isEnglish ? 'Come back later for new updates!' : 'Revenez plus tard pour de nouvelles actualités !',
    articlesCount: (count: number, updateTime: string) => isEnglish
      ? `${count} article${count > 1 ? 's' : ''} in the last 24 hours (last update: ${updateTime})`
      : `${count} article${count > 1 ? 's' : ''} publié${count > 1 ? 's' : ''} dans les dernières 24h (dernière mise à jour : ${updateTime})`,
  };

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        setLoading(true);

        // Chargement du fichier JSON pré-généré au build
        const response = await fetch('/rss-feed-cache.json');
        const data: RSSCacheData = await response.json();

        setCategoryGroups(data.groups);
        setGeneratedAt(data.generatedAt);
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des flux RSS:', err);
        setError('Erreur lors du chargement des flux RSS');
        setLoading(false);
      }
    };

    fetchFeeds();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      if (isEnglish) {
        return `${month}/${day}/${year} ${hours}:${minutes}`;
      } else {
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      }
    } catch {
      return dateString;
    }
  };

  const formatUpdateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const getTotalArticles = () => {
    return categoryGroups.reduce((total, group) => total + group.items.length, 0);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{t.error}</p>
      </div>
    );
  }

  if (categoryGroups.length === 0) {
    return (
      <div className={styles.noArticles}>
        <p>{t.noArticles}</p>
        <p>{t.comeBack}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        <p>{t.articlesCount(getTotalArticles(), formatUpdateTime(generatedAt))}</p>
      </div>

      {categoryGroups.map((group) => {
        const isExpanded = expandedCategories.has(group.category);
        return (
          <div key={group.category} className={styles.categorySection}>
            <h2
              className={styles.categoryTitle}
              onClick={() => toggleCategory(group.category)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <span className={styles.categoryTitleContent}>
                <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                {group.category}
              </span>
              <span className={styles.categoryCount}>{group.items.length}</span>
            </h2>

            {isExpanded && (
              <div className={styles.feedList}>
                {group.items.map((item, index) => (
                  <article key={`${item.link}-${index}`} className={styles.feedItem}>
                    <div className={styles.feedHeader}>
                      <span className={styles.source}>{item.source}</span>
                      <time className={styles.date}>{formatDate(item.pubDate)}</time>
                    </div>
                    <h3 className={styles.title}>
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    </h3>
                  </article>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RSSFeedWidget;
