import bcrypt from "bcryptjs";
import rateLimiter from "./rateLimiter";
import auditLogger from "./auditLogger";

// Get credentials from environment variables
const hashedUserName = process.env.REACT_APP_ADMIN_USERNAME_HASH;
const hashedPassword = process.env.REACT_APP_ADMIN_PASSWORD_HASH;

// Input validation function
const validateInput = (input) => {
    if (!input || typeof input !== 'string') {
        return false;
    }
    // Check for basic security: no special characters that could be used for injection
    const dangerousChars = /[<>'"&]/;
    return !dangerousChars.test(input) && input.length <= 100;
};

export const authenticateUser = async (username, password) => {
    try {
        // Check rate limiting
        if (rateLimiter.isBlocked(username)) {
            const remainingTime = rateLimiter.getRemainingTime(username);
            throw new Error(`Too many failed attempts. Try again in ${remainingTime} minutes.`);
        }

        // Validate inputs
        if (!validateInput(username) || !validateInput(password)) {
            rateLimiter.recordAttempt(username);
            console.error('Invalid input provided for authentication');
            return { success: false, error: 'Invalid input provided' };
        }

        // Check if environment variables are properly set
        if (!hashedUserName || !hashedPassword) {
            console.error('Authentication credentials not properly configured');
            console.log('Username hash exists:', !!hashedUserName);
            console.log('Password hash exists:', !!hashedPassword);
            return { success: false, error: 'Authentication system not configured' };
        }

        // Perform authentication
        const doesPasswordMatch = bcrypt.compareSync(password, hashedPassword);
        const doesUsernameMatch = bcrypt.compareSync(username, hashedUserName);
        
        if (doesUsernameMatch && doesPasswordMatch) {
            // Clear any previous failed attempts on successful login
            rateLimiter.attempts.delete(username);
            auditLogger.logLogin(true, username);
            return { success: true };
        }
        
        // Record failed attempt
        rateLimiter.recordAttempt(username);
        const remainingAttempts = rateLimiter.getRemainingAttempts(username);
        
        // Log failed login attempt
        auditLogger.logLogin(false, username);
        
        return { 
            success: false, 
            error: `Invalid credentials. ${remainingAttempts} attempts remaining.` 
        };
    } catch (error) {
        console.error('Authentication error:', error);
        return { success: false, error: error.message };
    }
};
