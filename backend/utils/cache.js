// backend/utils/cache.js
const LRU = require("lru-cache");

const cache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 60 // 1 hour default TTL
});

module.exports = cache;