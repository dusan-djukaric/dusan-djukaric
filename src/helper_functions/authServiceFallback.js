import bcrypt from "bcryptjs";

/**
 * Fallback authentication service
 * Provides backup authentication when environment variables are not available
 */

// Fallback credentials (synchronized with .env file)
const FALLBACK_HASHED_USERNAME = "$2a$10$tOqiz85FFnnkyui8Z2TUUeQzePnGjF1aYivKmUTiZs1uj02kHnf3m";
const FALLBACK_HASHED_PASSWORD = "$2a$10$sh.izXEu72yjq4eS4bYW1emCrdz5axxCNzVZGcaN8TreX1HmnVee6";

export const authenticateUserFallback = async (username, password) => {
    try {
        // Input validation
        if (!username || !password) {
            return { success: false, error: 'Username and password required' };
        }

        // Perform authentication with fallback credentials
        const doesPasswordMatch = bcrypt.compareSync(password, FALLBACK_HASHED_PASSWORD);
        const doesUsernameMatch = bcrypt.compareSync(username, FALLBACK_HASHED_USERNAME);
        
        if (doesUsernameMatch && doesPasswordMatch) {
            return { success: true };
        }
        
        return { 
            success: false, 
            error: 'Invalid credentials' 
        };
    } catch (error) {
        console.error('Fallback authentication error:', error);
        return { success: false, error: 'Authentication failed' };
    }
};