// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://dusandjukaric.com',
            'https://www.dusandjukaric.com',
            'https://dusan-djukaric-rh5q.vercel.app',
            'https://dusan-djukaric-frontend.vercel.app',
            'https://dusan-djukaric.vercel.app',
            'https://dusan-djukaric-kappa.vercel.app',
            'https://dusan-djukaric-api.vercel.app',
            'https://dusan-djukaric-5496.vercel.app',
            'https://dusan-djukaric-4pkkfo5qg-djukaric-tim.vercel.app'
        ]
        : ['http://localhost:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true, limit: '10mb'}));

// Import routes
const authRoutes = require('./auth');
const s3Routes = require('./s3');

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Dusan Djukaric Backend API',
        status: 'running',
        endpoints: ['/health', '/auth/login', '/auth/logout', '/s3/images/:folder'],
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/auth', authRoutes);
app.use('/s3', s3Routes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({error: 'Endpoint not found'});
});

// Vercel serverless function handler
module.exports = app;
