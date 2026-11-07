import { cn } from "@/lib/utils";

/**
 * One rhythm for every homepage block. `paper` sits on the page background, `band` is the white
 * full-width strip with hairlines. Spacing comes from the --section-gap-* tokens (48 / 64 / 96px).
 */
export function Section({
  labelledBy,
  tone = "paper",
  className,
  children,
}: {
  labelledBy: string;
  tone?: "paper" | "band";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={labelledBy} className={cn(tone === "band" && "border-y border-line bg-surface")}>
      <div
        className={cn(
          "container-page py-(--section-gap-sm) sm:py-(--section-gap-md)",
          tone === "band" && "lg:py-(--section-gap-lg)",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Index for the CSS stagger (`.reveal` / `.hero-in`). */
export const stagger = (name: "--reveal-i" | "--hero-i", i: number) => ({ [name]: i }) as React.CSSProperties;
