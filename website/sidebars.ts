import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Sidebar configuration for Haystack documentation
 * Note: Docusaurus strips numeric prefixes (01-, 02-, etc.) from folder names
 * when generating document IDs, so we use the stripped versions here.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    // Only include items that actually exist
    // The API reference is auto-generated and has its own sidebar
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api-reference/haystack-payment-orchestration-api',
        'api-reference/get-hello',
        'api-reference/check',
        'api-reference/liveness',
        'api-reference/readiness',
      ],
    },
  ],
};

export default sidebars;
