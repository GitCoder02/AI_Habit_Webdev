// backend/testGemini.js
require('dotenv').config();             // ← loads backend/.env into process.env
const { generateText } = require('./services/geminiClient');

async function run() {
  try {
    console.log('GEMINI_API_KEY present?', !!process.env.GEMINI_API_KEY);
    const out = await generateText(
      "Write a friendly 1-line tip to focus for 25 minutes.",
      { maxOutputTokens: 80, temperature: 0.35 }
    );
    console.log("Gemini output:", out);
  } catch (err) {
    console.error("Gemini test failed:",
      err && err.response ? { status: err.response.status, data: err.response.data } : (err.message || err)
    );
  }
}
run();