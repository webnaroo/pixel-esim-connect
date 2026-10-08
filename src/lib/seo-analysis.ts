import { z } from "zod";
import { SITE_URL } from "./seo";

export const seoReportInput = z.object({ title: z.string().trim().min(3).max(120), report: z.string().trim().min(20).max(40000) });
export const seoAnalysisSchema = z.object({
  summary: z.string(),
  limitations: z.array(z.string()),
  recommendations: z.array(z.object({
    priority: z.enum(["P1", "P2", "P3"]),
    title: z.string(), page: z.string(), evidence: z.string(),
    action: z.string(), impact: z.string(), effort: z.enum(["klein", "mittel", "groß"]),
    verification: z.string(),
  })),
});
export type SeoAnalysis = z.infer<typeof seoAnalysisSchema>;
export function normalizeAnalysis(value: SeoAnalysis): SeoAnalysis {
  return { ...value, recommendations: value.recommendations.slice(0, 12).map((r) => {
    let page = "";
    try {
      const u = new URL(r.page, SITE_URL);
      if (u.origin === SITE_URL && !u.search && !u.hash) page = u.pathname;
    } catch { /* Unknown page is explicitly left unspecified. */ }
    return { ...r, page };
  }).sort((a, b) => a.priority.localeCompare(b.priority)) };
}