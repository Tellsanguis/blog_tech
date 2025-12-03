import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export interface Article {
  title: string;
  permalink: string;
  type: 'blog' | 'doc';
  date?: string;
}

interface ArticleCarouselProps {
  articles: Article[];
  maxVisible?: number;
}

/**
 * ArticleCarousel component displays recent blog posts and documentation
 * with auto-generated thumbnails featuring title and type badge.
 *
 * @param articles - Array of articles to display in the carousel
 * @param maxVisible - Maximum number of visible carousel items (default: 6)
 */
export default function ArticleCarousel({
  articles,
  maxVisible = 6
}: ArticleCarouselProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const { i18n } = useDocusaurusContext();

  // Auto-play carousel every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying || articles.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, articles.length]);

  // Limit articles to maxVisible
  const visibleArticles = articles.slice(0, maxVisible);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) =>
      prev === 0 ? visibleArticles.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % visibleArticles.length);
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  if (visibleArticles.length === 0) {
    return null;
  }

  // Get badge text based on article type and current locale
  const getBadgeText = (type: 'blog' | 'doc'): string => {
    return type === 'blog'
      ? translate({
          id: 'carousel.badge.blog',
          message: 'BLOG',
          description: 'Badge text for blog articles in carousel',
        })
      : translate({
          id: 'carousel.badge.documentation',
          message: 'DOCUMENTATION',
          description: 'Badge text for documentation pages in carousel',
        });
  };

  // Generate consistent background colors for thumbnails
  const getBackgroundColor = (index: number): string => {
    const colors = [
      '#4A90E2', // Blue
      '#50C878', // Emerald
      '#9B59B6', // Purple
      '#E67E22', // Orange
      '#1ABC9C', // Turquoise
      '#E74C3C', // Red
    ];
    return colors[index % colors.length];
  };

  return (
    <section className={styles.carouselSection}>
      <div className="container">
        <h2 className={styles.carouselTitle}>
          {translate({
            id: 'carousel.title',
            message: 'Articles récents',
            description: 'Title of the article carousel section',
          })}
        </h2>

        <div className={styles.carouselContainer}>
          {/* Navigation Arrow - Previous */}
          <button
            className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
            onClick={handlePrevious}
            aria-label={translate({
              id: 'carousel.previous',
              message: 'Article précédent',
              description: 'Previous article button aria-label',
            })}
          >
            ‹
          </button>

          {/* Carousel Track */}
          <div className={styles.carouselTrack}>
            <div
              className={styles.carouselInner}
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {visibleArticles.map((article, index) => (
                <Link
                  key={`${article.permalink}-${index}`}
                  to={article.permalink}
                  className={styles.carouselItem}
                >
                  <div
                    className={styles.articleThumbnail}
                    style={{
                      backgroundColor: getBackgroundColor(index),
                    }}
                  >
                    {/* Type Badge */}
                    <div
                      className={`${styles.articleBadge} ${
                        article.type === 'blog'
                          ? styles.articleBadgeBlog
                          : styles.articleBadgeDoc
                      }`}
                    >
                      {getBadgeText(article.type)}
                    </div>

                    {/* Article Title */}
                    <div className={styles.articleTitle}>
                      <h3>{article.title}</h3>
                    </div>

                    {/* Date (if available for blog posts) */}
                    {article.date && (
                      <div className={styles.articleDate}>
                        {new Date(article.date).toLocaleDateString(
                          i18n.currentLocale === 'fr' ? 'fr-FR' : 'en-US',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation Arrow - Next */}
          <button
            className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
            onClick={handleNext}
            aria-label={translate({
              id: 'carousel.next',
              message: 'Article suivant',
              description: 'Next article button aria-label',
            })}
          >
            ›
          </button>
        </div>

        {/* Carousel Indicators (Dots) */}
        <div className={styles.carouselIndicators}>
          {visibleArticles.map((_, index) => (
            <button
              key={index}
              className={`${styles.carouselDot} ${
                index === currentIndex ? styles.carouselDotActive : ''
              }`}
              onClick={() => handleDotClick(index)}
              aria-label={translate(
                {
                  id: 'carousel.goToSlide',
                  message: 'Aller à la diapositive {index}',
                  description: 'Go to slide button aria-label',
                },
                { index: index + 1 }
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
