/**
 * Simple rate limiter for authentication attempts
 * Prevents brute force attacks
 */

class RateLimiter {
  constructor() {
    this.attempts = new Map();
    this.maxAttempts = 5; // Maximum attempts
    this.windowMs = 15 * 60 * 1000; // 15 minutes
    this.blockDurationMs = 30 * 60 * 1000; // 30 minutes block
  }

  isBlocked(identifier) {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier);

    if (!userAttempts) {
      return false;
    }

    // Check if user is in block period
    if (userAttempts.blockedUntil && now < userAttempts.blockedUntil) {
      return true;
    }

    // Reset if block period has expired
    if (userAttempts.blockedUntil && now >= userAttempts.blockedUntil) {
      this.attempts.delete(identifier);
      return false;
    }

    // Check if too many attempts in current window
    if (userAttempts.count >= this.maxAttempts) {
      // Block user for the specified duration
      userAttempts.blockedUntil = now + this.blockDurationMs;
      return true;
    }

    return false;
  }

  recordAttempt(identifier) {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || {
      count: 0,
      firstAttempt: now,
      blockedUntil: null
    };

    // Reset if window has expired
    if (now - userAttempts.firstAttempt > this.windowMs) {
      userAttempts.count = 1;
      userAttempts.firstAttempt = now;
      userAttempts.blockedUntil = null;
    } else {
      userAttempts.count++;
    }

    this.attempts.set(identifier, userAttempts);
  }

  getRemainingTime(identifier) {
    const userAttempts = this.attempts.get(identifier);
    if (!userAttempts || !userAttempts.blockedUntil) {
      return 0;
    }

    const remaining = userAttempts.blockedUntil - Date.now();
    return Math.max(0, Math.ceil(remaining / 60000)); // Return minutes
  }

  getRemainingAttempts(identifier) {
    const userAttempts = this.attempts.get(identifier);
    if (!userAttempts) {
      return this.maxAttempts;
    }

    return Math.max(0, this.maxAttempts - userAttempts.count);
  }
}

// Create a singleton instance
const rateLimiter = new RateLimiter();

export default rateLimiter;
