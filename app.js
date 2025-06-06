const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const chapterRoutes = require('./routes/chapterRoutes');
const { isAdmin } = require('./middlewares/auth');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/v1/chapters', chapterRoutes);

// Simple admin token setup route for demo purposes
app.get('/api/v1/setup-admin', (req, res) => {
  const adminToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  console.log('Generated ADMIN_TOKEN:', adminToken);
  res.json({
    success: true,
    message: 'Use this token in x-admin-token header for admin access',
    token: adminToken,
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

module.exports = app;