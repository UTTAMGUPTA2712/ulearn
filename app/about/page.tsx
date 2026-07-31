import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHeader } from "@/components/ui/page-header";
import { Prose } from "@/components/ui/prose";
import { routes } from "@/lib/content/paths";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, graph } from "@/lib/seo/schema";
import { siteConfig } from "@/lib/site";

const trail: Crumb[] = [
  { name: "Home", path: routes.home() },
  { name: "About", path: routes.about() },
];

export const metadata: Metadata = buildMetadata({
  title: "About",
  description: `Why ${siteConfig.name} exists, who writes it, and how the lessons are put together.`,
  path: routes.about(),
});

export default function AboutPage() {
  return (
    <>
      <JsonLd schema={graph(breadcrumbSchema(trail))} />

      <Container width="prose" className="py-12 sm:py-16">
        <Breadcrumbs trail={trail} />

        <PageHeader
          className="mt-6"
          eyebrow="About"
          title={`What ${siteConfig.name} is`}
          description={siteConfig.tagline}
        />

        <Prose className="mt-12">
          <p>
            The name comes from two places at once: <strong>u</strong> for Uttam,
            and <strong>u</strong> for you. It is a place to write down things I
            have actually learned — properly, in a form someone else can pick up
            without the context I had.
          </p>

          <h2>How it&apos;s organised</h2>
          <p>
            Every subject gets its own <Link href={routes.topics()}>topic</Link>,
            and every topic is a small set of lessons that build on each other.
            Nothing is gated, there is no account, and no lesson ends by telling
            you to buy the real version.
          </p>

          <h2>How lessons are written</h2>
          <p>Each one tries to hold to four rules:</p>
          <ul>
            <li>
              <strong>Explain the model, not the syntax.</strong> Syntax is
              searchable; the mental model is what makes the syntax obvious.
            </li>
            <li>
              <strong>Show the failure.</strong> The wrong version, why it looks
              right, and what actually happens.
            </li>
            <li>
              <strong>Stay short.</strong> If a lesson needs more than ten
              minutes, it is two lessons.
            </li>
            <li>
              <strong>End with what to remember.</strong> Five lines you could
              recall a month later.
            </li>
          </ul>

          <h2>Who writes it</h2>
          <p>
            {siteConfig.author.name} — a developer writing up what took a while to
            get right the first time. If something here is wrong or unclear, that
            is worth fixing; the source is on{" "}
            <a href={siteConfig.social.github}>GitHub</a>.
          </p>

          <h2>How it&apos;s built</h2>
          <p>
            Next.js App Router with React Server Components, Tailwind CSS v4, and
            MDX for the lesson bodies. Every page is statically generated at build
            time, which is why it loads instantly and costs nothing to host.
          </p>
        </Prose>
      </Container>
    </>
  );
}
