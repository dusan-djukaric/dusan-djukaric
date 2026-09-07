// Simplified API to debug step by step
const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Dusan Djukaric Backend API',
    status: 'running',
    version: 'simplified',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Simple auth test
app.post('/auth/login', (req, res) => {
  res.json({ 
    message: 'Auth endpoint working',
    success: true
  });
});

// Simple S3 test
app.get('/s3/images/available', (req, res) => {
  res.json({ 
    message: 'S3 endpoint working',
    images: []
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Something went wrong', details: err.message });
});

module.exports = app;
