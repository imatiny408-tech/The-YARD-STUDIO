import type { AnchorHTMLAttributes } from "react";
import { useNav } from "./router";

export default function Link({ href, children, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { go } = useNav();
  return (
    <a
      href={href.startsWith("#") ? href : "#"}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (href.startsWith("#")) return;
        e.preventDefault();
        go(href);
      }}
    >
      {children}
    </a>
  );
}
