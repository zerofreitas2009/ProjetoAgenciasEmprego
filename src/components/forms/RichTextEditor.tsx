import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Eraser } from "lucide-react";

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "UL",
  "OL",
  "LI",
]);

export function sanitizeRichText(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          // unwrap disallowed nodes but keep their text content
          const frag = doc.createDocumentFragment();
          while (el.firstChild) frag.appendChild(el.firstChild);
          el.replaceWith(frag);
          continue;
        }

        // remove all attributes (avoid XSS)
        for (const attr of Array.from(el.attributes)) {
          el.removeAttribute(attr.name);
        }

        walk(el);
      }
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);

  const safeValue = useMemo(() => sanitizeRichText(value), [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== safeValue) el.innerHTML = safeValue;
  }, [safeValue]);

  function exec(cmd: string) {
    // keep focus so execCommand applies to editor selection
    ref.current?.focus();
    document.execCommand(cmd);
    onChange(sanitizeRichText(ref.current?.innerHTML ?? ""));
  }

  return (
    <div
      className={cn(
        "rounded-[22px] border border-slate-200/70 bg-white/70 backdrop-blur-md",
        "dark:border-white/10 dark:bg-white/5",
        focused && "ring-1 ring-[hsl(var(--electric-indigo))]/35",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/70 px-3 py-2 dark:border-white/10">
        <Button
          type="button"
          variant="secondary"
          className="h-9 rounded-xl hr-btn-secondary"
          onClick={() => exec("bold")}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-9 rounded-xl hr-btn-secondary"
          onClick={() => exec("italic")}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-9 rounded-xl hr-btn-secondary"
          onClick={() => exec("insertUnorderedList")}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-9 rounded-xl hr-btn-secondary"
          onClick={() => exec("insertOrderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="ml-auto">
          <Button
            type="button"
            variant="secondary"
            className="h-9 rounded-xl hr-btn-secondary"
            onClick={() => {
              onChange("");
              if (ref.current) ref.current.innerHTML = "";
            }}
          >
            <Eraser className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>
      </div>

      <div className="relative">
        {!safeValue && !focused ? (
          <div className="pointer-events-none absolute left-4 top-3 text-sm text-slate-500 dark:text-slate-400">
            {placeholder ?? "Descreva o contexto, responsabilidades e diferenciais…"}
          </div>
        ) : null}

        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onChange(sanitizeRichText(ref.current?.innerHTML ?? ""));
          }}
          onInput={() => onChange(sanitizeRichText(ref.current?.innerHTML ?? ""))}
          className={cn(
            "min-h-[140px] px-4 py-3 text-sm text-slate-800 outline-none",
            "dark:text-slate-100",
            "prose prose-slate max-w-none dark:prose-invert"
          )}
        />
      </div>
    </div>
  );
}
