import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['fr', 'en'],
        indexDocs: true,
        indexBlog: true,
        indexPages: true,
        docsRouteBasePath: '/docs',
        blogRouteBasePath: '/blog',
        searchBarShortcutHint: false,
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  plugins: [
    'docusaurus-plugin-image-zoom',
    './plugins/docusaurus-plugin-unified-tags',
    './plugins/docusaurus-plugin-recent-articles',
    './plugins/docusaurus-plugin-rss-aggregator',
    [
      './plugins/docusaurus-plugin-plausible-custom',
      {
        domain: 'docs.tellserv.fr',
        scriptSrc: 'https://plausible.tellserv.fr/js/script.js',
      },
    ],
    './docusaurus.config.webpack.js',
  ],

  title: 'TellServ Tech Blog',
  tagline: 'Recherches et réflexions sur les défis techniques',
  favicon: 'img/logo.png',


  url: 'https://docs.tellserv.fr',
  baseUrl: '/',

  organizationName: 'Tellserv',
  projectName: 'blog_technique',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

  markdown: {
    format: 'mdx',
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    localeConfigs: {
      fr: {
        label: 'Français',
        direction: 'ltr',
        htmlLang: 'fr-FR',
      },
      en: {
        label: 'English',
        direction: 'ltr',
        htmlLang: 'en-US',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://forgejo.tellserv.fr/Tellsanguis/blog_tech/src/branch/main/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            title: 'TellServ Tech Blog',
            description: 'Recherches et réflexions sur les défis techniques',
            copyright: `Copyright © ${new Date().getFullYear()} TellServ.`,
            language: 'fr',
          },
          editUrl: 'https://forgejo.tellserv.fr/Tellsanguis/blog_tech/src/branch/main/',
          blogSidebarTitle: 'Articles récents',
          blogSidebarCount: 'ALL',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    metadata: [
      {name: 'description', content: 'Blog technique sur le homelab, DevOps, Kubernetes et l\'infrastructure as code. Documentation et tutoriels sur Docker, OpenTofu, Ansible et K3s.'},
      {name: 'keywords', content: 'homelab, kubernetes, docker, devops, opentofu, ansible, k3s, infrastructure as code'},
      {name: 'author', content: 'TellServ'},
    ],
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'TellServ Tech Blog',
      logo: {
        alt: 'TellServ Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {to: '/tags', label: 'Tags', position: 'left'},
        {to: '/veille', label: 'Veille', position: 'left'},
        {to: '/about', label: 'À propos', position: 'right'},
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/Tellsanguis',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub profile',
        },
        {
          href: 'https://forgejo.tellserv.fr/Tellsanguis',
          position: 'right',
          className: 'header-forgejo-link',
          'aria-label': 'Forgejo profile',
        },
        {
          href: 'https://docs.tellserv.fr/blog/atom.xml',
          position: 'right',
          className: 'header-rss-link',
          'aria-label': 'RSS Feed',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'À propos',
              to: '/about',
            },
          ],
        },
        {
          title: 'Blog',
          items: [
            {
              label: 'Articles',
              to: '/blog',
            },
          ],
        },
        {
          title: 'Liens',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Tellsanguis',
            },
            {
              label: 'Forgejo',
              href: 'https://forgejo.tellserv.fr/Tellsanguis',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TellServ. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'hcl', 'docker'],
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 5,
    },
    zoom: {
      selector: '.markdown :not(em) > img',
      background: {
        light: 'rgb(255, 255, 255)',
        dark: 'rgb(50, 50, 50)'
      },
      config: {
        // options from medium-zoom: https://github.com/francoischalifour/medium-zoom#options
      }
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
