/**
 * Docusaurus plugin to gather recent blog posts and documentation pages
 * for the ArticleCarousel component.
 *
 * This plugin creates a global data structure containing recent articles
 * from both blog posts and documentation pages, sorted by date.
 */

module.exports = function pluginRecentArticles(context, options) {
  return {
    name: 'docusaurus-plugin-recent-articles',

    async allContentLoaded({ actions, allContent }) {
      const { setGlobalData } = actions;

      try {
        const blogArticles = [];
        const docArticles = [];

        // Access blog plugin data
        const blogPlugin = allContent?.['docusaurus-plugin-content-blog'];
        const blogContent = blogPlugin?.default;

        if (blogContent?.blogPosts) {
          blogContent.blogPosts.forEach((post) => {
            blogArticles.push({
              title: post.metadata.title,
              permalink: post.metadata.permalink,
              type: 'blog',
              date: post.metadata.date,
            });
          });
        }

        // Access docs plugin data
        const docsPlugin = allContent?.['docusaurus-plugin-content-docs'];
        const docsContent = docsPlugin?.default;

        if (docsContent?.loadedVersions) {
          docsContent.loadedVersions.forEach((version) => {
            if (version.docs) {
              version.docs.forEach((doc) => {
                // Skip index/category pages to focus on actual content
                if (!doc.id.endsWith('/index') && !doc.id.includes('category')) {
                  docArticles.push({
                    title: doc.title,
                    permalink: doc.permalink,
                    type: 'doc',
                    // Docs don't have a publish date, use last updated time or current date
                    date: doc.lastUpdatedAt
                      ? new Date(doc.lastUpdatedAt).toISOString()
                      : new Date().toISOString(),
                  });
                }
              });
            }
          });
        }

        // Sort each type by date (most recent first)
        blogArticles.sort((a, b) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateB - dateA;
        });

        docArticles.sort((a, b) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateB - dateA;
        });

        // Take 3 most recent from each type
        const recentBlog = blogArticles.slice(0, 3);
        const recentDocs = docArticles.slice(0, 3);

        // Determine which type has the most recent content
        const mostRecentBlog = recentBlog.length > 0 ? new Date(recentBlog[0].date) : new Date(0);
        const mostRecentDoc = recentDocs.length > 0 ? new Date(recentDocs[0].date) : new Date(0);
        const startWithBlog = mostRecentBlog >= mostRecentDoc;

        // Intercalate blog and documentation articles, starting with the most recent type
        const articles = [];
        for (let i = 0; i < Math.max(recentBlog.length, recentDocs.length); i++) {
          if (startWithBlog) {
            // Start with blog: blog, doc, blog, doc, blog, doc
            if (i < recentBlog.length) {
              articles.push(recentBlog[i]);
            }
            if (i < recentDocs.length) {
              articles.push(recentDocs[i]);
            }
          } else {
            // Start with doc: doc, blog, doc, blog, doc, blog
            if (i < recentDocs.length) {
              articles.push(recentDocs[i]);
            }
            if (i < recentBlog.length) {
              articles.push(recentBlog[i]);
            }
          }
        }

        // Store globally for use in React components
        setGlobalData({ articles });
      } catch (error) {
        console.error('Error loading recent articles:', error);
        setGlobalData({ articles: [] });
      }
    },
  };
};
