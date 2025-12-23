import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Haystack Payment Orchestration',
  tagline: 'Unified payment processing for African businesses',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://docs.haystack.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config (if needed)
  organizationName: 'haystack',
  projectName: 'haystack-docs',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Use default /docs/ route to avoid conflicts with homepage
          editUrl: 'https://github.com/yourorg/haystack/edit/main/website/',
        },
        blog: false, // Disable blog feature
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'classic',
        config: {
          haystack: {
            specPath: 'static/openapi.json',
            outputDir: 'docs/api-reference',
            sidebarOptions: {
              groupPathsBy: 'tag',
            },
          },
        },
      },
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Haystack Docs',
      logo: {
        alt: 'Haystack Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/docs/api/api-specification',
          position: 'left',
          label: 'API',
        },
        {
          href: 'https://github.com/yourorg/haystack',
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
              label: 'Product Requirements',
              to: '/docs/product/PRD',
            },
            {
              label: 'API Specification',
              to: '/docs/api/api-specification',
            },
            {
              label: 'Architecture',
              to: '/docs/architecture/technical-architecture',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Development Roadmap',
              to: '/docs/planning/development-roadmap',
            },
            {
              label: 'Provider Integration',
              to: '/docs/providers/provider-integration-guide',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/yourorg/haystack',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Haystack. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript', 'javascript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
