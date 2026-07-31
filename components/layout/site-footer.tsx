import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { routes } from "@/lib/content/paths";
import { getTopics } from "@/lib/content/queries";
import { mainNav, siteConfig } from "@/lib/site";

export function SiteFooter() {
  const topics = getTopics();

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <Container width="wide" className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-7 w-7" />
              <span className="text-lg font-semibold tracking-tight">
                {siteConfig.name}
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
              {siteConfig.tagline} Built and maintained by {siteConfig.author.name}.
            </p>
          </div>

          <FooterColumn title="Topics">
            {topics.map((topic) => (
              <FooterLink key={topic.slug} href={routes.topic(topic.slug)}>
                {topic.title}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Site">
            {mainNav.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
            <FooterLink href="/sitemap.xml">Sitemap</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Content is free to read
            and share.
          </p>
          <div className="flex gap-4">
            <a
              href={siteConfig.social.github}
              className="transition-colors hover:text-ink"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <a
              href={siteConfig.social.x}
              className="transition-colors hover:text-ink"
              rel="noopener noreferrer"
              target="_blank"
            >
              X
            </a>
            <a
              href={siteConfig.social.linkedin}
              className="transition-colors hover:text-ink"
              rel="noopener noreferrer"
              target="_blank"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold tracking-wider text-ink-subtle uppercase">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-ink-muted transition-colors hover:text-ink"
      >
        {children}
      </Link>
    </li>
  );
}
