import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'TellServ Tech Blog',
  tagline: 'Recherches et réflexions sur les défis techniques',
  favicon: 'img/favicon.ico',

  url: 'https://docs.tellserv.fr',
  baseUrl: '/',

  organizationName: 'Tellserv',
  projectName: 'blog_technique',

  onBrokenLinks: 'throw',

  markdown: {
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
          editUrl: 'https://github.com/Tellsanguis/blog_technique/tree/main/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/Tellsanguis/blog_technique/tree/main/',
          blogSidebarTitle: 'Articles récents',
          blogSidebarCount: 'ALL',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'TellServ Tech Blog',
      logo: {
        alt: 'TellServ Logo',
        src: 'img/logo.svg',
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
          href: 'https://github.com/Tellsanguis/blog_technique',
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
              label: 'Introduction',
              to: '/docs/intro',
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
              href: 'https://github.com/Tellsanguis/blog_technique',
            },
            {
              label: 'Forgejo',
              href: 'https://forgejo.tellserv.fr',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TellServ. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
