import type { ReactNode } from "react";
import type { LinkProps as RRLinkProps } from "react-router";
import { Link as RRLink } from "react-router";

import styles from "./link.module.css";

type InternalLinkProps = Pick<
  RRLinkProps,
  "to" | "children" | "reloadDocument"
>;

interface ExternalLinkProps {
  href: URL;
  children: ReactNode;
  newTab?: boolean;
}

export type LinkProps = InternalLinkProps | ExternalLinkProps;

export const Link = (props: LinkProps) => {
  if ("href" in props) {
    const { newTab, ...rest } = props;
    return (
      <a
        {...rest}
        href={props.href.toString()}
        {...(newTab && { target: "_blank", rel: "noopener noreferrer" })}
        className={styles.link}
      >
        {props.children}
      </a>
    );
  }

  return <RRLink {...props} className={styles.link} />;
};
