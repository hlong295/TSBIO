import sanitizeHtml from "sanitize-html";

// Server-side HTML sanitizer for WYSIWYG content.
// Keep allowlist tight; expand only when needed.
export function sanitizeRichTextHtml(input: string): string {
  const html = (input || "").toString();
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "blockquote",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "a",
      "code",
      "pre",
      "hr",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      span: ["style"],
      p: ["style"],
      li: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => {
        const href = (attribs.href || "").toString();
        // Prevent javascript: etc.
        const safeHref = href.startsWith("http") || href.startsWith("mailto:") ? href : "";
        return {
          tagName,
          attribs: {
            ...attribs,
            href: safeHref,
            target: "_blank",
            rel: "noopener noreferrer",
          },
        };
      },
    },
    // Drop all comments and disallow any CSS except simple inline styles.
    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
      },
    },
  });
}
