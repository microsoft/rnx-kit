import useBaseUrl from "@docusaurus/useBaseUrl";
import clsx from "clsx";
import React from "react";
import styles from "./HomepageFeatures.module.css";

type FeatureItem = {
  title: string;
  image: string;
  alt: string;
  description: JSX.Element[];
};

const FeatureList: FeatureItem[] = [
  {
    title: "For all developers",
    image: "/img/code-pull-request.svg",
    alt: "Pull-request icon",
    description: [
      <p key="dev1">
        <strong>Developer-centric tools</strong> built for React Native
        engineers. Designed for real world needs - integrate into <em>any </em>
        project, large or small.
      </p>,
      <p key="dev2">
        Purpose-built to improve DX and streamline your workflow.
      </p>,
    ],
  },
  {
    title: "Community first.",
    image: "/img/user-gear.svg",
    alt: "User with a gear icon",
    description: [
      <p key="com1">
        Created as a <strong>GitHub-first</strong> repository for the React
        Native community. Integrated with tools you already use: Metro,
        TypeScript, Jest, and more.
      </p>,
      <p key="com2">
        Contributions from the community are key to shaping rnx-kit. Get
        involved!
      </p>,
    ],
  },
  {
    title: "Tested at scale. Supported by Microsoft.",
    image: "/img/flask.svg",
    alt: "Flask icon",
    description: [
      <p key="test1">
        Battle-tested at scale by Microsoft engineers. From unit tests to large
        monorepos, these tools are <strong>thoroughly validated</strong>.
      </p>,
      <p key="com2">
        Dedicated maintainers are ensuring rnx-kit evolves to meet the real
        needs of Microsoft.
      </p>,
    ],
  },
];

function Feature({ title, alt, image, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <img className={styles.featureSvg} alt={alt} src={useBaseUrl(image)} />
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
