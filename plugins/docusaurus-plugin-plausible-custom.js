module.exports = function (_context, options) {
  const { domain, scriptSrc } = options;

  if (!domain) {
    throw new Error('You must specify the `domain` option for plausible-custom plugin.');
  }

  if (!scriptSrc) {
    throw new Error('You must specify the `scriptSrc` option for plausible-custom plugin.');
  }

  const isProd = process.env.NODE_ENV === 'production';

  return {
    name: 'docusaurus-plugin-plausible-custom',

    injectHtmlTags() {
      if (!isProd) {
        return {};
      }

      return {
        headTags: [
          {
            tagName: 'link',
            attributes: {
              key: 'plausible-custom-preconnect',
              rel: 'preconnect',
              href: new URL(scriptSrc).origin,
            },
          },
          {
            tagName: 'script',
            attributes: {
              key: 'plausible-custom-script',
              defer: true,
              'data-domain': domain,
              src: scriptSrc,
            },
          },
          {
            tagName: 'script',
            attributes: {
              key: 'plausible-custom-events',
            },
            innerHTML: 'window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) };',
          },
        ],
      };
    },
  };
};
