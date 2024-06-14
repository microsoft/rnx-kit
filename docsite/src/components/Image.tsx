import useBaseUrl from "@docusaurus/useBaseUrl";
import clsx from "clsx";
import React from "react";
import styles from "./Image.module.css";

export interface ImageProps {
  src: string;
  children?: JSX.Element[];
  invertable?: boolean;
  [key: string]: string | number | boolean | symbol | JSX.Element[];
}

export default function Image({
  children,
  invertable,
  src,
  ...props
}: ImageProps): JSX.Element {
  const imageProps = { ...props, src: useBaseUrl(src) };

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
