// backend/utils/cache.js
const { LRUCache } = require("lru-cache");

const cache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 60 // 1 hour default TTL
});

module.exports = cache;
