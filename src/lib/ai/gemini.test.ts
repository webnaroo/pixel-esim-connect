import { afterEach, describe, expect, it, vi } from "vitest";
import { generateText, Output } from "ai";
import { z } from "zod";
import { draftOut, faqOut, sectionOut, suggestOut } from "../ratgeber-ai";
import { seoAnalysisSchema } from "../seo-analysis";
import { AI_BLOCKING_STATUSES, createGeminiModel, geminiModelId, GEMINI_MODEL_DEFAULT, upstreamErrorMessage } from "./gemini.server";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const okResponse = (text: string) => new Response(JSON.stringify({
  candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP", index: 0 }],
  usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
}), { status: 200, headers: { "content-type": "application/json" } });

describe("gemini model", () => {
  it("defaults to the free flash model and can be overridden by env", () => {
    vi.stubEnv("GEMINI_MODEL", "");
    expect(geminiModelId()).toBe(GEMINI_MODEL_DEFAULT);
    vi.stubEnv("GEMINI_MODEL", " gemini-flash-latest ");
    expect(geminiModelId()).toBe("gemini-flash-latest");
  });

  it("calls the Gemini API with the key and returns the generated text", async () => {
    vi.stubEnv("GEMINI_MODEL", "");
    const fetchMock = vi.fn().mockResolvedValue(okResponse("Hallo"));
    vi.stubGlobal("fetch", fetchMock);
    const { text } = await generateText({ model: createGeminiModel("key_123"), prompt: "Sag hallo" });
    expect(text).toBe("Hallo");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain(`generativelanguage.googleapis.com`);
    expect(String(url)).toContain(GEMINI_MODEL_DEFAULT);
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe("key_123");
  });

  it("reports upstream errors (quota, bad key) with status and message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 429, message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" } }), { status: 429, headers: { "content-type": "application/json" } })));
    let seen: { status: number; message: string } | undefined;
    const model = createGeminiModel("k", async (res) => { seen = { status: res.status, message: await upstreamErrorMessage(res, "fallback") }; });
    await expect(generateText({ model, prompt: "x", maxRetries: 0 })).rejects.toBeTruthy();
    expect(seen).toEqual({ status: 429, message: "Quota exceeded" });
    expect(AI_BLOCKING_STATUSES).not.toContain(429); // a quota limit is temporary and must not pause the AI
    expect(AI_BLOCKING_STATUSES).toEqual(expect.arrayContaining([401, 403, 404]));
    expect(await upstreamErrorMessage(new Response("not json", { status: 500 }), "fallback")).toBe("fallback");
  });

  it("builds a structured-output request for every schema the admin AI uses", async () => {
    const schemas: Record<string, z.ZodType<unknown>> = { draftOut, sectionOut, faqOut, suggestOut, seoAnalysisSchema };
    for (const [name, schema] of Object.entries(schemas)) {
      const fetchMock = vi.fn().mockResolvedValue(okResponse("{}"));
      vi.stubGlobal("fetch", fetchMock);
      await generateText({ model: createGeminiModel("k"), prompt: "x", output: Output.object({ schema }) }).catch(() => undefined);
      expect(fetchMock, name).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
      expect(body.generationConfig.responseMimeType, name).toBe("application/json");
      expect(body.generationConfig.responseJsonSchema?.type, name).toBe("object");
    }
  });
});
