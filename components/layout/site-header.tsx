import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Container } from "@/components/layout/container";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-md">
      <Container width="wide" className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="rounded-lg" aria-label="ulearn home">
          <Logo />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <NavLinks />
          <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
