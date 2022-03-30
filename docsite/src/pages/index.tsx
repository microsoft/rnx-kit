import React from "react";
import clsx from "clsx";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./index.module.css";
import HomepageFeatures from "../components/HomepageFeatures";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.headerBanner}>
      <div className="container">
        <h1 className={clsx("hero__title", styles.headerTitle)}>
          <div className={clsx(styles.headerTitleText)}>
            {siteConfig.customFields.title1}
          </div>
          <div className={clsx(styles.headerTitleText)}>
            {siteConfig.customFields.title2}
          </div>
        </h1>
        <p className={clsx("hero__subtitle", styles.headerTagline)}>
          {siteConfig.tagline}
        </p>
        <div className={styles.buttons}>
          <Link
            className={clsx(
              "button button--primary button--lg",
              styles.headerButton
            )}
            to="/docs/guides/getting-started"
          >
            Get Started
          </Link>
          <Link
            className={clsx(
              "button button--link button--lg",
              styles.headerLink
            )}
            to="/docs/introduction"
          >
            Learn the Basics
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={"Home"} description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
