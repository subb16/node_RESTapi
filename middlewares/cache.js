const { getAsync, setAsync } = require('../config/redis');

const cache = (keyPrefix, ttl = 3600) => {
  return async (req, res, next) => {
    const cacheKey = `${keyPrefix}:${JSON.stringify(req.query)}`;
    
    try {
      const cachedData = await getAsync(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = (body) => {
        setAsync(cacheKey, JSON.stringify(body), 'EX', ttl)
          .catch(err => console.error('Redis set error:', err));
        originalJson.call(res, body);
      };
      
      next();
    } catch (err) {
      console.error('Cache middleware error:', err);
      next();
    }
  };
};

module.exports = cache;