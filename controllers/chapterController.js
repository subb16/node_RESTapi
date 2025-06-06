const Chapter = require('../models/Chapter');
const { delAsync } = require('../config/redis');
const multer = require('multer');
const fs = require('fs');

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage }).single('file');

// Get all chapters with filtering and pagination
exports.getChapters = async (req, res) => {
  try {
    const { class: classFilter, unit, status, weakChapters, subject, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (classFilter) filter.class = classFilter;
    if (unit) filter.unit = unit;
    if (status) filter.status = status;
    if (weakChapters) filter.weakChapters = weakChapters === 'true';
    if (subject) filter.subject = subject;
    
    const total = await Chapter.countDocuments(filter);
    const chapters = await Chapter.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: chapters,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  }
};

// Get single chapter by ID
exports.getChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }
    
    res.json({
      success: true,
      data: chapter,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  }
};

// Upload chapters from JSON file
exports.uploadChapters = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'File upload failed',
        error: err.message,
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }
    
    try {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const chaptersData = JSON.parse(fileContent);
      
      if (!Array.isArray(chaptersData)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file format. Expected an array of chapters.',
        });
      }
      
      const results = [];
      const failedChapters = [];
      
      for (const chapterData of chaptersData) {
        try {
          const chapter = new Chapter(chapterData);
          await chapter.validate();
          results.push(chapter);
        } catch (validationErr) {
          failedChapters.push({
            data: chapterData,
            error: validationErr.message,
          });
        }
      }
      
      // Save valid chapters
      await Chapter.insertMany(results);
      
      // Invalidate cache
      await delAsync('chapters:*');
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json({
        success: true,
        message: 'Chapters uploaded successfully',
        uploadedCount: results.length,
        failedChapters,
      });
    } catch (parseErr) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON file',
        error: parseErr.message,
      });
    }
  });
};