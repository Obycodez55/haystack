import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: 'doc',
      id: 'api-reference/api-reference',
      label: 'Overview',
    },
    {
      type: 'doc',
      id: 'api-reference/haystack-payment-orchestration-api',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'health',
      items: [
        {
          type: 'doc',
          id: 'api-reference/get-hello',
          label: 'Get API status',
          className: 'api-method get',
        },
        {
          type: 'doc',
          id: 'api-reference/check',
          label: 'Health check',
          className: 'api-method get',
        },
        {
          type: 'doc',
          id: 'api-reference/liveness',
          label: 'Liveness probe',
          className: 'api-method get',
        },
        {
          type: 'doc',
          id: 'api-reference/readiness',
          label: 'Readiness probe',
          className: 'api-method get',
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
