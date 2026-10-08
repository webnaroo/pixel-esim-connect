// Minimal, safe Markdown subset (headings, paragraphs, line breaks, **bold**, lists, links). No raw HTML.
import { Fragment } from "react";

function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong>;
    const m = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (m) return <a key={`${key}-${i}`} href={m[2]} className="text-primary underline" target="_blank" rel="noopener noreferrer">{m[1]}</a>;
    return <Fragment key={`${key}-${i}`}>{p}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className="space-y-4 text-ink">
      {blocks.map((b, i) => {
        const h = b.match(/^(#{1,3})\s+(.*)$/);
        if (h && h[1] && h[2] !== undefined) return h[1].length === 1 ? <h2 key={i} className="text-2xl">{inline(h[2], `${i}`)}</h2> : <h3 key={i} className="text-xl">{inline(h[2], `${i}`)}</h3>;
        const lines = b.split("\n");
        if (lines.every((l) => /^[-*]\s+/.test(l))) return <ul key={i} className="list-disc space-y-1 pl-6">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^[-*]\s+/, ""), `${i}-${j}`)}</li>)}</ul>;
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `${i}-${j}`)}</Fragment>)}</p>;
      })}
    </div>
  );
}
