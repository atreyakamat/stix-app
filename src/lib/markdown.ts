// A small Markdown reader for blog posts. It returns plain data (no HTML
// strings), and the page renders that with React, so nothing in a post can
// inject markup or script. Links and images only keep http(s) and site paths.
//
// Supported: # to ### headings, paragraphs, - and 1. lists, > quotes, ---
// rules, ![alt](src) images on their own line, and inline **bold**,
// *italic*, `code` and [links](url).

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: Inline[] }
  | { kind: "em"; children: Inline[] }
  | { kind: "code"; text: string }
  | { kind: "link"; href: string; children: Inline[] };

export type Block =
  | { kind: "heading"; level: 2 | 3 | 4; children: Inline[] }
  | { kind: "paragraph"; children: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "quote"; children: Inline[] }
  | { kind: "image"; src: string; alt: string }
  | { kind: "rule" };

/** A link or image address the page may use, or null. */
export function safeUrl(raw: string): string | null {
  const url = raw.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (url.startsWith("#")) return url;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ kind: "text", text });
    text = "";
  };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^`([^`]+)`/))) {
      flush();
      out.push({ kind: "code", text: m[1] });
    } else if ((m = rest.match(/^\*\*(.+?)\*\*/))) {
      flush();
      out.push({ kind: "strong", children: parseInline(m[1]) });
    } else if ((m = rest.match(/^\*([^*\s][^*]*?)\*/)) || (m = rest.match(/^_([^_\s][^_]*?)_(?![a-zA-Z0-9])/))) {
      flush();
      out.push({ kind: "em", children: parseInline(m[1]) });
    } else if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/))) {
      flush();
      const href = safeUrl(m[2]);
      if (href) out.push({ kind: "link", href, children: parseInline(m[1]) });
      else out.push(...parseInline(m[1]));
    } else {
      text += src[i];
      i++;
      continue;
    }
    i += m[0].length;
  }
  flush();
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ kind: "paragraph", children: parseInline(para.join(" ").trim()) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const t = line.trim();
    let m: RegExpMatchArray | null;

    if (!t) {
      flushPara();
    } else if ((m = t.match(/^(#{1,3})\s+(.+)$/))) {
      flushPara();
      // The post title is the page's h1, so # in a post becomes h2.
      blocks.push({ kind: "heading", level: (m[1].length + 1) as 2 | 3 | 4, children: parseInline(m[2]) });
    } else if (/^(-{3,}|\*{3,})$/.test(t)) {
      flushPara();
      blocks.push({ kind: "rule" });
    } else if ((m = t.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
      flushPara();
      const src = safeUrl(m[2]);
      if (src) blocks.push({ kind: "image", src, alt: m[1] });
    } else if (/^>\s?/.test(t)) {
      flushPara();
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) quote.push(lines[i++].trim().replace(/^>\s?/, ""));
      i--;
      blocks.push({ kind: "quote", children: parseInline(quote.join(" ")) });
    } else if (/^([-*+]|\d+[.)])\s+/.test(t)) {
      flushPara();
      const ordered = /^\d/.test(t);
      const items: Inline[][] = [];
      const itemRe = ordered ? /^\d+[.)]\s+(.*)$/ : /^[-*+]\s+(.*)$/;
      while (i < lines.length) {
        const im = lines[i].trim().match(itemRe);
        if (!im) break;
        items.push(parseInline(im[1]));
        i++;
      }
      i--;
      blocks.push({ kind: "list", ordered, items });
    } else {
      para.push(t);
    }
  }
  flushPara();
  return blocks;
}

/** Plain text of a post, for descriptions and reading time. */
export function plainText(src: string): string {
  const walk = (xs: Inline[]): string => xs.map((x) => ("children" in x ? walk(x.children) : x.text)).join("");
  return parseMarkdown(src)
    .map((b) => (b.kind === "list" ? b.items.map(walk).join(" ") : "children" in b ? walk(b.children) : ""))
    .filter(Boolean)
    .join(" ");
}

export const readingMinutes = (src: string) => Math.max(1, Math.round(plainText(src).split(/\s+/).length / 200));
