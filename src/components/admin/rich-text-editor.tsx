"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiptap editor limited to the node/mark types the public RichText renderer allows.
 * The JSON document is mirrored into a hidden input named `name` for the Server Action.
 */
export function RichTextEditor({ name, initial, label }: { name: string; initial: unknown; label: string }) {
  const [json, setJson] = useState(() => JSON.stringify(initial ?? { type: "doc", content: [] }));
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ["https", "mailto"],
          isAllowedUri: (url, ctx) => /^(https?:|mailto:|\/(?!\/))/i.test(url) && ctx.defaultValidate(url),
        },
      }),
    ],
    content: (initial as object) ?? { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class: "prose-editorial min-h-64 space-y-4 px-4 py-3 focus:outline-none",
        "aria-label": label,
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor }) => setJson(JSON.stringify(editor.getJSON())),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            quote: e.isActive("blockquote"),
            ul: e.isActive("bulletList"),
            ol: e.isActive("orderedList"),
            link: e.isActive("link"),
          }
        : null,
  });

  const btn = (on: boolean | undefined) =>
    cn("rounded-sm px-2.5 py-1 text-sm", on ? "bg-primary text-primary-foreground" : "hover:bg-surface-sunk");

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(
      "Link URL (https://…, mailto: or /path). Leave empty to remove.",
      prev ?? "https://",
    );
    if (url === null) return;
    if (url.trim() === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div>
      <span className="block text-sm font-semibold">{label}</span>
      <div className="border-border bg-surface mt-1.5 rounded-sm border">
        <div
          role="toolbar"
          aria-label="Formatting"
          className="border-border flex flex-wrap gap-1 border-b p-1.5"
        >
          <button
            type="button"
            className={btn(active?.bold)}
            aria-pressed={!!active?.bold}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={btn(active?.italic)}
            aria-pressed={!!active?.italic}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={btn(active?.h2)}
            aria-pressed={!!active?.h2}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </button>
          <button
            type="button"
            className={btn(active?.h3)}
            aria-pressed={!!active?.h3}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </button>
          <button
            type="button"
            className={btn(active?.quote)}
            aria-pressed={!!active?.quote}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            Quote
          </button>
          <button
            type="button"
            className={btn(active?.ul)}
            aria-pressed={!!active?.ul}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            • List
          </button>
          <button
            type="button"
            className={btn(active?.ol)}
            aria-pressed={!!active?.ol}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </button>
          <button type="button" className={btn(active?.link)} aria-pressed={!!active?.link} onClick={setLink}>
            Link
          </button>
          <button
            type="button"
            className={btn(false)}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            Divider
          </button>
        </div>
        <EditorContent editor={editor} />
      </div>
      <input type="hidden" name={name} value={json} />
    </div>
  );
}
