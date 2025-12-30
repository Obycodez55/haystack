import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
// Import the auto-generated API sidebar
import apiSidebar from './docs/api-reference/sidebar';

/**
 * Sidebar configuration for Haystack documentation
 * Note: Docusaurus strips numeric prefixes (01-, 02-, etc.) from folder names
 * when generating document IDs, so we use the stripped versions here.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    // Include the auto-generated API reference sidebar
    {
      type: 'category',
      label: 'API Reference',
      items: apiSidebar,
    },
  ],
};

export default sidebars;
