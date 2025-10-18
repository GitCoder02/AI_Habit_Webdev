// backend/services/geminiClient.js
const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "models/gemini-2.5-flash-lite";
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT = parseInt(process.env.GEMINI_TIMEOUT_MS || "30000", 10); // Increased to 30 seconds

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
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
      topP: options.topP ?? 0.9,
    },
  };

  // Add response_mime_type if specified
  if (options.response_mime_type) {
    body.generationConfig.response_mime_type = options.response_mime_type;
  }

  const model = options.model || MODEL;
  const url = modelUrl(model);
  const snippet = safeSnippet(parts);

  console.log(`[geminiClient] calling model: ${model}`);
  console.log(`[geminiClient] request snippet: ${snippet}`);

  try {
    const resp = await axios.post(
      url,
      body,
      {
        params: { key: API_KEY },
        headers: { "Content-Type": "application/json" },
        timeout: TIMEOUT,
      }
    );

    const raw = resp.data;
    const candidate = raw?.candidates?.[0];
    const content = candidate?.content;
    const textParts = content?.parts || [];
    const text = textParts.map(p => p.text || "").join("");

    console.log(`[geminiClient] success. response length: ${text.length} chars`);

    return {
      text,
      raw,
      metadata: {
        model,
        finishReason: candidate?.finishReason,
        safetyRatings: candidate?.safetyRatings,
      },
    };
  } catch (err) {
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      console.error(`[geminiClient] timeout after ${TIMEOUT}ms`);
    } else if (err.response) {
      console.error(`[geminiClient] API error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
    } else {
      console.error(`[geminiClient] network or other error: ${err.message}`);
    }
    throw err;
  }
}

module.exports = { generateText };
