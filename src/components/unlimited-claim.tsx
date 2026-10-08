import { useQuery } from "@tanstack/react-query";
import { unlimitedClaimQuery } from "@/lib/catalog.functions";
import { showsNoThrottle, type ThrottleClaim } from "@/lib/throttle";

/** "Unlimited · ohne Drosselung · laut Anbieter" — texts from settings, only for confirmed plans. */
export function UnlimitedLabel({ throttleClaim, className }: { throttleClaim?: ThrottleClaim | null; className?: string }) {
  const { data } = useQuery(unlimitedClaimQuery());
  const t = data?.texts;
  if (!t || !showsNoThrottle({ type: "unlimited", throttleClaim })) return <span className={className}>Unlimited</span>;
  return (
    <span className={className}>
      Unlimited · {t.label}
      {t.qualifier && <span className="ml-1 align-middle text-xs font-normal text-ink-muted">{t.qualifier}</span>}
    </span>
  );
}

/** Expandable caption under the claim. Native details/summary: keyboard + screen reader friendly. */
export function UnlimitedNote({ throttleClaim }: { throttleClaim?: ThrottleClaim | null }) {
  const { data } = useQuery(unlimitedClaimQuery());
  const t = data?.texts;
  if (!t?.note || !showsNoThrottle({ type: "unlimited", throttleClaim })) return null;
  return (
    <details className="text-xs text-ink-muted" onClick={(e) => e.stopPropagation()}>
      <summary className="inline-flex min-h-[32px] cursor-pointer items-center underline decoration-dotted underline-offset-4">Was heißt das?</summary>
      <p className="mt-1">{t.note}</p>
    </details>
  );
}

/** Page-level claim (home, country/region pages): only when at least one plan is confirmed. */
export function NoThrottleClaim({ when = true, className }: { when?: boolean; className?: string }) {
  const { data } = useQuery(unlimitedClaimQuery());
  if (!when || !data?.anyConfirmed || !data.texts) return null;
  return <span className={className}>Unlimited {data.texts.label}{data.texts.qualifier ? ` ${data.texts.qualifier}` : ""}</span>;
}
