// backend/utils/retry.js
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Retry function with exponential backoff + jitter.
 * fn should be a function returning a promise.
 * opts: { retries, baseMs }
 */
async function retryWithBackoff(fn, opts = {}) {
  const retries = typeof opts.retries === "number" ? opts.retries : 3;
  const baseMs = typeof opts.baseMs === "number" ? opts.baseMs : 500;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status;
      // don't retry on 4xx other than 429
      if (status && status < 500 && status !== 429) throw err;
      if (attempt === retries) throw err;
      const jitter = Math.floor(Math.random() * 100);
      const backoff = baseMs * Math.pow(2, attempt) + jitter;
      console.warn(`[retryWithBackoff] attempt ${attempt + 1} failed. retrying in ${backoff}ms`);
      await sleep(backoff);
    }
  }
}

module.exports = { retryWithBackoff };