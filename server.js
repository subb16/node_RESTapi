require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const { createClient } = require('redis');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit'); // Added for rate limiting


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};


const app = express();
const PORT = process.env.PORT || 5000;
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
  }
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Redis connection
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Cache middleware
const cacheMiddleware = async (req, res, next) => {
  if (req.method !== 'GET') return next();
  
  const cacheKey = `cache:${req.originalUrl}`;
  
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('Serving from cache');
      return res.json(JSON.parse(cachedData));
    }
    
    // Override res.json to cache responses
    const originalJson = res.json;
    res.json = (body) => {
      redisClient.setEx(cacheKey, 3600, JSON.stringify(body)); // Cache for 1 hour
      originalJson.call(res, body);
    };
    
    next();
  } catch (err) {
    console.error('Cache error:', err);
    next();
  }
};

app.use(express.urlencoded({ extended: true }));

// Routes

app.get('/test', (req, res) => {
    res.send('Server is working!');
  });


// Apply caching only to GET /chapters
app.get('/api/v1/chapters', cacheMiddleware, async (req, res) => {
  try {
    const chapters = await Chapter.find();
    res.json(chapters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/chapters/:id', async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    res.json(chapter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const Chapter = require('./models/Chapter');
const adminAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({
      success: false,
      message: 'Invalid admin token'
    });
  }
  next();
};
app.post('/api/v1/chapters',adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.join(__dirname, req.file.path);
    const fileData = fs.readFileSync(filePath, 'utf8');
    const chapters = JSON.parse(fileData);

    const savedChapters = await Chapter.insertMany(chapters);
    
    // Invalidate cache after upload
    await redisClient.del('cache:/api/v1/chapters');
    
    fs.unlinkSync(filePath);

    console.log(`Saved ${savedChapters.length} chapters to MongoDB`);
    
    res.json({ 
      success: true, 
      uploaded: savedChapters.length,
      firstId: savedChapters[0]._id
    });
    
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      error: err.message,
      hint: 'Check if chapter data matches Mongoose schema'
    });
  }
});


app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


async function startServer() {
  try {
    await connectDB();
    await redisClient.connect();
    console.log('Connected to Redis');
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Try these endpoints:');
      console.log(`- GET http://localhost:${PORT}/api/v1/chapters`);
      console.log(`- GET http://localhost:${PORT}/api/v1/chapters/:id`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

startServer();