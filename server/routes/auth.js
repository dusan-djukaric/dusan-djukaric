const express = require('express');
const { login, logout } = require('../middleware/auth');
const router = express.Router();

// Login endpoint
router.post('/login', login);

// Logout endpoint
router.post('/logout', logout);

module.exports = router;
