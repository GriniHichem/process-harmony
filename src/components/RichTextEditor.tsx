import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Undo,
  Redo,
  Palette,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Quote,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

const TEXT_COLORS = [
  { label: "Noir", value: "#000000" },
  { label: "Rouge foncé", value: "#991b1b" },
  { label: "Rouge", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Jaune", value: "#ca8a04" },
  { label: "Vert", value: "#16a34a" },
  { label: "Vert foncé", value: "#166534" },
  { label: "Bleu", value: "#2563eb" },
  { label: "Bleu foncé", value: "#1e3a8a" },
  { label: "Violet", value: "#9333ea" },
  { label: "Rose", value: "#db2777" },
  { label: "Gris", value: "#6b7280" },
];

const HIGHLIGHT_COLORS = [
  { label: "Jaune", value: "#fef08a" },
  { label: "Vert", value: "#bbf7d0" },
  { label: "Bleu", value: "#bfdbfe" },
  { label: "Rose", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
  { label: "Violet", value: "#e9d5ff" },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  a4?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "",
  a4 = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        code: false,
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: a4
          ? "a4-editor-content focus:outline-none"
          : "prose prose-sm max-w-none focus:outline-none px-4 py-3 text-sm min-h-[120px]",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const ToolBtn = ({
    active,
    onClick,
    disabled,
    children,
    title,
  }: {
    active?: boolean;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded h-8 w-8 text-sm transition-colors disabled:opacity-30 ${
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted text-foreground/70 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-border mx-0.5" />;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-muted/40 border-b border-border">
      {/* Headings */}
      <ToolBtn
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Titre 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Titre 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Titre 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      {/* Text formatting */}
      <ToolBtn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Gras (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italique (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Souligné (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Barré"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      {/* Alignment */}
      <ToolBtn
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Aligner à gauche"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Centrer"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Aligner à droite"
      >
        <AlignRight className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        title="Justifier"
      >
        <AlignJustify className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      {/* Lists & blocks */}
      <ToolBtn
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Liste à puces"
      >
        <List className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Liste numérotée"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Citation"
      >
        <Quote className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        active={false}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Ligne horizontale"
      >
        <Minus className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      {/* Text color */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded h-8 w-8 hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
            title="Couleur du texte"
          >
            <Palette className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Couleur du texte</p>
          <div className="grid grid-cols-6 gap-1.5">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="h-7 w-7 rounded border border-input hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value }}
                title={c.label}
                onClick={() => editor.chain().focus().setColor(c.value).run()}
              />
            ))}
            <button
              type="button"
              className="h-7 w-7 rounded border border-input flex items-center justify-center text-xs hover:scale-110 transition-transform bg-background"
              title="Réinitialiser"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              ✕
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlight */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded h-8 w-8 hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
            title="Surligner"
          >
            <Highlighter className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Surlignage</p>
          <div className="flex gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="h-7 w-7 rounded border border-input hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value }}
                title={c.label}
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .toggleHighlight({ color: c.value })
                    .run()
                }
              />
            ))}
            <button
              type="button"
              className="h-7 w-7 rounded border border-input flex items-center justify-center text-xs hover:scale-110 transition-transform bg-background"
              title="Supprimer"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >
              ✕
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Divider />

      {/* Undo/Redo */}
      <ToolBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Annuler (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Rétablir (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </ToolBtn>
    </div>
  );

  return (
    <div className="rounded-md border border-input bg-background overflow-hidden">
      {toolbar}

      {a4 ? (
        <div className="bg-muted/30 overflow-auto" style={{ maxHeight: "calc(100vh - 260px)" }}>
          <div className="mx-auto my-6" style={{
            width: "210mm",
            maxWidth: "100%",
            minHeight: "297mm",
            padding: "25mm 30mm",
            background: "white",
            boxShadow: "0 4px 24px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
            borderRadius: "2px",
          }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        .ProseMirror {
          outline: none;
        }
        .ProseMirror:not(.a4-editor-content) {
          padding: 12px 16px;
          min-height: 120px;
          font-size: 14px;
        }
        .a4-editor-content {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #1a1a1a;
        }
        .a4-editor-content h1 {
          font-size: 22pt;
          font-weight: 700;
          margin: 0 0 12pt 0;
          color: #111;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 6pt;
        }
        .a4-editor-content h2 {
          font-size: 16pt;
          font-weight: 600;
          margin: 16pt 0 8pt 0;
          color: #222;
        }
        .a4-editor-content h3 {
          font-size: 13pt;
          font-weight: 600;
          margin: 12pt 0 6pt 0;
          color: #333;
        }
        .a4-editor-content p {
          margin: 0 0 8pt 0;
        }
        .a4-editor-content ul, .a4-editor-content ol {
          margin: 4pt 0 8pt 0;
          padding-left: 24pt;
        }
        .a4-editor-content li {
          margin-bottom: 3pt;
        }
        .a4-editor-content blockquote {
          border-left: 3px solid #d1d5db;
          padding-left: 12pt;
          margin: 8pt 0;
          color: #555;
          font-style: italic;
        }
        .a4-editor-content hr {
          border: none;
          border-top: 1px solid #d1d5db;
          margin: 16pt 0;
        }
        .a4-editor-content mark {
          border-radius: 2px;
          padding: 1px 2px;
        }

        /* Non-A4 prose styles */
        .ProseMirror:not(.a4-editor-content) h1 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 0.5em 0 0.3em;
        }
        .ProseMirror:not(.a4-editor-content) h2 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.5em 0 0.3em;
        }
        .ProseMirror:not(.a4-editor-content) h3 {
          font-size: 1.1em;
          font-weight: 600;
          margin: 0.4em 0 0.2em;
        }
        .ProseMirror:not(.a4-editor-content) ul,
        .ProseMirror:not(.a4-editor-content) ol {
          padding-left: 1.5em;
          margin: 0.3em 0;
        }
        .ProseMirror:not(.a4-editor-content) blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 1em;
          margin: 0.5em 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        .ProseMirror:not(.a4-editor-content) hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1em 0;
        }
        .ProseMirror:not(.a4-editor-content) mark {
          border-radius: 2px;
          padding: 1px 2px;
        }
      `}</style>
    </div>
  );
}
