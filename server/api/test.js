// Simple test function to debug Vercel deployment
const express = require('express');
const app = express();

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Dusan Djukaric Backend API',
    status: 'running',
    endpoints: ['/health', '/test'],
    timestamp: new Date().toISOString()
  });
});

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend is working!',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working!',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Something went wrong', details: err.message });
});

module.exports = app;
