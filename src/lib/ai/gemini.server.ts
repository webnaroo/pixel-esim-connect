// Server-only: the one place that knows which AI provider and model are used (Google Gemini, GEMINI_API_KEY).
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Free-tier availability of Gemini models changes; override with GEMINI_MODEL without a code change.
export const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash";
export const geminiModelId = () => process.env["GEMINI_MODEL"]?.trim() || GEMINI_MODEL_DEFAULT;

/** Upstream statuses that pause the AI until an admin releases it: bad/forbidden key, exhausted plan, unknown model. */
export const AI_BLOCKING_STATUSES = [401, 402, 403, 404];

/** `onError` gets a clone of every non-2xx upstream response (status and body for the admin message). */
export function createGeminiModel(apiKey: string, onError?: (response: Response) => Promise<void>) {
  const provider = createGoogleGenerativeAI({
    apiKey,
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      if (!response.ok && onError) await onError(response.clone());
      return response;
    },
  });
  return provider(geminiModelId());
}

export async function upstreamErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: { message?: string } };
    return body.message ?? body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}
