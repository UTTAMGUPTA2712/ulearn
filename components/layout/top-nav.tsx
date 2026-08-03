import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/90 shadow-sm backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>

        <nav aria-label="Main" className="flex items-center gap-4 text-sm font-medium text-text-muted">
          <Link href="/" className="transition-colors hover:text-text">
            topics
          </Link>
          <Link href="/blog" className="transition-colors hover:text-text">
            blog
          </Link>
          <a
            href="https://uttamgupta2712.is-a.dev"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-text"
          >
            portfolio
          </a>
          <ThemeToggle />
        </nav>
      </Container>
    </header>
  );
}
