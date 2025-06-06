const mongoose = require('mongoose');

const ChapterSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  chapter: {  // Changed from 'title' to match your data
    type: String,
    required: true
  },
  class: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  yearWiseQuestionCount: {
    type: Map,
    of: Number,
    required: true
  },
  questionSolved: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed'], // Match your exact status values
    default: 'Not Started'
  },
  isWeakChapter: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Chapter', ChapterSchema);