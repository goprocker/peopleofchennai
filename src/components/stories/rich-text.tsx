import type { ReactNode } from "react";
import type { RichTextNode } from "@/types/domain";

/**
 * Safe renderer for Tiptap/ProseMirror JSON. Allow-list only: unknown node and mark types
 * render their children as plain text, nothing is ever injected as HTML, and links are limited
 * to http(s), mailto and same-site paths.
 */

const MAX_DEPTH = 20;

export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (/^\/(?!\/)/.test(h)) return h;
  try {
    const u = new URL(h);
    return ["http:", "https:", "mailto:"].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

function renderMarks(text: string, marks: RichTextNode["marks"], key: string): ReactNode {
  return (marks ?? []).reduce<ReactNode>((acc, mark, i) => {
    const k = `${key}-m${i}`;
    switch (mark.type) {
      case "bold":
        return <strong key={k}>{acc}</strong>;
      case "italic":
        return <em key={k}>{acc}</em>;
      case "underline":
        return <u key={k}>{acc}</u>;
      case "strike":
        return <s key={k}>{acc}</s>;
      case "code":
        return <code key={k} className="rounded bg-surface-sunk px-1 text-[0.9em]">{acc}</code>;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (!href) return acc;
        const external = !href.startsWith("/");
        return (
          <a
            key={k}
            href={href}
            className="text-accent underline underline-offset-4 hover:text-terracotta-dark"
            {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
          >
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, text);
}

function renderNode(node: RichTextNode, key: string, depth: number): ReactNode {
  if (depth > MAX_DEPTH) return null;
  if (node.type === "text") return renderMarks(node.text ?? "", node.marks, key);
  const children = node.content?.map((c, i) => renderNode(c, `${key}-${i}`, depth + 1));

  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading": {
      // Story titles are h1; body headings are capped to h2–h3.
      const level = node.attrs?.level === 3 ? 3 : 2;
      return level === 2 ? (
        <h2 key={key} className="display-md mt-12 mb-4">{children}</h2>
      ) : (
        <h3 key={key} className="mt-8 mb-3 font-serif text-2xl">{children}</h3>
      );
    }
    case "blockquote":
      return (
        <blockquote key={key} className="my-10 border-l-2 border-terracotta pl-6 font-serif text-2xl leading-snug italic md:text-3xl">
          {children}
        </blockquote>
      );
    case "bulletList":
      return <ul key={key} className="list-disc space-y-2 pl-6">{children}</ul>;
    case "orderedList":
      return <ol key={key} className="list-decimal space-y-2 pl-6">{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} className="my-10 border-border" />;
    default:
      return <span key={key}>{children}</span>;
  }
}

export function RichText({ doc }: { doc: RichTextNode }) {
  return <div className="prose-editorial space-y-6">{renderNode(doc, "n", 0)}</div>;
}
