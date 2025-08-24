// backend/services/geminiClient.js
// Robust Gemini REST wrapper using axios.
// Exports: generateText(promptParts, opts) -> { text, raw, metadata }

const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "models/gemini-2.5-flash-lite";
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT = parseInt(process.env.GEMINI_TIMEOUT_MS || "12000", 10);

function modelUrl(model = MODEL) {
  return `${BASE}/${model}:generateContent`;
}

function safeSnippet(parts) {
  try {
    if (!Array.isArray(parts)) return "";
    return parts.map(p => (p.text || "").slice(0, 300)).join(" ");
  } catch {
    return "";
  }
}

async function generateText(promptParts, options = {}) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY not set in environment");
  }

  const parts = Array.isArray(promptParts)
    ? promptParts.map(p => ({ text: String(p) }))
    : [{ text: String(promptParts) }];

  const body = {
    contents: [
      {
        role: "user",
        parts
      }
    ],
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens || 256,
      temperature: typeof options.temperature === "number" ? options.temperature : 0.2,
      topP: typeof options.topP === "number" ? options.topP : undefined,
      topK: typeof options.topK === "number" ? options.topK : undefined
    },
    responseMimeType: options.responseMimeType || undefined
  };

  // remove undefined fields
  if (!body.generationConfig.topP) delete body.generationConfig.topP;
  if (!body.generationConfig.topK) delete body.generationConfig.topK;
  if (!body.responseMimeType) delete body.responseMimeType;

  const url = modelUrl();

  // safe logging (no PII, no API key)
  console.debug("[geminiClient] calling model:", MODEL);
  console.debug("[geminiClient] request snippet:", safeSnippet(parts));

  try {
    const res = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
        // Preferred header; if blocked, you can change to `?key=...` in the url
        "x-goog-api-key": API_KEY
      },
      timeout: TIMEOUT
    });

    const data = res.data || {};
    const candidates = data.candidates || [];

    if (!candidates.length) {
      return { text: "", raw: data, metadata: { candidateCount: 0 } };
    }

    // get first candidate
    const first = candidates[0];
    const cparts = first?.content?.parts || [];
    const text = cparts.map(p => p.text || "").join("");

    return {
      text: text.trim(),
      raw: data,
      metadata: {
        model: MODEL,
        candidateCount: candidates.length,
        responseId: data.responseId
      }
    };
  } catch (err) {
    // Helpful error info (without key)
    if (err.response) {
      console.error("[geminiClient] error status:", err.response.status);
      console.error("[geminiClient] error body:", JSON.stringify(err.response.data).slice(0, 2000));
      const e = new Error("Gemini API error: " + err.response.status);
      e.response = err.response;
      throw e;
    }
    console.error("[geminiClient] network or other error:", err.message || err);
    throw err;
  }
}

module.exports = { generateText };