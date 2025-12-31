import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/product/PRD">
            Get Started →
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            to="/docs/api/api-specification"
            style={{marginLeft: '1rem'}}>
            API Docs →
          </Link>
        </div>
      </div>
    </header>
  );
}

function QuickLinks() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="col col--4">
            <div className="text--center padding-horiz--md">
              <Heading as="h3">Product</Heading>
              <p>
                Learn about Haystack's vision, features, and how it solves payment
                orchestration challenges for African businesses.
              </p>
              <Link to="/docs/product/PRD">View Product Docs →</Link>
            </div>
          </div>
          <div className="col col--4">
            <div className="text--center padding-horiz--md">
              <Heading as="h3">Architecture</Heading>
              <p>
                Understand the technical architecture, database schema, and system
                design behind Haystack.
              </p>
              <Link to="/docs/architecture/technical-architecture">
                View Architecture →
              </Link>
            </div>
          </div>
          <div className="col col--4">
            <div className="text--center padding-horiz--md">
              <Heading as="h3">API</Heading>
              <p>
                Explore the API specification, endpoints, authentication, and
                integration guides.
              </p>
              <Link to="/docs/api/api-specification">View API Docs →</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Documentation`}
      description="Comprehensive documentation for Haystack Payment Orchestration Service. Learn how to integrate, use the API, and understand the architecture.">
      <HomepageHeader />
      <main>
        <QuickLinks />
      </main>
    </Layout>
  );
}
