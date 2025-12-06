const Parser = require('rss-parser');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

module.exports = function (context, options) {
  return {
    name: 'docusaurus-plugin-rss-aggregator',

    async loadContent() {
      console.log('[RSS Aggregator] Récupération des flux RSS...');

      const parser = new Parser({
        timeout: 10000,
        customFields: {
          item: ['description', 'content:encoded']
        }
      });

      // Lecture du fichier OPML
      const opmlPath = path.join(context.siteDir, 'static', 'veille-tech.opml');
      const opmlText = fs.readFileSync(opmlPath, 'utf-8');

      const xmlParser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: ''
      });
      const opmlData = xmlParser.parse(opmlText);

      // Extraction des flux depuis le fichier OPML
      const opmlFeeds = [];
      const outlines = opmlData.opml.body.outline;

      outlines.forEach((categoryOutline) => {
        const categoryName = categoryOutline.text;
        const feedOutlines = Array.isArray(categoryOutline.outline)
          ? categoryOutline.outline
          : [categoryOutline.outline];

        feedOutlines.forEach((feed) => {
          if (feed.xmlUrl) {
            opmlFeeds.push({
              title: feed.text || feed.title,
              xmlUrl: feed.xmlUrl,
              category: categoryName
            });
          }
        });
      });

      // Récupération des flux RSS (articles des dernières 24h)
      const allItems = [];
      const now = Date.now();
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

      console.log(`[RSS Aggregator] Récupération de ${opmlFeeds.length} flux RSS...`);

      // Traitement par lots de 5 flux en parallèle pour ne pas surcharger
      const batchSize = 5;
      for (let i = 0; i < opmlFeeds.length; i += batchSize) {
        const batch = opmlFeeds.slice(i, i + batchSize);
        const batchPromises = batch.map(async (feedInfo) => {
          try {
            const feed = await parser.parseURL(feedInfo.xmlUrl);

            // Filtrer les articles des dernières 24h
            const recentItems = feed.items.filter((item) => {
              const itemDate = new Date(item.pubDate || item.isoDate || '');
              return itemDate.getTime() >= twentyFourHoursAgo;
            });

            return recentItems.map((item) => ({
              title: item.title || 'Sans titre',
              link: item.link || '#',
              pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
              source: feedInfo.title,
              category: feedInfo.category
            }));
          } catch (err) {
            console.warn(`[RSS Aggregator] Échec ${feedInfo.title}:`, err.message);
            return [];
          }
        });

        const batchResults = await Promise.all(batchPromises);
        allItems.push(...batchResults.flat());
      }

      // Grouper par catégorie et trier
      const groupedByCategory = new Map();

      allItems.forEach((item) => {
        if (!groupedByCategory.has(item.category)) {
          groupedByCategory.set(item.category, []);
        }
        groupedByCategory.get(item.category).push(item);
      });

      // Trier les articles de chaque catégorie par date (plus récent en premier)
      const groups = Array.from(groupedByCategory.entries())
        .map(([category, items]) => ({
          category,
          items: items.sort((a, b) =>
            new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
          )
        }))
        .sort((a, b) => a.category.localeCompare(b.category));

      console.log(`[RSS Aggregator] ${allItems.length} articles trouvés dans les dernières 24h`);

      return {
        groups,
        generatedAt: new Date().toISOString(),
        totalArticles: allItems.length
      };
    },

    async contentLoaded({ content, actions }) {
      const { setGlobalData } = actions;

      // Écrire les données dans un fichier JSON statique
      const outputPath = path.join(context.siteDir, 'static', 'rss-feed-cache.json');
      fs.writeFileSync(outputPath, JSON.stringify(content, null, 2));

      console.log(`[RSS Aggregator] Données écrites dans ${outputPath}`);

      // Rendre les données disponibles globalement
      setGlobalData(content);
    },
  };
};
