const rateLimit = require('express-rate-limit');
const { client } = require('../config/redis');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
    });
  },
  store: {
    // Use Redis store
    async increment(key) {
      const current = await client.incr(key);
      if (current === 1) {
        await client.expire(key, 60);
      }
      return current;
    },
  },
});

module.exports = limiter;