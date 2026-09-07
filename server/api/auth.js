const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Simple in-memory session store
const sessions = {};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate credentials (using your existing hashes)
    const ADMIN_USERNAME_HASH = process.env.ADMIN_USERNAME_HASH || '$2a$10$tOqiz85FFnnkyui8Z2TUUeQzePnGjF1aYivKmUTiZs1uj02kHnf3m';
    const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2a$10$sh.izXEu72yjq4eS4bYW1emCrdz5axxCNzVZGcaN8TreX1HmnVee6';
    
    const usernameMatch = bcrypt.compareSync(username, ADMIN_USERNAME_HASH);
    const passwordMatch = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
    
    if (!usernameMatch || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    const token = jwt.sign({ username }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '30m' });
    sessions[token] = { username, expires: Date.now() + 30 * 60 * 1000 };
    
    res.json({
      success: true,
      token,
      expires: Date.now() + 30 * 60 * 1000
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && sessions[token]) {
    delete sessions[token];
  }
  res.json({ success: true });
});

module.exports = router;
