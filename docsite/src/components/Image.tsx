import useBaseUrl from "@docusaurus/useBaseUrl";
import React from "react";
import clsx from "clsx";
import styles from "./Image.module.css";

export interface ImageProps {
  src: string;
  children?: JSX.Element[];
  invertable?: boolean;
  [key: string]: string | number | boolean | symbol | JSX.Element[];
}

export default function Image(props: ImageProps): JSX.Element {
  const children = props.children;
  const invertable = Boolean(props.invertable);

  const imageProps = { ...props, src: useBaseUrl(props.src) };
  delete imageProps.children;
  delete imageProps.invertable;

  if (children) {
    return (
      <div className={styles.container}>
        <div>
          <img
            className={clsx(
              styles.image,
              invertable ? styles.imageInvertable : ""
            )}
            {...imageProps}
          />
        </div>
        <div className={styles.text}>{children}</div>
      </div>
    );
  }

  return <img {...imageProps} />;
}
