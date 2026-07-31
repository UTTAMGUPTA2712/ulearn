import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lesson content lives in `content/` and is imported as modules, so `.mdx`
  // is deliberately NOT added to `pageExtensions` — an MDX file must never
  // become a route on its own.
  pageExtensions: ["ts", "tsx"],
};

const withMDX = createMDX({
  options: {
    // Turbopack (the default compiler in Next 16) hands plugins to Rust, so
    // they must be named as strings with serializable options only.
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-slug"],
  },
});

export default withMDX(nextConfig);
