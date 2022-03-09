import useBaseUrl from "@docusaurus/useBaseUrl";
import React from "react";
import clsx from "clsx";
import styles from "./HomepageFeatures.module.css";

type FeatureItem = {
  title: string;
  image: string;
  description: JSX.Element[];
};

const FeatureList: FeatureItem[] = [
  {
    title: "Made by developers, for developers.",
    image: "/img/code-pull-request.svg",
    description: [
      <p key="dev1">
        Every tool is <strong>purpose-built</strong> to make your React Native
        developer experience better. Simple, efficient tools make all the
        difference.
      </p>,
    ],
  },
  {
    title: "Community first.",
    image: "/img/user-gear.svg",
    description: [
      <p key="com1">
        Created as a <strong>GitHub-first</strong> project for the React Native
        community. Integrated with tools you already use: Metro, TypeScript,
        Jest, and more.
      </p>,
      <p key="com2">
        Join in! Your contributions are <em>always</em> welcome.
      </p>,
    ],
  },
  {
    title: "Tested at scale. Supported by Microsoft.",
    image: "/img/flask.svg",
    description: [
      <p key="test1">
        From unit tests to deployments in large monorepos, each tool is{" "}
        <strong>thoroughly validated</strong>. Microsoft has engineers dedicated
        to this project, using it to ship React Native apps to millions of
        customers.
      </p>,
    ],
  },
];

function Feature({ title, image, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <img
          className={styles.featureSvg}
          alt={title}
          src={useBaseUrl(image)}
        />
      </div>
      <div
        className={clsx(
          "text--center padding-horiz--md padding-top--md",
          styles.featureText
        )}
      >
        <h3>{title}</h3>
        {description}
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
