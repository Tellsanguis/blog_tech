const path = require('path');
const fs = require('fs-extra');

module.exports = function pluginUnifiedTags(context, options) {
  return {
    name: 'docusaurus-plugin-unified-tags',

    async allContentLoaded({actions, allContent}) {
      const {addRoute} = actions;
      const {setGlobalData} = actions;

      const blogPlugin = allContent?.['docusaurus-plugin-content-blog'];
      const docsPlugin = allContent?.['docusaurus-plugin-content-docs'];

      const blogContent = blogPlugin?.default;
      const docsContent = docsPlugin?.default;

      const tagsMap = new Map();

      if (blogContent?.blogPosts) {
        blogContent.blogPosts.forEach((post) => {
          if (post.metadata.tags) {
            post.metadata.tags.forEach((tag) => {
              const tagKey = tag.label.toLowerCase();
              if (!tagsMap.has(tagKey)) {
                tagsMap.set(tagKey, {
                  label: tag.label,
                  permalink: tag.permalink,
                  count: 0,
                  items: []
                });
              }
              const tagData = tagsMap.get(tagKey);
              tagData.count++;
              tagData.items.push({
                type: 'blog',
                title: post.metadata.title,
                permalink: post.metadata.permalink,
                date: post.metadata.date,
                _ts: new Date(post.metadata.date).getTime(),
                formattedDate: post.metadata.formattedDate,
                description: post.metadata.description,
                authors: post.metadata.authors,
                tags: post.metadata.tags,
                readingTime: post.metadata.readingTime
              });
            });
          }
        });
      }

      if (docsContent?.loadedVersions) {
        docsContent.loadedVersions.forEach((version) => {
          version.docs.forEach((doc) => {
            if (doc.tags) {
              doc.tags.forEach((tag) => {
                const tagKey = tag.label.toLowerCase();
                if (!tagsMap.has(tagKey)) {
                  tagsMap.set(tagKey, {
                    label: tag.label,
                    permalink: tag.permalink,
                    count: 0,
                    items: []
                  });
                }
                const tagData = tagsMap.get(tagKey);
                tagData.count++;
                tagData.items.push({
                  type: 'doc',
                  title: doc.title,
                  permalink: doc.permalink,
                  description: doc.description,
                  tags: doc.tags
                });
              });
            }
          });
        });
      }

      const sortedTagsData = new Map();
      tagsMap.forEach((tagData, tagKey) => {
        const sortedItems = tagData.items
          .sort((a, b) => {
            if (a.type === 'blog' && b.type === 'blog') return b._ts - a._ts;
            if (a.type === 'doc' && b.type === 'doc') return a.title.localeCompare(b.title);
            return a.type === 'blog' ? -1 : 1;
          })
          .map(({_ts, ...item}) => item);

        sortedTagsData.set(tagKey, {...tagData, items: sortedItems});
      });

      const allTags = Array.from(tagsMap.values())
        .map(({items, ...tag}) => tag)
        .sort((a, b) => a.label.localeCompare(b.label));

      const tagsByLetter = {};
      allTags.forEach((tag) => {
        const firstLetter = tag.label.charAt(0).toUpperCase();
        if (!tagsByLetter[firstLetter]) {
          tagsByLetter[firstLetter] = [];
        }
        tagsByLetter[firstLetter].push(tag);
      });

      setGlobalData({allTags, tagsByLetter});

      const locale = context.i18n.currentLocale;
      const baseUrl = locale === context.i18n.defaultLocale ? '/' : `/${locale}/`;

      sortedTagsData.forEach((tagData, tagKey) => {
        addRoute({
          path: `${baseUrl}tags/${tagKey}`,
          component: '@site/src/theme/TagPage',
          exact: true,
          props: {
            tagKey,
            tagData,
          },
        });
      });
    }
  };
};
