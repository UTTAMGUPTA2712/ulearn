import Link from "next/link";

import { Container } from "@/components/layout/container";

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center rounded border border-border-strong bg-panel font-mono text-xs text-accent"
          >
            u
          </span>
          <span className="font-mono text-sm font-medium tracking-tight text-text">
            ulearn<span className="text-text-faint">/systems</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-4 font-mono text-xs text-text-muted">
          <Link href="/" className="transition-colors hover:text-text">
            topics
          </Link>
        </nav>
      </Container>
    </header>
  );
}
