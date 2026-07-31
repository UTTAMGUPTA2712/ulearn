"use client";

import { useEffect } from "react";

import { Container } from "@/components/layout/container";

/**
 * Route-level error boundary. Must be a Client Component — Next.js needs to
 * attach the `reset` handler in the browser.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with a real reporter (Sentry, Axiom…) when one is wired up.
    console.error(error);
  }, [error]);

  return (
    <Container width="prose" className="py-24 text-center">
      <p className="text-sm font-semibold tracking-[0.14em] text-accent uppercase">
        Something broke
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        This page failed to render
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-muted">
        The error has been logged. Trying again often works — the failure may
        have been transient.
      </p>

      {error.digest && (
        <p className="mt-4 font-mono text-xs text-ink-subtle">
          Reference: {error.digest}
        </p>
      )}

      <button
        type="button"
        onClick={reset}
        className="mt-10 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Try again
      </button>
    </Container>
  );
}
