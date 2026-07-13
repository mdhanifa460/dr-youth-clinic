"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { Bold, Italic, Underline as UnderlineIcon, Highlighter, Link2 } from "lucide-react";

function ToolbarButton({
  active, onClick, title, children,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
        active ? "bg-[#0B2560] text-white" : "text-gray-500 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

// Deliberately restricted to inline marks only (bold/italic/underline/
// highlight/link) — block-level structure (headings, lists, quotes) has its
// own dedicated block types in the Content Block Builder, so a Paragraph
// block staying "just formatted text" avoids two competing ways to make a
// list or a heading.
export default function RichTextEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, bulletList: false, orderedList: false, listItem: false,
        blockquote: false, codeBlock: false, horizontalRule: false, code: false,
      }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: html || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[100px] px-4 py-3 text-sm text-gray-700 leading-relaxed",
      },
    },
    immediatelyRender: false,
  });

  // useEditor's `content` option only seeds the document once, on mount —
  // it doesn't reactively track the `html` prop. Without this, external
  // updates to a block's html (the "✨ Improve Writing" AI action, or the
  // slash command clearing this paragraph after inserting a new block)
  // would silently leave the visible editor showing stale text. Skipped
  // when the incoming html already matches what the editor has (i.e. this
  // update originated from the user's own typing via onUpdate below) so we
  // don't fight the user's cursor position on every keystroke.
  useEffect(() => {
    if (!editor) return;
    const incoming = html || "<p></p>";
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, false);
    }
  }, [html, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous || "https://");
    if (url === null) return;
    if (!url) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={14} />
        </ToolbarButton>
        <ToolbarButton title="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter size={14} />
        </ToolbarButton>
        <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
          <Link2 size={14} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
