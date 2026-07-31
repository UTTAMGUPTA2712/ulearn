import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/**
 * Global MDX component overrides. Required at the project root for
 * `@next/mdx` to work with the App Router.
 *
 * Base typography is handled by the `.prose` styles in `app/globals.css`;
 * only elements that need real behaviour (not just styling) are overridden
 * here, so lesson MDX stays plain markdown.
 */
const components: MDXComponents = {
  a: ({ href = "", children, ...props }) => {
    const isInternal = href.startsWith("/");

    if (isInternal) {
      return (
        <Link href={href} {...props}>
          {children}
        </Link>
      );
    }

    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

export function useMDXComponents(): MDXComponents {
  return components;
}
