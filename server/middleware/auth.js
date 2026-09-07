const bcrypt = require('bcryptjs');

// Simple in-memory session store (use Redis in production)
const sessions = new Map();

// Admin credentials (should be in database in production)
const ADMIN_USERNAME_HASH = process.env.ADMIN_USERNAME_HASH || '$2a$10$tOqiz85FFnnkyui8Z2TUUeQzePnGjF1aYivKmUTiZs1uj02kHnf3m';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2a$10$sh.izXEu72yjq4eS4bYW1emCrdz5axxCNzVZGcaN8TreX1HmnVee6';

// Rate limiting for login attempts
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function validateInput(input) {
  if (!input || typeof input !== 'string') return false;
  const dangerousChars = /[<>'"&]/;
  return !dangerousChars.test(input) && input.length <= 100;
}

function isRateLimited(ip) {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;
  
  const now = Date.now();
  if (now - attempts.firstAttempt > LOCKOUT_DURATION) {
    loginAttempts.delete(ip);
    return false;
  }
  
  return attempts.count >= MAX_LOGIN_ATTEMPTS;
}

function recordLoginAttempt(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
  
  if (now - attempts.firstAttempt > LOCKOUT_DURATION) {
    attempts.count = 1;
    attempts.firstAttempt = now;
  } else {
    attempts.count++;
  }
  
  loginAttempts.set(ip, attempts);
}

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }
  
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = session.user;
  next();
};

// Login endpoint
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Input validation
    if (!validateInput(username) || !validateInput(password)) {
      return res.status(400).json({ error: 'Invalid input provided' });
    }
    
    // Check rate limiting
    if (isRateLimited(clientIP)) {
      return res.status(429).json({ 
        error: 'Too many login attempts. Please try again later.' 
      });
    }
    
    // Validate credentials
    const usernameMatch = bcrypt.compareSync(username, ADMIN_USERNAME_HASH);
    const passwordMatch = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
    
    if (!usernameMatch || !passwordMatch) {
      recordLoginAttempt(clientIP);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Clear failed attempts on successful login
    loginAttempts.delete(clientIP);
    
    // Create session
    const sessionToken = require('crypto').randomBytes(32).toString('hex');
    const expires = Date.now() + (30 * 60 * 1000); // 30 minutes
    
    sessions.set(sessionToken, {
      user: { username },
      expires
    });
    
    // Clean up expired sessions
    for (const [token, session] of sessions.entries()) {
      if (session.expires < Date.now()) {
        sessions.delete(token);
      }
    }
    
    res.json({ 
      success: true, 
      token: sessionToken,
      expires: expires 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Logout endpoint
const logout = (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true });
};

module.exports = {
  authenticate,
  login,
  logout
};
