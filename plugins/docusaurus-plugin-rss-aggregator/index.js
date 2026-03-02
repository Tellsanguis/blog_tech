const Parser = require('rss-parser');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const PER_REQUEST_TIMEOUT_MS = 20_000;
const GLOBAL_TIMEOUT_MS = 600_000;

function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout après ${ms / 1000}s`)), ms)
  );
  return Promise.race([promise, timeout]);
}

module.exports = function (context, options) {
  return {
    name: 'docusaurus-plugin-rss-aggregator',

    async loadContent() {
      console.log('[RSS Aggregator] Récupération des flux RSS...');

      const httpAgent = new http.Agent({ keepAlive: false });
      const httpsAgent = new https.Agent({ keepAlive: false });

      const parser = new Parser({
        timeout: PER_REQUEST_TIMEOUT_MS,
        requestOptions: {
          agent: { http: httpAgent, https: httpsAgent }
        },
        customFields: {
          item: ['description', 'content:encoded']
        }
      });

      const opmlPath = path.join(context.siteDir, 'static', 'veille-tech.opml');
      const opmlText = fs.readFileSync(opmlPath, 'utf-8');

      const xmlParser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: ''
      });
      const opmlData = xmlParser.parse(opmlText);

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

      const allItems = [];
      const now = Date.now();
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

      console.log(`[RSS Aggregator] Récupération de ${opmlFeeds.length} flux RSS...`);

      let globalTimedOut = false;
      const globalTimeoutId = setTimeout(() => {
        globalTimedOut = true;
        console.warn('[RSS Aggregator] Timeout global atteint (600s), arrêt du traitement.');
      }, GLOBAL_TIMEOUT_MS);

      const batchSize = 5;
      for (let i = 0; i < opmlFeeds.length; i += batchSize) {
        if (globalTimedOut) break;
        const batch = opmlFeeds.slice(i, i + batchSize);
        const batchPromises = batch.map(async (feedInfo) => {
          try {
            const feed = await withTimeout(parser.parseURL(feedInfo.xmlUrl), PER_REQUEST_TIMEOUT_MS);

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

      clearTimeout(globalTimeoutId);
      httpAgent.destroy();
      httpsAgent.destroy();

      const groupedByCategory = new Map();

      allItems.forEach((item) => {
        if (!groupedByCategory.has(item.category)) {
          groupedByCategory.set(item.category, []);
        }
        groupedByCategory.get(item.category).push(item);
      });

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

      const outputPath = path.join(context.siteDir, 'static', 'rss-feed-cache.json');
      fs.writeFileSync(outputPath, JSON.stringify(content, null, 2));
      console.log(`[RSS Aggregator] Données écrites dans ${outputPath}`);
      setGlobalData(content);
    },
  };
};
