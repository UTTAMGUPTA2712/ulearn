type JsonLdProps = {
  schema: Record<string, unknown>;
};

/**
 * Renders a structured-data script tag.
 *
 * `<` is escaped so a string inside the schema can never close the script tag
 * early — the standard XSS guard for inline JSON-LD.
 */
export function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
