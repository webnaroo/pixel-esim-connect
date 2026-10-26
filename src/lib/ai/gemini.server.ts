// Server-only: the one place that knows which AI provider and model are used (Google Gemini, GEMINI_API_KEY).
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Free-tier availability of Gemini models changes; override with GEMINI_MODEL without a code change.
export const GEMINI_MODEL_DEFAULT = "gemini-3.8-flash";
export const geminiModelId = () => process.env["GEMINI_MODEL"]?.trim() || GEMINI_MODEL_DEFAULT;

/** Upstream statuses that pause the AI until an admin releases it: bad/forbidden key, exhausted plan, unknown model. */
export const AI_BLOCKING_STATUSES = [401, 402, 403, 404];

/** Tried in order when Google answers "high demand" (503) or a rate limit (429) for the main model. */
export const GEMINI_FALLBACK_DEFAULT = "gemini-flash-latest,gemini-flash-lite-latest";
export const geminiFallbackIds = () =>
  (process.env["GEMINI_FALLBACK_MODELS"] ?? GEMINI_FALLBACK_DEFAULT)
    .split(",").map((id) => id.trim()).filter(Boolean);

const OVERLOAD_STATUSES = [429, 500, 503];

/** `onError` gets a clone of the final non-2xx upstream response (status and body for the admin message). */
export function createGeminiModel(apiKey: string, onError?: (response: Response) => Promise<void>) {
  const mainId = geminiModelId();
  const provider = createGoogleGenerativeAI({
    apiKey,
    fetch: async (input, init) => {
      const first = await fetch(input, init);
      let response = first;
      if (OVERLOAD_STATUSES.includes(first.status)) {
        const url = String(input instanceof Request ? input.url : input);
        for (const id of geminiFallbackIds().filter((id) => id !== mainId)) {
          const swapped = url.replace(/\/models\/[^/:?]+/, `/models/${id}`);
          if (swapped === url) break;
          const attempt = await fetch(swapped, init);
          if (attempt.ok) { response = attempt; break; }
        }
        // No fallback worked (overloaded, or retired model): report the main model's error, not a fallback's.
        response = response.ok ? response : first;
      }
      if (!response.ok && onError) await onError(response.clone());
      return response;
    },
  });
  return provider(mainId);
}

export async function upstreamErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: { message?: string } };
    return body.message ?? body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}
