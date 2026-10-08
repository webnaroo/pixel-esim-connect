// Minimal, safe Markdown subset (headings, paragraphs, line breaks, **bold**, lists, links). No raw HTML.
import { Fragment } from "react";

function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]*\))/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong>;
    const m = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (m) return <a key={`${key}-${i}`} href={m[2]} className="text-primary underline" target="_blank" rel="noopener noreferrer">{m[1]}</a>;
    const r = p.match(/^\[([^\]]+)\]\((\/[a-zA-Z0-9/_-]*)\)$/);
    if (r) return <a key={`${key}-${i}`} href={r[2]} className="text-primary underline">{r[1]}</a>;
    return <Fragment key={`${key}-${i}`}>{p}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className="min-w-0 space-y-4 text-ink [overflow-wrap:anywhere]">
      {blocks.map((b, i) => {
        const h = b.match(/^(#{1,3})\s+(.*)$/);
        if (h && h[1] && h[2] !== undefined) return h[1].length === 1 ? <h2 key={i} className="text-2xl">{inline(h[2], `${i}`)}</h2> : <h3 key={i} className="text-xl">{inline(h[2], `${i}`)}</h3>;
        const lines = b.split("\n");
        if (lines.every((l) => /^[-*]\s+/.test(l))) return <ul key={i} className="list-disc space-y-1 pl-6">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^[-*]\s+/, ""), `${i}-${j}`)}</li>)}</ul>;
        if (lines.every((l) => /^\d+\.\s+/.test(l))) return <ol key={i} className="list-decimal space-y-1 pl-6">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\.\s+/, ""), `${i}-${j}`)}</li>)}</ol>;
        if (lines.length >= 2 && lines.every((l) => /^\|.*\|$/.test(l.trim()))) {
          const rows = lines.filter((l) => !/^\|[\s:|-]+\|$/.test(l.trim())).map((l) => l.trim().slice(1, -1).split("|").map((c) => c.trim()));
          const [head, ...body] = rows;
          return (
            <div key={i} className="overflow-x-auto rounded-[14px] border border-line">
              <table className="w-full min-w-0 text-left text-sm">
                <thead className="border-b border-line"><tr>{head!.map((c, j) => <th key={j} scope="col" className="p-2 font-semibold sm:p-3">{inline(c, `${i}-h${j}`)}</th>)}</tr></thead>
                <tbody>{body.map((r, j) => <tr key={j} className="border-b border-line last:border-0">{r.map((c, k) => <td key={k} className="p-2 align-top sm:p-3">{inline(c, `${i}-${j}-${k}`)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `${i}-${j}`)}</Fragment>)}</p>;
      })}
    </div>
  );
}
