import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'TellServ Tech Blog',
  tagline: 'Recherches et réflexions sur les défis techniques',
  favicon: 'img/favicon.png',

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
    image: 'img/docusaurus-social-card.jpg',
    metadata: [
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
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/Tellsanguis',
          label: 'GitHub',
          position: 'right',
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
              label: 'Présentation',
              to: '/docs/presentation',
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
  } satisfies Preset.ThemeConfig,
};

export default config;
